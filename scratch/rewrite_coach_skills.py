### SCRIPT: rewrite_coach_skills.py
# Run from root of lifemaxxantigrav project

coach_content = r'''window.LM.views.coach = (function () {
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
    const energy = localStorage.getItem('lm_user_energy') || 'High';
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
      `The user's energy level is: ${energy}. ` +
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

  // ── Open chat message ──
  async function sendChatMessage(userText) {
    if (!userText.trim()) return;
    chatHistory.push({ sender: 'user', text: userText });
    addSystemMessage("Fletcher is typing...", true);
    renderHistory();

    const contextMessages = chatHistory.slice(-6).filter(m => m.sender !== 'system');
    const conversationContext = contextMessages.map(m => `${m.sender === 'user' ? 'User' : 'Fletcher'}: ${m.text}`).join('\n');

    const response = await window.LM.aiEngine.generateContent(
      `Here is the ongoing conversation:\n${conversationContext}\n\nFletcher, respond to the user's latest message brutally and in-character. Keep it under 4 sentences.`,
      FLETCHER_SYSTEM_INSTRUCTION
    );
    removeLoadingMessage();

    if (response.error) {
      chatHistory.push({ sender: 'fletcher', text: `SYSTEM ERROR: ${response.error}` });
    } else {
      try {
        chatHistory.push({ sender: 'fletcher', text: response.data.candidates[0].content.parts[0].text });
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
            <div class="border-l-4 border-primary bg-surface-container/70 backdrop-blur-xl px-6 py-5 max-w-[88%] shadow-[0_0_20px_rgba(0,229,255,0.08)]">
              <p class="font-body-md text-primary/90 tracking-wide leading-relaxed">${m.text.replace(/\n/g, '<br>')}</p>
              <span class="text-[10px] font-label-sm text-primary/30 mt-2 block">${getTimeStr()}</span>
            </div>
          </div>`;
      }
      return `
        <div class="flex justify-end mb-6">
          <div class="border-r-4 border-secondary bg-surface-container/70 backdrop-blur-xl px-6 py-5 max-w-[88%] text-right shadow-[0_0_20px_rgba(255,45,120,0.06)]">
            <p class="font-body-md text-secondary/90 tracking-wide leading-relaxed">"${m.text.replace(/\n/g, '<br>')}"</p>
            <span class="text-[10px] font-label-sm text-secondary/30 mt-2 block">${getTimeStr()}</span>
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
          <div class="relative">
            <div class="w-20 h-20 border-2 border-primary overflow-hidden shadow-[0_0_20px_rgba(0,229,255,0.3)] bg-surface-container">
              <img class="w-full h-full object-cover grayscale contrast-125" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUV6W_pv9qR1zinvyk6cv4w6ulR_hV9_1qbNnfiPkuNCDRDaqzrf5qVUmiAYAZEME84Dqq9LREzB-VPw19CdkRNvVvxUUSrKeCPc8cMozcqpho5qBV7p9Ai5884kMe_7A7yvkhUaFfeRTI3OZqNFVukNWVk5WZogGJfp-wABtxK4vV3n-6fKc9tjeBzNCi0z3rpJApw3RKH28NuIioeVLAICOxmSMluL9s-_3_Kjr17f8HBlIpTuXyzKSzzDMoe5Y4wdphI91jLRYm" alt="Coach Fletcher" />
            </div>
            <div class="absolute -bottom-2 -right-2 bg-primary text-black px-2 py-0.5 font-label-sm text-[10px] tracking-widest font-bold">ACTIVE</div>
          </div>
          <div>
            <h2 class="font-headline-md text-primary tracking-tight uppercase drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">Coach Fletcher</h2>
            <p class="text-on-surface-variant text-xs uppercase tracking-widest mt-1">Status: No Excuses Tolerated</p>
          </div>
        </div>

        <!-- Action Chips (quick commands) -->
        <div class="flex gap-3 flex-wrap mb-6 flex-shrink-0">
          <button id="btn-morning-brief" class="flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary text-primary font-label-sm uppercase tracking-widest hover:bg-primary hover:text-black transition-all active:scale-95 shadow-[0_0_10px_rgba(0,229,255,0.2)]">
            <span class="material-symbols-outlined text-sm">wb_sunny</span>
            Morning Brief
          </button>
          <button id="btn-perf-review" class="flex items-center gap-2 px-5 py-2.5 bg-secondary/10 border border-secondary text-secondary font-label-sm uppercase tracking-widest hover:bg-secondary hover:text-white transition-all active:scale-95 shadow-[0_0_10px_rgba(255,45,120,0.2)]">
            <span class="material-symbols-outlined text-sm">analytics</span>
            Performance Review
          </button>
          <div class="flex items-center gap-2 px-4 py-2.5 bg-surface-container/50 border border-white/10 font-label-sm text-on-surface-variant text-xs uppercase tracking-widest">
            <span class="material-symbols-outlined text-sm">bolt</span>
            Energy:
            <select id="coach-energy-sel" class="bg-transparent border-none text-primary font-label-sm focus:ring-0 text-xs uppercase tracking-widest cursor-pointer outline-none">
              <option value="High" ${(localStorage.getItem('lm_user_energy')||'High')==='High'?'selected':''}>High</option>
              <option value="Medium" ${(localStorage.getItem('lm_user_energy')||'High')==='Medium'?'selected':''}>Medium</option>
              <option value="Low" ${(localStorage.getItem('lm_user_energy')||'High')==='Low'?'selected':''}>Low</option>
            </select>
          </div>
        </div>

        <!-- Chat History -->
        <section class="flex-grow overflow-y-auto scroll-smooth space-y-1 pb-8 min-h-[300px]" id="coach-chat-history"></section>

        <!-- Fixed Input Bar -->
        <div class="fixed left-0 w-full px-4 md:px-8 flex justify-center z-40 bottom-24">
          <div class="w-full max-w-3xl bg-surface-container/95 backdrop-blur-xl border-b-2 border-primary flex items-center shadow-[0_0_20px_rgba(0,229,255,0.15)] transition-all" id="coach-input-wrapper">
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
    const energySel = document.getElementById('coach-energy-sel');

    if (energySel) {
      energySel.addEventListener('change', () => {
        localStorage.setItem('lm_user_energy', energySel.value);
      });
    }

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
  }

  return { render, init };
})();
'''

