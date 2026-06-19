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
