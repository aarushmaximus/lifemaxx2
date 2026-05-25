// LIFEMAXX — Data Store (localStorage)
window.LM.store = (function () {
  const KEYS = { macros: 'lm_macros', quests: 'lm_quests', overall: 'lm_overall', settings: 'lm_settings', xplog: 'lm_xplog' };
  const listeners = [];
  const F = window.LM.formulas;

  function on(event, fn) { listeners.push({ event, fn }); }
  function emit(event, data) { listeners.filter(l => l.event === event).forEach(l => l.fn(data)); }

  function load(key) { try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; } }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

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
      q.targetSkills = q.targetSkills.filter(t => t.macroSkillId !== id);
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

  // ── Quests ──
  function getQuests() { 
    let qs = load(KEYS.quests) || []; 
    let migrated = false;
    qs.forEach(q => {
      if (q.type === 'daily') {
        q.type = 'habit';
        q.scheduledDays = [0,1,2,3,4,5,6];
        q.isNegativeOnMiss = true;
        migrated = true;
      }
    });
    if (migrated) save(KEYS.quests, qs);
    return qs;
  }
  function saveQuests(list) { save(KEYS.quests, list); emit('change'); }
  function getQuest(id) { return getQuests().find(q => q.id === id) || null; }

  function upsertQuest(quest) {
    const list = getQuests();
    const idx = list.findIndex(q => q.id === quest.id);
    if (idx >= 0) list[idx] = quest; else list.push(quest);
    saveQuests(list);
  }

  function deleteQuest(id) { saveQuests(getQuests().filter(q => q.id !== id)); }

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
  function getXPLog(macroId) { return (load(KEYS.xplog) || []).filter(e => e.macroId === macroId); }
  function saveXPLog(log) { save(KEYS.xplog, log); }

  // ── Award XP ──
  function awardXP(targetSkills, negative = false, reason = '') {
    if (!Array.isArray(targetSkills)) return { overallDelta: 0 };
    const macros = getMacros();
    const log = load(KEYS.xplog) || [];
    let overallDelta = 0;
    const sign = negative ? -1 : 1;

    targetSkills.forEach(t => {
      const macro = macros.find(m => m.id === t.macroSkillId);
      if (!macro) return;
      const delta = sign * t.xpAmount;
      macro.currentXP = Math.max(0, (macro.currentXP || 0) + delta);
      macro.currentLevel = F.currentLevel(macro.currentXP, macro);

      if (t.microSkillId) {
        const ms = (macro.microSkills || []).find(ms => ms.id === t.microSkillId);
        if (ms) {
          ms.currentXP = Math.max(0, (ms.currentXP || 0) + delta);
          ms.currentLevel = F.currentLevel(ms.currentXP, ms);
        }
      }
      overallDelta += t.xpAmount;
      
      log.push({
        id: uid(),
        timestamp: Date.now(),
        macroId: macro.id,
        microId: t.microSkillId || null,
        delta: delta,
        reason: reason
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

    const today = new Date().toDateString();

    let xpMultiplier = 1;
    if (quest.type === 'habit') {
      const streak = (quest.streak || 0) + 1;
      quest.streak = streak;
      quest.lastCompletedDate = today;
      if (streak >= 30) xpMultiplier = 2.0;
      else if (streak >= 7) xpMultiplier = 1.5;
      
      quest.status = 'completed'; // Mark completed so it doesn't fail
      quest.completedAt = Date.now();
    } else {
      quest.status = 'completed';
      quest.completedAt = Date.now();
    }

    const tSkills = quest.targetSkills || [];
    const adjustedTargets = tSkills.map(t => ({ ...t, xpAmount: Math.round(t.xpAmount * xpMultiplier) }));
    const negative = quest.isNegativeOnComplete || false;
    const actionDesc = negative ? 'Failed' : 'Completed';
    awardXP(adjustedTargets, negative, `${actionDesc}: ${quest.name}`);
    
    quest.isReadyToClaim = false;
    if (getSettings().deleteAfterDragged) {
      quest.hiddenFromDashboard = true;
    }

    save(KEYS.quests, quests);
    emit('change');
    return { quest, xpMultiplier, adjustedTargets };
  }

  // ── Daily/Weekly Reset Check ──
  function checkResets() {
    const quests = getQuests();
    const now = new Date();
    const todayStr = now.toDateString();
    const currentMonday = getMonday(now).toDateString();
    let changed = false;

    const todayDay = now.getDay();

    quests.forEach(q => {
      if (q.type === 'habit') {
        if (q.scheduledDays && q.scheduledDays.includes(todayDay)) {
          if (q.lastResetDate !== todayStr) {
            q.lastResetDate = todayStr;
            q.status = 'active';
            q.isReadyToClaim = false;
            
            // Set expiresAt to 23:59:59.999 of today
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            q.expiresAt = endOfDay.getTime();
            changed = true;
          }
        }
      }
      if (q.type === 'weekly') {
        if (q.lastWeekReset !== currentMonday) {
          if (q.lastWeekReset && q.status !== 'completed' && q.isNegativeOnMiss) {
            awardXP(q.targetSkills, true);
          }
          q.status = 'active';
          q.lastWeekReset = currentMonday;
          changed = true;
        }
      }
    });

    if (changed) saveQuests(quests);
  }

  // ── Timer Check ──
  function checkTimers() {
    const quests = getQuests();
    let changed = false;
    const now = Date.now();

    quests.forEach(q => {
      if (q.expiresAt && q.expiresAt <= now) {
        if (q.status === 'active') {
          if (q.isNegativeOnMiss || q.type === 'habit') {
            awardXP(q.targetSkills, true, `Missed: ${q.name}`);
          }
          if (q.type === 'habit') {
            q.streak = 0;
            q.status = 'failed';
            changed = true;
          } else if (q.status !== 'failed' && q.status !== 'completed') {
            q.status = 'failed';
            changed = true;
          }
        }
      }
    });

    if (changed) {
      saveQuests(quests);
      emit('change');
    }
  }

  function getMonday(d) {
    const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

  return {
    on, emit,
    getMacros, getMacro, upsertMacro, deleteMacro,
    getMicroSkills, upsertMicroSkill, deleteMicroSkill,
    getQuests, getQuest, upsertQuest, deleteQuest,
    getOverall, saveOverall,
    getSettings, saveSettings,
    getXPLog, saveXPLog,
    awardXP, completeQuest, markQuestReady, checkResets, checkTimers,
    uid
  };
})();
