// LIFEMAXX — Research Timer (timed session component)
window.LM.components.researchTimer = (function () {
  const S = window.LM.store;
  const N = window.LM.components.notifications;

  // Global timer state (survives re-renders if we preserve it)
  let state = { questId: null, interval: null, elapsed: 0, earned: 0, cap: 0, rate: 0 };

  function start(questId) {
    if (state.interval) stop(); // stop any running timer
    const quest = S.getQuest(questId);
    if (!quest || !quest.timedResearch?.enabled) return;

    state = {
      questId,
      interval: null,
      elapsed: 0,
      earned: 0,
      cap: quest.timedResearch.sessionXPCap || 50,
      rate: quest.timedResearch.xpPerSecond || 0.05
    };

    state.interval = setInterval(() => {
      state.elapsed++;
      state.earned = Math.min(state.cap, state.elapsed * state.rate);
      updateUI(questId);
      if (state.earned >= state.cap) stop(true); // auto-stop at cap
    }, 1000);

    updateUI(questId);
    N.show(`Research session started for "${quest.name}"`, 'info');
  }

  function stop(autoCap = false) {
    if (!state.interval) return;
    clearInterval(state.interval);
    const questId = state.questId;
    const xpEarned = Math.round(state.earned);
    const elapsed = state.elapsed;

    if (xpEarned > 0) {
      const quest = S.getQuest(questId);
      if (quest) {
        // Award XP
        S.awardXP(quest.targetSkills.map(t => ({ ...t, xpAmount: xpEarned })));
        // Log session
        const session = { startedAt: Date.now() - elapsed * 1000, endedAt: Date.now(), xpEarned, durationSec: elapsed };
        quest.timedResearch.sessions = [...(quest.timedResearch.sessions || []), session];
        // Add research entry
        quest.researchLog = quest.researchLog || [];
        quest.researchLog.unshift({
          id: S.uid(), questId, title: `Research Session — ${new Date().toLocaleDateString()}`,
          content: `Timed session: ${formatTime(elapsed)} → +${xpEarned} XP`, createdAt: Date.now(), tags: ['timed-session']
        });
        S.upsertQuest(quest);
        N.xpGain('Research', xpEarned, 'var(--accent)');
        if (autoCap) N.show('Session cap reached! XP awarded.', 'success');
        else N.show(`Session ended: +${xpEarned} XP earned`, 'success');
      }
    }

    state = { questId: null, interval: null, elapsed: 0, earned: 0, cap: 0, rate: 0 };
    S.emit('change');
  }

  function isRunning(questId) { return state.questId === questId && state.interval !== null; }

  function updateUI(questId) {
    const bar = document.getElementById(`timer-bar-${questId}`);
    const elapsed = document.getElementById(`timer-elapsed-${questId}`);
    const earned = document.getElementById(`timer-earned-${questId}`);
    const pct = state.cap > 0 ? (state.earned / state.cap * 100) : 0;
    if (bar) bar.style.width = `${pct}%`;
    if (elapsed) elapsed.textContent = formatTime(state.elapsed);
    if (earned) earned.textContent = `+${Math.round(state.earned)} / ${state.cap} XP`;
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function renderButton(quest) {
    if (!quest.timedResearch?.enabled) return '';
    const running = isRunning(quest.id);
    return `
      <div class="timer-widget" id="timer-widget-${quest.id}">
        ${running ? `
          <div class="timer-bar-track"><div class="timer-bar-fill" id="timer-bar-${quest.id}" style="width:0%"></div></div>
          <div class="timer-meta">
            <span id="timer-elapsed-${quest.id}">00:00</span>
            <span id="timer-earned-${quest.id}">+0 / ${quest.timedResearch.sessionXPCap} XP</span>
          </div>
          <button class="btn-timer btn-timer-stop" onclick="LM.components.researchTimer.stop()">■ End Session</button>
        ` : `
          <button class="btn-timer btn-timer-start" onclick="LM.components.researchTimer.start('${quest.id}')">▶ Start Research Session</button>
          <span class="timer-meta-info">${quest.timedResearch.xpPerSecond} XP/sec · cap ${quest.timedResearch.sessionXPCap} XP</span>
        `}
      </div>`;
  }

  return { start, stop, isRunning, renderButton, formatTime };
})();
