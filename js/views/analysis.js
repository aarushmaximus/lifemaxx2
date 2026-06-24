window.LM.views.analysis = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;
  const N = window.LM.components.notifications;

  let activeTab = 'today'; // 'today' or 'archive'
  let activeCellIdx = null; // Currently selected hour cell (0-23)
  
  // AI Chat State
  let activeChatId = null;
  let isAiLoading = false;
  
  let _archiveMode = 'list';
  let _activeWeekStart = null;
  let _expandedArchiveDate = null;
  let _archiveSortOrder = 'desc';
  let _collapsedWeeks = new Set();
  
  function toggleArchiveSort() {
    _archiveSortOrder = _archiveSortOrder === 'desc' ? 'asc' : 'desc';
    LM.router.render();
  }

  function toggleWeekCollapse(weekStart) {
    if (_collapsedWeeks.has(weekStart)) _collapsedWeeks.delete(weekStart);
    else _collapsedWeeks.add(weekStart);
    LM.router.render();
  }

  function openWeekDetails(weekStart, dateToExpand = null) {
    _archiveMode = 'week_details';
    _activeWeekStart = weekStart;
    _expandedArchiveDate = dateToExpand;
    LM.router.render();
  }

  function openWeekStats(weekStart) {
    _archiveMode = 'week_stats';
    _activeWeekStart = weekStart;
    LM.router.render();
  }

  function backToArchiveList() {
    _archiveMode = 'list';
    _activeWeekStart = null;
    _expandedArchiveDate = null;
    LM.router.render();
  }

  function toggleArchiveDayExpand(date) {
    if (_expandedArchiveDate === date) {
      _expandedArchiveDate = null;
    } else {
      _expandedArchiveDate = date;
    }
    LM.router.render();
  }

  const FLETCHER_SYSTEM_INSTRUCTION = 
    `You are Fletcher, an elite, data-obsessed productivity analyst and harsh coach. ` +
    `You have ZERO tolerance for wasted hours or generic motivational speeches. ` +
    `You read the user's 24-hour log grid and statistic metrics. You point out exactly where they slacked off, and you demand efficiency. ` +
    `You keep your answers highly analytical, concise (3 sentences max). Never break character.\n` +
    `QUEST CREATION PROTOCOL: The user can ask you to create a quest (e.g. using /quest). ` +
    `If the request is vague, INTERROGATE them for specifics (what exactly, how long, etc). Do not deny quests, just demand clarity. ` +
    `Once you have concrete details, ASK FOR CONFIRMATION to add it. ` +
    `If they explicitly confirm (e.g. "yes", "do it"), set "action" to "create_quest" and provide "questData". Otherwise, "action" MUST be null.\n` +
    `YOU MUST ALWAYS RESPOND IN STRICT JSON FORMAT:\n` +
    `{\n` +
    `  "message": "Your actual chat response to the user",\n` +
    `  "action": null | "create_quest",\n` +
    `  "questData": { "title": "...", "description": "...", "xp": 100 }\n` +
    `}`;

  function init() {
    render();
    initChat();
  }

  function format12Hour(hour) {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h} ${ampm}`;
  }

  function toggleTab(tab) {
    activeTab = tab;
    activeCellIdx = null;
    window.LM.router.render();
    if (tab === 'today') initChat();
  }
  
  function getTodayStr() {
    return new Date().toDateString();
  }

  // ── Cell Grid Logic ──
  function selectCell(idx) {
    if (idx > new Date().getHours()) return; // locked
    activeCellIdx = activeCellIdx === idx ? null : idx;
    window.LM.router.render();
  }

  function setCellStatus(presetId) {
    if (activeCellIdx === null) return;
    const today = getTodayStr();
    const log = S.getDailyLog(today);
    
    // Auto-fill all cells from activeCellIdx up to current hour if they are empty
    // Wait, let's just set the currently selected cell for now.
    log.cells[activeCellIdx].status = presetId;
    S.upsertDailyLog(log);
    
    window.LM.router.render();
  }
  
  function setCustomStatus(e) {
    e.preventDefault();
    if (activeCellIdx === null) return;
    const input = document.getElementById('custom-status-input');
    if (!input || !input.value.trim()) return;
    
    const today = getTodayStr();
    const log = S.getDailyLog(today);
    log.cells[activeCellIdx].status = input.value.trim();
    S.upsertDailyLog(log);
    
    window.LM.router.render();
  }

  function updateCellNote(e) {
    if (activeCellIdx === null) return;
    const today = getTodayStr();
    const log = S.getDailyLog(today);
    log.cells[activeCellIdx].note = e.target.value;
    S.upsertDailyLog(log);
  }

  function setCellMacro(e) {
    if (activeCellIdx === null) return;
    const today = getTodayStr();
    const log = S.getDailyLog(today);
    log.cells[activeCellIdx].macroId = e.target.value;
    S.upsertDailyLog(log);
    window.LM.router.render();
  }

  // ── Rendering Today ──
  function renderToday() {
    const today = getTodayStr();
    const log = S.getDailyLog(today);
    const presets = S.getCellPresets();
    const currentHour = new Date().getHours();

    let gridHtml = `<div class="grid grid-cols-6 gap-2 w-full max-w-sm mx-auto mb-6">`;
    for (let i = 0; i < 24; i++) {
      const cell = log.cells[i];
      const isLocked = i > currentHour;
      const isLogged = !!cell.status;
      const isUnlockedNotLogged = !isLocked && !isLogged;
      const isSelected = activeCellIdx === i;
      
      let preset = presets.find(p => p.id === cell.status);
      let bgColor = preset ? preset.color : (isLogged ? '#1D3557' : 'transparent');
      
      let borderClass = 'border-surface-container';
      let content = `<span class="text-[10px] text-on-surface-variant/30">${format12Hour(i)}</span>`;
      let inlineStyle = `background-color: ${bgColor};`;
      
      if (isLocked) {
        borderClass = 'border-surface-container-highest opacity-50';
        content = `<span class="material-symbols-outlined text-sm text-on-surface-variant/30">lock</span>`;
      } else if (isLogged) {
        borderClass = 'border-[#2A9D8F] border opacity-90';
        let customIcon = `<span class="material-symbols-outlined text-sm text-white">fiber_manual_record</span>`;
        if (cell.macroId) {
          const macro = S.getMacros().find(m => m.id === cell.macroId);
          if (macro) customIcon = `<span class="material-symbols-outlined text-sm" style="color: ${macro.accentColor}">adjust</span>`;
        }
        content = preset ? `<span class="material-symbols-outlined text-sm text-white">${preset.icon}</span>` : customIcon;
      } else if (isUnlockedNotLogged) {
        borderClass = 'border-[#E9C46A] border';
        content = `<span class="material-symbols-outlined text-sm text-[#E9C46A]">priority_high</span>`;
      }

      if (cell.macroId) {
        const macro = S.getMacros().find(m => m.id === cell.macroId);
        if (macro) {
          borderClass += ' border-2';
          inlineStyle += ` border-color: ${macro.accentColor};`;
        }
      }

      if (isSelected) {
        borderClass = 'border-primary border-2 shadow-[0_0_10px_rgba(255,255,255,0.3)] scale-110 z-10 transition-transform';
        inlineStyle = `background-color: ${bgColor};`; // reset to just background and tailwind borders
      }

      gridHtml += `
        <div onclick="LM.views.analysis.selectCell(${i})" 
             class="aspect-square rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 ${borderClass}" 
             style="${inlineStyle}">
          ${content}
        </div>
      `;
    }
    gridHtml += `</div>`;

    // Expanding space for selected cell
    let activeCellHtml = '';
    if (activeCellIdx !== null) {
      const cell = log.cells[activeCellIdx];
      
      activeCellHtml = `
        <div class="bg-surface-container-highest rounded-2xl p-5 shadow-lg mb-8 animate-fade-in origin-top">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-headline-sm text-on-surface">${format12Hour(activeCellIdx)} - ${format12Hour(activeCellIdx+1)}</h3>
            <button onclick="LM.views.analysis.selectCell(null)" class="text-on-surface-variant hover:text-white"><span class="material-symbols-outlined">close</span></button>
          </div>
          
          ${cell.status && !presets.find(p=>p.id===cell.status) ? `<p class="text-sm font-bold text-primary mb-3">Logged: <span class="text-white">${cell.status}</span></p>` : ''}
          
          <p class="text-xs text-on-surface-variant mb-2">Select Activity Status:</p>
          <div class="flex flex-wrap gap-2 mb-4">
            ${presets.map(p => `
              <button onclick="LM.views.analysis.setCellStatus('${p.id}')" 
                      class="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold text-white transition-transform hover:scale-105 border ${cell.status === p.id ? 'border-white ring-2 ring-white/20' : 'border-transparent'}"
                      style="background-color: ${p.color};">
                <span class="material-symbols-outlined text-sm">${p.icon}</span>
                ${p.label}
              </button>
            `).join('')}
          </div>
          
          <form onsubmit="LM.views.analysis.setCustomStatus(event)" class="flex gap-2 mb-4">
             <input type="text" id="custom-status-input" placeholder="Or type custom status..." class="flex-1 bg-surface-container border border-surface-container-highest rounded-lg px-3 py-1.5 text-sm text-on-surface focus:border-primary outline-none" value="${!presets.find(p=>p.id===cell.status) && cell.status ? cell.status : ''}">
             <button type="submit" class="bg-surface-container border border-surface-container-highest rounded-lg px-3 py-1.5 text-sm hover:border-primary transition-colors"><span class="material-symbols-outlined text-sm text-primary">check</span></button>
          </form>

          <p class="text-xs text-on-surface-variant mb-2 mt-4">Tag Macro Skill (Optional):</p>
          <select onchange="LM.views.analysis.setCellMacro(event)" class="w-full bg-surface-container border border-surface-container-highest rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary outline-none mb-4">
            <option value="">-- No Skill Tag --</option>
            ${S.getMacros().map(m => `<option value="${m.id}" ${cell.macroId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
          </select>

          <textarea onchange="LM.views.analysis.updateCellNote(event)" placeholder="Add a note for this hour..." class="w-full bg-surface-container border border-surface-container-highest rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary outline-none resize-none h-20">${cell.note || ''}</textarea>
        </div>
      `;
    }

    // General Stats
    const stats = S.getStatistics();
    let statsHtml = `<div class="bg-surface-container rounded-2xl p-5 mb-8">
      <h3 class="font-label-lg text-on-surface mb-4">Daily Statistic Metrics</h3>
      ${stats.length ? stats.map(s => {
        const todayStr = new Date().toDateString();
        const logs = S.getStatLogs().filter(l => l.statId === s.id && l.dateStr === todayStr);
        logs.sort((a,b) => b.timestamp - a.timestamp);
        const val = logs.length ? logs[0].value : 0;
        return `
        <div class="flex justify-between items-center mb-3 last:mb-0">
          <span class="text-sm text-on-surface-variant">${s.name}</span>
          <span class="font-bold text-primary">${val} / ${s.goalValue} <span class="text-xs text-on-surface-variant font-normal">${s.unit || ''}</span></span>
        </div>
      `}).join('') : '<p class="text-xs text-on-surface-variant">No statistics active. Create one in the Skills Hub.</p>'}
    </div>`;

    return `
      <div class="p-6">
        ${gridHtml}
        ${activeCellHtml}
        ${statsHtml}
      </div>
    `;
  }

  // ── Rendering Archive ──
  function renderStatChartsForWeek(weekDates) {
    const logs = S.getStatLogs();
    if (logs.length === 0) return '';
    const stats = S.getStatistics();
    if (stats.length === 0) return '';
    
    const statSeries = {};
    stats.forEach(s => { statSeries[s.id] = { name: s.name, unit: s.unit, goal: s.goalValue, data: [] }; });

    weekDates.forEach((date, i) => {
      const logsForDate = logs.filter(l => l.dateStr === date);
      Object.keys(statSeries).forEach(statId => {
        const statLogs = logsForDate.filter(l => l.statId === statId);
        const val = statLogs.reduce((acc, l) => acc + l.value, 0);
        statSeries[statId].data.push({ x: i, y: val, date });
      });
    });

    const w = 320;
    const h = 80;
    
    let html = `<div class="mb-6"><div class="flex gap-4 overflow-x-auto pb-4 snap-x custom-scrollbar">`;

    Object.values(statSeries).forEach(series => {
      const maxValY = Math.max(...series.data.map(d => d.y), series.goal * 1.2, 1);
      const points = series.data.map((d, i) => {
        const px = (i / Math.max(1, series.data.length - 1)) * w;
        const py = h - ((d.y / maxValY) * h);
        return `${px},${py}`;
      }).join(' ');

      const goalY = h - ((series.goal / maxValY) * h);

      html += `
        <div class="min-w-[280px] bg-surface-container rounded-2xl p-4 shadow-sm border border-surface-container-highest snap-start">
          <div class="flex justify-between items-end mb-4">
            <span class="font-bold text-sm text-on-surface">${series.name}</span>
            <span class="text-xs text-on-surface-variant font-mono">Goal: ${series.goal} ${series.unit || ''}</span>
          </div>
          <svg viewBox="0 -10 ${w} ${h+20}" class="w-full h-24 overflow-visible">
            <line x1="0" y1="${goalY}" x2="${w}" y2="${goalY}" stroke="var(--border)" stroke-width="2" stroke-dasharray="4" />
            <polyline points="${points}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            ${series.data.map((d, i) => {
              const px = (i / Math.max(1, series.data.length - 1)) * w;
              const py = h - ((d.y / maxValY) * h);
              return `<circle cx="${px}" cy="${py}" r="4" fill="var(--bg-base)" stroke="var(--primary)" stroke-width="2"><title>${new Date(d.date).toLocaleDateString(undefined, {weekday:'short'})}: ${d.y}</title></circle>`;
            }).join('')}
          </svg>
        </div>
      `;
    });

    html += `</div></div>`;
    return html;
  }

  function getWeekStart(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d.toDateString();
  }

  function renderArchive() {
    const logs = S.getDailyLogs();
    const CUTOFF_DATE = new Date('2026-06-21').getTime();
    
    let dates = Object.keys(logs).filter(d => new Date(d).getTime() >= CUTOFF_DATE);
    dates.sort((a,b) => new Date(b) - new Date(a));
    
    let statLogs = S.getStatLogs().filter(sl => new Date(sl.dateStr).getTime() >= CUTOFF_DATE);
    
    if (dates.length === 0 && statLogs.length === 0) {
      return `<div class="p-10 text-center text-on-surface-variant text-sm mt-10">No archives found after June 21, 2026.</div>`;
    }

    const weeks = {};
    const allDatesToGroup = new Set([...dates, ...statLogs.map(sl => sl.dateStr)]);
    
    allDatesToGroup.forEach(date => {
      const ws = getWeekStart(date);
      if (!weeks[ws]) weeks[ws] = new Set();
      weeks[ws].add(date);
    });

    let sortedWeeks = Object.keys(weeks);
    sortedWeeks.sort((a,b) => {
      const diff = new Date(b) - new Date(a);
      return _archiveSortOrder === 'desc' ? diff : -diff;
    });

    if (_archiveMode === 'list') {
      let html = `
        <div class="p-6 space-y-5">
          <div class="flex justify-between items-center mb-6">
            <h2 class="font-headline-sm text-primary">Archive Calendar</h2>
            <button onclick="LM.views.analysis.toggleArchiveSort()" class="flex items-center gap-1 text-xs font-bold text-on-surface-variant bg-surface-container-highest px-3 py-1.5 rounded-full hover:text-primary transition-colors">
              <span class="material-symbols-outlined text-sm">sort</span>
              ${_archiveSortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
            </button>
          </div>
      `;
      
      sortedWeeks.forEach(weekStart => {
        const weekDates = [];
        const wsDate = new Date(weekStart);
        for (let i = 0; i < 7; i++) {
          const d = new Date(wsDate);
          d.setDate(wsDate.getDate() + i);
          weekDates.push(d.toDateString());
        }
        
        const weDate = new Date(weekDates[6]);
        const weekLabel = `${wsDate.toLocaleDateString('en-US', {month:'short', day:'numeric'})} - ${weDate.toLocaleDateString('en-US', {month:'short', day:'numeric'})}`;
        
        let trackedHours = 0;
        let daysWithData = 0;
        weeks[weekStart].forEach(date => {
          if (logs[date]) {
            const cells = logs[date].cells || Array(24).fill({ status: null });
            trackedHours += cells.filter(c => c.status).length;
            daysWithData++;
          }
        });

        const isCollapsed = _collapsedWeeks.has(weekStart);

        html += `
          <div class="bg-surface-container rounded-2xl p-5 border border-surface-container-highest chrome-accent shadow-lg mb-6 transition-all duration-300">
            <div class="flex justify-between items-start mb-4 cursor-pointer group" onclick="LM.views.analysis.toggleWeekCollapse('${weekStart}')">
              <div>
                <h3 class="font-headline-sm text-on-surface ${!isCollapsed ? 'mb-1' : ''} group-hover:text-primary transition-colors">Week of ${weekLabel}</h3>
                ${!isCollapsed ? `<p class="text-xs text-on-surface-variant">${daysWithData} Days Tracked • ${trackedHours} Total Hours</p>` : ''}
              </div>
              <span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors bg-surface-container-highest rounded-full p-1">${isCollapsed ? 'expand_more' : 'expand_less'}</span>
            </div>
            
            <!-- 7 Squares Heatmap (Always visible) -->
            <div class="flex justify-between items-center gap-2 ${!isCollapsed ? 'mb-6' : ''} w-full max-w-[320px]">
              ${weekDates.map(dateStr => {
                const isFuture = new Date(dateStr) > new Date() || new Date(dateStr).getTime() < CUTOFF_DATE;
                const log = logs[dateStr];
                let fillClass = 'bg-surface-container-highest border border-surface-container-highest opacity-50 text-on-surface-variant';
                
                if (log) {
                  const cells = log.cells || Array(24).fill({ status: null });
                  const c = cells.filter(x => x.status).length;
                  if (c > 12) fillClass = 'bg-primary border-primary shadow-[0_0_8px_var(--primary)] text-black';
                  else if (c > 0) fillClass = 'bg-primary/50 border-primary/50 text-white';
                }
                
                const dayLabel = new Date(dateStr).toLocaleDateString(undefined, {weekday:'narrow'});
                const dateNum = new Date(dateStr).getDate();
                
                return `
                  <div class="flex flex-col items-center gap-1">
                    <span class="text-[0.6rem] text-on-surface-variant font-bold">${dayLabel}</span>
                    <button onclick="${!isFuture ? `LM.views.analysis.openWeekDetails('${weekStart}', '${dateStr}')` : ''}" 
                            class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[0.65rem] ${fillClass} transition-transform hover:scale-110 cursor-pointer ${isFuture ? 'opacity-20 cursor-default' : ''}"
                            title="${new Date(dateStr).toLocaleDateString()}">${dateNum}</button>
                  </div>
                `;
              }).join('')}
            </div>

            ${!isCollapsed ? `
            <div class="flex gap-2">
              <button onclick="LM.views.analysis.openWeekDetails('${weekStart}')" class="flex-1 bg-surface-container-highest hover:bg-white/10 text-on-surface text-xs font-bold py-2 rounded-xl transition-colors">Info & Details <span class="text-[10px] ml-1 opacity-50">></span></button>
              <button onclick="LM.views.analysis.openWeekStats('${weekStart}')" class="flex-1 bg-surface-container-highest hover:bg-white/10 text-on-surface text-xs font-bold py-2 rounded-xl transition-colors">Statistics Review <span class="text-[10px] ml-1 opacity-50">></span></button>
            </div>
            ` : ''}
          </div>
        `;
      });
      html += `</div>`;
      return html;

    } else if (_archiveMode === 'week_stats') {
      
      const wsDate = new Date(_activeWeekStart);
      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(wsDate);
        d.setDate(wsDate.getDate() + i);
        weekDates.push(d.toDateString());
      }

      let html = `
        <div class="p-6">
          <button onclick="LM.views.analysis.backToArchiveList()" class="flex items-center gap-1 text-on-surface-variant hover:text-white text-xs font-bold mb-6 transition-colors">
            <span class="material-symbols-outlined text-sm">arrow_back</span> Back to Calendar
          </button>
          <h2 class="font-headline-sm text-primary mb-6">Week Statistics</h2>
          ${renderStatChartsForWeek(weekDates)}
        </div>
      `;
      return html;

    } else {
      const wsDate = new Date(_activeWeekStart);
      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(wsDate);
        d.setDate(wsDate.getDate() + i);
        weekDates.push(d.toDateString());
      }
      
      let html = `
        <div class="p-6">
          <button onclick="LM.views.analysis.backToArchiveList()" class="flex items-center gap-1 text-on-surface-variant hover:text-white text-xs font-bold mb-6 transition-colors">
            <span class="material-symbols-outlined text-sm">arrow_back</span> Back to Calendar
          </button>
          <h2 class="font-headline-sm text-primary mb-6">Week Log Explorer</h2>
          <div class="space-y-4">
      `;
      
      weekDates.forEach(dateStr => {
        if (new Date(dateStr).getTime() < CUTOFF_DATE) return;
        const log = logs[dateStr];
        const isExpanded = _expandedArchiveDate === dateStr;
        const dayName = new Date(dateStr).toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'});
        
        let cCount = 0;
        if (log) cCount = (log.cells || []).filter(c=>c.status).length;
        
        html += `
          <div class="bg-surface-container border border-surface-container-highest rounded-2xl overflow-hidden transition-all duration-300">
            <div class="p-4 flex justify-between items-center cursor-pointer hover:bg-surface-container-highest/50 transition-colors" onclick="LM.views.analysis.toggleArchiveDayExpand('${dateStr}')">
              <span class="font-bold text-sm text-on-surface">${dayName}</span>
              <div class="flex items-center gap-3">
                <span class="text-xs text-on-surface-variant bg-surface-container-highest px-2 py-1 rounded-md">${cCount} hrs</span>
                <span class="material-symbols-outlined text-on-surface-variant">${isExpanded ? 'expand_less' : 'expand_more'}</span>
              </div>
            </div>
        `;
        
        if (isExpanded) {
          html += `<div class="p-4 pt-0 border-t border-surface-container-highest/50">`;
          if (!log || cCount === 0) {
            html += `<div class="text-center text-xs text-on-surface-variant py-4">No data logged for this day.</div>`;
          } else {
            html += `<div class="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-4">`;
            const presets = S.getCellPresets();
            for (let i = 0; i < 24; i++) {
              const cell = log.cells[i];
              if (!cell.status) continue;
              let preset = presets.find(p => p.id === cell.status);
              let bgColor = preset ? preset.color : '#1D3557';
              let icon = preset ? `<span class="material-symbols-outlined text-sm text-white">${preset.icon}</span>` : `<span class="text-[10px] text-white">★</span>`;
              
              if (cell.macroId) {
                const macro = S.getMacros().find(m => m.id === cell.macroId);
                if (macro) {
                   icon = `<span class="material-symbols-outlined text-sm" style="color: ${macro.accentColor}">adjust</span>`;
                }
              }

              html += `
                <div class="flex flex-col items-center gap-1 group relative">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 shadow-sm" style="background-color:${bgColor}">
                    ${icon}
                  </div>
                  <span class="text-[9px] text-on-surface-variant">${format12Hour(i)}</span>
                  ${cell.note ? `
                    <div class="absolute bottom-full mb-1 w-32 bg-surface-container-highest text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl border border-surface-container">
                      ${cell.note}
                    </div>
                  ` : ''}
                </div>
              `;
            }
            html += `</div>`;
          }
          html += `</div>`;
        }
        html += `</div>`;
      });
      html += `</div></div>`;
      return html;
    }
  }

  // ── AI Chat Interface ──
  function initChat() {
    if (activeTab !== 'today') return;
    
    activeChatId = `chat_${getTodayStr()}`;
    
    const input = document.getElementById('coach-input-text');
    const send = document.getElementById('btn-coach-send');
    
    renderChatHistory();

    if (input && send) {
      input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        send.disabled = !this.value.trim();
      });
      send.disabled = !input.value.trim();
    }

    const submitMsg = () => {
      if (!input || !input.value.trim()) return;
      const txt = input.value; 
      input.value = '';
      input.style.height = 'auto';
      send.disabled = true;
      sendChatMessage(txt);
    };

    if (send) {
      send.replaceWith(send.cloneNode(true)); // remove old listeners
      document.getElementById('btn-coach-send').addEventListener('click', submitMsg);
    }
    if (input) {
      input.replaceWith(input.cloneNode(true));
      document.getElementById('coach-input-text').addEventListener('keydown', e => { 
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitMsg(); 
        }
      });
    }
  }

  function renderChatHistory() {
    const container = document.getElementById('analysis-chat-history');
    if (!container) return;
    
    const chat = S.getCoachChat(activeChatId);
    if (!chat || !chat.messages || !chat.messages.length) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8 text-center text-on-surface-variant opacity-50">
          <span class="material-symbols-outlined text-4xl mb-2">query_stats</span>
          <p class="text-sm">Fletcher is analyzing your data. Ask him a question.</p>
        </div>`;
      return;
    }

    const getTimeStr = (ts) => new Date(ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    container.innerHTML = chat.messages.map(m => {
      if (m.sender === 'system') {
        return `<div class="text-center font-mono text-xs text-primary/50 my-4 ${m.isLoading ? 'animate-pulse' : ''} tracking-widest">${m.text}</div>`;
      }
      
      const textFmt = m.text.replace(/\n/g, '<br>');
      
      if (m.sender === 'fletcher') {
        return `
          <div class="flex justify-start mb-4">
            <div class="max-w-[90%]">
              <span class="text-[9px] font-bold tracking-widest text-primary uppercase ml-2 mb-1 block">Fletcher</span>
              <div class="bg-surface-container border border-surface-container-highest rounded-xl rounded-tl-sm px-4 py-3 shadow-md">
                <p class="font-body-md text-on-surface text-sm leading-relaxed">${textFmt}</p>
                <span class="text-[10px] text-on-surface-variant mt-1 block opacity-60">${getTimeStr(m.timestamp)}</span>
              </div>
            </div>
          </div>`;
      }
      
      return `
        <div class="flex justify-end mb-4">
          <div class="max-w-[90%]">
             <span class="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mr-2 mb-1 block text-right">You</span>
            <div class="bg-surface-container-highest border border-surface-container-highest rounded-xl rounded-tr-sm px-4 py-3 shadow-md">
              <p class="font-body-md text-on-surface text-sm leading-relaxed">${textFmt}</p>
              <span class="text-[10px] text-on-surface-variant mt-1 block opacity-60 text-right">${getTimeStr(m.timestamp)}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 10);
  }

  function pushMessage(sender, text, isLoading = false) {
    let chat = S.getCoachChat(activeChatId);
    if (!chat) {
      chat = { id: activeChatId, title: `Log: ${getTodayStr()}`, createdAt: Date.now(), messages: [] };
    }
    chat.messages.push({ sender, text, isLoading, timestamp: Date.now() });
    S.upsertCoachChat(chat);
    renderChatHistory();
  }

  function removeLoadingMessage() {
    let chat = S.getCoachChat(activeChatId);
    if (chat) {
      chat.messages = chat.messages.filter(m => !m.isLoading);
      S.upsertCoachChat(chat);
      renderChatHistory();
    }
  }

  async function sendChatMessage(userText) {
    pushMessage('user', userText);
    pushMessage('system', "Analyzing data...", true);

    const log = S.getDailyLog(getTodayStr());
    const stats = S.getStatistics();
    
    // Build context string
    const cells = log.cells || Array(24).fill({ status: null, note: '' });
    const logCtx = cells.map((c, i) => `Hour ${i}: ${c.status || 'EMPTY'} (Note: ${c.note || 'none'})`).join('\n');
    
    const todayStr = getTodayStr();
    const statsCtx = stats.map(s => {
      const sLogs = S.getStatLogs().filter(l => l.statId === s.id && l.dateStr === todayStr);
      sLogs.sort((a,b) => b.timestamp - a.timestamp);
      const val = sLogs.length ? sLogs[0].value : 0;
      return `${s.name}: ${val}/${s.goalValue} ${s.unit||''}`;
    }).join('\n');
    
    const chat = S.getCoachChat(activeChatId);
    const contextMessages = chat.messages.slice(-6).filter(m => m.sender !== 'system');
    const conversationContext = contextMessages.map(m => `${m.sender === 'user' ? 'User' : 'Fletcher'}: ${m.text}`).join('\n');

    const prompt = 
      `USER'S 24-HOUR LOG TODAY:\n${logCtx}\n\n` +
      `USER'S STATISTIC PROGRESS TODAY:\n${statsCtx || 'No stats tracked today.'}\n\n` +
      `CONVERSATION HISTORY:\n${conversationContext}\n\n` +
      `Respond directly to the user's latest message based on this data. Output JSON format as specified in instructions.`;

    const response = await window.LM.aiEngine.generateContent(prompt, FLETCHER_SYSTEM_INSTRUCTION);
    removeLoadingMessage();

    if (response.error) {
      pushMessage('fletcher', `API Error: ${response.error}`);
    } else {
      try {
        let text = response.data.candidates[0].content.parts[0].text;
        text = text.replace(/```json|```/gi, '').trim();
        const parsed = JSON.parse(text);
        
        if (parsed.message) {
          pushMessage('fletcher', parsed.message);
        }
        
        if (parsed.action === 'create_quest' && parsed.questData) {
          const newQuest = {
            id: 'quest_' + Date.now(),
            name: parsed.questData.title || "New Quest",
            description: parsed.questData.description || "",
            type: "daily",
            status: "active",
            xpReward: parsed.questData.xp || 100,
            macroSkillId: null,
            createdAt: Date.now()
          };
          window.LM.store.upsertQuest(newQuest);
          pushMessage('system', `SYSTEM: Quest '${newQuest.name}' has been added to your Dashboard.`);
        }
      } catch (e) {
        console.error("Fletcher JSON Parse Error", e);
        pushMessage('fletcher', "Data corrupted. Stop making excuses and fix the JSON parsing error.");
      }
    }
  }

  // ── Main Render ──
  function render() {
    return `
      <div style="padding: 100px 16px 120px; max-width: 900px; margin: 0 auto;">
        
        <!-- Tab Navigation -->
        <header class="flex items-center justify-between mb-6">
          <h2 class="font-label-lg text-on-surface">Analysis & Chronicle</h2>
          <div class="flex gap-2 bg-surface-container p-1 rounded-xl">
            <button onclick="LM.views.analysis.toggleTab('today')" class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'today' ? 'bg-primary text-black shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}">Today</button>
            <button onclick="LM.views.analysis.toggleTab('archive')" class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'archive' ? 'bg-primary text-black shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}">Archive</button>
          </div>
        </header>

        <!-- Main Content -->
        <div>
          ${activeTab === 'today' ? renderToday() : renderArchive()}
          
          <!-- Embedded AI Coach for Today -->
          ${activeTab === 'today' ? `
          <div class="mt-8">
             <div class="border-t border-surface-container pt-6 mb-4">
               <h3 class="font-label-lg text-on-surface flex items-center gap-2"><span class="material-symbols-outlined text-primary text-lg">psychology</span> Coach Fletcher</h3>
               <p class="text-xs text-on-surface-variant mt-1">Fletcher is actively monitoring your log grid and stats.</p>
             </div>
             
             <div id="analysis-chat-history" class="w-full flex flex-col mb-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar"></div>
             
             <div class="bg-surface-container border border-surface-container-highest rounded-[2rem] p-1.5 flex items-end shadow-lg">
                <textarea id="coach-input-text" rows="1"
                  class="bg-transparent border-none outline-none focus:ring-0 flex-grow font-body-sm text-on-surface placeholder:text-on-surface-variant/50 py-3 px-5 resize-none max-h-32"
                  placeholder="Ask for analysis..."></textarea>
                <button id="btn-coach-send" class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-primary text-black hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 mb-1 mr-1">
                  <span class="material-symbols-outlined text-lg">send</span>
                </button>
              </div>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  return { render, init, toggleTab, selectCell, setCellStatus, updateCellNote, setCustomStatus, openWeekDetails, openWeekStats, backToArchiveList, toggleArchiveDayExpand, toggleArchiveSort, toggleWeekCollapse };
})();
