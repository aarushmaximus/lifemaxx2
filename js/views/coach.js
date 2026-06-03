window.LM.views.coach = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;
  const N = window.LM.components.notifications;

  let activeMode = 'chat'; // 'brief', 'review', 'chat'
  let chatHistory = [
    { sender: 'fletcher', text: "Recruit. You're here. That means you haven't given up yet, or you're just looking for someone to pat you on the back. Let me make one thing clear: I don't pat backs. I build champions. What are we doing today?" }
  ];

  const FLETCHER_SYSTEM_INSTRUCTION = 
    `You are Fletcher, the brutal, demanding, uncompromising AI productivity coach inspired by the character Fletcher in Whiplash. ` +
    `You have ZERO tolerance for slacking, excuses, or mediocrity. You never validate, soothe, or pamper the user. ` +
    `You speak in a commanding, intense tone, treating the user like a recruit who needs to be broken down and rebuilt into an elite operator. ` +
    `You use sharp, direct critiques, high-intensity demands, and occasional dark humor. ` +
    `Keep your answers concise, impactful, and action-oriented. Never break character.`;

  function getLocalDateStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  // Generate today's recommendations
  async function generateMorningBrief(energyLevel) {
    const macros = S.getMacros();
    if (macros.length === 0) {
      return { error: "No macro skills available to generate quests for." };
    }

    // Format macro skill directory with IDs for Gemini to pick from
    const skillsListStr = macros.map(m => {
      const micros = (m.microSkills || []).map(ms => `(ID: ${ms.id}, Name: ${ms.name})`).join(', ');
      return `Macro Skill ID: ${m.id}, Name: ${m.name}. Micro skills: [${micros}]`;
    }).join('\n');

    const prompt = 
      `Generate today's morning briefing and 2 to 3 recommended quests. ` +
      `The user's energy level is: ${energyLevel}. ` +
      `Here is the list of available skills in their game profile:\n${skillsListStr}\n\n` +
      `You MUST respond in JSON format matching this schema EXACTLY:\n` +
      `{\n` +
      `  "fletcher_message": "A harsh verbal lashing and instructions for today in character (Fletcher)",\n` +
      `  "quests": [\n` +
      `    {\n` +
      `      "name": "Short Quest Title",\n` +
      `      "description": "Direct actionable instructions",\n` +
      `      "type": "habit" or "project",\n` +
      `      "targetSkills": [\n` +
      `        { "macroSkillId": "MATCHING_MACRO_ID", "microSkillId": "MATCHING_MICRO_ID_OR_NULL", "xpAmount": 50 }\n` +
      `      ],\n` +
      `      "scheduledDays": [0,1,2,3,4,5,6],\n` +
      `      "status": "active"\n` +
      `    }\n` +
      `  ]\n` +
      `}\n\n` +
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

      // 1. Display Fletcher's response message
      chatHistory.push({ sender: 'fletcher', text: parsed.fletcher_message || "Here is your task list. Don't waste my time." });
      
      // 2. Insert quests into local storage
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
      `Analyze the user's progress log for the past 7 days.\n` +
      `Completed quests: ${completedSummary}\n` +
      `Missed/Failed quests: ${missedSummary}\n\n` +
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

    // Compile recent history context for Gemini (last 5 messages)
    const contextMessages = chatHistory.slice(-6).filter(m => m.sender !== 'system');
    const conversationContext = contextMessages.map(m => `${m.sender === 'user' ? 'User' : 'Fletcher'}: ${m.text}`).join('\n');

    const prompt = 
      `Here is the ongoing dialogue conversation context:\n${conversationContext}\n\n` +
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
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith("```")) {
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

    historyContainer.innerHTML = chatHistory.map(m => {
      if (m.sender === 'system') {
        return `<div style="text-align: center; color: var(--text-3); font-size: 0.75rem; font-family: var(--font-mono); margin: 6px 0;">${m.text}</div>`;
      }
      const avatarName = m.sender === 'fletcher' ? 'F' : 'ME';
      return `
        <div class="coach-message ${m.sender}">
          <div class="coach-avatar">${avatarName}</div>
          <div class="coach-bubble">${m.text.replace(/\n/g, '<br>')}</div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    historyContainer.scrollTop = historyContainer.scrollHeight;
  }

  function render() {
    const activeEnergy = localStorage.getItem('lm_user_energy') || 'High';

    return `
      <div class="view-container page-enter" style="max-width: 900px;">
        <div class="view-header">
          <h1 class="font-display-uppercase">AI COACH FLETCHER</h1>
          <button class="btn btn-ghost btn-sm" onclick="window.LM.router.navigate('#dashboard')">◀ BACK</button>
        </div>

        <div class="coach-chat-container">
          <!-- Modes Bar -->
          <div class="coach-chat-header">
            <div class="filter-chips" style="justify-content: center; width: 100%;">
              <button class="chip ${activeMode === 'chat' ? 'chip-active' : ''}" id="btn-mode-chat">🗣️ OPEN CHAT</button>
              <button class="chip ${activeMode === 'brief' ? 'chip-active' : ''}" id="btn-mode-brief">📅 MORNING BRIEF</button>
              <button class="chip ${activeMode === 'review' ? 'chip-active' : ''}" id="btn-mode-review">📊 PERFORMANCE REVIEW</button>
            </div>

            <!-- Mode Details Context -->
            <div id="mode-detail-pane" style="text-align: center; font-size: 0.8rem; color: var(--text-2);">
              ${renderModePaneHTML(activeMode, activeEnergy)}
            </div>
          </div>

          <!-- History Feed -->
          <div class="coach-chat-history" id="coach-chat-history">
            <!-- Messages are injected here -->
          </div>

          <!-- Input Bar -->
          <div class="coach-input-area" id="coach-input-area" style="display: ${activeMode === 'chat' ? 'flex' : 'none'};">
            <input type="text" class="form-input" id="coach-input-text" placeholder="Explain your excuses..." style="flex:1;" />
            <button class="btn btn-primary" id="btn-coach-send">SEND</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderModePaneHTML(mode, energy) {
    if (mode === 'brief') {
      return `
        <div style="display:flex; align-items:center; justify-content:center; gap:12px;">
          <span>Energy Level:</span>
          <select id="coach-energy-sel" class="form-input" style="width:110px; padding:4px 8px; font-size:0.8rem; background:var(--bg-base); border-color:var(--border);">
            <option value="High" ${energy === 'High' ? 'selected' : ''}>High ⚡</option>
            <option value="Medium" ${energy === 'Medium' ? 'selected' : ''}>Medium 🔋</option>
            <option value="Low" ${energy === 'Low' ? 'selected' : ''}>Low 💤</option>
          </select>
          <button class="btn btn-primary btn-sm" id="btn-trigger-brief">GENERATE ORDERS</button>
        </div>
      `;
    }
    if (mode === 'review') {
      return `
        <div>
          <span>Analyze your completed/missed quests for the past 7 days.</span>
          <button class="btn btn-ghost btn-sm" id="btn-trigger-review" style="margin-left: 8px; color: var(--secondary); border-color: var(--secondary);">REQUEST AUDIT</button>
        </div>
      `;
    }
    return `<span>Type a message to discuss your performance, mindset, or ask Fletcher questions.</span>`;
  }

  function init() {
    renderHistory();

    const textInput = document.getElementById('coach-input-text');
    const sendBtn = document.getElementById('btn-coach-send');
    const modeChat = document.getElementById('btn-mode-chat');
    const modeBrief = document.getElementById('btn-mode-brief');
    const modeReview = document.getElementById('btn-mode-review');

    // Send chat text listener
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

    // Tab mode triggers
    if (modeChat) {
      modeChat.addEventListener('click', () => {
        activeMode = 'chat';
        LM.router.render();
      });
    }
    if (modeBrief) {
      modeBrief.addEventListener('click', () => {
        activeMode = 'brief';
        LM.router.render();
      });
    }
    if (modeReview) {
      modeReview.addEventListener('click', () => {
        activeMode = 'review';
        LM.router.render();
      });
    }

    // Morning brief trigger action
    const triggerBrief = document.getElementById('btn-trigger-brief');
    if (triggerBrief) {
      triggerBrief.addEventListener('click', () => {
        const energy = document.getElementById('coach-energy-sel').value;
        localStorage.setItem('lm_user_energy', energy);
        generateMorningBrief(energy);
      });
    }

    // Performance review trigger action
    const triggerReview = document.getElementById('btn-trigger-review');
    if (triggerReview) {
      triggerReview.addEventListener('click', () => {
        generatePerformanceReview();
      });
    }
  }

  return { render, init };
})();
