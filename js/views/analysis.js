window.LM.views.analysis = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;
  const N = window.LM.components.notifications;

  let activeTab = 'today'; // 'today' or 'archive'
  let activeCellIdx = null; // Currently selected hour cell (0-23)
  
  // AI Chat State
  let activeChatId = null;
  let isAiLoading = false;
  
  const FLETCHER_SYSTEM_INSTRUCTION = 
    `You are Fletcher, an elite, data-obsessed productivity analyst and harsh coach. ` +
    `You have ZERO tolerance for wasted hours or generic motivational speeches. ` +
    `You read the user's 24-hour log grid and statistic metrics. You point out exactly where they slacked off, and you demand efficiency. ` +
    `You keep your answers highly analytical, concise (3 sentences max), and you ALWAYS end by asking a probing question based on the hard data provided. ` +
    `Never break character.`;

  function init() {
    render();
    initChat();
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
      let content = `<span class="text-[10px] text-on-surface-variant/30">${i}:00</span>`;
      
      if (isLocked) {
        borderClass = 'border-surface-container-highest opacity-50';
        content = `<span class="material-symbols-outlined text-sm text-on-surface-variant/30">lock</span>`;
      } else if (isLogged) {
        borderClass = 'border-[#2A9D8F] border opacity-90';
        content = preset ? `<span class="material-symbols-outlined text-sm text-white">${preset.icon}</span>` : `<span class="text-[10px] text-white font-bold truncate px-1">${cell.status}</span>`;
      } else if (isUnlockedNotLogged) {
        borderClass = 'border-[#E9C46A] border';
        content = `<span class="material-symbols-outlined text-sm text-[#E9C46A]">priority_high</span>`;
      }

      if (isSelected) {
        borderClass = 'border-primary border-2 shadow-[0_0_10px_rgba(255,255,255,0.3)] scale-110 z-10 transition-transform';
      }

      gridHtml += `
        <div onclick="LM.views.analysis.selectCell(${i})" 
             class="aspect-square rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 ${borderClass}" 
             style="background-color: ${bgColor};">
          ${content}
        </div>
      `;
    }
    gridHtml += `</div>`;

    // Expanding space for selected cell
    let activeCellHtml = '';
    if (activeCellIdx !== null) {
      const cell = log.cells[activeCellIdx];
      
      // Quests completed in this timeframe
      // We check history for quest completions in this hour today
      const startOfHour = new Date();
      startOfHour.setHours(activeCellIdx, 0, 0, 0);
      const endOfHour = new Date();
      endOfHour.setHours(activeCellIdx, 59, 59, 999);
      
      const completedQuests = S.getHistory().filter(h => 
        h.type === 'quest_completed' && 
        h.timestamp >= startOfHour.getTime() && 
        h.timestamp <= endOfHour.getTime()
      );
      
      let questsHtml = '';
      if (completedQuests.length > 0) {
        questsHtml = `<div class="mt-4 pt-4 border-t border-surface-container-highest">
          <span class="text-xs text-primary font-bold tracking-widest uppercase mb-2 block">Quests Claimed this Hour:</span>
          <ul class="text-sm text-on-surface-variant space-y-1">
            ${completedQuests.map(q => `<li>• ${q.message.replace('Quest Completed: ', '')}</li>`).join('')}
          </ul>
        </div>`;
      }

      activeCellHtml = `
        <div class="bg-surface-container-highest rounded-2xl p-5 shadow-lg mb-8 animate-fade-in origin-top">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-headline-sm text-on-surface">${activeCellIdx}:00 - ${activeCellIdx+1}:00</h3>
            <button onclick="LM.views.analysis.selectCell(null)" class="text-on-surface-variant hover:text-white"><span class="material-symbols-outlined">close</span></button>
          </div>
          
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
             <button type="submit" class="bg-surface-container border border-surface-container-highest rounded-lg px-3 py-1.5 text-sm hover:border-primary transition-colors"><span class="material-symbols-outlined text-sm text-primary">add</span></button>
          </form>

          <textarea onchange="LM.views.analysis.updateCellNote(event)" placeholder="Add a note for this hour..." class="w-full bg-surface-container border border-surface-container-highest rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary outline-none resize-none h-20">${cell.note || ''}</textarea>
          
          ${questsHtml}
        </div>
      `;
    }

    // General Stats
    const stats = S.getQuests().filter(q => q.type === 'statistic');
    let statsHtml = `<div class="bg-surface-container rounded-2xl p-5 mb-8">
      <h3 class="font-label-lg text-on-surface mb-4">Daily Statistic Metrics</h3>
      ${stats.length ? stats.map(s => `
        <div class="flex justify-between items-center mb-3 last:mb-0">
          <span class="text-sm text-on-surface-variant">${s.name}</span>
          <span class="font-bold text-primary">${s.currentValue || 0} / ${s.dailyGoal} <span class="text-xs text-on-surface-variant font-normal">${s.unit || ''}</span></span>
        </div>
      `).join('') : '<p class="text-xs text-on-surface-variant">No statistic quests active. Create one in the Quests tab.</p>'}
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
  function renderStatCharts() {
    const logs = S.getDailyLogs();
    const dates = Object.keys(logs).sort((a,b) => new Date(a) - new Date(b)); // Ascending
    if (dates.length < 1) return '';

    const statSeries = {};
    dates.forEach(date => {
      const snap = logs[date].statsSnapshot || {};
      Object.keys(snap).forEach(statId => {
        if (!statSeries[statId]) {
          statSeries[statId] = { name: snap[statId].name, unit: snap[statId].unit, data: [] };
        }
      });
    });

    if (Object.keys(statSeries).length === 0) return '';

    dates.forEach((date, i) => {
      const snap = logs[date].statsSnapshot || {};
      Object.keys(statSeries).forEach(statId => {
        const val = snap[statId] ? snap[statId].value : 0;
        statSeries[statId].data.push({ x: i, y: val, date });
      });
    });

    const w = 320;
    const h = 80;
    
    let html = `<div class="mb-8"><h3 class="font-label-lg text-on-surface mb-4">Statistic Trends</h3><div class="flex gap-4 overflow-x-auto pb-4 snap-x custom-scrollbar">`;

    Object.values(statSeries).forEach(series => {
      const maxVal = Math.max(...series.data.map(d => d.y), 1);
      const points = series.data.map((d, i) => {
        const px = (i / Math.max(1, series.data.length - 1)) * w;
        const py = h - ((d.y / maxVal) * h);
        return `${px},${py}`;
      }).join(' ');

      html += `
        <div class="min-w-[280px] bg-surface-container rounded-2xl p-4 shadow-sm border border-surface-container-highest snap-start">
          <div class="flex justify-between items-end mb-4">
            <span class="font-bold text-sm text-on-surface">${series.name}</span>
            <span class="text-xs text-primary font-mono">${series.data[series.data.length-1].y} ${series.unit||''} (Latest)</span>
          </div>
          <svg viewBox="0 -10 ${w} ${h+20}" class="w-full h-24 overflow-visible">
            <polyline points="${points}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            ${series.data.map((d, i) => {
              const px = (i / Math.max(1, series.data.length - 1)) * w;
              const py = h - ((d.y / maxVal) * h);
              return `<circle cx="${px}" cy="${py}" r="4" fill="var(--surface-container)" stroke="var(--primary)" stroke-width="2"><title>${d.date}: ${d.y}</title></circle>`;
            }).join('')}
          </svg>
        </div>
      `;
    });

    html += `</div></div>`;
    return html;
  }

  function renderArchive() {
    const logs = S.getDailyLogs();
    const dates = Object.keys(logs).sort((a,b) => new Date(b) - new Date(a));
    
    if (dates.length === 0) {
      return `<div class="p-10 text-center text-on-surface-variant text-sm mt-10">No archives found. Your data will appear here after midnight.</div>`;
    }

    let archiveHtml = `<div class="p-6 space-y-4">`;
    archiveHtml += renderStatCharts();
    
    dates.forEach(date => {
      const log = logs[date];
      // Quick summary
      const loggedHours = log.cells.filter(c => c.status).length;
      archiveHtml += `
        <div class="bg-surface-container rounded-2xl p-5 border border-surface-container-highest cursor-pointer hover:border-primary transition-colors">
          <div class="flex justify-between items-center mb-3">
            <h3 class="font-label-lg text-on-surface">${new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</h3>
            <span class="text-xs text-primary font-bold">${loggedHours}/24 Hours Logged</span>
          </div>
          <div class="flex gap-1 h-6">
            ${log.cells.map(c => {
              if (!c.status) return `<div class="flex-1 bg-surface-container-highest rounded-sm opacity-50"></div>`;
              let preset = S.getCellPresets().find(p => p.id === c.status);
              return `<div class="flex-1 rounded-sm" style="background-color: ${preset ? preset.color : '#1D3557'};" title="${c.status}"></div>`;
            }).join('')}
          </div>
        </div>
      `;
    });
    archiveHtml += `</div>`;
    return archiveHtml;
  }

  // ── AI Chat Interface ──
  function initChat() {
    const chatId = `chat_${getTodayStr()}`;
    activeChatId = chatId;
    
    // Auto render chat history if we are in today tab
    const container = document.getElementById('analysis-chat-history');
    if (container) renderChatHistory();

    const input = document.getElementById('coach-input-text');
    const send = document.getElementById('btn-coach-send');

    if (input) {
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
    const stats = S.getQuests().filter(q => q.type === 'statistic');
    
    // Build context string
    const logCtx = log.cells.map((c, i) => `Hour ${i}: ${c.status || 'EMPTY'} (Note: ${c.note || 'none'})`).join('\n');
    const statsCtx = stats.map(s => `${s.name}: ${s.currentValue||0}/${s.dailyGoal} ${s.unit||''}`).join('\n');
    
    const chat = S.getCoachChat(activeChatId);
    const contextMessages = chat.messages.slice(-6).filter(m => m.sender !== 'system');
    const conversationContext = contextMessages.map(m => `${m.sender === 'user' ? 'User' : 'Fletcher'}: ${m.text}`).join('\n');

    const prompt = 
      `USER'S 24-HOUR LOG TODAY:\n${logCtx}\n\n` +
      `USER'S STATISTIC PROGRESS TODAY:\n${statsCtx || 'No stats tracked today.'}\n\n` +
      `CONVERSATION HISTORY:\n${conversationContext}\n\n` +
      `Respond directly to the user's latest message based on this data. Ask a probing question based on empty hours or missed metrics. Output ONLY plain text, no JSON.`;

    const response = await window.LM.aiEngine.generateContent(prompt, FLETCHER_SYSTEM_INSTRUCTION);
    removeLoadingMessage();

    if (response.error) {
      pushMessage('fletcher', `API Error: ${response.error}`);
    } else {
      try {
        const text = response.data.candidates[0].content.parts[0].text;
        pushMessage('fletcher', text.replace(/```json|```/g, '').trim());
      } catch (e) {
        pushMessage('fletcher', "Data corrupted. Stop making excuses and fix it.");
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

  return { render, init, toggleTab, selectCell, setCellStatus, updateCellNote, setCustomStatus };
})();
