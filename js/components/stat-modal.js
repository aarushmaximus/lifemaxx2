window.LM.components.statModal = (function () {
  let modalEl = null;
  let editingId = null;

  function renderModalHTML(macros, stat = null) {
    const isEdit = !!stat;
    
    // Default values
    const name = stat ? stat.name : '';
    const unit = stat ? stat.unit : 'e.g. kcal, miles';
    const goalValue = stat ? stat.goalValue : 2000;
    const maxXP = stat ? stat.maxXP : 50;
    const penaltyRange = stat ? stat.penaltyRange : 1000;
    const negativeXP = stat ? stat.negativeXP : 50;
    
    // Macro/Micro targets
    let targetMacroId = stat && stat.targetSkill ? stat.targetSkill.macroSkillId : '';
    let targetMicroId = stat && stat.targetSkill ? stat.targetSkill.microSkillId : '';

    return `
      <div class="modal-header">
        <h2 class="font-display">${isEdit ? 'EDIT STATISTIC' : 'CREATE STATISTIC'}</h2>
        <button type="button" class="modal-close" onclick="LM.components.statModal.close(); return false;">✕</button>
      </div>
      <div class="modal-body">
        
        <div class="form-group">
          <label>Statistic Name</label>
          <input id="sm-name" class="form-input" type="text" placeholder="e.g. Calories, Steps, Study Hours" value="${name}">
        </div>

        <div class="form-group">
          <label>Unit of Measurement</label>
          <input id="sm-unit" class="form-input" type="text" placeholder="${unit}" value="${stat ? unit : ''}">
        </div>

        <div class="form-group">
          <label>Target Skill</label>
          <select id="sm-macro" class="form-input" style="margin-bottom: 8px;">
            <option value="">— Select Macro Skill (Optional) —</option>
            ${macros.map(m => `<option value="${m.id}" ${targetMacroId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
          </select>
          <select id="sm-micro" class="form-input">
            <option value="">— Select Micro Skill (Optional) —</option>
          </select>
        </div>

        <div class="form-group" style="border-left: 2px solid var(--primary); padding-left: 12px; margin-top: 16px;">
          <label>Goal Value</label>
          <p style="font-size: 0.75rem; color: var(--text-3); margin-bottom: 6px;">The optimal number you are trying to hit each day.</p>
          <input id="sm-goal" class="form-input" type="number" step="any" value="${goalValue}">
        </div>

        <div class="form-group">
          <label>Max XP Reward</label>
          <p style="font-size: 0.75rem; color: var(--text-3); margin-bottom: 6px;">XP gained if you hit the goal exactly.</p>
          <input id="sm-max-xp" class="form-input" type="number" min="0" value="${maxXP}">
        </div>

        <div class="form-group" style="border-left: 2px solid var(--danger); padding-left: 12px; margin-top: 16px;">
          <label>Penalty Range (Deviation)</label>
          <p style="font-size: 0.75rem; color: var(--text-3); margin-bottom: 6px;">How far from the goal value do you hit maximum penalty? (e.g. if Goal is 2000, and Range is 1000, hitting 1000 or 3000 gives max penalty).</p>
          <input id="sm-range" class="form-input" type="number" min="0" step="any" value="${penaltyRange}">
        </div>

        <div class="form-group">
          <label>Max Negative XP Penalty</label>
          <p style="font-size: 0.75rem; color: var(--text-3); margin-bottom: 6px;">The XP subtracted if you deviate by the Penalty Range or more.</p>
          <input id="sm-neg-xp" class="form-input" type="number" min="0" value="${negativeXP}">
        </div>

      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="LM.components.statModal.close(); return false;">Cancel</button>
        <button type="button" class="btn btn-primary" id="sm-submit">${isEdit ? 'Save Statistic' : 'Create Statistic'}</button>
      </div>
    `;
  }

  function initEvents(modal, macros) {
    const macroSel = modal.querySelector('#sm-macro');
    const microSel = modal.querySelector('#sm-micro');

    function updateMicros() {
      const mId = macroSel.value;
      microSel.innerHTML = '<option value="">— Select Micro Skill (Optional) —</option>';
      if (mId) {
        const macro = macros.find(m => m.id === mId);
        if (macro && macro.microSkills) {
          macro.microSkills.forEach(ms => {
            const opt = document.createElement('option');
            opt.value = ms.id;
            opt.textContent = ms.name;
            microSel.appendChild(opt);
          });
        }
      }
    }

    macroSel.addEventListener('change', updateMicros);
    // trigger once to populate if editing
    updateMicros();
    if (editingId) {
      const stat = window.LM.store.getStatistic(editingId);
      if (stat && stat.targetSkill && stat.targetSkill.microSkillId) {
        microSel.value = stat.targetSkill.microSkillId;
      }
    }

    const submitBtn = modal.querySelector('#sm-submit');
    submitBtn.addEventListener('click', () => {
      const name = modal.querySelector('#sm-name').value.trim();
      const unit = modal.querySelector('#sm-unit').value.trim();
      if (!name) return alert('Statistic name is required.');

      const goalValue = parseFloat(modal.querySelector('#sm-goal').value) || 0;
      const maxXP = parseFloat(modal.querySelector('#sm-max-xp').value) || 0;
      const penaltyRange = parseFloat(modal.querySelector('#sm-range').value) || 0;
      const negativeXP = parseFloat(modal.querySelector('#sm-neg-xp').value) || 0;

      const macroId = macroSel.value;
      const microId = microSel.value;
      let targetSkill = null;
      if (macroId) {
        targetSkill = { macroSkillId: macroId, microSkillId: microId || null };
      }

      const stat = {
        id: editingId || 'stat_' + Date.now(),
        name,
        unit,
        goalValue,
        maxXP,
        penaltyRange,
        negativeXP,
        targetSkill
      };

      window.LM.store.upsertStatistic(stat);
      closeModal();
    });
  }

  function openModal(statId = null) {
    editingId = statId;
    const macros = window.LM.store.getMacros();
    let stat = null;
    if (statId) stat = window.LM.store.getStatistic(statId);

    const modalEl = document.getElementById('stat-modal');
    const overlay = document.getElementById('modal-overlay');

    if (!modalEl || !overlay) return;

    modalEl.innerHTML = renderModalHTML(macros, stat);
    modalEl.classList.add('modal-open');
    overlay.classList.add('overlay-open');

    initEvents(modalEl, macros);
  }

  function closeModal() {
    const modalEl = document.getElementById('stat-modal');
    const overlay = document.getElementById('modal-overlay');
    if (modalEl) modalEl.classList.remove('modal-open');
    // Only close overlay if no other modals are open
    if (overlay && !document.querySelector('.modal.modal-open')) {
      overlay.classList.remove('overlay-open');
    }
    editingId = null;
  }

  return { open: openModal, close: closeModal };
})();
