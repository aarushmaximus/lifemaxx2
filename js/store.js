// LIFEMAXX — Data Store (localStorage)
window.LM.store = (function () {
  const KEYS = {
    macros: 'lm_macros',
    quests: 'lm_quests',
    overall: 'lm_overall',
    settings: 'lm_settings',
    xplog: 'lm_xplog',
    presets: 'lm_presets'
  };
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

    const tSkills = quest.targetSkills || [];
    const adjustedTargets = tSkills.map(t => ({ ...t, xpAmount: Math.round(t.xpAmount) }));
    awardXP(adjustedTargets, false, `Completed: ${quest.name}`);
    
    // Requirement 2: Auto-delete on XP claim!
    // The quest immediately deletes itself from local storage when XP is claimed.
    const filteredQuests = quests.filter(q => q.id !== questId);
    save(KEYS.quests, filteredQuests);
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
            expiresAt: p.hasTimeLimit ? (Date.now() + 24 * 60 * 60 * 1000) : null,
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

  function checkResets() {
    checkPresetSpawns();
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
        }
      }
    });

    if (changed) {
      saveQuests(quests);
      emit('change');
    }
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

  function exportBackup() {
    return {
      macros: getMacros(),
      quests: getQuests(),
      overall: getOverall(),
      settings: getSettings(),
      presets: getPresets(),
      xplog: load(KEYS.xplog) || []
    };
  }

  function importBackup(data) {
    if (!data) return false;
    if (data.macros) save(KEYS.macros, data.macros);
    if (data.quests) save(KEYS.quests, data.quests);
    if (data.overall) save(KEYS.overall, data.overall);
    if (data.settings) save(KEYS.settings, data.settings);
    if (data.presets) save(KEYS.presets, data.presets);
    if (data.xplog) save(KEYS.xplog, data.xplog);
    emit('change');
    return true;
  }

  return {
    on, emit,
    getMacros, getMacro, upsertMacro, deleteMacro,
    getMicroSkills, upsertMicroSkill, deleteMicroSkill,
    getPresets, getPreset, upsertPreset, deletePreset,
    getQuests, getQuest, upsertQuest, deleteQuest,
    getOverall, saveOverall,
    getSettings, saveSettings,
    getXPLog, saveXPLog,
    awardXP, completeQuest, markQuestReady, checkResets, checkTimers,
    uid, exportBackup, importBackup
  };
})();
