// LIFEMAXX — Router & App Boot
window.LM.router = (function () {
  const S = window.LM.store;
  const views = {
    dashboard: window.LM.views.dashboard,
    quests: window.LM.views.questLog,
    settings: window.LM.views.settings,
  };

  let currentView = null;
  let currentSkillId = null;

  function getRoute() {
    const hash = window.location.hash || '#dashboard';
    if (hash.startsWith('#skill/')) return { view: 'skillDetail', skillId: hash.split('/')[1] };
    const v = hash.replace('#','');
    return { view: ['dashboard','quests','settings'].includes(v) ? v : 'dashboard' };
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
      } else {
        const view = views[route.view] || views.dashboard;
        main.innerHTML = view.render();
        view.init();
      }

      // Update sidebar active state
      document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('nav-active', el.dataset.view === route.view);
      });

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
  setInterval(() => {
    LM.store.checkTimers();
  }, 10000); // Check every 10 seconds

  // Theme
  LM.components.theme.init();

  // Apply persisted Frutiger Aero preference immediately
  const _aeroOn = LM.store.getSettings().aeroTheme !== false;
  LM.views.settings.applyAeroTheme(_aeroOn);

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
    }
  });

  // Pull cloud sync on boot
  if (LM.store.getSettings().syncKey) {
    LM.store.pullCloudSync().then(result => {
      if (result === 'pulled') {
        window.LM.components.notifications.show('☁️ Synced latest progress from the cloud!', 'success');
        window.LM.router.render();
      }
    });
  }

  // Router
  LM.router.init();
});
