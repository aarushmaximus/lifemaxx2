// LIFEMAXX — Skill Widgets Placeholder
window.LM.views.skillWidgets = (function () {
  const S = window.LM.store;

  function render(macroId) {
    const macro = S.getMacro(macroId);
    if (!macro) return `<div class="view-error">Skill not found.</div>`;
    return `
      <div class="widget-canvas-view" style="--sk-accent:${macro.accentColor};">
        <div class="widget-canvas-header">
          <button class="btn-back" onclick="LM.router.navigate('#skill-hub/${macroId}')">← Back</button>
          <div class="widget-canvas-title-row">
            <div style="width:9px;height:9px;border-radius:50%;background:${macro.accentColor};box-shadow:0 0 10px ${macro.accentColor};flex-shrink:0;"></div>
            <span class="font-display" style="font-size:0.85rem;letter-spacing:0.12em;color:${macro.accentColor};">${macro.name}</span>
            <span class="font-display" style="font-size:0.65rem;letter-spacing:0.18em;color:var(--text-3);">/ WIDGETS</span>
          </div>
        </div>
        <div class="widget-canvas-body">
          <div class="widget-canvas-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="${macro.accentColor}" stroke-width="0.8" width="72" height="72" style="opacity:0.25;">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5"/>
            </svg>
            <p class="font-display widget-canvas-empty-label">WIDGETS COMING SOON</p>
            <p class="widget-canvas-empty-sub">Custom tracking widgets for ${macro.name} will live here.</p>
          </div>
        </div>
      </div>`;
  }

  function init() {}

  return { render, init };
})();