skills_content = r'''// LIFEMAXX — Skills Grid View (NeonStitcher Design)
window.LM.views.skills = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;

  function render() {
    const macros = S.getMacros();

    return `
      <div class="relative z-10 pt-24 pb-36 px-4 md:px-8 max-w-7xl mx-auto page-enter">

        <!-- Header -->
        <div class="mb-10 relative pt-4">
          <div class="absolute -top-6 -left-8 w-48 h-48 bg-secondary/10 rounded-full blur-[80px] pointer-events-none"></div>
          <p class="font-label-sm text-primary uppercase tracking-[0.3em] mb-2">SYSTEM MODULES</p>
          <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg uppercase tracking-tighter text-on-surface neon-text-cyan mb-2">Skills</h2>
          <div class="h-1 w-24 bg-gradient-to-r from-primary to-secondary mb-6 shadow-[0_0_10px_rgba(0,229,255,0.8)]"></div>
          <p class="text-on-surface-variant text-sm uppercase tracking-wider">Tap a module to manage quests, chain objectives &amp; widgets</p>
        </div>

        <!-- Skills Grid -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          ${macros.map(m => {
            const pct = F.progressPercent(m.currentXP || 0, m);
            const into = F.xpIntoCurrentLevel(m.currentXP || 0, m);
            const req = F.xpRequiredForNextLevel(m.currentXP || 0, m);
            const color = m.accentColor || '#00e5ff';
            const dashOffset = 125.6 - (125.6 * pct / 100);
            return `
              <div class="group relative bg-surface-container/60 backdrop-blur-xl border-l-4 p-5 cursor-pointer hover:bg-surface-container/90 transition-all duration-300 overflow-hidden shadow-[0_0_15px_transparent] hover:shadow-[0_0_20px_currentColor] active:scale-95"
                   style="border-left-color:${color}; --tw-shadow-color:${color}22;"
                   onclick="LM.router.navigate('#skill-hub/${m.id}')">

                <!-- Glow bg on hover -->
                <div class="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style="background:radial-gradient(circle at 30% 50%, ${color}, transparent 70%)"></div>

                <!-- Top: Circular progress + icon -->
                <div class="flex items-start justify-between mb-4">
                  <div class="w-12 h-12 relative flex-shrink-0">
                    <svg class="w-full h-full -rotate-90" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="3"/>
                      <circle cx="24" cy="24" r="20" fill="none" stroke="${color}" stroke-width="3"
                        stroke-dasharray="125.6" stroke-dashoffset="${dashOffset}"
                        style="filter:drop-shadow(0 0 4px ${color})"/>
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center">
                      <span class="font-bold text-xs" style="color:${color}">${m.currentLevel || 0}</span>
                    </div>
                  </div>
                  <span class="material-symbols-outlined text-2xl opacity-20 group-hover:opacity-60 transition-opacity" style="color:${color}">stars</span>
                </div>

                <!-- Skill Name -->
                <h3 class="font-headline-md text-sm md:text-base uppercase tracking-tight font-bold text-white mb-1">${m.name}</h3>
                <p class="text-[10px] text-on-surface-variant uppercase tracking-widest mb-3">LV ${m.currentLevel || 0} — ${F.formatXP(into)} / ${F.formatXP(req)} XP</p>

                <!-- XP Progress Bar -->
                <div class="h-0.5 w-full bg-white/5 overflow-hidden">
                  <div class="h-full transition-all duration-500" style="width:${pct}%;background:${color};box-shadow:0 0 6px ${color}"></div>
                </div>

                <!-- Sub-navigation pills -->
                <div class="flex gap-2 mt-4">
                  <button class="text-[9px] font-label-sm px-2 py-1 border opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-widest"
                          style="border-color:${color}33;color:${color}"
                          onclick="event.stopPropagation();LM.router.navigate('#skill-hub/${m.id}')">Hub</button>
                  <button class="text-[9px] font-label-sm px-2 py-1 border opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-widest"
                          style="border-color:${color}33;color:${color}"
                          onclick="event.stopPropagation();LM.router.navigate('#skill-chains/${m.id}')">Chains</button>
                  <button class="text-[9px] font-label-sm px-2 py-1 border opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-widest"
                          style="border-color:${color}33;color:${color}"
                          onclick="event.stopPropagation();LM.router.navigate('#skill-widgets/${m.id}')">Widgets</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Manage Skills Button -->
        <div class="mt-10 text-center">
          <button class="px-8 py-3 border border-primary/30 text-primary font-label-sm uppercase tracking-widest hover:bg-primary/10 transition-all active:scale-95 shadow-[0_0_10px_rgba(0,229,255,0.1)]"
                  onclick="LM.components.skillModal.open()">
            <span class="material-symbols-outlined align-middle text-sm mr-2">settings</span>
            Manage Skill Modules
          </button>
        </div>
      </div>
    `;
  }

  function init() {}

  return { render, init };
})();
'''

with open('js/views/coach.js', 'w', encoding='utf-8') as f:
    f.write(coach_content)

with open('js/views/skills.js', 'w', encoding='utf-8') as f:
    f.write(skills_content)

print("Done rewriting coach.js and skills.js")
