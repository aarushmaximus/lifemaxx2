window.LM.views.coach = (function () {
  // Chat-first coach. Morning Brief & Performance Review are quick-action chips.
  const S = window.LM.store;
  const F = window.LM.formulas;
  const N = window.LM.components.notifications;

  let chatHistory = [
    { sender: 'fletcher', text: "RECRUIT. You're here. That means you haven't given up yet — or you're just looking for someone to pat you on the back. I don't pat backs. I build champions. What are we doing today?" }
  ];
  let isBriefLoading = false;
  let isReviewLoading = false;

  const FLETCHER_SYSTEM_INSTRUCTION =
    `You are Fletcher, the brutal, demanding, uncompromising AI productivity coach inspired by the character Fletcher in Whiplash. ` +
    `You have ZERO tolerance for slacking, excuses, or mediocrity. You never validate, soothe, or pamper the user. ` +
    `You speak in a commanding, intense tone, treating the user like a recruit who needs to be broken down and rebuilt into an elite operator. ` +
    `You use sharp, direct critiques, high-intensity demands, and occasional dark humor. ` +
    `Keep your answers concise, impactful, and action-oriented. Never break character.`;

  // ── Morning Brief action chip ──
  async function generateMorningBrief() {
    if (isBriefLoading) return;
    isBriefLoading = true;
    const macros = S.getMacros();
    if (!macros.length) {
      chatHistory.push({ sender: 'fletcher', text: "You have no skill modules configured. Set up your profile first." });
      renderHistory(); isBriefLoading = false; return;
    }
    const skillsListStr = macros.map(m => {
      const micros = (m.microSkills || []).map(ms => `(ID: ${ms.id}, Name: ${ms.name})`).join(', ');
      return `Macro Skill ID: ${m.id}, Name: ${m.name}. Micro skills: [${micros}]`;
    }).join('\n');

    const prompt =
      `Generate today's morning briefing and 2 to 3 recommended quests. ` +
      `Here is the list of available skills:\n${skillsListStr}\n\n` +
      `Here is the list of available skills:\n${skillsListStr}\n\n` +
      `You MUST respond in JSON format matching this schema EXACTLY:\n` +
      `{"fletcher_message":"A harsh verbal lashing (Fletcher voice)","quests":[{"name":"Short Quest Title","description":"Actionable instructions","type":"habit","targetSkills":[{"macroSkillId":"MATCHING_MACRO_ID","microSkillId":null,"xpAmount":50}],"status":"active"}]}\n\n` +
      `Pick VALID IDs from the skill list. xpAmount should be 20-150.`;

    addSystemMessage("Fletcher is drafting your orders...", true);
    renderHistory();

    const response = await window.LM.aiEngine.generateContent(prompt, FLETCHER_SYSTEM_INSTRUCTION);
    removeLoadingMessage();

    if (response.error) {
      chatHistory.push({ sender: 'fletcher', text: `SYSTEM ERROR: ${response.error}` });
    } else {
      try {
        const text = response.data.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(cleanJSONString(text));
        chatHistory.push({ sender: 'fletcher', text: parsed.fletcher_message || "Here are your orders. Don't waste my time." });
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
        chatHistory.push({ sender: 'fletcher', text: "Data corrupted. Configure your profile and try again." });
      }
    }
    isBriefLoading = false;
    renderHistory();
  }

  // ── Performance Review action chip ──
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

    addSystemMessage("Fletcher is examining your log file...", true);
    renderHistory();

    const response = await window.LM.aiEngine.generateContent(prompt, FLETCHER_SYSTEM_INSTRUCTION);
    removeLoadingMessage();

    if (response.error) {
      chatHistory.push({ sender: 'fletcher', text: `SYSTEM ERROR: ${response.error}` });
    } else {
      try {
        chatHistory.push({ sender: 'fletcher', text: response.data.candidates[0].content.parts[0].text });
      } catch (e) {
        chatHistory.push({ sender: 'fletcher', text: "I couldn't process your stats. Get back to work." });
      }
    }
    isReviewLoading = false;
    renderHistory();
  }

  // ── Open chat message — Fletcher can spawn quests mid-convo ──
  async function sendChatMessage(userText) {
    if (!userText.trim()) return;
    chatHistory.push({ sender: 'user', text: userText });
    addSystemMessage("Fletcher is typing...", true);
    renderHistory();

    const macros = S.getMacros();
    const skillsListStr = macros.map(m => `ID: ${m.id}, Name: ${m.name}`).join(' | ');
    const contextMessages = chatHistory.slice(-8).filter(m => m.sender !== 'system');
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
      chatHistory.push({ sender: 'fletcher', text: `SYSTEM ERROR: ${response.error}` });
    } else {
      try {
        const raw = response.data.candidates[0].content.parts[0].text;
        let parsed;
        try {
          parsed = JSON.parse(cleanJSONString(raw));
        } catch (_) {
          // If JSON parse fails, treat the whole response as plain text
          parsed = { message: raw };
        }

        // Show Fletcher's message
        chatHistory.push({ sender: 'fletcher', text: parsed.message || raw });

        // Spawn quests if Fletcher included them
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
          // Show a system message so the user knows quests were spawned
          const questNames = parsed.quests.map(q => q.name).join(', ');
          addSystemMessage(`⚡ Quest${parsed.quests.length > 1 ? 's' : ''} spawned: ${questNames}`);
        }
      } catch (e) {
        chatHistory.push({ sender: 'fletcher', text: "Stop muttering. Speak clearly." });
      }
    }
    renderHistory();
  }


  function cleanJSONString(str) {
    let s = str.trim();
    if (s.startsWith("```json")) s = s.slice(7);
    else if (s.startsWith("```")) s = s.slice(3);
    if (s.endsWith("```")) s = s.slice(0, -3);
    return s.trim();
  }

  function addSystemMessage(text, isLoading = false) {
    chatHistory.push({ sender: 'system', text, isLoading });
  }

  function removeLoadingMessage() {
    chatHistory = chatHistory.filter(m => !m.isLoading);
  }

  function renderHistory() {
    const container = document.getElementById('coach-chat-history');
    if (!container) return;
    const getTimeStr = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    container.innerHTML = chatHistory.map(m => {
      if (m.sender === 'system') {
        return `<div class="text-center font-mono text-xs text-primary/50 my-4 animate-pulse tracking-widest">${m.text}</div>`;
      }
      if (m.sender === 'fletcher') {
        return `
          <div class="flex justify-start mb-6">
            <div class="border-l-4 border-primary bg-surface-container/70 backdrop-blur-xl px-6 py-5 max-w-[88%] shadow-sm">
              <p class="font-body-md text-primary/90 tracking-wide leading-relaxed">${m.text.replace(/\n/g, '<br>')}</p>
              <span class="text-[10px] font-label-sm text-primary/30 mt-2 block">${getTimeStr()}</span>
            </div>
          </div>`;
      }
      return `
        <div class="flex justify-end mb-6">
          <div class="border-r-4 border-surface-container-highest bg-surface-container/70 backdrop-blur-xl px-6 py-5 max-w-[88%] text-right shadow-sm">
            <p class="font-body-md text-on-surface-variant tracking-wide leading-relaxed">"${m.text.replace(/\n/g, '<br>')}"</p>
            <span class="text-[10px] font-label-sm text-on-surface-variant/50 mt-2 block">${getTimeStr()}</span>
          </div>
        </div>`;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  function render() {
    return `
      <!-- Global overlays reused from main css -->
      <main class="relative z-20 flex flex-col pb-40 px-4 md:px-8 max-w-3xl mx-auto pt-24 min-h-screen">

        <!-- Coach Header -->
        <div class="flex items-center gap-5 mb-8 flex-shrink-0">
          <div class="relative cursor-pointer group" id="coach-avatar-container" title="Click to change profile picture">
            <div class="w-20 h-20 border-2 border-primary overflow-hidden shadow-sm bg-surface-container group-hover:border-white transition-colors">
              <img class="w-full h-full object-cover grayscale contrast-125 group-hover:scale-110 transition-transform duration-300" src="${S.getSettings().coachAvatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDUV6W_pv9qR1zinvyk6cv4w6ulR_hV9_1qbNnfiPkuNCDRDaqzrf5qVUmiAYAZEME84Dqq9LREzB-VPw19CdkRNvVvxUUSrKeCPc8cMozcqpho5qBV7p9Ai5884kMe_7A7yvkhUaFfeRTI3OZqNFVukNWVk5WZogGJfp-wABtxK4vV3n-6fKc9tjeBzNCi0z3rpJApw3RKH28NuIioeVLAICOxmSMluL9s-_3_Kjr17f8HBlIpTuXyzKSzzDMoe5Y4wdphI91jLRYm'}" alt="Coach Fletcher" />
            </div>
            <div class="absolute -bottom-2 -right-2 bg-primary text-black px-2 py-0.5 font-label-sm text-[10px] tracking-widest font-bold">ACTIVE</div>
          </div>
          <div>
            <h2 class="font-headline-md text-primary tracking-tight uppercase">Coach Fletcher</h2>
            <p class="text-on-surface-variant text-xs uppercase tracking-widest mt-1">Status: No Excuses Tolerated (Click image to change)</p>
          </div>
        </div>

        <!-- Action Chips (quick commands) -->
        <div class="flex gap-3 flex-wrap mb-6 flex-shrink-0">
          <button id="btn-morning-brief" class="flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary text-primary font-label-sm uppercase tracking-widest hover:bg-primary hover:text-black transition-all active:scale-95 shadow-sm">
            <span class="material-symbols-outlined text-sm">wb_sunny</span>
            Morning Brief
          </button>
          <button id="btn-perf-review" class="flex items-center gap-2 px-5 py-2.5 bg-surface-container border border-surface-container-highest text-on-surface font-label-sm uppercase tracking-widest hover:bg-surface-container-highest transition-all active:scale-95 shadow-sm">
            <span class="material-symbols-outlined text-sm">analytics</span>
            Performance Review
          </button>
        </div>

        <!-- Chat History -->
        <section class="flex-grow overflow-y-auto scroll-smooth space-y-1 pb-8 min-h-[300px]" id="coach-chat-history"></section>

        <!-- Fixed Input Bar -->
        <div class="fixed left-0 w-full px-4 md:px-8 flex justify-center z-40 bottom-24">
          <div class="w-full max-w-3xl bg-surface-container/95 backdrop-blur-xl border-b-2 border-primary flex items-center shadow-lg transition-all" id="coach-input-wrapper">
            <input type="text" id="coach-input-text"
              class="bg-transparent border-none outline-none focus:ring-0 flex-grow font-headline-md text-primary placeholder:text-primary/30 py-4 px-5 uppercase tracking-tighter text-sm"
              placeholder="RESPOND TO FLETCHER..." />
            <button id="btn-coach-send" class="w-14 h-14 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors active:scale-95">
              <span class="material-symbols-outlined text-2xl">keyboard_return</span>
            </button>
          </div>
        </div>

      </main>
    `;
  }

  function init() {
    renderHistory();

    const input = document.getElementById('coach-input-text');
    const send = document.getElementById('btn-coach-send');
    const wrapper = document.getElementById('coach-input-wrapper');

    if (input && wrapper) {
      input.addEventListener('focus', () => { wrapper.style.boxShadow = '0 0 25px rgba(0,229,255,0.4)'; });
      input.addEventListener('blur', () => { wrapper.style.boxShadow = '0 0 20px rgba(0,229,255,0.15)'; });
    }

    const submitMsg = () => {
      if (!input || !input.value.trim()) return;
      const txt = input.value; input.value = '';
      sendChatMessage(txt);
    };

    if (send) send.addEventListener('click', submitMsg);
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') submitMsg(); });

    document.getElementById('btn-morning-brief')?.addEventListener('click', generateMorningBrief);
    document.getElementById('btn-perf-review')?.addEventListener('click', generatePerformanceReview);

    document.getElementById('coach-avatar-container')?.addEventListener('click', () => {
      const url = prompt("Enter new Coach profile picture URL:", S.getSettings().coachAvatarUrl || '');
      if (url !== null) {
        const s = S.getSettings();
        s.coachAvatarUrl = url.trim();
        S.saveSettings(s);
        window.LM.router.render();
      }
    });
  }

  return { render, init };
})();
