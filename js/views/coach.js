window.LM.views.coach = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;
  const N = window.LM.components.notifications;

  let activeChatId = null;
  let isBriefLoading = false;
  let isReviewLoading = false;
  let isSidebarOpen = false;

  const FLETCHER_SYSTEM_INSTRUCTION =
    `You are Fletcher, the brutal, demanding, uncompromising AI productivity coach inspired by the character Fletcher in Whiplash. ` +
    `You have ZERO tolerance for slacking, excuses, or mediocrity. You never validate, soothe, or pamper the user. ` +
    `You speak in a commanding, intense tone, treating the user like a recruit who needs to be broken down and rebuilt into an elite operator. ` +
    `You use sharp, direct critiques, high-intensity demands, and occasional dark humor. ` +
    `Keep your answers concise, impactful, and action-oriented. Never break character.`;

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

  async function generateMorningBrief() {
    if (isBriefLoading) return;
    isBriefLoading = true;
    
    const macros = S.getMacros();
    if (!macros.length) {
      pushMessage('fletcher', "You have no skill modules configured. Set up your profile first.");
      isBriefLoading = false; return;
    }
    
    const skillsListStr = macros.map(m => `ID: ${m.id}, Name: ${m.name}`).join(', ');
    const prompt =
      `Generate today's morning briefing and 2 to 3 recommended quests. ` +
      `Here is the list of available skills:\n${skillsListStr}\n\n` +
      `You MUST respond in JSON format matching this schema EXACTLY:\n` +
      `{"fletcher_message":"A harsh verbal lashing","quests":[{"name":"Short Quest Title","description":"Actionable instructions","type":"habit","targetSkills":[{"macroSkillId":"MATCHING_MACRO_ID","microSkillId":null,"xpAmount":50}],"status":"active"}]}\n\n` +
      `Pick VALID IDs from the skill list. xpAmount should be 20-150.`;

    // Ensure we have a chat context
    if (!activeChatId) {
      const chat = { id: S.uid(), title: "Morning Briefing", createdAt: Date.now(), messages: [] };
      activeChatId = chat.id;
      S.upsertCoachChat(chat);
      window.LM.router.render(); // force render to show history container
    }

    pushMessage('system', "Fletcher is drafting your orders...", true);

    const response = await window.LM.aiEngine.generateContent(prompt, FLETCHER_SYSTEM_INSTRUCTION);
    removeLoadingMessage();

    if (response.error) {
      pushMessage('fletcher', `SYSTEM ERROR: ${response.error}`);
    } else {
      try {
        const text = response.data.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(cleanJSONString(text));
        pushMessage('fletcher', parsed.fletcher_message || "Here are your orders. Don't waste my time.");
        
        if (Array.isArray(parsed.quests)) {
          parsed.quests.forEach(q => {
            S.upsertQuest({
              id: S.uid(), name: q.name, description: q.description || '',
              type: q.type || 'project', status: 'active',
              isNegativeOnMiss: q.type === 'habit', isNegativeOnComplete: false,
              targetSkills: q.targetSkills || [], isCustom: true,
              createdAt: Date.now(), completedAt: null,
              streak: q.type === 'habit' ? 0 : null,
              lastCompletedDate: null, lastResetDate: null, subTasks: null,
              timedResearch: { enabled: false }
            });
          });
          N.show(`Fletcher spawned ${parsed.quests.length} quests!`, 'xp');
        }
      } catch (e) {
        pushMessage('fletcher', "Data corrupted. Configure your profile and try again.");
      }
    }
    isBriefLoading = false;
    
    // Auto title if this was the first action
    let chat = getActiveChat();
    if (chat && chat.title === "New Conversation") {
      chat.title = "Morning Briefing";
      S.upsertCoachChat(chat);
    }
    window.LM.router.render();
  }

  async function generatePerformanceReview() {
    if (isReviewLoading) return;
    isReviewLoading = true;
    
    const quests = S.getQuests();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const completedSummary = quests.filter(q => q.status === 'completed' && q.completedAt >= sevenDaysAgo).map(q => q.name).join(', ') || 'None';
    const missedSummary = quests.filter(q => q.status === 'missed' && q.updatedAt >= sevenDaysAgo).map(q => q.name).join(', ') || 'None';

    const prompt =
      `Analyze the user's progress log for the past 7 days.\n` +
      `Completed quests: ${completedSummary}\nMissed/Failed quests: ${missedSummary}\n\n` +
      `Provide a brutal, harsh critique of their performance. Address them as a recruit. ` +
      `Highlight any slacking. Then, give exactly 3 concrete, high-intensity recommendations they must implement starting immediately.`;

    if (!activeChatId) {
      const chat = { id: S.uid(), title: "Performance Review", createdAt: Date.now(), messages: [] };
      activeChatId = chat.id;
      S.upsertCoachChat(chat);
      window.LM.router.render();
    }

    pushMessage('system', "Fletcher is examining your log file...", true);

    const response = await window.LM.aiEngine.generateContent(prompt, FLETCHER_SYSTEM_INSTRUCTION);
    removeLoadingMessage();

    if (response.error) {
      pushMessage('fletcher', `SYSTEM ERROR: ${response.error}`);
    } else {
      try {
        pushMessage('fletcher', response.data.candidates[0].content.parts[0].text);
      } catch (e) {
        pushMessage('fletcher', "I couldn't process your stats. Get back to work.");
      }
    }
    isReviewLoading = false;
    
    let chat = getActiveChat();
    if (chat && chat.title === "New Conversation") {
      chat.title = "Performance Review";
      S.upsertCoachChat(chat);
    }
    window.LM.router.render();
  }

  async function sendChatMessage(userText) {
    if (!userText.trim()) return;
    pushMessage('user', userText);
    
    // Auto render to show message immediately before API call
    window.LM.router.render();
    
    pushMessage('system', "Fletcher is typing...", true);

    const macros = S.getMacros();
    const skillsListStr = macros.map(m => `ID: ${m.id}, Name: ${m.name}`).join(' | ');
    
    const chat = getActiveChat();
    const contextMessages = chat.messages.slice(-8).filter(m => m.sender !== 'system');
    const conversationContext = contextMessages.map(m => `${m.sender === 'user' ? 'User' : 'Fletcher'}: ${m.text}`).join('\n');

    const prompt =
      `You are Fletcher. The user has these skill modules available: [${skillsListStr}].\n\n` +
      `Conversation so far:\n${conversationContext}\n\n` +
      `Respond to the user's latest message in character — brutal, concise, no more than 4 sentences.\n\n` +
      `If the user is asking you to CREATE a quest, objective, task, or challenge for them (explicitly or implicitly), ` +
      `you MUST also include a "quests" array in your response. Otherwise omit it.\n\n` +
      `You MUST respond ONLY with valid JSON in this exact format:\n` +
      `{"message":"Your brutal Fletcher reply here","quests":[{"name":"Quest Title","description":"Actionable steps","type":"project","targetSkills":[{"macroSkillId":"VALID_ID_FROM_LIST","microSkillId":null,"xpAmount":50}],"status":"active"}]}\n\n` +
      `If no quests are needed, respond: {"message":"Your reply here"}\n` +
      `Use ONLY valid macroSkillIds from the provided list. xpAmount between 20 and 200.`;

    const response = await window.LM.aiEngine.generateContent(prompt, FLETCHER_SYSTEM_INSTRUCTION);
    removeLoadingMessage();

    if (response.error) {
      pushMessage('fletcher', `SYSTEM ERROR: ${response.error}`);
    } else {
      try {
        const raw = response.data.candidates[0].content.parts[0].text;
        let parsed;
        try {
          parsed = JSON.parse(cleanJSONString(raw));
        } catch (_) {
          parsed = { message: raw };
        }

        pushMessage('fletcher', parsed.message || raw);

        if (Array.isArray(parsed.quests) && parsed.quests.length > 0) {
          parsed.quests.forEach(q => {
            S.upsertQuest({
              id: S.uid(), name: q.name, description: q.description || '',
              type: q.type || 'project', status: 'active',
              isNegativeOnMiss: q.type === 'habit', isNegativeOnComplete: false,
              targetSkills: q.targetSkills || [], isCustom: true,
              createdAt: Date.now(), completedAt: null,
              streak: q.type === 'habit' ? 0 : null,
              lastCompletedDate: null, lastResetDate: null,
              subTasks: null, timedResearch: { enabled: false }
            });
          });
          N.show(`Fletcher created ${parsed.quests.length} quest${parsed.quests.length > 1 ? 's' : ''}!`, 'xp');
          pushMessage('system', `⚡ Quest${parsed.quests.length > 1 ? 's' : ''} spawned: ${parsed.quests.map(q=>q.name).join(', ')}`);
        }
      } catch (e) {
        pushMessage('fletcher', "Stop muttering. Speak clearly.");
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
      container.scrollTop = container.scrollHeight;
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
      <div class="flex flex-col items-center justify-center h-full text-center px-4 max-w-lg mx-auto pb-32 pt-20">
        <div class="w-24 h-24 rounded-full border border-primary mb-6 flex items-center justify-center bg-surface-container shadow-[0_0_30px_rgba(255,255,255,0.05)]">
           <span class="material-symbols-outlined text-4xl text-primary">local_fire_department</span>
        </div>
        <h2 class="font-headline-md text-on-surface mb-2 tracking-tight">How can I push you today?</h2>
        <p class="text-on-surface-variant text-sm mb-10">Start a new conversation or select a quick action below.</p>
        
        <div class="flex gap-4 flex-wrap justify-center w-full">
          <button id="btn-morning-brief" class="flex-1 min-w-[140px] flex flex-col items-center gap-3 p-5 rounded-2xl bg-surface-container border border-surface-container-highest hover:border-primary transition-colors group">
            <span class="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform">wb_sunny</span>
            <span class="font-label-md text-on-surface">Morning Brief</span>
          </button>
          <button id="btn-perf-review" class="flex-1 min-w-[140px] flex flex-col items-center gap-3 p-5 rounded-2xl bg-surface-container border border-surface-container-highest hover:border-primary transition-colors group">
            <span class="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform">analytics</span>
            <span class="font-label-md text-on-surface">Performance Review</span>
          </button>
        </div>
      </div>
    ` : '';

    const avatarUrl = S.getSettings().coachAvatarUrl;
    const headerAvatar = avatarUrl ? `<img src="${avatarUrl}" class="w-full h-full object-cover">` : `F`;

    return `
      <div class="flex h-screen bg-background overflow-hidden relative">
        
        <!-- Sidebar Toggle Overlay (Mobile) -->
        ${isSidebarOpen ? `<div class="fixed inset-0 bg-black/60 z-40 md:hidden" onclick="LM.views.coach.toggleSidebar()"></div>` : ''}

        <!-- Sidebar (Chat History) -->
        <aside class="${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transform transition-transform duration-300 fixed md:relative z-50 w-72 h-full bg-surface-container-lowest border-r border-surface-container flex flex-col">
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
        <main class="flex-1 flex flex-col relative h-full max-w-full">
          
          <!-- Sleek Fixed Header -->
          <header class="flex-shrink-0 h-16 border-b border-surface-container bg-surface-container-lowest/80 backdrop-blur-md flex items-center px-4 justify-between z-30">
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
            ${activeChatId ? `
              <div class="flex gap-2 hidden sm:flex">
                <button id="btn-quick-brief" class="px-3 py-1.5 rounded-lg border border-surface-container hover:bg-surface-container text-xs text-on-surface-variant transition-colors" onclick="LM.views.coach.triggerAction('brief')">Brief</button>
                <button id="btn-quick-review" class="px-3 py-1.5 rounded-lg border border-surface-container hover:bg-surface-container text-xs text-on-surface-variant transition-colors" onclick="LM.views.coach.triggerAction('review')">Review</button>
              </div>
            ` : ''}
          </header>

          <!-- Chat Content Scroll Area -->
          <section class="flex-1 overflow-y-auto w-full pt-6 pb-40" id="coach-scroll-area">
            <div class="max-w-3xl mx-auto w-full h-full relative">
              ${emptyStateHTML}
              <div id="coach-chat-history" class="w-full flex flex-col pb-10 ${!activeChatId ? 'hidden' : ''}"></div>
            </div>
          </section>

          <!-- Floating Input Pill -->
          <div class="absolute bottom-6 left-0 w-full px-4 md:px-8 flex justify-center pointer-events-none z-30">
            <div class="w-full max-w-3xl pointer-events-auto">
              <div class="bg-surface-container border border-surface-container-highest rounded-[2rem] p-1.5 flex items-end shadow-2xl backdrop-blur-xl">
                <textarea id="coach-input-text" rows="1"
                  class="bg-transparent border-none outline-none focus:ring-0 flex-grow font-body-md text-on-surface placeholder:text-on-surface-variant/50 py-3 px-5 resize-none max-h-32"
                  placeholder="Message Fletcher..."></textarea>
                <button id="btn-coach-send" class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-primary text-black hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 mb-1 mr-1">
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
    if (type === 'brief') generateMorningBrief();
    else if (type === 'review') generatePerformanceReview();
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

    document.getElementById('btn-morning-brief')?.addEventListener('click', generateMorningBrief);
    document.getElementById('btn-perf-review')?.addEventListener('click', generatePerformanceReview);
    document.getElementById('btn-quick-brief')?.addEventListener('click', () => triggerAction('brief'));
    document.getElementById('btn-quick-review')?.addEventListener('click', () => triggerAction('review'));
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
