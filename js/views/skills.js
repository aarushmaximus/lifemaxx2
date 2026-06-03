// LIFEMAXX — Skills Grid View (NeonStitcher Design)
window.LM.views.skills = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;

  function render() {
    const macros = S.getMacros();

    return `
      <div class="relative z-10 pt-24 pb-36 px-4 md:px-8 max-w-7xl mx-auto page-enter">

        <!-- Header -->
        <div class="mb-10 relative pt-4">
          <div class="absolute -top-6 -left-8 w-48 h-48 bg-secondary/10 rounded-full blur-[80px] pointer-events-none"></div>
          <p class="font-label-sm text-primary uppercase tracking-[0.3em] mb-2">SYSTEM MODULES</p>
          <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg uppercase tracking-tighter text-on-surface neon-text-cyan mb-2">Skills</h2>
          <div class="h-1 w-24 bg-gradient-to-r from-primary to-secondary mb-6 shadow-[0_0_10px_rgba(0,229,255,0.8)]"></div>
          <p class="text-on-surface-variant text-sm uppercase tracking-wider">Tap a module to manage quests, chain objectives &amp; widgets</p>
        </div>

        <!-- Skills Grid -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          ${macros.map(m => {
            const pct = F.progressPercent(m.currentXP || 0, m);
            const into = F.xpIntoCurrentLevel(m.currentXP || 0, m);
            const req = F.xpRequiredForNextLevel(m.currentXP || 0, m);
            const color = m.accentColor || '#00e5ff';
            const dashOffset = 125.6 - (125.6 * pct / 100);
            return `
              <div class="group relative bg-surface-container/60 backdrop-blur-xl border-l-4 p-5 cursor-pointer hover:bg-surface-container/90 transition-all duration-300 overflow-hidden shadow-[0_0_15px_transparent] hover:shadow-[0_0_20px_currentColor] active:scale-95"
                   style="border-left-color:${color}; --tw-shadow-color:${color}22;"
                   onclick="LM.router.navigate('#skill-hub/${m.id}')">

                <!-- Glow bg on hover -->
                <div class="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style="background:radial-gradient(circle at 30% 50%, ${color}, transparent 70%)"></div>

                <!-- Top: Circular progress + icon -->
                <div class="flex items-start justify-between mb-4">
                  <div class="w-12 h-12 relative flex-shrink-0">
                    <svg class="w-full h-full -rotate-90" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="3"/>
                      <circle cx="24" cy="24" r="20" fill="none" stroke="${color}" stroke-width="3"
                        stroke-dasharray="125.6" stroke-dashoffset="${dashOffset}"
                        style="filter:drop-shadow(0 0 4px ${color})"/>
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center">
                      <span class="font-bold text-xs" style="color:${color}">${m.currentLevel || 0}</span>
                    </div>
                  </div>
                  <span class="material-symbols-outlined text-2xl opacity-20 group-hover:opacity-60 transition-opacity" style="color:${color}">stars</span>
                </div>

                <!-- Skill Name -->
                <h3 class="font-headline-md text-sm md:text-base uppercase tracking-tight font-bold text-white mb-1">${m.name}</h3>
                <p class="text-[10px] text-on-surface-variant uppercase tracking-widest mb-3">LV ${m.currentLevel || 0} — ${F.formatXP(into)} / ${F.formatXP(req)} XP</p>

                <!-- XP Progress Bar -->
                <div class="h-0.5 w-full bg-white/5 overflow-hidden">
                  <div class="h-full transition-all duration-500" style="width:${pct}%;background:${color};box-shadow:0 0 6px ${color}"></div>
                </div>

                <!-- Sub-navigation pills -->
                <div class="flex gap-2 mt-4">
                  <button class="text-[9px] font-label-sm px-2 py-1 border opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-widest"
                          style="border-color:${color}33;color:${color}"
                          onclick="event.stopPropagation();LM.router.navigate('#skill-hub/${m.id}')">Hub</button>
                  <button class="text-[9px] font-label-sm px-2 py-1 border opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-widest"
                          style="border-color:${color}33;color:${color}"
                          onclick="event.stopPropagation();LM.router.navigate('#skill-chains/${m.id}')">Chains</button>
                  <button class="text-[9px] font-label-sm px-2 py-1 border opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-widest"
                          style="border-color:${color}33;color:${color}"
                          onclick="event.stopPropagation();LM.router.navigate('#skill-widgets/${m.id}')">Widgets</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Manage Skills Button -->
        <div class="mt-10 text-center">
          <button class="px-8 py-3 border border-primary/30 text-primary font-label-sm uppercase tracking-widest hover:bg-primary/10 transition-all active:scale-95 shadow-[0_0_10px_rgba(0,229,255,0.1)]"
                  onclick="LM.components.skillModal.open()">
            <span class="material-symbols-outlined align-middle text-sm mr-2">settings</span>
            Manage Skill Modules
          </button>
        </div>
      </div>
    `;
  }

  function init() {}

  return { render, init };
})();
