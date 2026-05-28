// LIFEMAXX — Quest Log View
window.LM.views.questLog = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;

  let filters = { skill: 'all', status: 'all' }; // status: 'all', 'active', 'missed'
  let expanded = new Set();

  function isWithinTimeWindow(timeWindow) {
    if (!timeWindow || !timeWindow.start || !timeWindow.end) return true;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = timeWindow.start.split(':').map(Number);
    const [endH, endM] = timeWindow.end.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Overnight window (e.g. 22:00 to 04:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  function render() {
    const macros = S.getMacros();
    const quests = getFilteredQuests(macros);

    return `
      <div class="view-container quest-log-view">
        <div class="view-header">
          <h1 class="font-display">QUEST LOG</h1>
          <button class="btn btn-primary" onclick="LM.components.questModal.open()">+ Create Preset</button>
        </div>

        <div class="quest-log-filters">
          <div class="filter-row" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <select class="form-input" onchange="LM.views.questLog.setSkillFilter(this.value)" style="width:160px; background:var(--bg-raised); border:1px solid var(--border); color:var(--text-1); padding: 8px 12px; border-radius: 8px;">
              <option value="all">All Skills</option>
              ${macros.map(m=>`<option value="${m.id}" ${filters.skill===m.id?'selected':''}>${m.name}</option>`).join('')}
            </select>
            <div class="filter-chips">
              ${['all', 'active', 'missed'].map(s =>
                `<button class="chip ${filters.status===s?'chip-active':''}" onclick="LM.views.questLog.setStatusFilter('${s}')">${s==='all'?'All':s==='active'?'Active':'Missed'}</button>`
              ).join('')}
            </div>
          </div>
        </div>

        <div class="quest-log-list" id="quest-log-list" style="margin-top: 16px;">
          ${renderList(quests, macros)}
        </div>
      </div>`;
  }

  function getFilteredQuests(macros) {
    return S.getQuests().filter(q => {
      const tSkills = q.targetSkills || [];
      
      // Skill filter
      if (filters.skill !== 'all' && !tSkills.some(t => t.macroSkillId === filters.skill)) return false;
      
      // Status filter
      if (filters.status === 'active' && q.status !== 'active') return false;
      if (filters.status === 'missed' && q.status !== 'missed') return false;
      
      return true;
    });
  }

  function renderList(quests, macros) {
    if (!quests.length) return `<div class="empty-state"><p>No quests match these filters.</p></div>`;

    return quests.map(q => {
      const isExpanded = expanded.has(q.id);
      const tSkills = q.targetSkills || [];
      const skillTags = tSkills.map(t => {
        const m = macros.find(x=>x.id===t.macroSkillId);
        return m ? `<span class="skill-tag" style="color:${m.accentColor};border-color:${m.accentColor}33">${m.name} +${t.xpAmount}xp</span>` : '';
      }).join('');

      const isMissed = q.status === 'missed';
      const withinWindow = isWithinTimeWindow(q.timeWindow);
      const isLocked = q.status === 'active' && !withinWindow;

      let timeStr = '';
      if (q.expiresAt && q.status === 'active') {
        const leftMs = Math.max(0, q.expiresAt - Date.now());
        if (leftMs > 0) {
          const h = Math.floor(leftMs / 3600000);
          const m = Math.floor((leftMs % 3600000) / 60000);
          timeStr = `<span class="time-left" style="font-size:0.75rem;color:var(--text-3);">${h}h ${m}m remaining</span>`;
        } else {
          timeStr = `<span class="time-left" style="font-size:0.75rem;color:var(--danger);">Expired</span>`;
        }
      }

      let windowBadge = '';
      if (q.timeWindow) {
        windowBadge = `<span class="quest-type-badge" style="background:var(--accent-dim);color:var(--accent);border:1px solid var(--border);">${q.timeWindow.start} - ${q.timeWindow.end}</span>`;
      } else {
        windowBadge = `<span class="quest-type-badge" style="background:var(--bg-raised);color:var(--text-3);border:1px solid var(--border);">Anytime</span>`;
      }

      let statusBadge = '';
      if (isMissed) {
        statusBadge = `<span class="quest-type-badge" style="background:rgba(239,68,68,0.15);color:var(--danger);border:1px solid rgba(239,68,68,0.3);">MISSED</span>`;
      } else if (isLocked) {
        statusBadge = `<span class="quest-type-badge" style="background:rgba(120,120,140,0.15);color:var(--text-3);border:1px solid var(--border);">LOCKED</span>`;
      }

      let cardClass = '';
      if (isMissed) cardClass = 'quest-card-missed';
      else if (isLocked) cardClass = 'quest-card-disabled';

      return `
        <div class="quest-log-row ${cardClass}" style="margin-bottom: 8px;">
          <div class="quest-log-main" onclick="LM.views.questLog.toggleExpand('${q.id}')" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; cursor: pointer;">
            <div class="quest-log-left" style="display: flex; align-items: center; gap: 12px; flex: 1;">
              ${windowBadge}
              ${statusBadge}
              <div class="quest-log-info" style="display: flex; flex-direction: column; gap: 4px;">
                <span class="quest-log-name" style="${isMissed ? 'text-decoration:line-through;opacity:0.6;' : ''}">${q.name}</span>
                <div class="quest-log-meta" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  ${skillTags}
                  ${timeStr}
                </div>
              </div>
            </div>
            <div class="quest-log-right" style="display: flex; align-items: center; gap: 8px;">
              ${(!isLocked && !isMissed) 
                ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();LM.views.questLog.completeQuest('${q.id}')">✓</button>`
                : ''
              }
              <button class="btn-icon danger" onclick="event.stopPropagation();LM.views.questLog.deleteQuest('${q.id}')">✕</button>
              <span class="expand-arrow" style="margin-left: 8px;">${isExpanded?'▲':'▼'}</span>
            </div>
          </div>
          ${isExpanded && q.description ? `
            <div class="quest-log-expanded" style="padding: 12px 16px; border-top: 1px solid var(--border);">
              <p class="quest-desc-full" style="font-size:0.83rem;color:var(--text-2);line-height:1.5;">${q.description}</p>
            </div>` : ''}
        </div>`;
    }).join('');
  }

  function setSkillFilter(val) {
    filters.skill = val;
    refresh();
  }

  function setStatusFilter(val) {
    filters.status = val;
    refresh();
  }

  function refresh() {
    const list = document.getElementById('quest-log-list');
    if (list) list.innerHTML = renderList(getFilteredQuests(S.getMacros()), S.getMacros());
    
    // Update active filter chip classes
    document.querySelectorAll('.quest-log-view .chip').forEach(c => {
      const onclickAttr = c.getAttribute('onclick');
      if (onclickAttr && onclickAttr.includes('setStatusFilter')) {
        c.classList.toggle('chip-active', onclickAttr.includes(`'${filters.status}'`));
      }
    });
  }

  function toggleExpand(questId) {
    if (expanded.has(questId)) expanded.delete(questId); else expanded.add(questId);
    refresh();
  }

  function completeQuest(questId) {
    window.LM.components.wheel.handleDrop(questId);
    refresh();
  }

  function deleteQuest(questId) {
    if (confirm('Delete this quest instance?')) {
      S.deleteQuest(questId);
      refresh();
    }
  }

  function init() {}

  return { render, init, setSkillFilter, setStatusFilter, toggleExpand, completeQuest, deleteQuest };
})();
