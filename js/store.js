// LIFEMAXX — Data Store (localStorage)
window.LM.store = (function () {
  const KEYS = {
    macros: 'lm_macros',
    quests: 'lm_quests',
    overall: 'lm_overall',
    settings: 'lm_settings',
    xplog: 'lm_xplog',
    presets: 'lm_presets',
    chains: 'lm_chains',
    woTemplates: 'lm_workout_templates',
    lastUpdated: 'lm_last_updated',
    lastReviewDate: 'lm_last_review_date',
    cachedReview: 'lm_cached_review'
  };
  const listeners = [];
  const F = window.LM.formulas;

  function on(event, fn) { listeners.push({ event, fn }); }
  function emit(event, data) { listeners.filter(l => l.event === event).forEach(l => l.fn(data)); }

  function load(key) { try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; } }
  function save(key, val) { 
    localStorage.setItem(key, JSON.stringify(val)); 
    if (key !== KEYS.lastUpdated) {
      localStorage.setItem(KEYS.lastUpdated, JSON.stringify(Date.now()));
    }
  }

  // ── Macros ──
  function getMacros() { return load(KEYS.macros) || []; }
  function saveMacros(list) { save(KEYS.macros, list); emit('change'); }
  function getMacro(id) { return getMacros().find(m => m.id === id) || null; }

  function upsertMacro(macro) {
    const list = getMacros();
    macro.base = F.computeBase(macro);
    const idx = list.findIndex(m => m.id === macro.id);
    if (idx >= 0) list[idx] = macro; else list.push(macro);
    saveMacros(list);
  }

  function deleteMacro(id) {
    const list = getMacros().filter(m => m.id !== id);
    saveMacros(list);
    // Clean quest references
    const quests = getQuests().map(q => {
      q.targetSkills = (q.targetSkills || []).filter(t => t.macroSkillId !== id);
      return q;
    });
    save(KEYS.quests, quests);
    emit('change');
  }

  // ── Micro Skills ──
  function getMicroSkills(macroId) {
    const macro = getMacro(macroId);
    return macro ? (macro.microSkills || []) : [];
  }

  function upsertMicroSkill(macroId, micro) {
    const list = getMacros();
    const macro = list.find(m => m.id === macroId);
    if (!macro) return;
    macro.microSkills = macro.microSkills || [];
    micro.base = F.computeBase(micro);
    const idx = macro.microSkills.findIndex(ms => ms.id === micro.id);
    if (idx >= 0) macro.microSkills[idx] = micro; else macro.microSkills.push(micro);
    saveMacros(list);
  }

  function deleteMicroSkill(macroId, microId) {
    const list = getMacros();
    const macro = list.find(m => m.id === macroId);
    if (!macro) return;
    macro.microSkills = (macro.microSkills || []).filter(ms => ms.id !== microId);
    saveMacros(list);
  }

  // ── Quest Presets (Custom Quest Types) ──
  function getPresets() { return load(KEYS.presets) || []; }
  function savePresets(list) { save(KEYS.presets, list); emit('change'); }
  function getPreset(id) { return getPresets().find(p => p.id === id) || null; }

  function upsertPreset(preset) {
    const list = getPresets();
    const idx = list.findIndex(p => p.id === preset.id);
    if (idx >= 0) list[idx] = preset; else list.push(preset);
    savePresets(list);
    checkPresetSpawns();
  }

  function deletePreset(id) {
    savePresets(getPresets().filter(p => p.id !== id));
    // Also delete any active quest instances spawned from this preset
    const quests = getQuests().filter(q => q.presetId !== id || q.status === 'completed');
    save(KEYS.quests, quests);
    emit('change');
  }

  // ── Quest Instances ──
  function getQuests() { return load(KEYS.quests) || []; }
  function saveQuests(list) { save(KEYS.quests, list); emit('change'); }
  function getQuest(id) { return getQuests().find(q => q.id === id) || null; }

  function upsertQuest(quest) {
    const list = getQuests();
    const idx = list.findIndex(q => q.id === quest.id);
    if (idx >= 0) list[idx] = quest; else list.push(quest);
    saveQuests(list);
  }

  function deleteQuest(id, forcePermanent = false) {
    const quests = getQuests();
    const quest = quests.find(q => q.id === id);
    if (!quest) return;
    
    if (forcePermanent || quest.status === 'completed' || quest.status === 'deleted') {
      saveQuests(quests.filter(q => q.id !== id));
    } else if (quest.status === 'active') {
      quest.status = 'deleted';
      quest.deletedAt = Date.now();
      saveQuests(quests);
    } else if (quest.status === 'missed') {
      quest.hiddenFromDashboard = true;
      saveQuests(quests);
    }
  }

  // ── Overall Level ──
  function getOverall() {
    return load(KEYS.overall) || { currentXP: 0, currentLevel: 0, exponent: 1.8, totalXPtoL100: 5100000, base: 5100000 / Math.pow(100, 1.8) };
  }
  function saveOverall(o) { save(KEYS.overall, o); }

  // ── Settings ──
  function getSettings() {
    return load(KEYS.settings) || { theme: 'dark', accentColor: '#7c3aed', wheelSkillId: 'overall', dragToRegister: true, deleteAfterDragged: false };
  }
  function saveSettings(s) { save(KEYS.settings, s); }

  // ── XP Log ──
  function getXPLog(macroId) { 
    const log = load(KEYS.xplog) || []; 
    return (macroId && macroId !== 'all') ? log.filter(e => e.macroId === macroId) : log; 
  }
  function saveXPLog(log) { save(KEYS.xplog, log); }

  function getActiveStatusEffects() {
    const overall = getOverall();
    const effects = overall.statusEffects || [];
    const now = Date.now();
    const active = effects.filter(e => e.expiresAt > now);
    if (active.length !== effects.length) {
      overall.statusEffects = active;
      saveOverall(overall);
    }
    return active;
  }

  function addStatusEffect(effect) {
    const overall = getOverall();
    overall.statusEffects = overall.statusEffects || [];
    overall.statusEffects = overall.statusEffects.filter(e => e.id !== effect.id);
    overall.statusEffects.push(effect);
    saveOverall(overall);
    emit('change');
  }

  function registerMissedQuest() {
    const overall = getOverall();
    overall.missedCount = (overall.missedCount || 0) + 1;
    if (overall.missedCount >= 3) {
      addStatusEffect({
        id: 'fatigued',
        name: 'Fatigued',
        type: 'debuff',
        multiplier: 0.8,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      });
      overall.missedCount = 0;
    } else {
      saveOverall(overall);
    }
  }

  // ── Award XP ──
  function awardXP(targetSkills, negative = false, reason = '', questId = null) {
    if (!Array.isArray(targetSkills)) return { overallDelta: 0 };
    const macros = getMacros();
    const log = load(KEYS.xplog) || [];
    let overallDelta = 0;
    const sign = negative ? -1 : 1;

    // Calculate dynamic status multiplier
    let multiplier = 1.0;
    if (!negative) {
      const activeEffects = getActiveStatusEffects();
      activeEffects.forEach(e => {
        multiplier *= e.multiplier;
      });
    }

    targetSkills.forEach(t => {
      const macro = macros.find(m => m.id === t.macroSkillId);
      if (!macro) return;
      const delta = sign * Math.round(t.xpAmount * (negative ? 1.0 : multiplier));
      macro.currentXP = Math.max(0, (macro.currentXP || 0) + delta);
      macro.currentLevel = F.currentLevel(macro.currentXP, macro);

      if (t.microSkillId) {
        const ms = (macro.microSkills || []).find(ms => ms.id === t.microSkillId);
        if (ms) {
          ms.currentXP = Math.max(0, (ms.currentXP || 0) + delta);
          ms.currentLevel = F.currentLevel(ms.currentXP, ms);
        }
      }
      overallDelta += Math.abs(delta);
      
      log.push({
        id: uid(),
        timestamp: Date.now(),
        macroId: macro.id,
        microId: t.microSkillId || null,
        delta: delta,
        reason: multiplier !== 1.0 && !negative ? `${reason} (x${multiplier.toFixed(2)} status)` : reason,
        questId: questId
      });
    });

    const overall = getOverall();
    overall.currentXP = Math.max(0, (overall.currentXP || 0) + sign * overallDelta);
    overall.currentLevel = F.currentLevel(overall.currentXP, overall);
    saveOverall(overall);
    saveMacros(macros);
    saveXPLog(log);
    return { overallDelta };
  }

  // ── Complete Quest ──
  function markQuestReady(questId) {
    const quests = getQuests();
    const quest = quests.find(q => q.id === questId);
    if (!quest) return null;
    quest.isReadyToClaim = true;
    save(KEYS.quests, quests);
    emit('change');
  }

  function completeQuest(questId) {
    const quests = getQuests();
    const quest = quests.find(q => q.id === questId);
    if (!quest) return null;
    
    // Prevent double complete unless it's ready to claim
    if (quest.status === 'completed' && !quest.isReadyToClaim) return null;

    const tSkills = quest.targetSkills || [];
    // Scale XP by progress indicator percentage (if present)
    const progressScale = (quest.progressIndicator && quest.progressIndicator.value != null)
      ? Math.max(0, Math.min(1, quest.progressIndicator.value / 100))
      : 1;
    const adjustedTargets = tSkills.map(t => ({ ...t, xpAmount: Math.round(t.xpAmount * progressScale) }));
    
    // Pass quest.id as the fourth argument to link to timeline
    awardXP(adjustedTargets, false, `Completed: ${quest.name} (${Math.round(progressScale * 100)}%)`, quest.id);

    // Gym quest Pumped status buff trigger
    if (quest.name.toLowerCase().includes('gym')) {
      addStatusEffect({
        id: 'pumped',
        name: 'Pumped',
        type: 'buff',
        multiplier: 1.2,
        expiresAt: Date.now() + 4 * 60 * 60 * 1000
      });
    }
    
    quest.status = 'completed';
    quest.isReadyToClaim = false;
    quest.completedAt = Date.now();
    
    save(KEYS.quests, quests);
    emit('change');
    return { quest, xpMultiplier: 1, adjustedTargets };
  }

  // ── Auto-spawning Custom Quests from Presets ──
  function checkPresetSpawns() {
    const presets = getPresets();
    const quests = getQuests();
    const now = new Date();
    const todayDay = now.getDay(); // 0 = Sun, 1 = Mon, etc.
    const todayStr = now.toDateString();
    let changed = false;

    presets.forEach(p => {
      // Check if preset is scheduled for today
      if (p.scheduledDays && p.scheduledDays.includes(todayDay)) {
        // Check if quest already spawned for this preset today
        const alreadySpawned = quests.some(q => q.presetId === p.id && q.scheduledDate === todayStr);
        if (!alreadySpawned) {
          quests.push({
            id: uid(),
            presetId: p.id,
            name: p.name,
            description: p.description || '',
            targetSkills: p.targetSkills || [],
            scheduledDate: todayStr,
            createdAt: Date.now(),
            status: 'active',
            isReadyToClaim: false,
            timeLimitHours: p.timeLimitHours || 24,
            expiresAt: p.hasTimeLimit ? (Date.now() + (p.timeLimitHours || 24) * 60 * 60 * 1000) : null,
            timeWindow: p.timeWindow || null,
            energyCost: p.energyCost || 'Medium'
          });
          changed = true;
        }
      }
    });

    if (changed) {
      save(KEYS.quests, quests);
      emit('change');
    }
  }

  function getCachedReview() {
    return load(KEYS.cachedReview);
  }

  async function triggerMidnightReview(yesterdayStr) {
    const settings = getSettings();
    if (!settings.geminiApiKey) {
      console.warn("Midnight Review skipped: No Gemini API key configured.");
      return;
    }

    const quests = getQuests();
    const log = load(KEYS.xplog) || [];

    const completedQuests = quests.filter(q => q.scheduledDate === yesterdayStr && q.status === 'completed');
    const missedQuests = quests.filter(q => q.scheduledDate === yesterdayStr && q.status === 'missed');
    
    // Focus time in minutes
    const focusTimerMins = log.filter(e => 
      new Date(e.timestamp).toDateString() === yesterdayStr && 
      (e.reason.includes('Timer') || e.reason.includes('Tracker'))
    ).length * 20;

    const skillSpreads = {};
    const yesterdayLog = log.filter(e => new Date(e.timestamp).toDateString() === yesterdayStr);
    yesterdayLog.forEach(e => {
      skillSpreads[e.macroId] = (skillSpreads[e.macroId] || 0) + e.delta;
    });

    const prompt = `Yesterday's RPG Tracker stats:
- Completed Quests: ${completedQuests.length}
- Missed Quests: ${missedQuests.length}
- Focus Time: ${focusTimerMins} minutes
- Skill XP Gains: ${JSON.stringify(skillSpreads)}

Please analyze my performance and output a JSON response matching the following structure:
{
  "review": "Two-sentence max dynamic analytical review of my performance, highlighting strengths or calling out focus gaps.",
  "statusAdjustment": {
    "name": "Pumped", 
    "type": "buff", 
    "multiplier": 1.15, 
    "durationHours": 12, 
    "reason": "Outstanding completion rate yesterday!"
  },
  "recommendedQuest": {
    "title": "Double Down on Mind", 
    "macroCategory": "Mind", 
    "timeLimitHours": 24,
    "energyCost": "Medium"
  }
}`;

    const systemInstruction = `You are a strict but encouraging RPG game master. Analyze the player's performance yesterday and output a JSON object containing a dynamic review, a status adjustment, and a recommended quest. Ensure the response format is strictly JSON.`;

    try {
      const response = await window.LM.aiEngine.generateContent(prompt, systemInstruction);
      if (response.error) throw new Error(response.error);

      let jsonText = response.data.candidates[0].content.parts[0].text;
      jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonText);

      // 1. Cache the review
      save(KEYS.cachedReview, {
        date: new Date().toDateString(),
        text: parsed.review || "Yesterday is history, today is a clean slate."
      });

      // 2. Add Status Adjustment
      if (parsed.statusAdjustment) {
        addStatusEffect({
          id: parsed.statusAdjustment.name.toLowerCase().replace(/\s+/g, '-'),
          name: parsed.statusAdjustment.name,
          type: parsed.statusAdjustment.type || 'buff',
          multiplier: parsed.statusAdjustment.multiplier || 1.0,
          expiresAt: Date.now() + (parsed.statusAdjustment.durationHours || 24) * 3600000
        });
      }

      // 3. Add Recommended Quest
      if (parsed.recommendedQuest) {
        const macros = getMacros();
        let macroId = macros[0]?.id || 'overall';
        const cat = parsed.recommendedQuest.macroCategory;
        if (cat) {
          const match = macros.find(m => m.name.toLowerCase() === cat.toLowerCase());
          if (match) macroId = match.id;
        }

        const currentQuests = getQuests();
        currentQuests.push({
          id: uid(),
          name: parsed.recommendedQuest.title || 'AI Recommended Task',
          description: `AI recommended: ${parsed.statusAdjustment?.reason || 'Keep up the grind!'}`,
          status: 'active',
          scheduledDate: new Date().toDateString(),
          createdAt: Date.now(),
          timeLimitHours: parsed.recommendedQuest.timeLimitHours || 24,
          expiresAt: parsed.recommendedQuest.timeLimitHours ? (Date.now() + parsed.recommendedQuest.timeLimitHours * 3600000) : null,
          energyCost: parsed.recommendedQuest.energyCost || 'Medium',
          targetSkills: [{ macroSkillId: macroId, microSkillId: null, xpAmount: 30 }]
        });
        save(KEYS.quests, currentQuests);
      }

      emit('change');
    } catch (err) {
      console.error("Midnight Review AI analysis failed:", err);
      throw err;
    }
  }

  function checkMidnightReview() {
    const todayStr = new Date().toDateString();
    const lastReview = load(KEYS.lastReviewDate);
    if (!lastReview) {
      save(KEYS.lastReviewDate, todayStr);
      return;
    }

    if (lastReview !== todayStr) {
      triggerMidnightReview(lastReview);
      save(KEYS.lastReviewDate, todayStr);
    }
  }

  function checkResets() {
    checkPresetSpawns();
    checkMidnightReview();
  }

  // ── Expiration / Timer Check ──
  function checkTimers() {
    const quests = getQuests();
    let changed = false;
    const now = Date.now();

    quests.forEach(q => {
      if (q.expiresAt && q.expiresAt <= now) {
        if (q.status === 'active') {
          // Requirement 1: Expired active quests transition to 'missed' state and remain in the quest log.
          q.status = 'missed';
          changed = true;
          registerMissedQuest();
        }
      }
    });

    if (changed) {
      saveQuests(quests);
      emit('change');
    }
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

  function addQuestChain(data) {
    if (!data || !Array.isArray(data.quests)) return;
    const macros = getMacros();
    const quests = getQuests();
    const todayStr = new Date().toDateString();
    
    data.quests.forEach(q => {
      // Find matching macro skill
      let macroId = macros[0]?.id || 'overall';
      if (q.macroCategory) {
        const match = macros.find(m => m.name.toLowerCase() === q.macroCategory.toLowerCase());
        if (match) macroId = match.id;
      }
      
      quests.push({
        id: uid(),
        name: q.title || 'AI Generated Quest',
        description: q.description || `AI generated step for category ${q.macroCategory || ''}`,
        status: 'active',
        scheduledDate: todayStr,
        createdAt: Date.now(),
        timeLimitHours: q.timeLimitHours || 24,
        expiresAt: q.timeLimitHours ? (Date.now() + q.timeLimitHours * 3600000) : null,
        energyCost: q.energyCost || 'Medium',
        targetSkills: [{ macroSkillId: macroId, microSkillId: null, xpAmount: 20 }]
      });
    });
    
    save(KEYS.quests, quests);
    emit('change');
  }

  // ── Chain Quests ──
  function getAllChains() { return load(KEYS.chains) || []; }
  function getChains(macroId) { return getAllChains().filter(c => c.macroId === macroId); }
  function getChain(id) { return getAllChains().find(c => c.id === id) || null; }
  function saveChainsList(list) { save(KEYS.chains, list); emit('change'); }

  function upsertChain(chain) {
    const list = getAllChains();
    const idx = list.findIndex(c => c.id === chain.id);
    if (idx >= 0) list[idx] = chain; else list.push(chain);
    saveChainsList(list);
  }

  function deleteChain(id) { saveChainsList(getAllChains().filter(c => c.id !== id)); }

  function completeChainStep(chainId, stepId) {
    const list = getAllChains();
    const chain = list.find(c => c.id === chainId);
    if (!chain) return null;
    const activeIdx = chain.steps.findIndex(s => !s.completedAt);
    const stepIdx = chain.steps.findIndex(s => s.id === stepId);
    if (stepIdx < 0 || stepIdx !== activeIdx) return null;
    chain.steps[stepIdx].completedAt = Date.now();
    if (chain.steps[stepIdx].xpAmount) {
      awardXP([{ macroSkillId: chain.macroId, xpAmount: chain.steps[stepIdx].xpAmount }], false, `Chain: ${chain.name} — ${chain.steps[stepIdx].name}`);
    }
    saveChainsList(list);
    return chain.steps[stepIdx];
  }

  function exportBackup() {
    return {
      macros: getMacros(),
      quests: getQuests(),
      overall: getOverall(),
      settings: getSettings(),
      presets: getPresets(),
      chains: getAllChains(),
      xplog: load(KEYS.xplog) || [],
      lastUpdated: load(KEYS.lastUpdated) || Date.now()
    };
  }

  function importBackup(data) {
    if (!data) return false;
    if (data.macros) save(KEYS.macros, data.macros);
    if (data.quests) save(KEYS.quests, data.quests);
    if (data.overall) save(KEYS.overall, data.overall);
    if (data.settings) save(KEYS.settings, data.settings);
    if (data.presets) save(KEYS.presets, data.presets);
    if (data.chains) save(KEYS.chains, data.chains);
    if (data.xplog) save(KEYS.xplog, data.xplog);
    const cloudTime = data.lastUpdated || Date.now();
    save(KEYS.lastUpdated, cloudTime);
    emit('change');
    return true;
  }

  function getSyncEndpoint(key = "") {
    // When deployed on Netlify, use our own serverless function as the proxy
    // (avoids CORS issues entirely — the function runs server-side)
    const isDeployed = !window.location.hostname.includes('localhost') && 
                       !window.location.hostname.includes('127.0.0.1') &&
                       window.location.protocol !== 'file:';
    
    if (isDeployed) {
      // Use Netlify function as CORS proxy
      return key 
        ? `/api/sync?key=${encodeURIComponent(key)}`
        : `/api/sync`;
    } else {
      // Local dev fallback: direct URL (may need browser extension or CORS disabled)
      return key
        ? `https://jsonbin-zeta.vercel.app/api/bins/${key}`
        : `https://jsonbin-zeta.vercel.app/api/bins`;
    }
  }

  let isSyncing = false;
  async function pushCloudSync() {
    const settings = getSettings();
    if (!settings.syncKey || isSyncing) return;
    
    isSyncing = true;
    try {
      const backup = exportBackup();
      const endpoint = getSyncEndpoint(settings.syncKey);
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backup)
      });
      if (!res.ok) console.warn("Cloud sync update response not OK:", res.status);
    } catch (err) {
      console.warn("Cloud sync push failed:", err);
    } finally {
      isSyncing = false;
    }
  }

  async function pullCloudSync() {
    const settings = getSettings();
    if (!settings.syncKey || isSyncing) return false;
    
    isSyncing = true;
    try {
      const endpoint = getSyncEndpoint(settings.syncKey);
      const res = await fetch(endpoint);
      if (!res.ok) {
        isSyncing = false;
        return false;
      }
      
      const responseBody = await res.json();
      // jsonbin-zeta returns stored data at root level (not wrapped in .data)
      const cloudData = (responseBody && responseBody.macros) ? responseBody : responseBody.data;
      if (!cloudData || !cloudData.macros) {
        isSyncing = false;
        return false;
      }
      
      const localBackup = exportBackup();
      const cloudTime = cloudData.lastUpdated || 0;
      const localTime = localBackup.lastUpdated || 0;
      
      if (cloudTime > localTime) {
        // Cloud is newer, import it
        importBackup(cloudData);
        isSyncing = false;
        return 'pulled';
      } else if (localTime > cloudTime) {
        // Local is newer, update cloud.
        // We set isSyncing = false first because pushCloudSync checks for it
        isSyncing = false;
        await pushCloudSync();
        return 'pushed';
      }
      isSyncing = false;
      return 'synced';
    } catch (err) {
      console.warn("Cloud pull failed:", err);
      isSyncing = false;
      return false;
    }
  }

  // Debounced cloud push — waits 600ms after last change event before pushing.
  // This prevents the race condition where completeQuest() fires multiple change
  // events (one for XP award, one for quest deletion) and the push captures an
  // intermediate state (XP updated but quest not yet deleted).
  let _pushTimer = null;
  function schedulePush() {
    if (_pushTimer) clearTimeout(_pushTimer);
    _pushTimer = setTimeout(() => {
      _pushTimer = null;
      pushCloudSync();
    }, 600);
  }

  // Trigger debounced background upload whenever store data changes
  on('change', () => {
    schedulePush();
  });


  // ── Workout Templates ──
  function getWorkoutTemplates() { return load(KEYS.woTemplates) || []; }
  function upsertWorkoutTemplate(tpl) {
    const list = getWorkoutTemplates();
    const idx = list.findIndex(t => t.id === tpl.id);
    if (idx >= 0) list[idx] = tpl; else list.push(tpl);
    save(KEYS.woTemplates, list); emit('change');
  }
  function deleteWorkoutTemplate(id) {
    save(KEYS.woTemplates, getWorkoutTemplates().filter(t => t.id !== id)); emit('change');
  }


  return {
    on, emit,
    getMacros, getMacro, upsertMacro, deleteMacro,
    getMicroSkills, upsertMicroSkill, deleteMicroSkill,
    getPresets, getPreset, upsertPreset, deletePreset,
    getQuests, getQuest, upsertQuest, deleteQuest,
    getChains, getChain, upsertChain, deleteChain, completeChainStep,
    getOverall, saveOverall,
    getSettings, saveSettings,
    getXPLog, saveXPLog,
    getWorkoutTemplates, upsertWorkoutTemplate, deleteWorkoutTemplate,
    awardXP, completeQuest, markQuestReady, checkResets, checkTimers, addQuestChain,
    getActiveStatusEffects, addStatusEffect, registerMissedQuest, triggerMidnightReview, getCachedReview, checkMidnightReview,
    uid, exportBackup, importBackup, pushCloudSync, pullCloudSync, getSyncEndpoint
  };
})();
