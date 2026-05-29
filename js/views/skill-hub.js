// LIFEMAXX — Skill Hub View (4 option cards)
window.LM.views.skillHub = (function () {
  const S = window.LM.store;

  const OPTIONS = [
    {
      id: 'create-quest',
      title: 'Create Quest',
      desc: 'Add a new quest for this skill',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`
    },
    {
      id: 'chain-quests',
      title: 'Chain Quests',
      desc: 'Multi-step ordered quest sequences',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><circle cx="5" cy="12" r="2.5"/><circle cx="12" cy="12" r="2.5"/><circle cx="19" cy="12" r="2.5"/><line x1="7.5" y1="12" x2="9.5" y2="12"/><line x1="14.5" y1="12" x2="16.5" y2="12"/></svg>`
    },
    {
      id: 'microskills',
      title: 'Microskills',
      desc: 'Sub-skills, XP history &amp; stats',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`
    },
    {
      id: 'widgets',
      title: 'Widgets',
      desc: 'Custom tracking &amp; display widgets',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`
    }
  ];

  function render(macroId) {
    const macro = S.getMacro(macroId);
    if (!macro) return `<div class="view-error">Skill not found.</div>`;
    const F = window.LM.formulas;
    const pct = F.progressPercent(macro.currentXP || 0, macro);
    const chains = S.getChains(macroId);
    const activeChains = chains.filter(c => c.steps.some(s => !s.completedAt)).length;

    return `
      <div class="skill-hub-view" style="--sk-accent:${macro.accentColor};">
        <div class="skill-hub-header">
          <button class="btn-back" onclick="LM.router.navigate('#skills')">← Skills</button>
          <div class="skill-hub-title-row">
            <div class="skill-hub-dot" style="background:${macro.accentColor};box-shadow:0 0 14px ${macro.accentColor};"></div>
            <h1 class="font-display skill-hub-name">${macro.name}</h1>
            <span class="skill-hub-lv font-display" style="color:${macro.accentColor};">Lv${macro.currentLevel || 0}</span>
          </div>
        </div>
        <div class="skill-hub-xp-bar-track">
          <div class="skill-hub-xp-bar-fill" style="width:${pct}%;background:${macro.accentColor};"></div>
        </div>

        <div class="skill-hub-options">
          ${OPTIONS.map(opt => {
            let badge = '';
            if (opt.id === 'chain-quests' && activeChains > 0) {
              badge = `<span class="hub-badge" style="background:${macro.accentColor};">${activeChains}</span>`;
            }
            return `
              <button class="skill-hub-option" id="hub-opt-${opt.id}" data-macroi="${macroId}">
                <div class="hub-opt-icon" style="color:${macro.accentColor};">${opt.icon}</div>
                <div class="hub-opt-text">
                  <div class="hub-opt-title">${opt.title}${badge}</div>
                  <div class="hub-opt-desc">${opt.desc}</div>
                </div>
                <div class="hub-opt-arrow">›</div>
              </button>`;
          }).join('')}
        </div>
      </div>`;
  }

  function init(macroId) {
    document.getElementById('hub-opt-create-quest')?.addEventListener('click', () => {
      window.LM.components.questModal.open(null, false);
    });
    document.getElementById('hub-opt-chain-quests')?.addEventListener('click', () => {
      LM.router.navigate(`#skill-chains/${macroId}`);
    });
    document.getElementById('hub-opt-microskills')?.addEventListener('click', () => {
      LM.router.navigate(`#skill/${macroId}`);
    });
    document.getElementById('hub-opt-widgets')?.addEventListener('click', () => {
      LM.router.navigate(`#skill-widgets/${macroId}`);
    });
  }

  return { render, init };
})();
