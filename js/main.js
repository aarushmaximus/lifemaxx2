// LIFEMAXX — Router & App Boot
window.LM.router = (function () {
  const S = window.LM.store;
  const views = {
    dashboard: window.LM.views.dashboard,
    quests: window.LM.views.questLog,
    settings: window.LM.views.settings,
    skills: window.LM.views.skills,
    me: window.LM.views.me,
    coach: window.LM.views.coach
  };

  let currentView = null;
  let currentSkillId = null;

  function getRoute() {
    const hash = window.location.hash || '#dashboard';
    if (hash.startsWith('#skill-hub/'))     return { view: 'skillHub',     skillId: hash.split('/')[1] };
    if (hash.startsWith('#skill-chains/'))  return { view: 'skillChains',  skillId: hash.split('/')[1] };
    if (hash.startsWith('#skill-widgets/')) return { view: 'skillWidgets', skillId: hash.split('/')[1] };
    if (hash.startsWith('#skill/'))         return { view: 'skillDetail',  skillId: hash.split('/')[1] };
    const v = hash.replace('#','');
    return { view: ['dashboard','quests','settings','skills','me','coach'].includes(v) ? v : 'dashboard' };
  }

  function navigate(hash) {
    window.location.hash = hash;
  }

  function render() {
    const route = getRoute();
    const main = document.getElementById('main-content');
    if (!main) return;

    // Animate out
    main.style.opacity = '0';
    main.style.transition = 'opacity 0.2s ease';

    setTimeout(() => {
      main.style.opacity = '1';
      main.style.transition = '';
      
      if (route.view === 'skillDetail') {
        main.innerHTML = window.LM.views.skillDetail.render(route.skillId);
        window.LM.views.skillDetail.init();
      } else if (route.view === 'skillHub') {
        main.innerHTML = window.LM.views.skillHub.render(route.skillId);
        window.LM.views.skillHub.init(route.skillId);
      } else if (route.view === 'skillChains') {
        main.innerHTML = window.LM.views.skillChains.render(route.skillId);
        window.LM.views.skillChains.init(route.skillId);
      } else if (route.view === 'skillWidgets') {
        main.innerHTML = window.LM.views.skillWidgets.render(route.skillId);
        window.LM.views.skillWidgets.init(route.skillId);
      } else {
        const view = views[route.view] || views.dashboard;
        main.innerHTML = view.render();
        view.init();
      }

      // Update bottom nav active state
      const activeView = route.view.startsWith('skill') ? 'skills' : route.view;
      document.querySelectorAll('[data-nav-view]').forEach(el => {
        const isActive = el.dataset.navView === activeView;
        el.classList.toggle('nav-active', isActive);
        el.classList.toggle('text-primary', isActive);
        el.classList.toggle('scale-110', isActive);
        el.classList.toggle('text-on-surface-variant', !isActive);
      });

      // Hide FAB on coach view to avoid overlapping the input bar
      const fab = document.getElementById('fab');
      if (fab) {
        fab.style.display = route.view === 'coach' ? 'none' : 'flex';
      }

      // Animate in via CSS class
      const child = main.firstElementChild;
      if (child) {
        child.classList.remove('page-enter');
        void child.offsetWidth; // force reflow
        child.classList.add('page-enter');
      }
    }, 200);
  }

  function init() {
    window.addEventListener('hashchange', render);
    render();
  }

  return { navigate, render, init };
})();

// ── Sidebar Skill List ──
function renderSidebarSkills() {
  const macros = LM.store.getMacros();
  const list = document.getElementById('sidebar-skill-list');
  if (!list) return;
  list.innerHTML = macros.map(m => `
    <a href="#skill/${m.id}" class="sidebar-skill-item" onclick="LM.router.navigate('#skill/${m.id}')">
      <span class="sidebar-skill-dot" style="background:${m.accentColor}"></span>
      <span class="sidebar-skill-name">${m.name}</span>
      <span class="sidebar-skill-level">Lv${m.currentLevel||0}</span>
    </a>`).join('');
}

