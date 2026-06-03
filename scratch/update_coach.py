import re

with open('js/views/coach.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_content = """window.LM.views.coach = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;
  const N = window.LM.components.notifications;

  let activeMode = 'chat'; // kept for backward compatibility if needed, but not strictly used in the new UI state
  let chatHistory = [
    { sender: 'fletcher', text: "YOUR CURRENT PERFORMANCE IS SUB-OPTIMAL. ARE YOU TRAINING OR JUST DECORATING THE GYM FLOOR? SADDLE UP." }
  ];

  const FLETCHER_SYSTEM_INSTRUCTION = 
    `You are Fletcher, the brutal, demanding, uncompromising AI productivity coach inspired by the character Fletcher in Whiplash. ` +
    `You have ZERO tolerance for slacking, excuses, or mediocrity. You never validate, soothe, or pamper the user. ` +
    `You speak in a commanding, intense tone, treating the user like a recruit who needs to be broken down and rebuilt into an elite operator. ` +
    `You use sharp, direct critiques, high-intensity demands, and occasional dark humor. ` +
    `Keep your answers concise, impactful, and action-oriented. Never break character.`;

  // Generate today's recommendations
  async function generateMorningBrief(energyLevel) {
    const macros = S.getMacros();
    if (macros.length === 0) {
      return { error: "No macro skills available to generate quests for." };
    }

    const skillsListStr = macros.map(m => {
      const micros = (m.microSkills || []).map(ms => `(ID: ${ms.id}, Name: ${ms.name})`).join(', ');
      return `Macro Skill ID: ${m.id}, Name: ${m.name}. Micro skills: [${micros}]`;
    }).join('\\n');

    const prompt = 
      `Generate today's morning briefing and 2 to 3 recommended quests. ` +
      `The user's energy level is: ${energyLevel}. ` +
      `Here is the list of available skills in their game profile:\\n${skillsListStr}\\n\\n` +
      `You MUST respond in JSON format matching this schema EXACTLY:\\n` +
      `{\\n` +
      `  "fletcher_message": "A harsh verbal lashing and instructions for today in character (Fletcher)",\\n` +
      `  "quests": [\\n` +
      `    {\\n` +
      `      "name": "Short Quest Title",\\n` +
      `      "description": "Direct actionable instructions",\\n` +
      `      "type": "habit" or "project",\\n` +
      `      "targetSkills": [\\n` +
      `        { "macroSkillId": "MATCHING_MACRO_ID", "microSkillId": "MATCHING_MICRO_ID_OR_NULL", "xpAmount": 50 }\\n` +
      `      ],\\n` +
      `      "scheduledDays": [0,1,2,3,4,5,6],\\n` +
      `      "status": "active"\\n` +
      `    }\\n` +
      `  ]\\n` +
      `}\\n\\n` +
      `Ensure you pick VALID ids from the provided skills list. The xpAmount for each quest should be between 20 and 150 depending on difficulty.`;

    addSystemMessage("Fletcher is drafting your orders...", true);
    renderHistory();

    const response = await window.LM.aiEngine.generateContent(prompt, FLETCHER_SYSTEM_INSTRUCTION);
    removeLoadingMessage();

    if (response.error) {
      chatHistory.push({ sender: 'fletcher', text: `ERROR: ${response.error}` });
      renderHistory();
      return;
    }

    try {
      const text = response.data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(cleanJSONString(text));

      chatHistory.push({ sender: 'fletcher', text: parsed.fletcher_message || "Here is your task list. Don't waste my time." });
      
      if (Array.isArray(parsed.quests)) {
        parsed.quests.forEach(q => {
          const questData = {
            id: S.uid(),
            name: q.name,
            description: q.description || '',
            type: q.type || 'project',
            status: 'active',
            isNegativeOnMiss: q.type === 'habit',
            isNegativeOnComplete: false,
            targetSkills: q.targetSkills || [],
            isCustom: true,
            createdAt: Date.now(),
            completedAt: null,
            streak: q.type === 'habit' ? 0 : null,
            lastCompletedDate: null,
            lastResetDate: null,
            subTasks: null,
            timedResearch: { enabled: false }
          };
          S.upsertQuest(questData);
        });
        N.show(`Fletcher spawned ${parsed.quests.length} active quests!`, 'xp');
      }
    } catch (e) {
      console.error(e);
      chatHistory.push({ sender: 'fletcher', text: "I tried to build your schedule, but the data got corrupted. Configure your profile or try again." });
    }
    renderHistory();
  }

  // Generate Performance Review
  async function generatePerformanceReview() {
    const quests = S.getQuests();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const recentCompleted = quests.filter(q => q.status === 'completed' && q.completedAt && q.completedAt >= sevenDaysAgo);
    const recentMissed = quests.filter(q => q.status === 'missed' && q.updatedAt && q.updatedAt >= sevenDaysAgo);

    const completedSummary = recentCompleted.map(q => `${q.name} (Type: ${q.type})`).join(', ') || 'None';
    const missedSummary = recentMissed.map(q => `${q.name} (Type: ${q.type})`).join(', ') || 'None';

    const prompt = 
      `Analyze the user's progress log for the past 7 days.\\n` +
      `Completed quests: ${completedSummary}\\n` +
      `Missed/Failed quests: ${missedSummary}\\n\\n` +
      `Provide a brutal, harsh critique of their performance. Address them as a recruit. ` +
      `Highlight any slacking. Then, give exactly 3 concrete, high-intensity recommendations they must implement starting immediately.`;

    addSystemMessage("Fletcher is examining your log file...", true);
    renderHistory();

    const response = await window.LM.aiEngine.generateContent(prompt, FLETCHER_SYSTEM_INSTRUCTION);
    removeLoadingMessage();

    if (response.error) {
      chatHistory.push({ sender: 'fletcher', text: `ERROR: ${response.error}` });
    } else {
      try {
        const text = response.data.candidates[0].content.parts[0].text;
        chatHistory.push({ sender: 'fletcher', text: text });
      } catch (e) {
        chatHistory.push({ sender: 'fletcher', text: "I couldn't process your stats. Get back to work." });
      }
    }
    renderHistory();
  }

  // Send open chat message
  async function sendChatMessage(userText) {
    if (!userText.trim()) return;

    chatHistory.push({ sender: 'user', text: userText });
    renderHistory();

    addSystemMessage("Fletcher is typing...", true);
    renderHistory();

    const contextMessages = chatHistory.slice(-6).filter(m => m.sender !== 'system');
    const conversationContext = contextMessages.map(m => `${m.sender === 'user' ? 'User' : 'Fletcher'}: ${m.text}`).join('\\n');

    const prompt = 
      `Here is the ongoing dialogue conversation context:\\n${conversationContext}\\n\\n` +
      `Fletcher, respond to the user's latest query brutally and in-character. Keep it under 4 sentences.`;

    const response = await window.LM.aiEngine.generateContent(prompt, FLETCHER_SYSTEM_INSTRUCTION);
    removeLoadingMessage();

    if (response.error) {
      chatHistory.push({ sender: 'fletcher', text: `ERROR: ${response.error}` });
    } else {
      try {
        const text = response.data.candidates[0].content.parts[0].text;
        chatHistory.push({ sender: 'fletcher', text: text });
      } catch (e) {
        chatHistory.push({ sender: 'fletcher', text: "Stop muttering. Speak clearly." });
      }
    }
    renderHistory();
  }

  function cleanJSONString(str) {
    let cleaned = str.trim();
    if (cleaned.startsWith("\`\`\`json")) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith("\`\`\`")) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith("\`\`\`")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    return cleaned.trim();
  }

  function addSystemMessage(text, isLoading = false) {
    chatHistory.push({ sender: 'system', text: text, isLoading: isLoading });
  }

  function removeLoadingMessage() {
    chatHistory = chatHistory.filter(m => !m.isLoading);
  }

  function renderHistory() {
    const historyContainer = document.getElementById('coach-chat-history');
    if (!historyContainer) return;

    const getTimeStr = () => {
      const now = new Date();
      return now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    };

    historyContainer.innerHTML = chatHistory.map((m, index) => {
      if (m.sender === 'system') {
        return `<div class="text-center font-mono text-xs text-on-surface-variant opacity-60 my-4 animate-pulse">${m.text}</div>`;
      }
      
      // If it's the very first message, we format it as the dialogue panel
      if (index === 0 && m.sender === 'fletcher') {
        return `
          <div class="fletcher-panel border-l-4 border-primary bg-surface-container/70 backdrop-blur-xl p-6 mb-8 relative overflow-hidden py-8 shadow-[0_0_20px_rgba(0,229,255,0.1)]">
            <div class="absolute top-0 right-0 p-2 opacity-10">
              <span class="material-symbols-outlined text-6xl">terminal</span>
            </div>
            <div class="relative z-10">
              <p class="font-headline-md text-primary leading-tight mb-6 tracking-tight uppercase">"${m.text.replace(/\\n/g, '<br>')}"</p>
              <div class="flex gap-4 flex-col sm:flex-row">
                <button id="btn-stitch-brief" class="bg-primary text-black px-6 py-3 font-label-sm tracking-widest font-bold flex items-center gap-2 hover:bg-white transition-all active:scale-95 glitch-hover w-full justify-center shadow-[0_0_15px_rgba(0,229,255,0.4)]">
                  <span class="material-symbols-outlined text-sm text-black">wb_sunny</span>
                  MORNING BRIEF
                </button>
                <button id="btn-stitch-review" class="border border-primary text-primary px-6 py-3 font-label-sm tracking-widest font-bold flex items-center gap-2 hover:bg-primary/10 transition-all active:scale-95 w-full justify-center">
                  <span class="material-symbols-outlined text-sm">analytics</span>
                  PERFORMANCE REVIEW
                </button>
              </div>
            </div>
          </div>
        `;
      }
      
      // Subsequent messages
      if (m.sender === 'fletcher') {
        return `
          <div class="flex justify-start mb-6">
            <div class="fletcher-panel border-l-4 border-primary bg-surface-container/70 backdrop-blur-xl px-6 py-4 max-w-[85%] py-6 shadow-[0_0_15px_rgba(0,229,255,0.05)]">
              <p class="font-body-md text-primary tracking-wide uppercase">${m.text.replace(/\\n/g, '<br>')}</p>
              <span class="text-[10px] font-label-sm text-primary opacity-40 mt-2 block">${getTimeStr()}</span>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="flex justify-end mb-6">
            <div class="user-panel border-l-4 border-secondary bg-surface-container/70 backdrop-blur-xl px-6 py-4 max-w-[85%] text-right shadow-[0_0_15px_rgba(255,45,120,0.05)]">
              <p class="font-body-md text-secondary tracking-wide">"${m.text.replace(/\\n/g, '<br>')}"</p>
              <span class="text-[10px] font-label-sm text-secondary opacity-40 mt-2 block">${getTimeStr()}</span>
            </div>
          </div>
        `;
      }
    }).join('');

    // Rebind buttons for the first message
    const btnBrief = document.getElementById('btn-stitch-brief');
    if (btnBrief) {
      btnBrief.addEventListener('click', () => {
        const energy = localStorage.getItem('lm_user_energy') || 'High';
        generateMorningBrief(energy);
      });
    }
    const btnReview = document.getElementById('btn-stitch-review');
    if (btnReview) {
      btnReview.addEventListener('click', () => {
        generatePerformanceReview();
      });
    }

    // Scroll to bottom
    historyContainer.scrollTop = historyContainer.scrollHeight;
  }

  function render() {
    return `
      <!-- Global Overlays -->
      <div class="fixed inset-0 pointer-events-none z-0">
        <div class="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,229,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,229,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div class="absolute bottom-0 left-0 w-full h-[40vh] bg-gradient-to-b from-transparent to-primary/10 border-t border-primary/20 transform [transform:perspective(500px)_rotateX(60deg)] origin-bottom"></div>
        <div class="absolute top-[10%] -right-[10%] w-[500px] h-[500px] bg-gradient-to-b from-secondary to-transparent rounded-full blur-[40px] opacity-15">
          <div class="absolute w-full h-1 bg-background top-[20%] translate-y-[10px]"></div>
          <div class="absolute w-full h-1 bg-background top-[40%] translate-y-[10px]"></div>
          <div class="absolute w-full h-1 bg-background top-[60%] translate-y-[10px]"></div>
          <div class="absolute w-full h-1 bg-background top-[80%] translate-y-[10px]"></div>
        </div>
      </div>
      <div class="fixed inset-0 pointer-events-none z-[100] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[size:100%_2px,3px_100%]"></div>
      
      <main class="relative z-20 pb-40 px-4 md:px-6 max-w-4xl mx-auto pt-24 min-h-screen flex flex-col">
        
        <!-- AI Coach Header -->
        <section class="animate-fade-in mb-8 flex-shrink-0">
          <div class="flex items-center gap-6">
            <div class="relative">
              <div class="w-24 h-24 bg-surface-container border-2 border-primary overflow-hidden shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                <img alt="Coach Fletcher" class="w-full h-full object-cover grayscale contrast-125 saturate-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUV6W_pv9qR1zinvyk6cv4w6ulR_hV9_1qbNnfiPkuNCDRDaqzrf5qVUmiAYAZEME84Dqq9LREzB-VPw19CdkRNvVvxUUSrKeCPc8cMozcqpho5qBV7p9Ai5884kMe_7A7yvkhUaFfeRTI3OZqNFVukNWVk5WZogGJfp-wABtxK4vV3n-6fKc9tjeBzNCi0z3rpJApw3RKH28NuIioeVLAICOxmSMluL9s-_3_Kjr17f8HBlIpTuXyzKSzzDMoe5Y4wdphI91jLRYm"/>
              </div>
              <div class="absolute -bottom-2 -right-2 bg-primary text-black px-2 py-0.5 font-label-sm text-[10px] tracking-widest font-bold">ACTIVE</div>
            </div>
            <div>
              <h2 class="font-headline-md text-headline-md text-primary tracking-tight mb-1 drop-shadow-[0_0_8px_rgba(0,229,255,0.5)] uppercase">Coach Fletcher</h2>
              <p class="font-body-md text-on-surface-variant opacity-70 uppercase tracking-widest text-xs">STATUS: NO EXCUSES TOLERATED</p>
            </div>
          </div>
        </section>

        <!-- Chat History Container -->
        <section class="flex-grow overflow-y-auto space-y-6 scroll-smooth pb-4" id="coach-chat-history">
          <!-- Messages will be rendered here -->
        </section>

        <!-- Input Field -->
        <div class="fixed left-0 w-full px-4 md:px-6 flex justify-center z-40 bottom-24">
          <div class="w-full max-w-4xl bg-surface-container/90 backdrop-blur-xl border-b-2 border-primary flex items-center p-2 shadow-[0_5px_30px_rgba(0,229,255,0.15)] transition-all" id="input-wrapper">
            <input type="text" id="coach-input-text" class="bg-transparent border-none outline-none focus:ring-0 flex-grow font-headline-md text-primary placeholder:opacity-40 placeholder:text-primary py-3 md:py-4 px-4 uppercase tracking-tighter" placeholder="RESPOND TO FLETCHER..." />
            <button id="btn-coach-send" class="w-12 h-12 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors">
              <span class="material-symbols-outlined text-3xl">keyboard_return</span>
            </button>
          </div>
        </div>

      </main>
    `;
  }

  function init() {
    renderHistory();

    const textInput = document.getElementById('coach-input-text');
    const sendBtn = document.getElementById('btn-coach-send');
    const wrapper = document.getElementById('input-wrapper');

    if (textInput && wrapper) {
      textInput.addEventListener('focus', () => {
        wrapper.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.3)';
        wrapper.style.borderColor = '#ffb1c0';
      });
      textInput.addEventListener('blur', () => {
        wrapper.style.boxShadow = '0 5px 30px rgba(0, 229, 255, 0.15)';
        wrapper.style.borderColor = '#00e5ff';
      });
    }

    if (sendBtn && textInput) {
      sendBtn.addEventListener('click', () => {
        const text = textInput.value;
        if (!text.trim()) return;
        textInput.value = '';
        sendChatMessage(text);
      });
      textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const text = textInput.value;
          if (!text.trim()) return;
          textInput.value = '';
          sendChatMessage(text);
        }
      });
    }
  }

  return { render, init };
})();"""

with open('js/views/coach.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updated coach.js")
