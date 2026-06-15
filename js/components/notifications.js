// LIFEMAXX — Toast Notifications
window.LM.components.notifications = (function () {

  function show(message, type = 'info', duration = 3500) {
    const historyEntries = document.getElementById('history-bar-entries');
    if (historyEntries) {
      const emptyState = historyEntries.querySelector('.history-empty');
      if (emptyState) emptyState.remove();

      const entry = document.createElement('div');
      entry.className = `history-entry history-${type === 'warning' || type === 'error' ? 'danger' : type === 'success' || type === 'xp' ? 'success' : 'accent'}`;
      entry.style.transition = 'all 0.3s ease';
      
      const icon = { info: 'ℹ', success: '✓', warning: '⚠', error: '⚠', xp: '⬡' }[type] || 'ℹ';
      const colorVar = type === 'warning' || type === 'error' ? 'var(--danger)' : type === 'success' || type === 'xp' ? 'var(--success)' : 'var(--text-1)';
      
      entry.innerHTML = `
        <span class="history-icon" style="color: ${colorVar};">${icon}</span>
        <div class="history-body">
          <span class="history-msg" style="color: ${colorVar}; font-weight: 500;">${message}</span>
        </div>
        <div class="history-time">
          <span>Just now</span>
        </div>
      `;
      historyEntries.prepend(entry);
      
      setTimeout(() => {
        entry.style.opacity = '0';
        entry.style.transform = 'translateX(20px)';
        setTimeout(() => entry.remove(), 300);
      }, duration);
      return;
    }

    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${{ info: 'ℹ', success: '✓', warning: '⚠', xp: '⬡' }[type] || 'ℹ'}</span>
      <span class="toast-msg">${message}</span>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    setTimeout(() => {
      toast.classList.remove('toast-visible');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
  }

  function xpGain(skillName, amount, color) {
    show(`+${Math.round(amount)} XP → ${skillName}`, 'xp', 3000);
    // Log to history
    if (window.LM.store?.addHistoryEntry) {
      window.LM.store.addHistoryEntry('xp_gain', `+${Math.round(amount)} XP → ${skillName}`, { xp: Math.round(amount), skill: skillName });
    }
  }

  function levelUp(skillName, level, color) {
    show(`⬆ LEVEL UP — ${skillName} reached Level ${level}!`, 'success', 4500);
    // Log to history
    if (window.LM.store?.addHistoryEntry) {
      window.LM.store.addHistoryEntry('level_up', `Level Up! ${skillName} → Level ${level}`, { skill: skillName, level });
    }
    
    // Trigger visual pop animation on level displays
    const els = document.querySelectorAll('.level-big, #wheel-level-text, .sidebar-skill-level');
    els.forEach(el => {
      el.classList.remove('level-up-pop');
      void el.offsetWidth;
      el.classList.add('level-up-pop');
    });

    const bloom = document.getElementById('level-up-bloom');
    if (bloom) {
      bloom.classList.remove('active');
      void bloom.offsetWidth;
      bloom.classList.add('active');
      setTimeout(() => bloom.classList.remove('active'), 2500);
    }
  }

  function streakMilestone(questName, streak) {
    const mult = streak >= 30 ? '2.0x' : '1.5x';
    show(`${streak}-Day Streak on "${questName}" — ${mult} XP Multiplier!`, 'warning', 4000);
  }

  return { show, xpGain, levelUp, streakMilestone };
})();
