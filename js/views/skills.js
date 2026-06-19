// LIFEMAXX — Skills Grid View
window.LM.views.skills = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;

  function render() {
    const macros = S.getMacros();
    return `
      <div class="skills-view">
        <div class="skills-view-header" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 class="font-display">SKILLS & STATS</h1>
            <p class="skills-view-sub">Manage macros, micros &amp; stats</p>
          </div>
          <button onclick="LM.components.questModal.open(null, false, 'statistic')" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 4px;">
            <span class="material-symbols-outlined" style="font-size: 1rem;">add_chart</span> Add Stat
          </button>
        </div>
        <div class="skills-grid">
          ${macros.map(m => {
            const pct = F.progressPercent(m.currentXP || 0, m);
            const into = F.xpIntoCurrentLevel(m.currentXP || 0, m);
            const req = F.xpRequiredForNextLevel(m.currentXP || 0, m);
            return `
              <div class="skill-card" 
                   style="--sk-accent:${m.accentColor}; position: relative;"
                   onclick="LM.router.navigate('#skill-hub/${m.id}')">
                
                <button onclick="event.stopPropagation(); LM.components.questModal.open(null, false, 'statistic', '${m.id}')" 
                        class="btn-icon hover:scale-105 hover:bg-[rgba(255,255,255,0.1)] transition-all" 
                        style="position:absolute; top:12px; right:12px; z-index:10; background:rgba(0,0,0,0.4); color:var(--text-1); padding:4px 8px; border-radius:8px; font-size:0.7rem; font-weight:bold; letter-spacing:0.05em; display:flex; align-items:center; gap:4px; border:1px solid rgba(255,255,255,0.1);" 
                        title="Add Statistic Tracker">
                   <span class="material-symbols-outlined" style="font-size:14px;">add_chart</span> STAT
                </button>

                <div class="skill-card-shine"></div>
                <div class="skill-card-inner">
                  <div class="skill-card-top">
                    <div class="skill-card-dot" style="background:${m.accentColor};box-shadow:0 0 10px ${m.accentColor}88;"></div>
                    <div class="skill-card-level font-display" style="color:${m.accentColor};">
                      <span class="skill-card-lvnum">${m.currentLevel || 0}</span>
                      <span class="skill-card-lvlabel">LV</span>
                    </div>
                  </div>
                  <div class="skill-card-name">${m.name}</div>
                  <div class="skill-card-xp">${F.formatXP(into)} / ${F.formatXP(req)} XP</div>
                  <div class="skill-card-bar-track">
                    <div class="skill-card-bar-fill" style="width:${pct}%;background:${m.accentColor};"></div>
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  function init() {}

  return { render, init };
})();
