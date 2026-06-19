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
          <button onclick="LM.components.statModal.open()" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 4px;">
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

        <div style="margin-top: 32px;">
          <h2 class="font-display" style="font-size: 1.1rem; letter-spacing: 0.1em; color: var(--text-2); margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">STATISTICS ENGINE</h2>
          ${renderStatisticsBlock(S.getStatistics(), macros)}
        </div>
      </div>`;
  }

  function renderStatisticsBlock(stats, macros) {
    if (!stats || stats.length === 0) {
      return `<div style="text-align: center; color: var(--text-3); font-size: 0.85rem; padding: 20px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed var(--border);">No statistics configured. Click 'Add Stat' to create one.</div>`;
    }
    
    return `<div style="display: flex; flex-direction: column; gap: 12px;">
      ${stats.map(s => {
        let skillLabel = 'No Skill Attached';
        if (s.targetSkill && s.targetSkill.macroSkillId) {
          const m = macros.find(m => m.id === s.targetSkill.macroSkillId);
          if (m) skillLabel = m.name;
        }
        return `
        <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-family: var(--font-display); font-size: 1.1rem; letter-spacing: 0.05em; color: var(--text-1);">${s.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-3); margin-top: 4px;">Goal: <span style="color:var(--text-1); font-weight:bold;">${s.goalValue}</span> ${s.unit} • Range: ±${s.penaltyRange} • XP: +${s.maxXP} / -${s.negativeXP}</div>
            <div style="font-size: 0.7rem; color: var(--accent); margin-top: 6px; font-weight: bold;">LINKED: ${skillLabel.toUpperCase()}</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="LM.components.statModal.open('${s.id}')" style="background: transparent; border: 1px solid var(--border); color: var(--text-2); border-radius: 6px; padding: 6px 12px; cursor: pointer;">Edit</button>
            <button onclick="if(confirm('Delete ${s.name}?')) { LM.store.deleteStatistic('${s.id}'); LM.views.skills.render(); LM.router.navigate('#skills'); }" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--danger); border-radius: 6px; padding: 6px 12px; cursor: pointer;">Delete</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function init() {}

  return { render, init };
})();
