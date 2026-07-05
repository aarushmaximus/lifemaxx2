window.LM.views.coach = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;
  const N = window.LM.components.notifications;

  let activeChatId = null;
  let isBriefLoading = false;
  let isReviewLoading = false;
  let isSidebarOpen = false;

  // ── Timer System ─────────────────────────────────────────────────────────
  // Timers are stored in localStorage keyed by a unique ID.
  // Each timer: { id, label, durationMs, startedAt, endsAt, done }
  const TIMER_KEY = 'lm_coach_timers';

  function getTimers() {
    try { return JSON.parse(localStorage.getItem(TIMER_KEY) || '[]'); } catch { return []; }
  }
  function saveTimers(arr) {
    localStorage.setItem(TIMER_KEY, JSON.stringify(arr));
  }
  function addTimer(label, durationMs) {
    const timers = getTimers();
    const id = 'tmr_' + Date.now();
    timers.push({ id, label, durationMs, startedAt: Date.now(), endsAt: Date.now() + durationMs, done: false });
    saveTimers(timers);
    startTimerWatcher();
    return id;
  }
  function deleteTimer(id) {
    saveTimers(getTimers().filter(t => t.id !== id));
    renderTimerPanel();
  }
  function formatDuration(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }
  function formatMs(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  let _timerWatcher = null;
  function startTimerWatcher() {
    if (_timerWatcher) return;
    _timerWatcher = setInterval(() => {
      const timers = getTimers();
      let changed = false;
      timers.forEach(t => {
        if (!t.done && Date.now() >= t.endsAt) {
          t.done = true;
          changed = true;
          fireTimerNotification(t);
        }
      });
      if (changed) saveTimers(timers);
      renderTimerPanel();
    }, 1000);
  }

  function fireTimerNotification(timer) {
    const settings = S.getSettings();
    if (!settings.timerNotificationsEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const n = new Notification('⏱ Fletcher · Timer Done', {
        body: `"${timer.label}" just finished. Get up. Move.`,
        icon: '/icon-192.png',
        tag: 'lifemaxx-timer-' + timer.id,
        renotify: true,
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch(e) {}
  }

  let _timerPanelOpen = false;

  function renderTimerPanel() {
    const panel = document.getElementById('coach-timer-panel');
    if (!panel) return;
    const timers = getTimers();

    // Update the timer count badge in the header
    const badge = document.getElementById('coach-timer-badge');
    if (badge) {
      const active = timers.filter(t => !t.done).length;
      if (active > 0) {
        badge.textContent = active;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    if (!timers.length) {
      panel.innerHTML = '';
      panel.style.display = 'none';
      _timerPanelOpen = false;
      return;
    }

    // Only show if toggled open
    panel.style.display = _timerPanelOpen ? 'flex' : 'none';

    panel.innerHTML = timers.map(t => {
      const remaining = Math.max(0, t.endsAt - Date.now());
      const pct = t.done ? 100 : Math.min(100, ((t.durationMs - remaining) / t.durationMs) * 100);
      const radius = 22;
      const circ = 2 * Math.PI * radius;
      const dash = circ - (pct / 100) * circ;
      const color = t.done ? '#10b981' : '#e8e8e8';
      const timeText = t.done ? 'DONE' : formatMs(remaining);
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;" title="${t.label}">
          <div style="position:relative;width:56px;height:56px;">
            <svg width="56" height="56" viewBox="0 0 56 56" style="transform:rotate(-90deg);position:absolute;top:0;left:0;">
              <circle cx="28" cy="28" r="${radius}" fill="none" stroke="#1a1a1a" stroke-width="3"/>
              <circle cx="28" cy="28" r="${radius}" fill="none" stroke="${color}" stroke-width="3"
                stroke-dasharray="${circ.toFixed(2)}"
                stroke-dashoffset="${dash.toFixed(2)}"
                stroke-linecap="round"
                style="transition:stroke-dashoffset 0.9s linear;"/>
            </svg>
            <div style="position:absolute;top:0;left:0;width:56px;height:56px;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:9px;font-weight:700;color:${color};font-family:var(--font-mono,monospace);white-space:nowrap;letter-spacing:-.3px;">${timeText}</span>
            </div>
          </div>
          <div style="font-size:9px;color:#7a7a85;max-width:56px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.label}</div>
          <button onclick="LM.views.coach.deleteTimer('${t.id}')" style="background:none;border:none;color:#3a3a3a;cursor:pointer;font-size:10px;padding:0;line-height:1;transition:color .15s;" onmouseenter="this.style.color='#ef4444'" onmouseleave="this.style.color='#3a3a3a'">✕</button>
        </div>`;
    }).join('');
  }

  function toggleTimerPanel() {
    _timerPanelOpen = !_timerPanelOpen;
    renderTimerPanel();
  }

  // ── Timer command handler — no API call ─────────────────────────────────
  function handleTimerCommand() {
    // Push a special timer-setter card into chat
    let chat = getActiveChat();
    if (!chat) {
      chat = { id: S.uid(), title: 'Timer', createdAt: Date.now(), messages: [] };
      activeChatId = chat.id;
      S.upsertCoachChat(chat);
    }
    chat.messages.push({ sender: 'fletcher', text: 'How long should the timer run? Use the picker below.' , timestamp: Date.now() });
    chat.messages.push({ sender: 'timer_setter', text: '', timestamp: Date.now() });
    S.upsertCoachChat(chat);
    renderHistory();
    window.LM.router.render();
  }

  function handleFTimerCommand() {
    let chat = getActiveChat();
    if (!chat) {
      chat = { id: S.uid(), title: 'Fixed Timer', createdAt: Date.now(), messages: [] };
      activeChatId = chat.id;
      S.upsertCoachChat(chat);
    }
    chat.messages.push({ sender: 'fletcher', text: 'When should I remind you every day?', timestamp: Date.now() });
    chat.messages.push({ sender: 'ftimer_setter', text: '', timestamp: Date.now() });
    S.upsertCoachChat(chat);
    renderHistory();
    window.LM.router.render();
  }

  function startTimerFromCard() {
    const h = parseInt(document.getElementById('timer-h')?.value || 0);
    const m = parseInt(document.getElementById('timer-m')?.value || 0);
    const s = parseInt(document.getElementById('timer-s')?.value || 0);
    const label = document.getElementById('timer-label')?.value?.trim() || 'Focus';
    const totalMs = (h * 3600 + m * 60 + s) * 1000;
    if (totalMs <= 0) { N.show('Set a duration first!', 'warning'); return; }
    addTimer(label, totalMs);
    // Replace the setter card message with a confirmation
    let chat = getActiveChat();
    if (chat) {
      const idx = chat.messages.findLastIndex(msg => msg.sender === 'timer_setter');
      if (idx !== -1) {
        chat.messages[idx] = { sender: 'fletcher', text: `Timer set: "${label}" for ${formatDuration(totalMs)}. Clock is ticking. Don't waste it.`, timestamp: Date.now() };
        S.upsertCoachChat(chat);
      }
    }
    renderHistory();
    renderTimerPanel();
    N.show(`⏱ Timer started: ${formatDuration(totalMs)}`, 'success');
    // Request notification permission if needed
    const settings = S.getSettings();
    if (settings.timerNotificationsEnabled && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function setFixedTimerFromCard() {
    const timeVal = document.getElementById('ftimer-time')?.value;
    const label = document.getElementById('ftimer-label')?.value?.trim() || 'Reminder';
    
    if (!timeVal) {
      N.show('Select a time first!', 'warning');
      return;
    }

    const st = S.getSettings();
    st.fixedTimers = st.fixedTimers || [];
    st.fixedTimers.push({
      id: S.uid(),
      timeStr: timeVal,
      label: label,
      enabled: true
    });
    S.saveSettings(st);

    let chat = getActiveChat();
    if (chat) {
      const idx = chat.messages.findLastIndex(msg => msg.sender === 'ftimer_setter');
      if (idx !== -1) {
        // Convert 24h to 12h for display
        const [hh, mm] = timeVal.split(':');
        const hInt = parseInt(hh, 10);
        const ampm = hInt >= 12 ? 'PM' : 'AM';
        const displayH = hInt % 12 || 12;
        const displayTime = `${displayH}:${mm} ${ampm}`;
        
        chat.messages[idx] = { sender: 'fletcher', text: `Daily fixed timer set: "${label}" at ${displayTime}. I'll remind you every day.`, timestamp: Date.now() };
        S.upsertCoachChat(chat);
      }
    }
    renderHistory();
    N.show(`Daily timer set for ${timeVal}`, 'success');

    // Make sure we have notification permissions
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Refresh the notifier schedule
    if (window.LM.fixedTimerNotifier) {
      window.LM.fixedTimerNotifier.init();
    }
  }

  const FLETCHER_SYSTEM_INSTRUCTION = 
    `You are Fletcher, an elite, data-obsessed productivity analyst and harsh coach. ` +
    `You have ZERO tolerance for wasted hours or generic motivational speeches. ` +
    `You have full access to the user's past 7 days of log grid data and stats. ` +
    `If the user asks you to analyze a day, a specific cell, or a weekly trend, YOU MUST provide a highly detailed, analytical breakdown of that data. Point out exact hours they slacked off, summarize their logged hours, and demand efficiency. ` +
    `You keep your answers highly analytical, concise (4 sentences max). Never break character.\n` +
    `QUEST CREATION PROTOCOL: The user can ask you to create a regular quest (using /quest) OR a chain quest (using /cquest).\n` +
    `- For /quest: ask for specifics, then set "action" to "propose_quest" and provide "questData": { "title": "...", "description": "...", "xp": 100 }.\n` +
    `- For /cquest: a chain quest is a multi-step project. Ask for specifics, break it down into steps, then set "action" to "propose_chain" and provide "chainData": { "title": "...", "description": "...", "steps": [ { "name": "...", "xp": 50 }, ... ] }.\n` +
    `Once you have concrete details, DO NOT CREATE IT DIRECTLY. You must PROPOSE it to the user. ` +
    `The user will then see a UI card and can either Accept it or ask you to Modify it. ` +
    `If the user asks you to modify a proposed quest/chain, tweak the data and propose it again.\n` +
    `YOU MUST ALWAYS RESPOND IN STRICT JSON FORMAT:\n` +
    `{\n` +
    `  "message": "Your actual chat response to the user",\n` +
    `  "action": null | "propose_quest" | "propose_chain",\n` +
    `  "questData": { ... },\n` +
    `  "chainData": { ... }\n` +
    `}`;

  function getActiveChat() {
    if (!activeChatId) return null;
    return S.getCoachChat(activeChatId);
  }

  function startNewChat() {
    activeChatId = null;
    isSidebarOpen = false;
    window.LM.router.render();
  }

  function loadChat(id) {
    activeChatId = id;
    isSidebarOpen = false;
    window.LM.router.render();
  }

  function deleteChat(id, e) {
    e.stopPropagation();
    if(confirm("Delete this conversation?")) {
      S.deleteCoachChat(id);
      if (activeChatId === id) activeChatId = null;
      window.LM.router.render();
    }
  }

  function pushMessage(sender, text, isLoading = false) {
    let chat = getActiveChat();
    if (!chat) {
      chat = { id: S.uid(), title: "New Conversation", createdAt: Date.now(), messages: [] };
      activeChatId = chat.id;
      S.upsertCoachChat(chat);
    }
    chat.messages.push({ sender, text, isLoading, timestamp: Date.now() });
    
    // Auto title generation if it's the first user message and title is default
    if (sender === 'user' && chat.messages.filter(m => m.sender === 'user').length === 1 && chat.title === "New Conversation") {
      chat.title = text.substring(0, 30) + (text.length > 30 ? "..." : "");
    }
    
    S.upsertCoachChat(chat);
    renderHistory();
  }

  function removeLoadingMessage() {
    let chat = getActiveChat();
    if (chat) {
      chat.messages = chat.messages.filter(m => !m.isLoading);
      S.upsertCoachChat(chat);
      renderHistory();
    }
  }

  // Old generation functions removed

  async function sendChatMessage(userText) {
    if (userText.trim().toLowerCase().startsWith('/bulkquest')) {
      pushMessage('user', userText);
      
      const textBlock = userText.substring('/bulkquest'.length).trim();
      const lines = textBlock.split('\\n');
      const macros = S.getMacros();
      
      let currentChain = null;
      let addedCount = 0;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;
        
        if (line.startsWith('> ')) {
          let nameStr = line.substring(2);
          
          const typeMatch = nameStr.match(/#(habit|project|boss|chain|research|daily)/i);
          const type = typeMatch ? typeMatch[1].toLowerCase() : 'daily';
          
          const xpMatch = nameStr.match(/\$(\d+)/);
          const xp = xpMatch ? parseInt(xpMatch[1], 10) : 50;
          
          const timeMatch = nameStr.match(/~(\d{2}:\d{2}-\d{2}:\d{2})/);
          const timeWindow = timeMatch ? timeMatch[1] : null;
          
          const isNegative = /!negative/i.test(nameStr);
          
          const skillRegex = /@(\w+)/g;
          let targetSkills = [];
          let match;
          while ((match = skillRegex.exec(nameStr)) !== null) {
            const t = match[1].toLowerCase();
            const macro = macros.find(m => m.name.toLowerCase() === t);
            if (macro) {
              targetSkills.push({ macroSkillId: macro.id, microSkillId: null, xpAmount: xp });
            }
          }
          
          if (targetSkills.length === 0 && macros.length > 0) {
            targetSkills.push({ macroSkillId: macros[0].id, microSkillId: null, xpAmount: xp });
          }

          let cleanName = nameStr
            .replace(/#\w+/g, '')
            .replace(/\$\d+/g, '')
            .replace(/~\d{2}:\d{2}-\d{2}:\d{2}/g, '')
            .replace(/!negative/gi, '')
            .replace(/@\w+/g, '')
            .trim();
            
          if (type === 'chain') {
            currentChain = {
              id: S.uid(),
              name: cleanName,
              macroId: targetSkills.length > 0 ? targetSkills[0].macroSkillId : macros[0]?.id,
              steps: [],
              createdAt: Date.now()
            };
            S.upsertChain(currentChain);
            addedCount++;
          } else {
            currentChain = null;
            S.upsertQuest({
              id: S.uid(),
              name: cleanName,
              description: '',
              type: type,
              status: 'active',
              isNegative: isNegative,
              timeWindow: timeWindow,
              targetSkills: targetSkills,
              createdAt: Date.now(),
              isCustom: true
            });
            addedCount++;
          }
        } else if (line.startsWith('>> ') && currentChain) {
          let stepStr = line.substring(3).trim();
          const xpMatch = stepStr.match(/\$(\d+)/);
          const stepXp = xpMatch ? parseInt(xpMatch[1], 10) : 50;
          let cleanStep = stepStr.replace(/\$\d+/g, '').trim();
          
          currentChain.steps.push({
            id: S.uid(),
            name: cleanStep,
            xpAmount: stepXp,
            completedAt: null
          });
          S.upsertChain(currentChain);
        }
      }
      
      pushMessage('fletcher', `Successfully parsed and created ${addedCount} main quests/chains.`);
      window.LM.router.render();
      return;
    }

    // Intercept /timer before any API call
    if (userText.trim().toLowerCase() === '/timer') {
      handleTimerCommand();
      return;
    }
    if (userText.trim().toLowerCase() === '/ftimer') {
      handleFTimerCommand();
      return;
    }
    if (!userText.trim()) return;
    pushMessage('user', userText);
    
    // Auto render to show message immediately before API call
    window.LM.router.render();
    
    pushMessage('system', "Analyzing data...", true);

    const todayStr = new Date().toDateString();
    const stats = S.getStatistics();
    
    // Build context string for the last 7 days
    let logsCtx = '';
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const dailyLog = S.getDailyLog(dateStr);
      const cells = dailyLog.cells || Array(24).fill({ status: null, note: '' });
      
      const dayLogStr = cells.map((c, idx) => `H${idx}:${c.status || 'E'}${c.note ? '('+c.note+')' : ''}`).join(', ');
      logsCtx += `${dateStr}: [ ${dayLogStr} ]\\n`;
    }
    
    const statsCtx = stats.map(s => {
      const sLogs = S.getStatLogs().filter(l => l.statId === s.id && l.dateStr === todayStr);
      sLogs.sort((a,b) => b.timestamp - a.timestamp);
      const val = sLogs.length ? sLogs[0].value : 0;
      return `${s.name}: ${val}/${s.goalValue} ${s.unit||''}`;
    }).join('\\n');
    
    const chat = getActiveChat();
    const contextMessages = chat.messages.slice(-10).filter(m => m.sender !== 'system');
    const conversationContext = contextMessages.map(m => `${m.sender === 'user' ? 'User' : 'Fletcher'}: ${m.text}`).join('\\n');

    const prompt = 
      `USER'S LAST 7 DAYS OF LOGS (H0-H23, E=Empty):\\n${logsCtx}\\n` +
      `USER'S STATISTIC PROGRESS TODAY (${todayStr}):\\n${statsCtx || 'No stats tracked today.'}\\n\\n` +
      `CONVERSATION HISTORY:\\n${conversationContext}\\n\\n` +
      `Respond directly to the user's latest message based on this data. Output JSON format as specified in instructions.`;

    const response = await window.LM.aiEngine.generateContent(prompt, FLETCHER_SYSTEM_INSTRUCTION);
    removeLoadingMessage();

    if (response.error) {
      let errStr = response.error.toString();
      if (errStr.includes('503') || errStr.includes('UNAVAILABLE')) {
        pushMessage('fletcher', "The AI network is currently experiencing high demand (Error 503). Try again in a few minutes.");
      } else if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED')) {
        pushMessage('fletcher', `You are talking too fast. We hit the Gemini API rate limit. Wait about a minute and try again.\n\n[Debug Info: ${errStr}]`);
      } else {
        pushMessage('fletcher', `API Error: ${response.error}`);
      }
    } else {
      try {
        let text = response.data.candidates[0].content.parts[0].text;
        text = text.replace(/```json|```/gi, '').trim();
        const parsed = JSON.parse(text);
        
        if (parsed.message) {
          pushMessage('fletcher', parsed.message);
        }
        
        if (parsed.action === 'propose_quest' && parsed.questData) {
          // Push a system message containing the proposal
          let chat = getActiveChat();
          chat.messages.push({
            sender: 'fletcher_proposal',
            text: '',
            questData: parsed.questData,
            timestamp: Date.now()
          });
          S.upsertCoachChat(chat);
        }
      } catch (e) {
        console.error("Fletcher JSON Parse Error", e);
        pushMessage('fletcher', "Data corrupted. Stop making excuses and fix the JSON parsing error.");
      }
    }
    // Re-render to update chat titles in sidebar
    window.LM.router.render();
  }

  function cleanJSONString(str) {
    let s = str.trim();
    if (s.startsWith("```json")) s = s.slice(7);
    else if (s.startsWith("```")) s = s.slice(3);
    if (s.endsWith("```")) s = s.slice(0, -3);
    return s.trim();
  }

  function renderHistory() {
    const container = document.getElementById('coach-chat-history');
    if (!container) return;
    
    const chat = getActiveChat();
    if (!chat || !chat.messages.length) {
      container.innerHTML = '';
      return;
    }

    const getTimeStr = (ts) => new Date(ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // timer_setter card render
    const renderTimerSetterCard = () => {
      const avatarUrl = S.getSettings().coachAvatarUrl;
      const avatarContent = avatarUrl ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;">` : `F`;
      return `
        <div class="flex justify-start mb-6 w-full px-4 md:px-0">
          <div class="flex items-end gap-3 w-full md:max-w-[75%]">
            <div class="w-8 h-8 rounded-full flex-shrink-0 bg-surface-container border border-surface-container-highest overflow-hidden flex items-center justify-center font-bold text-sm text-primary shadow-sm mb-1">${avatarContent}</div>
            <div style="background:#0e0e0e;border:1px solid #1a1a1a;border-radius:18px;border-bottom-left-radius:4px;padding:16px;width:100%;max-width:340px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#7a7a85;margin-bottom:12px;">⏱ SET TIMER</div>
              <div style="margin-bottom:10px;">
                <input id="timer-label" type="text" placeholder="Label (e.g. Focus, Cooldown)" maxlength="30"
                  style="width:100%;background:#121212;border:1px solid #222;border-radius:8px;padding:8px 12px;font-size:13px;color:#e8e8f0;outline:none;box-sizing:border-box;">
              </div>
              <div style="display:flex;gap:8px;margin-bottom:14px;align-items:center;">
                <div style="display:flex;flex-direction:column;align-items:center;flex:1;">
                  <div style="font-size:10px;color:#555;margin-bottom:4px;">HH</div>
                  <input id="timer-h" type="number" min="0" max="23" value="0"
                    style="width:100%;background:#121212;border:1px solid #222;border-radius:8px;padding:8px;font-size:18px;font-weight:700;color:#e8e8f0;text-align:center;outline:none;-moz-appearance:textfield;">
                </div>
                <div style="color:#444;font-size:20px;padding-top:14px;">:</div>
                <div style="display:flex;flex-direction:column;align-items:center;flex:1;">
                  <div style="font-size:10px;color:#555;margin-bottom:4px;">MM</div>
                  <input id="timer-m" type="number" min="0" max="59" value="25"
                    style="width:100%;background:#121212;border:1px solid #222;border-radius:8px;padding:8px;font-size:18px;font-weight:700;color:#e8e8f0;text-align:center;outline:none;-moz-appearance:textfield;">
                </div>
                <div style="color:#444;font-size:20px;padding-top:14px;">:</div>
                <div style="display:flex;flex-direction:column;align-items:center;flex:1;">
                  <div style="font-size:10px;color:#555;margin-bottom:4px;">SS</div>
                  <input id="timer-s" type="number" min="0" max="59" value="0"
                    style="width:100%;background:#121212;border:1px solid #222;border-radius:8px;padding:8px;font-size:18px;font-weight:700;color:#e8e8f0;text-align:center;outline:none;-moz-appearance:textfield;">
                </div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
                ${[['5m',0,5,0],['10m',0,10,0],['15m',0,15,0],['25m',0,25,0],['45m',0,45,0],['1h',1,0,0]].map(([lbl,h,m,s]) =>
                  `<button onclick="document.getElementById('timer-h').value=${h};document.getElementById('timer-m').value=${m};document.getElementById('timer-s').value=${s};document.getElementById('timer-label').value='${lbl} Focus';" style="padding:5px 10px;border-radius:20px;border:1px solid #222;background:#121212;color:#aaa;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;" onmouseenter="this.style.borderColor='#e8e8e8';this.style.color='#e8e8e8'" onmouseleave="this.style.borderColor='#222';this.style.color='#aaa'">${lbl}</button>`
                ).join('')}
              </div>
              <button onclick="LM.views.coach.startTimerFromCard()" style="width:100%;padding:10px;border-radius:10px;background:#e8e8e8;border:none;color:#000;font-weight:700;font-size:13px;letter-spacing:.06em;cursor:pointer;transition:opacity .15s;" onmouseenter="this.style.opacity='.85'" onmouseleave="this.style.opacity='1'">START TIMER</button>
            </div>
          </div>
        </div>`;
    };

    const renderFTimerSetterCard = () => {
      const avatarUrl = S.getSettings().coachAvatarUrl;
      const avatarContent = avatarUrl ? `<img src="${avatarUrl}" class="w-full h-full object-cover">` : `F`;
      return `
        <div class="flex justify-start mb-6 w-full px-4 md:px-0">
          <div class="flex items-end gap-3 w-full md:max-w-[75%]">
            <div class="w-8 h-8 rounded-full flex-shrink-0 bg-surface-container border border-surface-container-highest overflow-hidden flex items-center justify-center font-bold text-sm text-primary shadow-sm mb-1">${avatarContent}</div>
            <div style="background:#0e0e0e;border:1px solid #1a1a1a;border-radius:18px;border-bottom-left-radius:4px;padding:16px;width:100%;max-width:340px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#7a7a85;margin-bottom:12px;">⏰ SET DAILY FIXED TIMER</div>
              <div style="margin-bottom:10px;">
                <input id="ftimer-label" type="text" placeholder="Label (e.g. Bedtime, Gym)" maxlength="30"
                  style="width:100%;background:#121212;border:1px solid #222;border-radius:8px;padding:8px 12px;font-size:13px;color:#e8e8f0;outline:none;box-sizing:border-box;">
              </div>
              <div style="display:flex;gap:8px;margin-bottom:14px;align-items:center;">
                <div style="display:flex;flex-direction:column;align-items:center;flex:1;">
                  <div style="font-size:10px;color:#555;margin-bottom:4px;">TIME OF DAY</div>
                  <input id="ftimer-time" type="time"
                    style="width:100%;background:#121212;border:1px solid #222;border-radius:8px;padding:8px;font-size:18px;font-weight:700;color:#e8e8f0;text-align:center;outline:none;">
                </div>
              </div>
              <button onclick="LM.views.coach.setFixedTimerFromCard()" style="width:100%;padding:10px;border-radius:10px;background:#e8e8e8;border:none;color:#000;font-weight:700;font-size:13px;letter-spacing:.06em;cursor:pointer;transition:opacity .15s;" onmouseenter="this.style.opacity='.85'" onmouseleave="this.style.opacity='1'">SET DAILY TIMER</button>
            </div>
          </div>
        </div>`;
    };

    container.innerHTML = chat.messages.map(m => {
      if (m.sender === 'timer_setter') return renderTimerSetterCard();
      if (m.sender === 'ftimer_setter') return renderFTimerSetterCard();
      if (m.sender === 'system') {
        return `<div class="text-center font-mono text-xs text-primary/50 my-4 ${m.isLoading ? 'animate-pulse' : ''} tracking-widest">${m.text}</div>`;
      }
      
      const textFmt = m.text.replace(/\n/g, '<br>');
      
      if (m.sender === 'fletcher') {
        const avatarUrl = S.getSettings().coachAvatarUrl;
        const avatarContent = avatarUrl ? `<img src="${avatarUrl}" class="w-full h-full object-cover">` : `F`;
        return `
          <div class="flex justify-start mb-6 w-full px-4 md:px-0">
            <div class="flex items-end gap-3 max-w-[85%] md:max-w-[75%]">
              <div class="w-8 h-8 rounded-full flex-shrink-0 bg-surface-container border border-surface-container-highest overflow-hidden flex items-center justify-center font-bold text-sm text-primary shadow-sm mb-1">
                ${avatarContent}
              </div>
              <div class="bg-surface-container border border-surface-container-highest rounded-2xl rounded-bl-sm px-5 py-4 shadow-md">
                <p class="font-body-md text-on-surface tracking-wide leading-relaxed">${textFmt}</p>
                <span class="text-[10px] font-label-sm text-on-surface-variant mt-2 block opacity-60">${getTimeStr(m.timestamp)}</span>
              </div>
            </div>
          </div>`;
      }

      if (m.sender === 'fletcher_proposal') {
        const isChain = m.chainData ? true : false;
        const q = isChain ? m.chainData : m.questData;
        const msgIndex = chat.messages.indexOf(m);
        const avatarUrl = S.getSettings().coachAvatarUrl;
        const avatarContent = avatarUrl ? `<img src="${avatarUrl}" class="w-full h-full object-cover">` : `F`;
        
        const isAccepted = m.accepted;
        const buttonsHtml = isAccepted 
          ? `<div class="text-center font-bold text-xs text-primary/70 py-2 bg-surface-container border border-surface-container-highest rounded-xl">${isChain ? 'CHAIN' : 'QUEST'} ACCEPTED</div>`
          : `<div class="flex gap-2 w-full">
               <button onclick="LM.views.coach.handleProposalAction('modify', ${msgIndex})" class="flex-1 py-2 rounded-xl bg-surface border border-surface-container-highest text-on-surface-variant font-bold text-xs hover:bg-surface-container transition-colors">MODIFY</button>
               <button onclick="LM.views.coach.handleProposalAction('accept', ${msgIndex})" class="flex-1 py-2 rounded-xl bg-primary text-black font-bold text-xs hover:opacity-90 transition-opacity shadow-[0_0_10px_rgba(255,255,255,0.3)]">ACCEPT</button>
             </div>`;

        let extraHtml = '';
        if (isChain && q.steps) {
          extraHtml = `<div class="mt-3 space-y-1 mb-3">` + 
            q.steps.map((s, idx) => `<div class="text-xs text-[#a0a0a8] flex justify-between bg-[#1a1a1a] p-1.5 rounded border border-[#2a2a2a]"><span class="truncate pr-2">${idx+1}. ${s.name}</span><span class="text-primary whitespace-nowrap">+${s.xp} XP</span></div>`).join('') +
          `</div>`;
        }

        return `
          <div class="flex justify-start mb-6 w-full px-4 md:px-0">
            <div class="flex items-end gap-3 w-full md:max-w-[75%]">
              <div class="w-8 h-8 rounded-full flex-shrink-0 bg-surface-container border border-surface-container-highest overflow-hidden flex items-center justify-center font-bold text-sm text-primary shadow-sm mb-1">
                ${avatarContent}
              </div>
              <div class="bg-[#121212] border border-[#1a1a1a] rounded-2xl px-4 py-4 shadow-md w-full max-w-sm">
                <div class="font-label-sm text-[#e8e8e8] mb-2 flex items-center gap-1 tracking-widest"><span class="material-symbols-outlined text-sm">${isChain ? 'link' : 'assignment'}</span> PROPOSED ${isChain ? 'CHAIN' : 'QUEST'}</div>
                <div class="font-body-lg font-bold text-[#e8e8f0] mb-1">${q.title}</div>
                <div class="font-body-sm text-[#7a7a85] mb-3">${q.description || ''}</div>
                ${extraHtml}
                ${!isChain ? `<div class="flex items-center gap-2 mb-4"><span class="bg-[#1a1a1a] text-[#e8e8e8] px-2 py-1 rounded text-xs font-bold border border-[#2a2a2a]">+${q.xp} XP</span></div>` : ''}
                ${buttonsHtml}
                <span class="text-[10px] font-label-sm text-[#7a7a85] mt-3 block text-right">${getTimeStr(m.timestamp)}</span>
              </div>
            </div>
          </div>`;
      }
      
      // User Message - using the requested Chrome Metallic UI 
      return `
        <div class="flex justify-end mb-6 w-full px-4 md:px-0">
          <div class="max-w-[85%] md:max-w-[75%]">
            <div class="bg-primary bg-gradient-to-br from-[#d0d0d0] to-[#ffffff] text-black border border-[#ffffff] rounded-2xl rounded-br-sm px-5 py-4 shadow-[0_4px_15px_rgba(0,0,0,0.5),inset_0_-2px_0_#ffffff]">
              <p class="font-body-md font-bold tracking-wide leading-relaxed">${textFmt}</p>
              <span class="text-[10px] font-label-sm mt-2 block opacity-60 text-black/70">${getTimeStr(m.timestamp)}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    // Auto scroll to bottom of the fixed scroll area
    setTimeout(() => {
      const area = document.getElementById('coach-scroll-area');
      if (area) area.scrollTop = area.scrollHeight;
    }, 10);
  }

  function render() {
    const chats = S.getCoachChats().sort((a,b) => b.createdAt - a.createdAt);
    const hasChats = chats.length > 0;

    // Group chats by date for ChatGPT-style sidebar
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const groups = { Today: [], Yesterday: [], Older: [] };
    chats.forEach(c => {
      const d = new Date(c.createdAt).toDateString();
      if (d === today) groups.Today.push(c);
      else if (d === yesterday) groups.Yesterday.push(c);
      else groups.Older.push(c);
    });

    const renderGroup = (label, list) => {
      if (!list.length) return '';
      return `
        <div class="px-2 pt-3 pb-1">
          <span style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7a7a85;opacity:.6;">${label}</span>
        </div>
        ${list.map(c => `
          <div onclick="LM.views.coach.loadChat('${c.id}')" style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:10px;cursor:pointer;margin-bottom:2px;background:${activeChatId === c.id ? '#1a1a1a' : 'transparent'};transition:background .15s;">
            <span style="font-size:13px;font-weight:500;color:#e8e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px;">${c.title}</span>
            <button onclick="LM.views.coach.deleteChat('${c.id}', event)" style="background:none;border:none;color:#ef4444;opacity:0;padding:2px 4px;border-radius:6px;cursor:pointer;flex-shrink:0;font-size:16px;line-height:1;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0'">
              <span class="material-symbols-outlined" style="font-size:15px;">delete</span>
            </button>
          </div>
        `).join('')}
      `;
    };

    const chatListHTML = renderGroup('Today', groups.Today) + renderGroup('Yesterday', groups.Yesterday) + renderGroup('Older', groups.Older);

    const avatarUrl = S.getSettings().coachAvatarUrl;
    const headerAvatar = avatarUrl ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;">` : `F`;

    // Empty state — shown when no active chat
    const emptyStateHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:16px 16px 80px;text-align:center;">
        <div style="width:48px;height:48px;border-radius:50%;border:1px solid #1a1a1a;background:#121212;display:flex;align-items:center;justify-content:center;margin-bottom:12px;">
          <span style="font-size:20px;font-weight:700;color:#e8e8f0;">F</span>
        </div>
        <h2 style="font-size:16px;font-weight:600;color:#e8e8f0;margin:0 0 4px;">Coach Fletcher</h2>
        <p style="font-size:13px;color:#7a7a85;margin:0 0 28px;">What do you need today?</p>
        <div style="display:flex;flex-direction:column;gap:8px;width:100%;max-width:360px;">
          <button onclick="LM.views.coach.triggerAction('analyze_today')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;border:1px solid #1a1a1a;background:#121212;cursor:pointer;text-align:left;width:100%;transition:background .15s;" onmouseenter="this.style.background='#1a1a1a'" onmouseleave="this.style.background='#121212'">
            <span class="material-symbols-outlined" style="color:#e8e8e8;font-size:20px;">today</span>
            <span style="font-size:13px;font-weight:500;color:#e8e8f0;flex:1;">Analyze my logging for today</span>
            <span class="material-symbols-outlined" style="color:#7a7a85;font-size:16px;">arrow_forward_ios</span>
          </button>
          <button onclick="LM.views.coach.triggerAction('analyze_week')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;border:1px solid #1a1a1a;background:#121212;cursor:pointer;text-align:left;width:100%;transition:background .15s;" onmouseenter="this.style.background='#1a1a1a'" onmouseleave="this.style.background='#121212'">
            <span class="material-symbols-outlined" style="color:#e8e8e8;font-size:20px;">date_range</span>
            <span style="font-size:13px;font-weight:500;color:#e8e8f0;flex:1;">Review my performance this week</span>
            <span class="material-symbols-outlined" style="color:#7a7a85;font-size:16px;">arrow_forward_ios</span>
          </button>
          <button onclick="LM.views.coach.triggerAction('plan_tomorrow')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;border:1px solid #1a1a1a;background:#121212;cursor:pointer;text-align:left;width:100%;transition:background .15s;" onmouseenter="this.style.background='#1a1a1a'" onmouseleave="this.style.background='#121212'">
            <span class="material-symbols-outlined" style="color:#e8e8e8;font-size:20px;">event_upcoming</span>
            <span style="font-size:13px;font-weight:500;color:#e8e8f0;flex:1;">Help me plan tomorrow's schedule</span>
            <span class="material-symbols-outlined" style="color:#7a7a85;font-size:16px;">arrow_forward_ios</span>
          </button>
        </div>
      </div>
    `;

    const macros = S.getMacros() || [];
    const macroPopupHTML = `
      <div id="coach-macro-popup" style="display:none; position:absolute; bottom:100%; left:16px; right:16px; margin-bottom:8px; background:#121212; border:1px solid #1a1a1a; border-radius:12px; padding:8px; z-index:20; box-shadow:0 -4px 20px rgba(0,0,0,0.5); max-height:200px; overflow-y:auto;">
        ${macros.map(m => `
          <div class="cmd-item" data-name="${m.name}" onclick="LM.views.coach.insertMacro('${m.name}')" style="padding:10px 12px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:background .15s;" onmouseenter="this.style.background='#1a1a1a'" onmouseleave="this.style.background='transparent'">
            <div style="width:12px;height:12px;border-radius:50%;background:${m.accentColor};"></div>
            <div style="font-size:13px;font-weight:600;color:#fff;">@${m.name.toLowerCase()}</div>
          </div>
        `).join('')}
      </div>
    `;

    return `
      <div id="coach-shell" style="
        position: fixed;
        top: 60px;
        bottom: 96px;
        left: 0;
        right: 0;
        display: flex;
        background: #000000;
        z-index: 20;
      ">
        <!-- Sidebar: slides in from left, always fixed so it never takes layout space -->
        <aside style="
          position: fixed;
          top: 60px;
          bottom: 96px;
          left: 0;
          z-index: 50;
          width: 260px;
          background: #050505;
          border-right: 1px solid #121212;
          display: flex;
          flex-direction: column;
          transform: ${isSidebarOpen ? 'translateX(0)' : 'translateX(-260px)'};
          transition: transform .25s ease;
        ">
          <div style="padding:12px;border-bottom:1px solid #121212;">
            <button onclick="LM.views.coach.startNewChat()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;border-radius:10px;background:#e8e8e8;color:#000;font-weight:700;font-size:13px;letter-spacing:.08em;text-transform:uppercase;border:none;cursor:pointer;">
              <span class="material-symbols-outlined" style="font-size:16px;">edit_square</span> New Chat
            </button>
          </div>
          <div style="flex:1;overflow-y:auto;padding:4px 8px 12px;">
            ${hasChats ? chatListHTML : '<div style="font-size:12px;color:#7a7a85;padding:16px 8px;">No conversations yet.</div>'}
          </div>
        </aside>

        <!-- Main area -->
        <main style="flex:1; position:relative;">

          <div style="position:absolute; top:0; left:0; right:0; display:flex; flex-direction:column; background:#000000; z-index:10; border-bottom:1px solid #121212;">
            <div style="display:flex; align-items:center; gap:12px; padding:0 16px; height:54px;">
              <button onclick="LM.views.coach.toggleSidebar()" style="background:none;border:none;cursor:pointer;padding:4px;color:#e8e8f0;display:flex;align-items:center;pointer-events:auto;">
                <span class="material-symbols-outlined" style="font-size:24px;">menu</span>
              </button>
              <div style="width:30px;height:30px;border-radius:50%;background:#121212;border:1px solid #1a1a1a;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#e8e8f0;overflow:hidden;cursor:pointer;" onclick="LM.views.coach.changeAvatar()">${headerAvatar}</div>
              <span style="font-size:14px;font-weight:600;color:#e8e8f0;flex:1;">Coach Fletcher</span>
              <!-- Timer toggle button -->
              <button onclick="LM.views.coach.toggleTimerPanel()" title="Active Timers" style="position:relative;background:none;border:none;cursor:pointer;padding:4px;color:#7a7a85;display:flex;align-items:center;transition:color .15s;" onmouseenter="this.style.color='#e8e8e8'" onmouseleave="this.style.color='#7a7a85'">
                <span class="material-symbols-outlined" style="font-size:22px;">timer</span>
                <span id="coach-timer-badge" style="display:none;position:absolute;top:0;right:0;background:#e8e8e8;color:#000;border-radius:50%;width:14px;height:14px;font-size:9px;font-weight:700;align-items:center;justify-content:center;"></span>
              </button>
            </div>
            <!-- Active Timers Panel (hidden by default, toggle via timer button) -->
            <div id="coach-timer-panel" style="display:none;flex-direction:row;gap:16px;padding:10px 16px 12px;overflow-x:auto;border-top:1px solid #111;"></div>
          </div>

          <div id="coach-scroll-area" style="position:absolute; top:54px; bottom:0; left:0; right:0; overflow-y:auto; -webkit-overflow-scrolling:touch;" id="coach-scroll-area-js">
            <div style="max-width:700px;margin:0 auto;min-height:calc(100% + 1px);display:flex;flex-direction:column;">
              
              <div style="flex:1; padding:16px;">
                ${!activeChatId ? emptyStateHTML : ''}
                <div id="coach-chat-history" style="display:flex;flex-direction:column;padding-bottom:12px;${!activeChatId ? 'display:none;' : ''}"></div>
              </div>

              <!-- Sticky Input Bar -->
              <div style="position:sticky; bottom:0; padding:10px 16px 12px; background:#000000; z-index:10; border-top:1px solid #121212;">
                ${macroPopupHTML}
                <!-- Command Popup -->
                <div id="coach-command-popup" style="display:none; position:absolute; bottom:100%; left:16px; right:16px; margin-bottom:8px; background:#121212; border:1px solid #1a1a1a; border-radius:12px; padding:8px; z-index:20; box-shadow:0 -4px 20px rgba(0,0,0,0.5);">
                  <div class="cmd-item" onclick="LM.views.coach.insertCommand('/bulkquest\\n> My Quest @macro #habit $50\\n')" style="padding:10px 12px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:background .15s;" onmouseenter="this.style.background='#1a1a1a'" onmouseleave="this.style.background='transparent'">
                    <span class="material-symbols-outlined" style="color:#e8e8e8;font-size:20px;">list_alt</span>
                    <div>
                      <div style="font-size:13px;font-weight:600;color:#fff;">/bulkquest</div>
                      <div style="font-size:11px;color:#7a7a85;margin-top:2px;">Import quests via syntax (Offline)</div>
                    </div>
                  </div>
                  <div class="cmd-item" onclick="LM.views.coach.insertCommand('/quest ')" style="padding:10px 12px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:background .15s;" onmouseenter="this.style.background='#1a1a1a'" onmouseleave="this.style.background='transparent'">
                    <span class="material-symbols-outlined" style="color:#e8e8e8;font-size:20px;">flag</span>
                    <div>
                      <div style="font-size:13px;font-weight:600;color:#fff;">/quest [goal]</div>
                      <div style="font-size:11px;color:#7a7a85;margin-top:2px;">Generate a single quest</div>
                    </div>
                  </div>
                  <div class="cmd-item" onclick="LM.views.coach.insertCommand('/cquest ')" style="padding:10px 12px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:background .15s;" onmouseenter="this.style.background='#1a1a1a'" onmouseleave="this.style.background='transparent'">
                    <span class="material-symbols-outlined" style="color:#e8e8e8;font-size:20px;">link</span>
                    <div>
                      <div style="font-size:13px;font-weight:600;color:#fff;">/cquest [goal]</div>
                      <div style="font-size:11px;color:#7a7a85;margin-top:2px;">Generate a multi-step chain quest</div>
                    </div>
                  </div>
                  <div class="cmd-item" onclick="LM.views.coach.insertCommand('/timer')" style="padding:10px 12px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:background .15s;" onmouseenter="this.style.background='#1a1a1a'" onmouseleave="this.style.background='transparent'">
                    <span class="material-symbols-outlined" style="color:#e8e8e8;font-size:20px;">timer</span>
                    <div>
                      <div style="font-size:13px;font-weight:600;color:#fff;">/timer</div>
                      <div style="font-size:11px;color:#7a7a85;margin-top:2px;">Set a countdown timer (no AI call)</div>
                    </div>
                  </div>
                  <div class="cmd-item" onclick="LM.views.coach.insertCommand('/ftimer ')" style="padding:10px 12px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:background .15s;" onmouseenter="this.style.background='#1a1a1a'" onmouseleave="this.style.background='transparent'">
                    <span class="material-symbols-outlined" style="color:#e8e8e8;font-size:20px;">alarm</span>
                    <div>
                      <div style="font-size:13px;font-weight:600;color:#fff;">/ftimer [name]</div>
                      <div style="font-size:11px;color:#7a7a85;margin-top:2px;">Set a daily recurring notification</div>
                    </div>
                  </div>
                </div>

                <div style="display:flex;align-items:flex-end;gap:8px;background:#121212;border:1px solid #1a1a1a;border-radius:16px;padding:8px 8px 8px 16px;">
                  <textarea id="coach-input-text" rows="1" placeholder="Message Fletcher..." style="flex:1;background:transparent;border:none;outline:none;resize:none;font-size:14px;color:#e8e8f0;max-height:120px;line-height:1.5;padding:4px 0;font-family:inherit;"></textarea>
                  <button id="btn-coach-send" style="width:34px;height:34px;border-radius:50%;background:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s;opacity:.5;" disabled>
                    <span class="material-symbols-outlined" style="font-size:18px;color:#000;">arrow_upward</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

        </main>
      </div>
    `;
  }

  function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    // Directly manipulate DOM — no full re-render, which would reset isSidebarOpen
    const aside = document.querySelector('#coach-shell > aside');
    if (aside) {
      aside.style.transform = isSidebarOpen ? 'translateX(0)' : 'translateX(-260px)';
    }
    // Add/remove the dark overlay
    let overlay = document.getElementById('coach-sidebar-overlay');
    if (isSidebarOpen && !overlay) {
      overlay = document.createElement('div');
      overlay.id = 'coach-sidebar-overlay';
      overlay.onclick = toggleSidebar;
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:49;';
      document.getElementById('coach-shell').prepend(overlay);
    } else if (!isSidebarOpen && overlay) {
      overlay.remove();
    }
  }

  function _resetSidebar() {
    isSidebarOpen = false;
  }

  function changeAvatar() {
    const url = prompt("Enter new Coach profile picture URL:", S.getSettings().coachAvatarUrl || '');
    if (url !== null) {
      const s = S.getSettings();
      s.coachAvatarUrl = url.trim();
      S.saveSettings(s);
      window.LM.router.render();
    }
  }

  function triggerAction(type) {
    if (type === 'analyze_today') sendChatMessage("Analyze my grid for today.");
    else if (type === 'analyze_week') sendChatMessage("Analyze my weekly trend.");
    else if (type === 'plan_tomorrow') sendChatMessage("Help me plan my day for tomorrow.");
  }

  function insertCommand(cmd) {
    const input = document.getElementById('coach-input-text');
    if (input) {
      input.value = cmd;
      input.focus();
      input.dispatchEvent(new Event('input'));
    }
  }

  function insertMacro(name) {
    const input = document.getElementById('coach-input-text');
    if (!input) return;
    const val = input.value;
    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0) {
      input.value = val.substring(0, lastAt) + '@' + name.toLowerCase() + ' ';
    } else {
      input.value = val + '@' + name.toLowerCase() + ' ';
    }
    input.focus();
    input.dispatchEvent(new Event('input'));
  }

  function handleProposalAction(action, msgIndex) {
    let chat = getActiveChat();
    if (!chat || !chat.messages[msgIndex]) return;
    let msg = chat.messages[msgIndex];

    if (action === 'modify') {
      const input = document.getElementById('coach-input-text');
      if (input) {
        const title = msg.chainData ? msg.chainData.title : msg.questData.title;
        input.value = `I want to modify the "${title}" proposal. Change it so that: `;
        input.focus();
        input.dispatchEvent(new Event('input'));
      }
    } else if (action === 'accept') {
      if (msg.accepted) return;
      
      if (msg.chainData) {
        // It's a chain
        const macros = S.getMacros();
        const macroId = macros.length > 0 ? macros[0].id : 'overall';
        const newChain = {
          id: S.uid(),
          name: msg.chainData.title || "New Chain",
          description: msg.chainData.description || "",
          macroId: macroId,
          steps: (msg.chainData.steps || []).map(s => ({
            id: S.uid(),
            name: s.name || "Step",
            targetSkills: [{ macroSkillId: macroId, microSkillId: null, xpAmount: s.xp || 50 }],
            completedAt: null
          })),
          createdAt: Date.now()
        };
        S.upsertChain(newChain);
      } else {
        // Regular quest
        const newQuest = {
          id: 'quest_' + Date.now(),
          name: msg.questData.title || "New Quest",
          description: msg.questData.description || "",
          type: "daily",
          status: "active",
          xpReward: msg.questData.xp || 100,
          macroSkillId: null,
          createdAt: Date.now(),
          streak: 0,
          lastCompletedDate: null,
          lastResetDate: null,
          subTasks: null,
          timedResearch: { enabled: false },
          isNegativeOnComplete: false,
          isNegativeOnMiss: false,
          isCustom: true
        };
        S.upsertQuest(newQuest);
      }
      
      msg.accepted = true;
      S.upsertCoachChat(chat);
      renderHistory();
      
      if (window.LM.components.notifications) {
        window.LM.components.notifications.show(`Quest added to dashboard!`);
      }
    }
  }

  function init() {
    if (activeChatId) renderHistory();
    startTimerWatcher();
    renderTimerPanel();

    const input = document.getElementById('coach-input-text');
    const send = document.getElementById('btn-coach-send');

    // Auto-resize textarea and command popup
    if (input) {
      input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        const hasText = this.value.trim().length > 0;
        if (send) {
          send.disabled = !hasText;
          send.style.opacity = hasText ? '1' : '.5';
        }

        // Command Popup Logic
        const popup = document.getElementById('coach-command-popup');
        if (popup) {
          if (this.value === '/' || (this.value.startsWith('/') && !this.value.includes(' ') && !this.value.includes('\n'))) {
            popup.style.display = 'block';
          } else {
            popup.style.display = 'none';
          }
        }

        // Macro Popup Logic
        const macroPopup = document.getElementById('coach-macro-popup');
        if (macroPopup) {
          const val = this.value;
          const lastAt = val.lastIndexOf('@');
          if (lastAt >= 0 && !val.substring(lastAt).includes(' ') && !val.substring(lastAt).includes('\n')) {
            const search = val.substring(lastAt + 1).toLowerCase();
            let hasVisible = false;
            macroPopup.querySelectorAll('.cmd-item').forEach(el => {
              if (el.dataset.name.toLowerCase().includes(search)) {
                el.style.display = 'flex';
                hasVisible = true;
              } else {
                el.style.display = 'none';
              }
            });
            macroPopup.style.display = hasVisible ? 'block' : 'none';
          } else {
            macroPopup.style.display = 'none';
          }
        }
      });
      if (send) {
        send.disabled = true;
        send.style.opacity = '.5';
      }
    }

    const submitMsg = () => {
      if (!input || !input.value.trim()) return;
      const txt = input.value; 
      input.value = '';
      input.style.height = 'auto';
      send.disabled = true;
      sendChatMessage(txt);
    };

    if (send) send.addEventListener('click', submitMsg);
    if (input) input.addEventListener('keydown', e => { 
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitMsg(); 
      }
    });
  }

  // Export internal methods needed by inline HTML onclick handlers
  return { 
    render, 
    init, 
    loadChat, 
    deleteChat, 
    startNewChat, 
    toggleSidebar,
    changeAvatar,
    triggerAction: triggerAction,
    _resetSidebar,
    insertCommand: insertCommand,
    insertMacro: insertMacro,
    handleProposalAction: handleProposalAction,
    startTimerFromCard,
    setFixedTimerFromCard,
    deleteTimer,
    renderTimerPanel,
    toggleTimerPanel
  };
})();
