// LIFEMAXX — Chain Quests View
window.LM.views.skillChains = (function () {
  const S = window.LM.store;
  
  let _macroId = null;
  let _mode = 'list'; // 'list' | 'create_metadata' | 'create_steps'
  let _draftChain = null;
  let _expandedChainId = null;

  // ── Helpers ──
  function activeStepIdx(chain) { return chain.steps.findIndex(s => !s.completedAt); }

  function renderQuestCardShadow(q, macro, isEdit = false, idx = 0) {
    const tSkills = q.targetSkills || [];
    const skillTags = tSkills.map(t => {
      const m = S.getMacro(t.macroSkillId);
      return m ? `<span class="skill-tag" style="color:${m.accentColor};border-color:${m.accentColor}33">${m.name} +${t.xpAmount}xp</span>` : '';
    }).join('');

    let windowBadge = q.timeWindow 
      ? `<span class="quest-type-badge" style="background:var(--accent-dim);color:var(--accent);border:1px solid var(--border);">${q.timeWindow.start} - ${q.timeWindow.end}</span>`
      : `<span class="quest-type-badge" style="background:var(--bg-raised);color:var(--text-3);border:1px solid var(--border);">Anytime</span>`;

    return `
      <div class="quest-card" style="position: relative; margin-bottom: 12px; pointer-events: none;">
        ${isEdit ? `
        <div style="position:absolute; top:-10px; left:-10px; width:24px; height:24px; border-radius:50%; background:var(--primary); color:#000; font-weight:bold; display:flex; align-items:center; justify-content:center; font-size:12px; z-index:10;">
          ${idx + 1}
        </div>
        ` : ''}
        <div class="quest-card-header" style="pointer-events: all;">
          ${windowBadge}
          <div class="quest-card-actions">
            ${isEdit ? `
              <button class="btn-icon" onclick="LM.views.skillChains._editQuestStep('${q.id}')" title="Edit">✎</button>
              <button class="btn-icon danger" onclick="LM.views.skillChains._removeQuestStep('${q.id}')" title="Remove">✕</button>
            ` : ''}
          </div>
        </div>
        <h3 class="quest-card-name">${q.name}</h3>
        ${q.description ? `<p class="quest-card-desc">${q.description}</p>` : ''}
        <div class="quest-skill-tags">${skillTags}</div>
        <div class="quest-card-footer">
          <button class="btn-complete" style="background:var(--bg-raised);border:1px solid var(--border);color:var(--text-3);cursor:default;">Step ${idx + 1}</button>
        </div>
      </div>`;
  }

  function renderRealQuestCard(q, macro, isLocked, isMissed, isDone, idx, chainId) {
    const tSkills = q.targetSkills || [];
    const skillTags = tSkills.map(t => {
      const m = S.getMacro(t.macroSkillId);
      return m ? `<span class="skill-tag" style="color:${m.accentColor};border-color:${m.accentColor}33">${m.name} +${t.xpAmount}xp</span>` : '';
    }).join('');

    let windowBadge = q.timeWindow 
      ? `<span class="quest-type-badge" style="background:var(--accent-dim);color:var(--accent);border:1px solid var(--border);">${q.timeWindow.start} - ${q.timeWindow.end}</span>`
      : `<span class="quest-type-badge" style="background:var(--bg-raised);color:var(--text-3);border:1px solid var(--border);">Anytime</span>`;

    let statusBadge = '';
    if (isMissed) statusBadge = `<span class="quest-type-badge" style="background:rgba(255,45,120,0.15);color:var(--danger);border:1px solid rgba(255,45,120,0.3);">MISSED</span>`;
    else if (isLocked) statusBadge = `<span class="quest-type-badge" style="background:rgba(120,120,140,0.15);color:var(--text-3);border:1px solid var(--border);">LOCKED 🔒</span>`;

    let cardClass = '';
    if (isMissed || isLocked) cardClass = 'quest-card-deleted-status';
    if (isDone) cardClass = 'quest-card-deleted-status';

    return `
      <div class="quest-card ${cardClass}" style="position:relative; margin-bottom: 12px; ${isDone ? 'opacity:0.6;' : ''}">
        <div style="position:absolute; top:-10px; left:-10px; width:24px; height:24px; border-radius:50%; background:${isDone ? 'var(--text-3)' : (isLocked ? 'var(--bg-raised)' : macro.accentColor)}; color:${isDone||isLocked?'var(--bg-surface)':'#000'}; font-weight:bold; display:flex; align-items:center; justify-content:center; font-size:12px; z-index:10; border:2px solid var(--bg-body);">
          ${isDone ? '✓' : idx + 1}
        </div>
        <div class="quest-card-header">
          ${windowBadge}
          ${statusBadge}
        </div>
        <h3 class="quest-card-name" style="${isMissed || isDone ? 'text-decoration:line-through;' : ''}">${q.name}</h3>
        ${q.description ? `<p class="quest-card-desc">${q.description}</p>` : ''}
        <div class="quest-skill-tags">${skillTags}</div>
        
        <div class="quest-card-footer">
          ${isDone 
            ? `<button class="btn-complete" style="background:transparent;border:1px dashed var(--border);color:var(--text-3);cursor:default;" disabled>✓ Completed</button>`
            : isLocked
              ? `<button class="btn-complete" style="background:var(--bg-raised);border:1px solid var(--border);color:var(--text-3);cursor:default;" disabled>Complete previous steps first</button>`
              : `<button class="btn-complete" style="background:${macro.accentColor};border:none;color:#fff;" onclick="LM.views.skillChains.completeStep('${chainId}','${q.id}')">✓ Complete Step</button>`
          }
        </div>
      </div>`;
  }

  // ── Render Views ──
  function renderListMode(macro, chains) {
    if (chains.length === 0) {
      return `
        <div class="chains-empty">
          <div style="font-size:2.5rem;margin-bottom:12px;">⛓️</div>
          <p style="color:var(--text-2);font-size:0.9rem;font-weight:500;">No chain quests yet</p>
          <p style="color:var(--text-3);font-size:0.78rem;margin-top:4px;">Break a big goal into ordered steps.</p>
        </div>
        <div style="text-align:center; margin-top:20px;">
          <button class="btn btn-primary" onclick="LM.views.skillChains._startCreate()">+ Create Chain</button>
        </div>`;
    }

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h2 class="font-display" style="font-size:1.1rem;">ACTIVE CHAINS</h2>
        <button class="btn btn-primary btn-sm" onclick="LM.views.skillChains._startCreate()">+ New Chain</button>
      </div>
      <div id="chains-list">
        ${chains.map(c => {
          const total = c.steps.length;
          const done = c.steps.filter(s => s.completedAt).length;
          const isExpanded = _expandedChainId === c.id;
          const actIdx = activeStepIdx(c);

          return `
            <div class="chain-card" style="--sk-accent:${macro.accentColor}; margin-bottom:16px; transition: all 0.2s ease;">
              <div class="chain-card-top" style="cursor:pointer;" onclick="LM.views.skillChains._toggleChain('${c.id}')">
                <div style="flex:1;">
                  <div class="chain-card-name" style="display:flex; align-items:center; gap:8px;">
                    ${c.name}
                    <span style="font-size:0.7rem; padding:2px 6px; background:var(--bg-raised); border-radius:4px; color:var(--text-3); font-weight:normal;">${done} / ${total} Quests</span>
                  </div>
                  <div class="chain-card-goal" style="color:var(--text-2); font-size:0.8rem; margin-top:4px;">Macro: ${macro.name}</div>
                </div>
                <div style="display:flex;align-items:center;gap:12px;">
                  <button class="btn-icon danger" onclick="event.stopPropagation(); LM.views.skillChains.deleteChain('${c.id}')" title="Delete chain">✕</button>
                  <span class="material-symbols-outlined" style="color:var(--text-3); transition: transform 0.2s;" ${isExpanded ? 'style="transform:rotate(180deg);"' : ''}>expand_more</span>
                </div>
              </div>

              ${isExpanded ? `
                <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border);">
                  <p style="color:var(--text-2); font-size:0.85rem; margin-bottom:16px;">${c.goal || 'No description provided.'}</p>
                  <div class="chain-expanded-steps">
                    ${c.steps.map((s, i) => {
                      const isDone = !!s.completedAt;
                      const isLocked = i > actIdx && actIdx !== -1;
                      const isMissed = false; // Add real missed logic if chain steps expire
                      return renderRealQuestCard(s, macro, isLocked, isMissed, isDone, i, c.id);
                    }).join('')}
                    ${actIdx === -1 && c.steps.length > 0 ? `<div style="text-align:center; padding: 20px; color:${macro.accentColor}; font-weight:bold; border: 1px dashed ${macro.accentColor}; border-radius: 12px; background: ${macro.accentColor}11;">🏆 Chain Complete!</div>` : ''}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>`;
  }

  function renderMetadataMode(macro) {
    return `
      <div class="bg-surface-container rounded-2xl p-6 border border-surface-container-highest" style="margin-bottom: 50vh;">
        <h2 class="font-display mb-6 text-primary">CREATE NEW CHAIN</h2>
        
        <div class="form-group mb-4">
          <label class="form-group label">Chain Name</label>
          <input type="text" class="form-input" id="chain-name-inp" placeholder="e.g. Master Python Fundamentals" value="${_draftChain?.name || ''}">
        </div>
        
        <div class="form-group mb-4">
          <label class="form-group label">Macro Skill</label>
          <input type="text" class="form-input" disabled value="${macro.name}" style="opacity: 0.7;">
        </div>

        <div class="form-group mb-6">
          <label class="form-group label">Description / Overall Goal</label>
          <textarea class="form-input form-textarea" id="chain-goal-inp" placeholder="What is the end goal of this chain?" style="min-height:80px;resize:none;">${_draftChain?.goal || ''}</textarea>
        </div>

        <div style="display:flex; justify-content:space-between;">
          <button class="btn btn-ghost" onclick="LM.views.skillChains._cancelCreate()">Cancel</button>
          <button class="btn btn-primary" onclick="LM.views.skillChains._nextToSteps()">Next: Add Quests</button>
        </div>
      </div>
    `;
  }

  function renderStepsMode(macro) {
    const stepsHtml = _draftChain.steps.map((s, i) => renderQuestCardShadow(s, macro, true, i)).join('');
    
    return `
      <div style="margin-bottom: 50vh;">
        <div class="flex justify-between items-center mb-4">
          <h2 class="font-display text-primary">CHAIN QUESTS</h2>
          <div class="text-sm text-on-surface-variant font-bold">${_draftChain.steps.length} Steps</div>
        </div>
        
        <div class="mb-6">
          ${stepsHtml}
          
          <!-- Shadow Layout Add Button -->
          <div class="quest-card" style="border: 2px dashed var(--border); background: transparent; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; min-height: 140px; opacity: 0.6; transition: all 0.2s ease;" onmouseover="this.style.opacity='1'; this.style.borderColor='var(--primary)';" onmouseout="this.style.opacity='0.6'; this.style.borderColor='var(--border)';" onclick="LM.views.skillChains._addQuestStep()">
             <div style="font-size: 2rem; color: var(--text-3); margin-bottom: 4px;">+</div>
             <div style="font-size: 0.8rem; color: var(--text-3); font-weight: bold;">ADD QUEST</div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border); padding-top:16px;">
          <button class="btn btn-ghost" onclick="LM.views.skillChains._backToMetadata()">← Back</button>
          <button class="btn btn-primary" onclick="LM.views.skillChains._saveDraftChain()">Save Chain</button>
        </div>
      </div>
    `;
  }

  function render(macroId) {
    if (macroId) _macroId = macroId;
    const macro = S.getMacro(_macroId);
    if (!macro) return `<div class="view-error">Skill not found.</div>`;
    const chains = S.getChains(_macroId);

    let contentHtml = '';
    if (_mode === 'list') contentHtml = renderListMode(macro, chains);
    else if (_mode === 'create_metadata') contentHtml = renderMetadataMode(macro);
    else if (_mode === 'create_steps') contentHtml = renderStepsMode(macro);

    return `
      <div class="view-container chains-view" style="max-width: 600px; margin: 0 auto; padding-bottom: 120px;">
        ${_mode === 'list' ? `
        <div class="view-header" style="margin-bottom:24px;">
          <button class="btn-back" onclick="LM.router.navigate('#skill-hub/${macroId}')">← Back to Hub</button>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${macro.accentColor};box-shadow:0 0 6px ${macro.accentColor};"></div>
            <h1 class="font-display" style="font-size:0.85rem;letter-spacing:0.12em;">${macro.name.toUpperCase()} / CHAINS</h1>
          </div>
          <div></div> <!-- Spacer -->
        </div>
        ` : ''}

        ${contentHtml}
      </div>`;
  }

  function init(macroId) {
    if (macroId) _macroId = macroId;
  }

  // ── State Actions ──
  function _startCreate() {
    _draftChain = { id: S.uid(), name: '', goal: '', macroId: _macroId, steps: [] };
    _mode = 'create_metadata';
    LM.router.render();
  }

  function _cancelCreate() {
    if (confirm('Discard this chain?')) {
      _draftChain = null;
      _mode = 'list';
      LM.router.render();
    }
  }

  function _nextToSteps() {
    const name = document.getElementById('chain-name-inp')?.value?.trim();
    if (!name) {
      window.LM.components.notifications.show('Please enter a chain name.', 'error');
      return;
    }
    _draftChain.name = name;
    _draftChain.goal = document.getElementById('chain-goal-inp')?.value?.trim() || '';
    _mode = 'create_steps';
    LM.router.render();
  }

  function _backToMetadata() {
    _mode = 'create_metadata';
    LM.router.render();
  }

  function _addQuestStep() {
    // Open quest modal in intercept mode
    // We pass `_macroId` as default macro so it auto-selects the skill!
    window.LM.components.questModal.open(null, false, 'task', _macroId, (questObj) => {
      // Intercept save!
      questObj.completedAt = null; // Ensure it starts incomplete
      _draftChain.steps.push(questObj);
      LM.router.render(); // Re-render the steps view
    });
  }

  function _editQuestStep(stepId) {
    const step = _draftChain.steps.find(s => s.id === stepId);
    if (!step) return;
    
    window.LM.components.questModal.open(null, false, 'task', _macroId, (updatedObj) => {
      // Intercept update!
      updatedObj.completedAt = step.completedAt;
      const idx = _draftChain.steps.findIndex(s => s.id === stepId);
      if (idx !== -1) _draftChain.steps[idx] = updatedObj;
      LM.router.render();
    }, step); // pass existing step data
  }

  function _removeQuestStep(stepId) {
    if (confirm('Remove this step from the chain?')) {
      _draftChain.steps = _draftChain.steps.filter(s => s.id !== stepId);
      LM.router.render();
    }
  }

  function _saveDraftChain() {
    if (_draftChain.steps.length === 0) {
      window.LM.components.notifications.show('Add at least one quest step to save the chain.', 'error');
      return;
    }
    
    // We add a createdAt timestamp
    _draftChain.createdAt = Date.now();
    S.upsertChain(_draftChain);
    
    window.LM.components.notifications.show('Chain quest created!', 'success');
    _draftChain = null;
    _mode = 'list';
    LM.router.render();
  }

  function _toggleChain(chainId) {
    if (_expandedChainId === chainId) _expandedChainId = null;
    else _expandedChainId = chainId;
    LM.router.render();
  }

  function completeStep(chainId, stepId) {
    const result = S.completeChainStep(chainId, stepId);
    if (result) {
      window.LM.components.notifications.show(`✓ Step complete! +${result.xpAmount || 0} XP`, 'success');
      LM.router.render();
    }
  }

  function deleteChain(chainId) {
    if (!confirm('Delete this chain quest?')) return;
    S.deleteChain(chainId);
    LM.router.render();
  }

  return { 
    render, init, completeStep, deleteChain, 
    _startCreate, _cancelCreate, _nextToSteps, _backToMetadata, 
    _saveDraftChain, _addQuestStep, _editQuestStep, _removeQuestStep, _toggleChain 
  };
})();
