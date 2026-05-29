// LIFEMAXX — Chain Quests View
window.LM.views.skillChains = (function () {
  const S = window.LM.store;
  let _macroId = null;
  let _stepCount = 0;

  // ── Helpers ──
  function activeStepIdx(chain) { return chain.steps.findIndex(s => !s.completedAt); }

  // ── Renderers ──
  function renderStep(step, idx, isActive, isDone, accent) {
    const cls = isDone ? 'cstep-done' : isActive ? 'cstep-active' : 'cstep-locked';
    const style = isDone
      ? `background:${accent};border-color:${accent};`
      : isActive
        ? `border-color:${accent};box-shadow:0 0 0 3px ${accent}33;`
        : '';
    return `
      <div class="cstep-wrap">
        ${idx > 0 ? `<div class="cstep-line ${isDone ? 'cstep-line-done' : ''}" style="${isDone ? `background:${accent};` : ''}"></div>` : ''}
        <div class="cstep-bubble ${cls}" style="${style}">
          ${isDone ? '✓' : idx + 1}
        </div>
        <div class="cstep-label ${isActive ? 'cstep-label-active' : ''}" style="${isActive ? `color:${accent};` : ''}">
          <span class="cstep-name">${step.name.length > 10 ? step.name.slice(0,10)+'…' : step.name}</span>
          <span class="cstep-xp">${step.xpAmount}xp</span>
        </div>
      </div>`;
  }

  function renderChain(chain, macro) {
    const total = chain.steps.length;
    const doneCount = chain.steps.filter(s => s.completedAt).length;
    const actIdx = activeStepIdx(chain);
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 100;
    const isComplete = actIdx === -1;

    return `
      <div class="chain-card" style="--sk-accent:${macro.accentColor};">
        <div class="chain-card-top">
          <div>
            <div class="chain-card-name">${chain.name}</div>
            ${chain.goal ? `<div class="chain-card-goal">${chain.goal}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <span class="chain-pct font-display" style="color:${macro.accentColor};">${pct}%</span>
            <button class="btn-icon danger" onclick="window.LM.views.skillChains.deleteChain('${chain.id}')" title="Delete chain">✕</button>
          </div>
        </div>

        <div class="chain-steps-track">
          ${chain.steps.map((s, i) => {
            const done = !!s.completedAt;
            const active = i === actIdx;
            return renderStep(s, i, active, done, macro.accentColor);
          }).join('')}
        </div>

        ${isComplete
          ? `<div class="chain-complete-badge">🏆 Chain Complete!</div>`
          : `<div class="chain-active-step">
              <div class="chain-active-info">
                <span class="chain-active-label font-display">ACTIVE</span>
                <span class="chain-active-name">${chain.steps[actIdx].name}</span>
                ${chain.steps[actIdx].xpAmount ? `<span class="chain-active-xp" style="color:${macro.accentColor};">+${chain.steps[actIdx].xpAmount} XP</span>` : ''}
              </div>
              <button class="btn btn-sm chain-complete-btn"
                      style="background:${macro.accentColor};border:none;color:#fff;"
                      onclick="window.LM.views.skillChains.completeStep('${chain.id}','${chain.steps[actIdx].id}')">
                ✓ Complete
              </button>
            </div>`}
      </div>`;
  }

  function renderCreateForm(macro) {
    return `
      <div class="create-chain-form" id="create-chain-form">
        <div class="create-chain-form-header">
          <h2 class="font-display" style="font-size:0.85rem;letter-spacing:0.12em;">NEW CHAIN QUEST</h2>
          <button class="btn-icon" id="btn-close-chain">✕</button>
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-group label">Chain Name</label>
          <input type="text" class="form-input" id="chain-name-inp" placeholder="e.g. Master Python Fundamentals">
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-group label">Overall Goal</label>
          <textarea class="form-input form-textarea" id="chain-goal-inp" placeholder="What is the end goal?" style="min-height:56px;resize:none;"></textarea>
        </div>
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <label class="form-group label" style="margin:0;">Steps <span style="color:var(--text-3);font-size:0.7rem;">(in order)</span></label>
            <button class="btn btn-ghost btn-sm" id="btn-add-step">+ Add Step</button>
          </div>
          <div id="chain-steps-list"></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:8px;border-top:1px solid var(--border);">
          <button class="btn btn-ghost btn-sm" id="btn-cancel-chain">Cancel</button>
          <button class="btn btn-sm" id="btn-save-chain" style="background:${macro.accentColor};border:none;color:#fff;">Save Chain</button>
        </div>
      </div>`;
  }

  function stepRowHTML(idx) {
    return `<div class="chain-step-form-row" id="step-row-${idx}">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
        <span class="font-display" style="font-size:0.68rem;color:var(--text-3);min-width:18px;text-align:center;">${idx + 1}</span>
        <input type="text" class="form-input" id="sname-${idx}" placeholder="Step name" style="flex:1;padding:7px 10px;">
        <button class="btn-remove-row" onclick="window.LM.views.skillChains._removeStep(${idx})">✕</button>
      </div>
      <div style="display:flex;gap:8px;padding-left:24px;">
        <input type="number" class="form-input" id="sxp-${idx}" placeholder="XP reward" min="0" style="flex:1;padding:7px 10px;">
        <input type="number" class="form-input" id="shrs-${idx}" placeholder="Hour limit (opt)" min="0" style="flex:1;padding:7px 10px;">
      </div>
    </div>`;
  }

  function render(macroId) {
    _macroId = macroId;
    _stepCount = 0;
    const macro = S.getMacro(macroId);
    if (!macro) return `<div class="view-error">Skill not found.</div>`;
    const chains = S.getChains(macroId);

    return `
      <div class="view-container chains-view">
        <div class="view-header">
          <button class="btn-back" onclick="LM.router.navigate('#skill-hub/${macroId}')">← Back</button>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${macro.accentColor};box-shadow:0 0 6px ${macro.accentColor};"></div>
            <h1 class="font-display" style="font-size:0.85rem;letter-spacing:0.12em;">${macro.name} <span style="color:var(--text-3);">/ CHAINS</span></h1>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-new-chain">+ New Chain</button>
        </div>

        <div id="create-chain-panel" style="display:none;margin-bottom:20px;">
          ${renderCreateForm(macro)}
        </div>

        <div id="chains-list">
          ${chains.length === 0
            ? `<div class="chains-empty">
                <div style="font-size:2.5rem;margin-bottom:12px;">⛓️</div>
                <p style="color:var(--text-2);font-size:0.9rem;font-weight:500;">No chain quests yet</p>
                <p style="color:var(--text-3);font-size:0.78rem;margin-top:4px;">Break a big goal into ordered steps.</p>
              </div>`
            : chains.map(c => renderChain(c, macro)).join('')}
        </div>
      </div>`;
  }

  function init(macroId) {
    _macroId = macroId;
    _stepCount = 0;

    document.getElementById('btn-new-chain')?.addEventListener('click', () => {
      const panel = document.getElementById('create-chain-panel');
      if (!panel) return;
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      if (panel.style.display === 'block') {
        if (_stepCount === 0) _addStep();
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    document.getElementById('btn-close-chain')?.addEventListener('click', _closeForm);
    document.getElementById('btn-cancel-chain')?.addEventListener('click', _closeForm);
    document.getElementById('btn-add-step')?.addEventListener('click', _addStep);
    document.getElementById('btn-save-chain')?.addEventListener('click', _saveChain);
  }

  function _closeForm() {
    const panel = document.getElementById('create-chain-panel');
    if (panel) panel.style.display = 'none';
    const list = document.getElementById('chain-steps-list');
    if (list) list.innerHTML = '';
    _stepCount = 0;
  }

  function _addStep() {
    const list = document.getElementById('chain-steps-list');
    if (!list) return;
    const div = document.createElement('div');
    div.innerHTML = stepRowHTML(_stepCount);
    list.appendChild(div.firstElementChild);
    _stepCount++;
  }

  function _removeStep(idx) {
    document.getElementById(`step-row-${idx}`)?.remove();
  }

  function _saveChain() {
    const name = document.getElementById('chain-name-inp')?.value?.trim();
    if (!name) {
      window.LM.components.notifications.show('Please enter a chain name.', 'error');
      return;
    }
    const goal = document.getElementById('chain-goal-inp')?.value?.trim() || '';
    const steps = [];
    document.querySelectorAll('.chain-step-form-row').forEach(row => {
      const idx = row.id.replace('step-row-', '');
      const n = document.getElementById(`sname-${idx}`)?.value?.trim();
      if (!n) return;
      steps.push({
        id: S.uid(),
        name: n,
        xpAmount: parseInt(document.getElementById(`sxp-${idx}`)?.value) || 0,
        timeLimit: (parseInt(document.getElementById(`shrs-${idx}`)?.value) || 0) * 3600000 || null,
        completedAt: null
      });
    });
    if (steps.length === 0) {
      window.LM.components.notifications.show('Add at least one step.', 'error');
      return;
    }
    S.upsertChain({ id: S.uid(), macroId: _macroId, name, goal, createdAt: Date.now(), steps });
    window.LM.components.notifications.show('Chain quest created!', 'success');
    LM.router.render();
  }

  // Public action handlers (called via onclick attributes)
  function completeStep(chainId, stepId) {
    const result = S.completeChainStep(chainId, stepId);
    if (result) {
      window.LM.components.notifications.show(`✓ Step complete! +${result.xpAmount} XP`, 'success');
      LM.router.render();
    }
  }

  function deleteChain(chainId) {
    if (!confirm('Delete this chain quest?')) return;
    S.deleteChain(chainId);
    LM.router.render();
  }

  return { render, init, completeStep, deleteChain, _addStep, _removeStep };
})();
