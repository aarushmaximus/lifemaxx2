// LIFEMAXX — Quest Preset Manager Modal
window.LM.components.questModal = (function () {
  const S = window.LM.store;
  const N = window.LM.components.notifications;

  let editingPresetId = null;

  function open(presetId = null) {
    editingPresetId = presetId;
    const preset = presetId ? S.getPreset(presetId) : null;
    const macros = S.getMacros();
    const modal = document.getElementById('quest-modal');
    const overlay = document.getElementById('modal-overlay');

    modal.innerHTML = buildHTML(preset, macros);
    modal.classList.add('modal-open');
    overlay.classList.add('overlay-open');

    initEvents(modal, macros);
  }

  function close() {
    const modal = document.getElementById('quest-modal');
    const overlay = document.getElementById('modal-overlay');
    modal.classList.remove('modal-open');
    overlay.classList.remove('overlay-open');
    editingPresetId = null;
  }

  function buildHTML(preset, macros) {
    const p = preset || {};
    const scheduledDays = p.scheduledDays || [0, 1, 2, 3, 4, 5, 6]; // Default to every day
    const hasTimeWindow = !!p.timeWindow;
    const timeWindow = p.timeWindow || { start: '09:00', end: '17:00' };

    return `
      <div class="modal-header">
        <h2 class="font-display">${preset ? 'EDIT QUEST PRESET' : 'CREATE QUEST PRESET'}</h2>
        <button type="button" class="modal-close" onclick="LM.components.questModal.close(); return false;">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Preset Name</label>
          <input id="qm-name" class="form-input" type="text" placeholder="e.g. Morning Cardio, Deep Work..." value="${p.name || ''}">
        </div>
        
        <div class="form-group">
          <label>Description</label>
          <textarea id="qm-desc" class="form-input form-textarea" placeholder="Describe this quest's routine...">${p.description || ''}</textarea>
        </div>

        <div class="form-group">
          <label>Scheduled Days (Appears Automatically)</label>
          <div class="type-tabs" id="qm-preset-days" style="display: flex; gap: 4px; flex-wrap: wrap;">
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => 
              `<button type="button" class="type-tab day-tab ${scheduledDays.includes(i) ? 'active' : ''}" data-day="${i}" style="flex: 1; min-width: 40px; padding: 6px 0; text-align: center;">${d}</button>`
            ).join('')}
          </div>
        </div>

        <div class="form-group">
          <div class="form-check">
            <input type="checkbox" id="qm-time-window-check" ${hasTimeWindow ? 'checked' : ''}>
            <label for="qm-time-window-check">Restrict to daily time window (Greyed out outside bounds)</label>
          </div>
          <div id="qm-time-window-fields" style="display: ${hasTimeWindow ? 'flex' : 'none'}; gap: 12px; margin-top: 10px;">
            <div class="form-group" style="flex: 1; margin: 0;">
              <label>Start Time</label>
              <input id="qm-time-start" class="form-input" type="time" value="${timeWindow.start}">
            </div>
            <div class="form-group" style="flex: 1; margin: 0;">
              <label>End Time</label>
              <input id="qm-time-end" class="form-input" type="time" value="${timeWindow.end}">
            </div>
          </div>
        </div>

        <div class="form-row" style="margin-top: 5px;">
          <div class="form-check">
            <input type="checkbox" id="qm-has-time-limit" ${p.hasTimeLimit ? 'checked' : ''}>
            <label for="qm-has-time-limit">24-Hour Expiration Time Limit (Missed if incomplete in 24h)</label>
          </div>
        </div>

        <!-- Target Skills -->
        <div class="form-group" style="margin-top: 10px;">
          <label>Target Skills & XP Rewards</label>
          <div id="qm-skills-list">
            ${(p.targetSkills || []).map((t, i) => buildSkillRow(t, i, macros)).join('')}
            ${(!p.targetSkills || p.targetSkills.length === 0) ? buildSkillRow(null, 0, macros) : ''}
          </div>
          <button type="button" class="btn-add-skill" id="qm-add-skill" style="margin-top: 8px;">+ Add Skill Reward</button>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="LM.components.questModal.close(); return false;">Cancel</button>
        <button type="button" class="btn btn-primary" id="qm-submit">${preset ? 'Save Changes' : 'Create Preset'}</button>
      </div>`;
  }

  function buildSkillRow(target, index, macros) {
    const activeMacroId = target?.macroSkillId || (macros[0]?.id || '');
    const microSkills = activeMacroId ? S.getMicroSkills(activeMacroId) : [];

    return `
      <div class="skill-row" data-idx="${index}" style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
        <select class="form-input skill-macro-sel" style="flex: 1;">
          ${macros.map(m => `<option value="${m.id}" ${activeMacroId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
        </select>
        <select class="form-input skill-micro-sel" style="flex: 1;">
          <option value="">— No Micro Skill —</option>
          ${microSkills.map(ms =>
            `<option value="${ms.id}" ${target?.microSkillId === ms.id ? 'selected' : ''}>${ms.name}</option>`
          ).join('')}
        </select>
        <input class="form-input skill-xp-input" type="number" value="${target?.xpAmount || 20}" min="1" style="width: 85px; text-align: center;">
        <button type="button" class="btn-remove-row" onclick="this.closest('.skill-row').remove(); return false;">✕</button>
      </div>`;
  }

  function initEvents(modal, macros) {
    // Day tabs multi-select toggle
    modal.querySelectorAll('.day-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        btn.classList.toggle('active');
      });
    });

    // Time window fields display toggle
    const twCheck = document.getElementById('qm-time-window-check');
    const twFields = document.getElementById('qm-time-window-fields');
    if (twCheck && twFields) {
      twCheck.addEventListener('change', () => {
        twFields.style.display = twCheck.checked ? 'flex' : 'none';
      });
    }

    // Add skill row action
    document.getElementById('qm-add-skill')?.addEventListener('click', (e) => {
      e.preventDefault();
      const list = document.getElementById('qm-skills-list');
      const idx = list.children.length;
      const div = document.createElement('div');
      div.innerHTML = buildSkillRow(null, idx, macros);
      list.appendChild(div.firstElementChild);
      initMacroSelChange(list.lastElementChild);
    });

    // Attach macro change listeners to existing rows
    modal.querySelectorAll('.skill-row').forEach(row => initMacroSelChange(row));

    // Submit handler
    document.getElementById('qm-submit')?.addEventListener('click', submit);
  }

  function initMacroSelChange(row) {
    const macroSel = row.querySelector('.skill-macro-sel');
    const microSel = row.querySelector('.skill-micro-sel');
    if (!macroSel || !microSel) return;
    macroSel.addEventListener('change', () => {
      const micros = S.getMicroSkills(macroSel.value);
      microSel.innerHTML = `<option value="">— No Micro Skill —</option>` +
        micros.map(ms => `<option value="${ms.id}">${ms.name}</option>`).join('');
    });
  }

  function submit(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('qm-name')?.value?.trim();
    if (!name) { N.show('Preset name is required', 'warning'); return; }

    const desc = document.getElementById('qm-desc')?.value?.trim() || '';

    // Collect active days
    const scheduledDays = [];
    document.querySelectorAll('.day-tab.active').forEach(btn => {
      scheduledDays.push(parseInt(btn.dataset.day));
    });
    if (scheduledDays.length === 0) {
      N.show('Select at least one scheduled day', 'warning');
      return;
    }

    // Collect time window bounds
    const twCheck = document.getElementById('qm-time-window-check')?.checked || false;
    let timeWindow = null;
    if (twCheck) {
      const start = document.getElementById('qm-time-start')?.value || '09:00';
      const end = document.getElementById('qm-time-end')?.value || '17:00';
      timeWindow = { start, end };
    }

    // Collect 24h timer expiration check
    const hasTimeLimit = document.getElementById('qm-has-time-limit')?.checked || false;

    // Collect skill rewards
    const targetSkills = [];
    document.querySelectorAll('#qm-skills-list .skill-row').forEach(row => {
      const macroId = row.querySelector('.skill-macro-sel')?.value;
      const microId = row.querySelector('.skill-micro-sel')?.value || null;
      const xp = parseFloat(row.querySelector('.skill-xp-input')?.value || 20);
      if (macroId) {
        targetSkills.push({ macroSkillId: macroId, microSkillId: microId, xpAmount: isNaN(xp) ? 20 : xp });
      }
    });

    if (targetSkills.length === 0) {
      N.show('Add at least one skill reward', 'warning');
      return;
    }

    const preset = {
      id: editingPresetId || S.uid(),
      name,
      description: desc,
      scheduledDays,
      timeWindow,
      hasTimeLimit,
      targetSkills
    };

    S.upsertPreset(preset);
    close();
    N.show(`Quest Preset "${name}" saved successfully!`, 'success');
  }

  return { open, close };
})();