// ── Boot ──
document.addEventListener('DOMContentLoaded', () => {
  // Init seed data
  LM.seed.run();

  // Daily/weekly reset check
  LM.store.checkResets();
  LM.store.checkTimers();
  LM.store.checkHabitualReset(); // IST midnight habitual reset
  setInterval(() => {
    LM.store.checkTimers();
  }, 10000); // Check every 10 seconds

  // Theme
  LM.components.theme.init();

  // Logo click → navigate to dashboard
  document.getElementById('logo-home-btn')?.addEventListener('click', () => LM.router.navigate('#dashboard'));
  // Sidebar skills
  renderSidebarSkills();

  // Skill manager button
  document.getElementById('btn-manage-skills')?.addEventListener('click', () => LM.components.skillModal.open());

  // FAB — Create Quest
  document.getElementById('fab')?.addEventListener('click', () => LM.components.questModal.open(null, false));

  // Modal overlay click to close
  document.getElementById('modal-overlay')?.addEventListener('click', () => {
    LM.components.questModal.close();
    LM.components.skillModal.close();
  });

  // Store change → re-render sidebar + current view refresh
  LM.store.on('change', () => {
    renderSidebarSkills();
    const route = LM.router.getRoute ? LM.router.getRoute() : null;
    // Light refresh: update XP bar if on dashboard
    if (window.location.hash === '#dashboard' || !window.location.hash) {
      LM.views.dashboard.updateBar(LM.store.getSettings().wheelSkillId || 'overall');
      LM.views.dashboard.refreshCards?.();
      const entriesContainer = document.getElementById('history-bar-entries');
      if (entriesContainer && LM.views.dashboard.renderHistoryBar) {
        entriesContainer.innerHTML = LM.views.dashboard.renderHistoryBar();
      }
    } else if (window.location.hash === '#quests') {
      window.LM.views.questLog.init?.();
    }
  });

  // Cloud Sync Real-Time Polling & Resurfacing Check
  function setupCloudSyncPolling() {
    let lastPollTime = 0;
    
    const checkAndSync = () => {
      if (!LM.store.getSettings().syncKey) return;
      
      const now = Date.now();
      if (now - lastPollTime < 5000) return; // Throttle to prevent duplicate concurrent pulls
      lastPollTime = now;

      LM.store.pullCloudSync().then(result => {
        if (result === 'pulled') {
          window.LM.components.notifications.show('☁️ Real-time cloud sync updated!', 'success');
          window.LM.router.render();
        }
      });
    };

    // Pull immediately on startup
    checkAndSync();

    // Pull when tab is resumed or window focused
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkAndSync();
      }
    });
    window.addEventListener('focus', checkAndSync);

    // Periodic pull check every 15 seconds
    setInterval(checkAndSync, 15000);
  }

  // Initialize Polling
  setupCloudSyncPolling();

  // Check background timers
  if (window.LM.questProgress) {
    window.LM.questProgress.checkRunningTimers();
  }

  // High-performance second-by-second countdown timer ticking engine
  setInterval(() => {
    const countdownEls = document.querySelectorAll('.quest-countdown-timer');
    if (countdownEls.length === 0) return;
    
    let expiredAny = false;
    countdownEls.forEach(el => {
      const expiresAt = parseInt(el.dataset.expiresAt);
      if (!isNaN(expiresAt)) {
        const leftMs = expiresAt - Date.now();
        if (leftMs > 0) {
          const totalSecs = Math.floor(leftMs / 1000);
          const hrs = Math.floor(totalSecs / 3600);
          const mins = Math.floor((totalSecs % 3600) / 60);
          const secs = totalSecs % 60;
          el.textContent = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} remaining`;
        } else {
          el.textContent = 'Expired';
          el.style.color = 'var(--danger)';
          expiredAny = true;
        }
      }
    });
    
    if (expiredAny) {
      LM.store.checkTimers();
    }
  }, 1000);

  // Router
  LM.router.init();
});
