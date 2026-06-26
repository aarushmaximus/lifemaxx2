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
    habituals: 'lm_habituals',
    woTemplates: 'lm_workout_templates',
    lastUpdated: 'lm_last_updated',
    lastReviewDate: 'lm_last_review_date',
    lastWorkoutGenDate: 'lm_last_workout_gen_date',
    cachedReview: 'lm_cached_review',
    coachChats: 'lm_coach_chats',
    history: 'lm_history',
    dailyLogs: 'lm_daily_logs',
    cellPresets: 'lm_cell_presets',
    statistics: 'lm_statistics',
    statLogs: 'lm_stat_logs',
    weeklySplit: 'lm_weekly_split'
  };
  const HISTORY_MAX = 200;
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

  // ── Statistics ──
  function getStatistics() { return load(KEYS.statistics) || []; }
  function saveStatistics(list) { save(KEYS.statistics, list); emit('change'); }
  function getStatistic(id) { return getStatistics().find(s => s.id === id) || null; }

  function upsertStatistic(stat) {
    const list = getStatistics();
    const idx = list.findIndex(s => s.id === stat.id);
    if (idx >= 0) list[idx] = stat; else list.push(stat);
    saveStatistics(list);
  }

  function deleteStatistic(id) {
    saveStatistics(getStatistics().filter(s => s.id !== id));
  }

  function getStatLogs() { return load(KEYS.statLogs) || []; }
  function saveStatLogs(list) { save(KEYS.statLogs, list); emit('change'); }
  function addStatLog(statId, value, dateStr, xpDelta) {
    const list = getStatLogs();
    list.push({ id: 'slog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5), statId, value, dateStr, xpDelta, timestamp: Date.now() });
    saveStatLogs(list);
  }

  // ── Quest Instances ──
  function getQuests() { return load(KEYS.quests) || []; }
  function saveQuests(list) { save(KEYS.quests, list); emit('change'); }
  function getQuest(id) { return getQuests().find(q => q.id === id) || null; }

  function upsertQuest(quest) {
    const list = getQuests();
    const idx = list.findIndex(q => q.id === quest.id);
    const isNew = idx < 0;
    if (idx >= 0) list[idx] = quest; else list.push(quest);
    saveQuests(list);
    if (isNew) {
      addHistoryEntry('quest_created', `Created quest: ${quest.name}`, { questId: quest.id });
    }
  }

  function deleteQuest(id, forcePermanent = false) {
    const quests = getQuests();
    const quest = quests.find(q => q.id === id);
    if (!quest) return;
    
    addHistoryEntry('quest_deleted', `Deleted quest: ${quest.name}`, { questId: quest.id });
    
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
    return load(KEYS.settings) || { theme: 'dark', accentColor: '#7c3aed', wheelSkillId: 'overall', dragToRegister: true, deleteAfterDragged: false, chromeAccentsEnabled: true, questSelectorStyle: 'wheel' };
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
    
    // Log completion + XP gains to history
    const totalXP = adjustedTargets.reduce((s, t) => s + t.xpAmount, 0);
    const skillNames = adjustedTargets.map(t => {
      const m = getMacro(t.macroSkillId);
      return m ? `${m.name} +${t.xpAmount}xp` : `+${t.xpAmount}xp`;
    }).join(', ');
    addHistoryEntry('quest_completed', `Completed: ${quest.name}`, { questId: quest.id, xp: totalXP, skills: skillNames });
    
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
            timeWindow: p.timeWindow || null
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



  function checkMidnightResets() {
    const todayStr = new Date().toDateString();
    const lastReview = load(KEYS.lastReviewDate);
    if (!lastReview) {
      save(KEYS.lastReviewDate, todayStr);
      return;
    }

    if (lastReview !== todayStr) {
      // Midnight Reset Logic for Statistics
      const quests = getQuests();
      const logs = getDailyLogs();
      const yesterdayLog = logs[lastReview] || getDailyLog(lastReview);
      
      let changed = false;
      quests.forEach(q => {
        if (q.type === 'statistic') {
          if (!yesterdayLog.statsSnapshot) yesterdayLog.statsSnapshot = {};
          yesterdayLog.statsSnapshot[q.id] = { name: q.name, value: q.currentValue || 0, goal: q.dailyGoal, unit: q.unit };
          
          // Calculate and award XP based on proximity to dailyGoal
          if (q.targetSkills && q.targetSkills.length > 0 && q.dailyGoal > 0) {
            const diff = Math.abs((q.currentValue || 0) - q.dailyGoal);
            const closeness = Math.max(0, 1 - (diff / q.dailyGoal)); // Range 0 to 1
            
            if (closeness > 0) {
              const scaledSkills = q.targetSkills.map(t => ({
                macroSkillId: t.macroSkillId,
                microSkillId: t.microSkillId,
                xpAmount: Math.round(t.xpAmount * closeness)
              })).filter(t => t.xpAmount > 0);
              
              if (scaledSkills.length > 0) {
                awardXP(scaledSkills, false, `Statistic Goal: ${q.name} (${Math.round(closeness*100)}% Match)`);
              }
            }
          }

          q.currentValue = 0; // Reset for new day
          changed = true;
        }
      });
      
      if (changed) saveQuests(quests);
      
      logs[lastReview] = yesterdayLog;
      saveDailyLogs(logs);

      save(KEYS.lastReviewDate, todayStr);
    }
  }

  // ── Weekly Split ──
  function getWeeklySplit() {
    let split = load(KEYS.weeklySplit);
    if (!split || !Array.isArray(split) || split.length !== 7) {
      split = Array(7).fill(null).map(() => ({ isActive: false, name: '', muscleGroups: [], exercises: [], xpReward: 500 }));
      save(KEYS.weeklySplit, split);
    }
    return split;
  }
  function upsertWeeklySplit(split) {
    save(KEYS.weeklySplit, split);
  }

  function checkWeeklyWorkoutGen(force) {
    const todayStr = new Date().toDateString();
    const lastGen = load(KEYS.lastWorkoutGenDate);
    if (lastGen === todayStr && !force) return; // Already generated today

    const split = getWeeklySplit();
    const dayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon...
    const todayConfig = split[dayIndex];

    if (todayConfig && todayConfig.isActive) {
      // If forcing, check if we already have an active workout quest today to avoid duplicates
      if (force) {
        const existingWorkout = getQuests().find(q => q.isWorkoutQuest && q.status === 'active' && new Date(q.createdAt).toDateString() === todayStr);
        if (existingWorkout) return; // Don't duplicate if one is already active today
      }
      // Find the titan macro to link it
      const macros = getMacros();
      let titanMacro = macros.find(m => m.name.toLowerCase() === 'titan');
      if (!titanMacro) {
        // Fallback to searching for other physique names if 'titan' was renamed
        const PHYSIQUE_NAMES = ['physique', 'corpus', 'forge', 'brawn', 'titan'];
        titanMacro = macros.find(m => PHYSIQUE_NAMES.some(n => m.name.toLowerCase().includes(n)) || m.accentColor === '#ef4444');
      }
      if (!titanMacro && macros.length > 0) {
        titanMacro = macros[0]; // Ultimate fallback: just pick the first skill so it doesn't fail silently
      }

      if (titanMacro) {
        const quest = {
          id: uid(),
          name: todayConfig.name || "Workout",
          description: "Auto-generated daily workout.",
          type: "daily",
          status: "active",
          isWorkoutQuest: true,
          workout: { exercises: JSON.parse(JSON.stringify(todayConfig.exercises || [])) },
          targetSkills: [{ macroSkillId: titanMacro.id, microSkillId: null, xpAmount: todayConfig.xpReward || 500 }],
          createdAt: Date.now(),
          streak: 0,
          isCustom: true
        };
        
        // Reset sets
        if (quest.workout.exercises) {
          quest.workout.exercises.forEach(ex => {
            ex.completedSets = Array(ex.sets || 3).fill(false);
          });
        }

        upsertQuest(quest);
      }
    }
    
    save(KEYS.lastWorkoutGenDate, todayStr);
  }

  function checkResets() {
    checkPresetSpawns();
    checkMidnightResets();
    checkWeeklyWorkoutGen();
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
          addHistoryEntry('quest_missed', `Missed: ${q.name}`, { questId: q.id });
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
    
    const step = chain.steps[stepIdx];
    step.completedAt = Date.now();
    
    // Award XP based on the step's targetSkills (which is a full Quest object now)
    if (step.targetSkills && step.targetSkills.length > 0) {
      awardXP(step.targetSkills, false, `Chain: ${chain.name} — ${step.name}`);
      
      // Calculate total XP for the return value
      step.xpAmount = step.targetSkills.reduce((sum, t) => sum + (t.xpAmount || 0), 0);
    } else if (step.xpAmount) {
      // Fallback for legacy chain steps that just had xpAmount
      awardXP([{ macroSkillId: chain.macroId, xpAmount: step.xpAmount }], false, `Chain: ${chain.name} — ${step.name}`);
    }
    
    saveChainsList(list);
    return step;
  }

  // ── Habituals ──
  // A habitual is a daily task tied to a macro skill.
  // Fields: { id, macroId, name, xpGain, xpLoss, createdAt, todayStatus: null|'yes'|'no', lastResetDate }
  function getHabituals() { return load(KEYS.habituals) || []; }
  function saveHabituals(list) { save(KEYS.habituals, list); emit('change'); }
  function getHabitual(id) { return getHabituals().find(h => h.id === id) || null; }

  function upsertHabitual(h) {
    const list = getHabituals();
    const idx = list.findIndex(x => x.id === h.id);
    if (idx >= 0) list[idx] = h; else list.push(h);
    saveHabituals(list);
  }

  function deleteHabitual(id) {
    saveHabituals(getHabituals().filter(h => h.id !== id));
  }

  // Returns the current IST date string e.g. "2026-06-15"
  function getISTDateString() {
    const now = new Date();
    // IST = UTC + 5:30
    const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
    const ist = new Date(istMs);
    return ist.toISOString().slice(0, 10); // "YYYY-MM-DD"
  }

  // Called on app load: reset any habituals whose lastResetDate != today (IST)
  // If todayStatus is null (not answered) AND it's past midnight IST since lastResetDate → deduct xpLoss
  function checkHabitualReset() {
    const todayIST = getISTDateString();
    let list = getHabituals();
    let changed = false;
    list = list.map(h => {
      if (!h.lastResetDate) {
        // First time, just set date
        return { ...h, lastResetDate: todayIST, todayStatus: null };
      }
      if (h.lastResetDate !== todayIST) {
        // New day! Apply penalty if no answer was given yesterday
        if (h.todayStatus === null || h.todayStatus === undefined) {
          // Missed — deduct xpLoss
          if (h.xpLoss && h.xpLoss > 0) {
            awardXP([{ macroSkillId: h.macroId, xpAmount: -h.xpLoss }], false, `Habitual missed: ${h.name}`);
            addHistoryEntry('habitual_missed', `Habitual missed: ${h.name}`, { habitualId: h.id, xp: -h.xpLoss });
          }
        }
        changed = true;
        return { ...h, lastResetDate: todayIST, todayStatus: null };
      }
      return h;
    });
    if (changed) saveHabituals(list);
  }

  // ── Coach Chats ──
  function getCoachChats() { return load(KEYS.coachChats) || []; }
  function saveCoachChats(list) { save(KEYS.coachChats, list); emit('change'); }
  function getCoachChat(id) { return getCoachChats().find(c => c.id === id) || null; }
  
  function upsertCoachChat(chat) {
    const list = getCoachChats();
    const idx = list.findIndex(c => c.id === chat.id);
    if (idx >= 0) list[idx] = chat; else list.push(chat);
    saveCoachChats(list);
  }
  
  function deleteCoachChat(id) {
    saveCoachChats(getCoachChats().filter(c => c.id !== id));
  }

  // ── Daily Logs (24h Cells) ──
  function getDailyLogs() { return load(KEYS.dailyLogs) || {}; }
  function saveDailyLogs(logs) { save(KEYS.dailyLogs, logs); emit('change'); }
  
  function getDailyLog(dateStr) {
    const logs = getDailyLogs();
    if (logs[dateStr]) return logs[dateStr];
    return {
      date: dateStr,
      cells: Array.from({ length: 24 }).map(() => ({ status: null, note: '', quests: [] })),
      statsSnapshot: {}
    };
  }

  function upsertDailyLog(log) {
    const logs = getDailyLogs();
    logs[log.date] = log;
    saveDailyLogs(logs);
  }

  // ── Cell Presets ──
  function getCellPresets() { 
    return load(KEYS.cellPresets) || [
      { id: 'sleep', label: 'Sleep', color: '#1E1E2A', icon: 'bedtime' },
      { id: 'work', label: 'Work', color: '#1D3557', icon: 'work' },
      { id: 'workout', label: 'Workout', color: '#E63946', icon: 'fitness_center' },
      { id: 'relax', label: 'Relax', color: '#2A9D8F', icon: 'coffee' }
    ]; 
  }
  function saveCellPresets(list) { save(KEYS.cellPresets, list); emit('change'); }

  function upsertCellPreset(preset) {
    const list = getCellPresets();
    const idx = list.findIndex(p => p.id === preset.id);
    if (idx >= 0) list[idx] = preset; else list.push(preset);
    saveCellPresets(list);
  }

  function deleteCellPreset(id) {
    saveCellPresets(getCellPresets().filter(p => p.id !== id));
  }

  function exportBackup() {
    return {
      macros: getMacros(),
      quests: getQuests(),
      overall: getOverall(),
      settings: getSettings(),
      presets: getPresets(),
      chains: getAllChains(),
      habituals: getHabituals(),
      xplog: load(KEYS.xplog) || [],
      coachChats: getCoachChats(),
      history: getHistory(),
      dailyLogs: getDailyLogs(),
      cellPresets: getCellPresets(),
      weeklySplit: getWeeklySplit(),
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
    if (data.habituals) save(KEYS.habituals, data.habituals);
    if (data.xplog) save(KEYS.xplog, data.xplog);
    if (data.coachChats) save(KEYS.coachChats, data.coachChats);
    if (data.history) save(KEYS.history, data.history);
    if (data.dailyLogs) save(KEYS.dailyLogs, data.dailyLogs);
    if (data.cellPresets) save(KEYS.cellPresets, data.cellPresets);
    if (data.weeklySplit) save(KEYS.weeklySplit, data.weeklySplit);
    const cloudTime = data.lastUpdated || Date.now();
    save(KEYS.lastUpdated, cloudTime);
    emit('change');
    return true;
  }

  function getSyncEndpoint(key = "") {
    // When deployed on Cloudflare, use our own serverless function/worker as the proxy
    // (avoids CORS issues entirely — the function runs server-side)
    const isDeployed = !window.location.hostname.includes('localhost') && 
                       !window.location.hostname.includes('127.0.0.1') &&
                       window.location.protocol !== 'file:';
    
    if (isDeployed) {
      // Use Cloudflare endpoint as CORS proxy
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


  // ── History / Activity Log ──
  function getHistory() { return load(KEYS.history) || []; }
  function addHistoryEntry(type, message, details = {}) {
    const history = getHistory();
    history.push({
      id: uid(),
      timestamp: Date.now(),
      type: type,
      message: message,
      details: details
    });
    // Auto-prune to keep only the most recent entries
    while (history.length > HISTORY_MAX) history.shift();
    save(KEYS.history, history);
  }
  function clearHistory() { save(KEYS.history, []); }

  return {
    on, emit,
    getMacros, getMacro, upsertMacro, deleteMacro,
    getMicroSkills, upsertMicroSkill, deleteMicroSkill,
    getPresets, getPreset, upsertPreset, deletePreset,
    getStatistics, getStatistic, upsertStatistic, deleteStatistic, getStatLogs, addStatLog,
    getQuests, getQuest, upsertQuest, deleteQuest,
    getChains, getAllChains, getChain, upsertChain, deleteChain, completeChainStep,
    getHabituals, getHabitual, upsertHabitual, deleteHabitual, checkHabitualReset,
    getWeeklySplit, upsertWeeklySplit, checkWeeklyWorkoutGen,
    getOverall, saveOverall,
    getSettings, saveSettings,
    getXPLog, saveXPLog,
    getWorkoutTemplates, upsertWorkoutTemplate, deleteWorkoutTemplate,
    getCoachChats, getCoachChat, upsertCoachChat, deleteCoachChat,
    getDailyLogs, getDailyLog, upsertDailyLog,
    getCellPresets, saveCellPresets, upsertCellPreset, deleteCellPreset,
    awardXP, completeQuest, markQuestReady, checkResets, checkTimers, addQuestChain,
    getActiveStatusEffects, addStatusEffect, registerMissedQuest, checkMidnightResets,
    getHistory, addHistoryEntry, clearHistory,
    uid, exportBackup, importBackup, pushCloudSync, pullCloudSync, getSyncEndpoint
  };
})();
