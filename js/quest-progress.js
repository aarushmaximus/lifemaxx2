// LIFEMAXX — Quest Progress Indicators Engine
window.LM.questProgress = (function () {
  const S = window.LM.store;
  let timerIntervals = {};

  function updateManual(questId, value) {
    const q = S.getQuest(questId);
    if (!q || !q.progressIndicator) return;
    q.progressIndicator.value = parseFloat(value);
    
    if (q.progressIndicator.value >= 100) {
      q.progressIndicator.value = 100;
      S.upsertQuest(q);
      completeQuest(questId);
    } else {
      S.upsertQuest(q);
      refreshViews();
    }
  }

  function toggleCheck(questId, index) {
    const q = S.getQuest(questId);
    if (!q || !q.progressIndicator || !q.progressIndicator.checklist) return;
    
    q.progressIndicator.checklist[index] = !q.progressIndicator.checklist[index];
    const checkedCount = q.progressIndicator.checklist.filter(c => c).length;
    const pct = Math.round((checkedCount / q.progressIndicator.checklist.length) * 100);
    q.progressIndicator.value = pct;
    
    if (pct >= 100) {
      S.upsertQuest(q);
      completeQuest(questId);
    } else {
      S.upsertQuest(q);
      refreshViews();
    }
  }

  function toggleTimer(questId) {
    const q = S.getQuest(questId);
    if (!q || !q.progressIndicator) return;
    
    const pi = q.progressIndicator;
    if (pi.timerIsRunning) {
      // Pause
      const now = Date.now();
      const leftSec = Math.max(0, Math.ceil((pi.timerEndTime - now) / 1000));
      pi.timerRemaining = leftSec;
      pi.timerIsRunning = false;
      pi.timerEndTime = 0;
      
      clearInterval(timerIntervals[questId]);
      delete timerIntervals[questId];
      
      S.upsertQuest(q);
      refreshViews();
    } else {
      // Play
      pi.timerIsRunning = true;
      pi.timerEndTime = Date.now() + (pi.timerRemaining * 1000);
      
      S.upsertQuest(q);
      refreshViews();
      startActiveInterval(questId);
    }
  }

  function startActiveInterval(questId) {
    if (timerIntervals[questId]) clearInterval(timerIntervals[questId]);
    
    timerIntervals[questId] = setInterval(() => {
      const q = S.getQuest(questId);
      if (!q || !q.progressIndicator || !q.progressIndicator.timerIsRunning) {
        clearInterval(timerIntervals[questId]);
        delete timerIntervals[questId];
        return;
      }
      
      const pi = q.progressIndicator;
      const now = Date.now();
      const leftSec = Math.ceil((pi.timerEndTime - now) / 1000);
      
      if (leftSec <= 0) {
        pi.timerRemaining = 0;
        pi.timerIsRunning = false;
        pi.timerEndTime = 0;
        pi.value = 100;
        
        clearInterval(timerIntervals[questId]);
        delete timerIntervals[questId];
        
        S.upsertQuest(q);
        completeQuest(questId);
      } else {
        pi.timerRemaining = leftSec;
        pi.value = Math.min(99, Math.round(((pi.timerDuration - leftSec) / pi.timerDuration) * 100));
        S.upsertQuest(q);
        updateTimerDOM(questId, pi);
      }
    }, 250);
  }

  function updateTimerDOM(questId, pi) {
    const rowEl = document.querySelector(`[data-quest-id="${questId}"]`) || document.querySelector(`[onclick*="'${questId}'"]`)?.closest('.quest-log-row');
    if (!rowEl) return;
    
    const fill = rowEl.querySelector('.pi-bar-fill');
    if (fill) fill.style.width = `${pi.value}%`;
    
    const label = rowEl.querySelector('.pi-timer-label');
    if (label) {
      const display = Math.max(0, pi.timerRemaining);
      const m = Math.floor(display / 60);
      const s = display % 60;
      label.textContent = `${m}:${s < 10 ? '0' : ''}${s} / ${Math.round(pi.timerDuration / 60)}m`;
    }
  }

  function completeQuest(questId) {
    // Play notification toast
    LM.components.notifications.toast('Quest Completed! +XP claimed.', 'success');
    
    const isDashboard = window.location.hash === '#dashboard' || !window.location.hash;
    if (isDashboard) {
      window.LM.views.dashboard.completeQuest(questId);
    } else {
      window.LM.views.questLog.completeQuest(questId);
    }
  }

  function refreshViews() {
    const hash = window.location.hash || '#dashboard';
    if (hash === '#dashboard') {
      window.LM.views.dashboard.refreshCards();
    } else if (hash === '#quests') {
      window.LM.views.questLog.refresh();
    }
  }

  function checkRunningTimers() {
    const quests = S.getQuests();
    let changed = false;
    
    quests.forEach(q => {
      if (q.status === 'active' && q.progressIndicator && q.progressIndicator.type === 'timer' && q.progressIndicator.timerIsRunning) {
        const pi = q.progressIndicator;
        const now = Date.now();
        const leftSec = Math.ceil((pi.timerEndTime - now) / 1000);
        
        if (leftSec <= 0) {
          pi.timerRemaining = 0;
          pi.timerIsRunning = false;
          pi.timerEndTime = 0;
          pi.value = 100;
          changed = true;
          
          setTimeout(() => completeQuest(q.id), 100);
        } else {
          pi.timerRemaining = leftSec;
          pi.value = Math.min(99, Math.round(((pi.timerDuration - leftSec) / pi.timerDuration) * 100));
          changed = true;
          
          // Re-spark the UI interval loop
          startActiveInterval(q.id);
        }
      }
    });
    
    if (changed) {
      S.saveQuests(quests);
      refreshViews();
    }
  }

  // ── Render HTML Shared Helper ──
  function renderIndicator(q) {
    if (!q.progressIndicator) return '';
    
    const pi = q.progressIndicator;
    let detailHTML = '';
    
    if (pi.type === 'manual') {
      detailHTML = `
        <div class="pi-manual-row" onclick="event.stopPropagation();">
          <input type="range" class="pi-slider" min="0" max="100" value="${pi.value}" onchange="LM.questProgress.updateManual('${q.id}', this.value)">
          <span class="pi-percent font-display">${pi.value}%</span>
        </div>`;
    } else if (pi.type === 'checks') {
      const bubbles = (pi.checklist || []).map((done, i) => {
        return `
          <button class="pi-check-bubble ${done ? 'pi-check-done' : ''}" onclick="LM.questProgress.toggleCheck('${q.id}', ${i}); event.stopPropagation();">
            ${done ? '✓' : (i + 1)}
          </button>`;
      }).join('');
      detailHTML = `<div class="pi-checks-row" onclick="event.stopPropagation();">${bubbles}</div>`;
    } else if (pi.type === 'timer') {
      const display = Math.max(0, pi.timerRemaining);
      const m = Math.floor(display / 60);
      const s = display % 60;
      const clockStr = `${m}:${s < 10 ? '0' : ''}${s} / ${Math.round(pi.timerDuration / 60)}m`;
      
      detailHTML = `
        <div class="pi-timer-row" onclick="event.stopPropagation();">
          <button class="btn-play-pause ${pi.timerIsRunning ? 'playing' : ''}" onclick="LM.questProgress.toggleTimer('${q.id}'); event.stopPropagation();">
            ${pi.timerIsRunning ? '⏸' : '▶'}
          </button>
          <span class="pi-timer-label font-display">${clockStr}</span>
        </div>`;
    }

    return `
      <div class="quest-pi-container">
        <div class="pi-bar-track">
          <div class="pi-bar-fill" style="width: ${pi.value}%;"></div>
        </div>
        ${detailHTML}
      </div>`;
  }

  return { updateManual, toggleCheck, toggleTimer, checkRunningTimers, renderIndicator };
})();
