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

    // Auto scroll to bottom
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    }, 10);
  }

  function render() {
    const chats = S.getCoachChats().sort((a,b) => b.createdAt - a.createdAt);
    const hasChats = chats.length > 0;
    
    // Sidebar Chat List
    const chatListHTML = chats.map(c => `
      <div class="group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors mb-1 ${activeChatId === c.id ? 'bg-surface-container-highest' : 'hover:bg-surface-container'}" onclick="LM.views.coach.loadChat('${c.id}')">
        <div class="flex flex-col truncate pr-2">
          <span class="font-label-md text-on-surface truncate">${c.title}</span>
          <span class="text-xs text-on-surface-variant">${new Date(c.createdAt).toLocaleDateString()}</span>
        </div>
        <button class="text-error opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 p-1" onclick="LM.views.coach.deleteChat('${c.id}', event)">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>
    `).join('');

    // Empty State (New Chat)
    const emptyStateHTML = !activeChatId ? `
      <div class="flex flex-col items-center justify-center h-full text-center px-4 max-w-lg mx-auto pb-32 pt-10">
        <div class="w-24 h-24 rounded-full border border-primary mb-6 flex items-center justify-center bg-surface-container shadow-[0_0_30px_rgba(255,255,255,0.05)]">
           <span class="material-symbols-outlined text-4xl text-primary">local_fire_department</span>
        </div>
        <h2 class="font-headline-md text-on-surface mb-2 tracking-tight">How can I push you today?</h2>
        <p class="text-on-surface-variant text-sm mb-10">Start a new conversation or select a quick action below.</p>
        
        <div class="flex gap-4 flex-wrap justify-center w-full">
          <button class="bg-surface-container hover:bg-surface-container-highest transition-colors rounded-xl px-5 py-4 flex flex-col items-center gap-2 border border-surface-container-highest shadow-sm min-w-[120px]" onclick="LM.views.coach.triggerAction('analyze_today')">
            <span class="material-symbols-outlined text-primary text-2xl">today</span>
            <span class="font-bold text-sm text-on-surface">Analyze Today</span>
          </button>
          <button class="bg-surface-container hover:bg-surface-container-highest transition-colors rounded-xl px-5 py-4 flex flex-col items-center gap-2 border border-surface-container-highest shadow-sm min-w-[120px]" onclick="LM.views.coach.triggerAction('analyze_week')">
            <span class="material-symbols-outlined text-primary text-2xl">date_range</span>
            <span class="font-bold text-sm text-on-surface">Analyze Week</span>
          </button>
          <button class="bg-surface-container hover:bg-surface-container-highest transition-colors rounded-xl px-5 py-4 flex flex-col items-center gap-2 border border-surface-container-highest shadow-sm min-w-[120px]" onclick="LM.views.coach.triggerAction('plan_tomorrow')">
            <span class="material-symbols-outlined text-primary text-2xl">event_upcoming</span>
            <span class="font-bold text-sm text-on-surface">Plan Tomorrow</span>
          </button>
        </div>
      </div>
    ` : '';

    const avatarUrl = S.getSettings().coachAvatarUrl;
    const headerAvatar = avatarUrl ? `<img src="${avatarUrl}" class="w-full h-full object-cover">` : `F`;

    return `
      <div class="w-full relative pb-40 pt-4">
        
        <!-- Sidebar Toggle Overlay (Mobile) -->
        ${isSidebarOpen ? `<div class="fixed inset-0 bg-black/60 z-40 md:hidden" onclick="LM.views.coach.toggleSidebar()"></div>` : ''}

        <!-- Sidebar (Chat History) -->
        <aside class="${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transform transition-transform duration-300 fixed top-[70px] left-0 bottom-[80px] z-50 w-72 bg-surface-container-lowest border-r border-surface-container flex flex-col">
          <div class="p-4 border-b border-surface-container">
            <button onclick="LM.views.coach.startNewChat()" class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-black font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
              <span class="material-symbols-outlined text-sm">add</span> New Chat
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-3 scroll-smooth">
            ${hasChats ? chatListHTML : '<div class="text-center text-on-surface-variant text-sm mt-10">No past conversations.</div>'}
          </div>
        </aside>

        <!-- Main Chat Area -->
        <main class="w-full md:pl-72 flex flex-col relative min-h-full">
          
          <!-- Sleek Header (Normal flow, scrolls up) -->
          <header class="h-16 flex items-center px-4 md:px-8 justify-between z-30 mb-4">
            <div class="flex items-center gap-3">
              <button class="md:hidden p-2 text-on-surface-variant hover:text-on-surface" onclick="LM.views.coach.toggleSidebar()">
                <span class="material-symbols-outlined">menu</span>
              </button>
              <div class="w-8 h-8 rounded-full bg-surface-container border border-primary flex items-center justify-center text-primary font-bold overflow-hidden cursor-pointer" onclick="LM.views.coach.changeAvatar()" title="Change Avatar">
                ${headerAvatar}
              </div>
              <div class="flex flex-col">
                <h2 class="font-label-lg text-on-surface leading-tight">Coach Fletcher</h2>
                <span class="text-[10px] text-primary tracking-widest uppercase font-bold">Active</span>
              </div>
            </div>
          </header>

          <!-- Chat Content -->
          <section class="w-full" id="coach-scroll-area">
            <div class="max-w-3xl mx-auto w-full relative px-4 md:px-8">
              ${emptyStateHTML}
              <div id="coach-chat-history" class="w-full flex flex-col pb-10 ${!activeChatId ? 'hidden' : ''}"></div>
            </div>
          </section>

          <!-- Floating Input Pill (Fixed to screen bottom) -->
          <div class="fixed bottom-[90px] left-0 w-full px-4 md:pl-[19rem] md:pr-8 flex justify-center pointer-events-none z-30">
            <div class="w-full max-w-3xl pointer-events-auto">
              <div class="bg-surface-container border border-surface-container-highest rounded-[2rem] p-1.5 flex items-end shadow-2xl backdrop-blur-xl">
                <textarea id="coach-input-text" rows="1"
                  class="bg-transparent border-none outline-none focus:ring-0 flex-grow font-body-md text-on-surface placeholder:text-on-surface-variant/50 py-3 px-5 resize-none max-h-32"
                  placeholder="Message Fletcher..."></textarea>
                <button id="btn-coach-send" class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-[#d0d0d0] to-[#ffffff] border border-[#ffffff] shadow-[0_2px_10px_rgba(0,0,0,0.5),inset_0_-2px_0_#ffffff] text-black hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 mb-1 mr-1">
                  <span class="material-symbols-outlined text-lg">arrow_upward</span>
                </button>
              </div>
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
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim()) {
          send.disabled = false;
        } else {
          send.disabled = true;
        }
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
