window.LM.views.coach = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;
  const N = window.LM.components.notifications;

  let activeChatId = null;
  let isBriefLoading = false;
  let isReviewLoading = false;
  let isSidebarOpen = false;

  const FLETCHER_SYSTEM_INSTRUCTION = 
    `You are Fletcher, an elite, data-obsessed productivity analyst and harsh coach. ` +
    `You have ZERO tolerance for wasted hours or generic motivational speeches. ` +
    `You have full access to the user's past 7 days of log grid data and stats. ` +
    `If the user asks you to analyze a day, a specific cell, or a weekly trend, YOU MUST provide a highly detailed, analytical breakdown of that data. Point out exact hours they slacked off, summarize their logged hours, and demand efficiency. ` +
    `You keep your answers highly analytical, concise (4 sentences max). Never break character.\n` +
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
        
        if (parsed.action === 'create_quest' && parsed.questData) {
          const newQuest = {
            id: 'quest_' + Date.now(),
            name: parsed.questData.title || "New Quest",
            description: parsed.questData.description || "",
            type: "daily",
            status: "active",
            xpReward: parsed.questData.xp || 100,
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
          window.LM.store.upsertQuest(newQuest);
          pushMessage('system', `SYSTEM: Quest '${newQuest.name}' has been added to your Dashboard.`);
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

    container.innerHTML = chat.messages.map(m => {
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
          <span style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--color-on-surface-variant);opacity:.6;">${label}</span>
        </div>
        ${list.map(c => `
          <div onclick="LM.views.coach.loadChat('${c.id}')" style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:10px;cursor:pointer;margin-bottom:2px;background:${activeChatId === c.id ? 'var(--color-surface-container-highest)' : 'transparent'};transition:background .15s;">
            <span style="font-size:13px;font-weight:500;color:var(--color-on-surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px;">${c.title}</span>
            <button onclick="LM.views.coach.deleteChat('${c.id}', event)" style="background:none;border:none;color:var(--color-error);opacity:0;padding:2px 4px;border-radius:6px;cursor:pointer;flex-shrink:0;font-size:16px;line-height:1;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0'">
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
        <div style="width:48px;height:48px;border-radius:50%;border:1px solid var(--color-surface-container-highest);background:var(--color-surface-container);display:flex;align-items:center;justify-content:center;margin-bottom:12px;">
          <span style="font-size:20px;font-weight:700;color:var(--color-on-surface);">F</span>
        </div>
        <h2 style="font-size:16px;font-weight:600;color:var(--color-on-surface);margin:0 0 4px;">Coach Fletcher</h2>
        <p style="font-size:13px;color:var(--color-on-surface-variant);margin:0 0 28px;">What do you need today?</p>
        <div style="display:flex;flex-direction:column;gap:8px;width:100%;max-width:360px;">
          <button onclick="LM.views.coach.triggerAction('analyze_today')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;border:1px solid var(--color-surface-container-highest);background:var(--color-surface-container);cursor:pointer;text-align:left;width:100%;transition:background .15s;" onmouseenter="this.style.background='var(--color-surface-container-highest)'" onmouseleave="this.style.background='var(--color-surface-container)'">
            <span class="material-symbols-outlined" style="color:var(--color-primary);font-size:20px;">today</span>
            <span style="font-size:13px;font-weight:500;color:var(--color-on-surface);flex:1;">Analyze my logging for today</span>
            <span class="material-symbols-outlined" style="color:var(--color-on-surface-variant);font-size:16px;">arrow_forward_ios</span>
          </button>
          <button onclick="LM.views.coach.triggerAction('analyze_week')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;border:1px solid var(--color-surface-container-highest);background:var(--color-surface-container);cursor:pointer;text-align:left;width:100%;transition:background .15s;" onmouseenter="this.style.background='var(--color-surface-container-highest)'" onmouseleave="this.style.background='var(--color-surface-container)'">
            <span class="material-symbols-outlined" style="color:var(--color-primary);font-size:20px;">date_range</span>
            <span style="font-size:13px;font-weight:500;color:var(--color-on-surface);flex:1;">Review my performance this week</span>
            <span class="material-symbols-outlined" style="color:var(--color-on-surface-variant);font-size:16px;">arrow_forward_ios</span>
          </button>
          <button onclick="LM.views.coach.triggerAction('plan_tomorrow')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;border:1px solid var(--color-surface-container-highest);background:var(--color-surface-container);cursor:pointer;text-align:left;width:100%;transition:background .15s;" onmouseenter="this.style.background='var(--color-surface-container-highest)'" onmouseleave="this.style.background='var(--color-surface-container)'">
            <span class="material-symbols-outlined" style="color:var(--color-primary);font-size:20px;">event_upcoming</span>
            <span style="font-size:13px;font-weight:500;color:var(--color-on-surface);flex:1;">Help me plan tomorrow's schedule</span>
            <span class="material-symbols-outlined" style="color:var(--color-on-surface-variant);font-size:16px;">arrow_forward_ios</span>
          </button>
        </div>
      </div>
    `;

    // The entire coach UI lives in a fixed overlay between the two navbars.
    // This prevents it from being part of the page scroll — exactly like ChatGPT.
    return `
      <div id="coach-shell" style="
        position: fixed;
        top: 60px;
        bottom: 80px;
        left: 0;
        right: 0;
        display: flex;
        background: var(--color-background);
        z-index: 20;
        overflow: hidden;
      ">
        <!-- Overlay for mobile sidebar -->
        ${isSidebarOpen ? `<div onclick="LM.views.coach.toggleSidebar()" style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:40;"></div>` : ''}

        <!-- Sidebar -->
        <aside style="
          position: ${isSidebarOpen ? 'fixed' : 'relative'};
          ${isSidebarOpen ? 'top:60px;bottom:80px;left:0;z-index:50;' : ''}
          width: 260px;
          flex-shrink: 0;
          background: var(--color-surface-container-lowest);
          border-right: 1px solid var(--color-surface-container);
          display: flex;
          flex-direction: column;
          transform: ${isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)'};
          transition: transform .25s ease;
        " class="coach-sidebar">
          <div style="padding:12px;border-bottom:1px solid var(--color-surface-container);">
            <button onclick="LM.views.coach.startNewChat()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;border-radius:10px;background:var(--color-primary);color:#000;font-weight:700;font-size:13px;letter-spacing:.08em;text-transform:uppercase;border:none;cursor:pointer;">
              <span class="material-symbols-outlined" style="font-size:16px;">edit_square</span> New Chat
            </button>
          </div>
          <div style="flex:1;overflow-y:auto;padding:4px 8px 12px;">
            ${hasChats ? chatListHTML : '<div style="font-size:12px;color:var(--color-on-surface-variant);padding:16px 8px;">No conversations yet.</div>'}
          </div>
        </aside>

        <!-- Main area -->
        <main style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;">

          <!-- Coach top bar -->
          <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--color-surface-container);flex-shrink:0;">
            <button onclick="LM.views.coach.toggleSidebar()" style="background:none;border:none;cursor:pointer;padding:4px;color:var(--color-on-surface);display:flex;align-items:center;">
              <span class="material-symbols-outlined" style="font-size:24px;">menu</span>
            </button>
            <div style="width:30px;height:30px;border-radius:50%;background:var(--color-surface-container);border:1px solid var(--color-surface-container-highest);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--color-on-surface);overflow:hidden;cursor:pointer;" onclick="LM.views.coach.changeAvatar()">${headerAvatar}</div>
            <span style="font-size:14px;font-weight:600;color:var(--color-on-surface);">Coach Fletcher</span>
          </div>

          <!-- Messages scroll area -->
          <div id="coach-scroll-area" style="flex:1;overflow-y:auto;padding:16px;">
            <div style="max-width:700px;margin:0 auto;height:100%;">
              ${!activeChatId ? emptyStateHTML : ''}
              <div id="coach-chat-history" style="display:flex;flex-direction:column;padding-bottom:12px;${!activeChatId ? 'display:none;' : ''}"></div>
            </div>
          </div>

          <!-- Input bar -->
          <div style="padding:10px 16px 12px;border-top:1px solid var(--color-surface-container);flex-shrink:0;">
            <div style="max-width:700px;margin:0 auto;display:flex;align-items:flex-end;gap:8px;background:var(--color-surface-container);border:1px solid var(--color-surface-container-highest);border-radius:16px;padding:8px 8px 8px 16px;">
              <textarea id="coach-input-text" rows="1" placeholder="Message Fletcher..." style="flex:1;background:transparent;border:none;outline:none;resize:none;font-size:14px;color:var(--color-on-surface);max-height:120px;line-height:1.5;padding:4px 0;font-family:inherit;"></textarea>
              <button id="btn-coach-send" style="width:34px;height:34px;border-radius:50%;background:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s;opacity:.5;" disabled>
                <span class="material-symbols-outlined" style="font-size:18px;color:#000;">arrow_upward</span>
              </button>
            </div>
          </div>

        </main>
      </div>
    `;
  }

  function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    window.LM.router.render();
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

  function init() {
    if (activeChatId) renderHistory();

    const input = document.getElementById('coach-input-text');
    const send = document.getElementById('btn-coach-send');

    // Auto-resize textarea
    if (input) {
      input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        const hasText = this.value.trim().length > 0;
        if (send) {
          send.disabled = !hasText;
          send.style.opacity = hasText ? '1' : '.5';
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
    triggerAction
  };
})();
