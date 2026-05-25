// LIFEMAXX — Skill Manager Modal
window.LM.components.skillModal = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;
  const N = window.LM.components.notifications;

  const EXPONENT_PRESETS = [
    { label: 'Easy (1.3)', value: 1.3 },
    { label: 'Normal (1.6)', value: 1.6 },
    { label: 'Hard (2.0)', value: 2.0 },
    { label: 'Brutal (2.2)', value: 2.2 },
  ];

  function open() {
    const modal = document.getElementById('skill-modal');
    const overlay = document.getElementById('modal-overlay');
    modal.innerHTML = buildHTML();
    modal.classList.add('modal-open');
    overlay.classList.add('overlay-open');
    initEvents();
  }

  function close() {
    document.getElementById('skill-modal').classList.remove('modal-open');
    document.getElementById('modal-overlay').classList.remove('overlay-open');
  }

  function buildHTML() {
    const macros = S.getMacros();
    return `
      <div class="modal-header">
        <h2 class="font-display">MANAGE SKILLS</h2>
        <button class="modal-close" onclick="LM.components.skillModal.close()">✕</button>
      </div>
      <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
        <div id="sm-macro-list">
          ${macros.map(m => buildMacroRow(m)).join('')}
        </div>
        <button class="btn btn-ghost" id="sm-add-macro" style="width:100%;margin-top:12px">+ Add New Macro Skill</button>

        <!-- Add Macro Form (hidden) -->
        <div id="sm-add-macro-form" class="add-skill-form" style="display:none;">
          <h3 style="margin-bottom:12px;font-family:var(--font-display);font-size:0.85rem;letter-spacing:0.1em">NEW MACRO SKILL</h3>
          <div class="form-group">
            <label>Name</label>
            <input id="sm-new-name" class="form-input" type="text" placeholder="Skill name...">
          </div>
          <div class="form-row">
            <div class="form-group" style="flex:1">
              <label>Accent Color</label>
              <input id="sm-new-color" class="form-input" type="color" value="#7c3aed">
            </div>
            <div class="form-group" style="flex:2">
              <label>Difficulty</label>
              <select id="sm-new-exponent" class="form-input">
                ${EXPONENT_PRESETS.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>XP to Level 100</label>
            <input id="sm-new-xp100" class="form-input" type="number" value="500000" min="10000">
          </div>
          <div class="form-row" style="justify-content:flex-end;gap:8px">
            <button class="btn btn-ghost" onclick="document.getElementById('sm-add-macro-form').style.display='none'">Cancel</button>
            <button class="btn btn-primary" id="sm-save-macro">Create Skill</button>
          </div>
        </div>
      </div>`;
  }

  function buildMacroRow(macro) {
    const micros = macro.microSkills || [];
    return `
      <div class="macro-manage-row" data-id="${macro.id}">
        <div class="macro-manage-header">
          <span class="macro-dot" style="background:${macro.accentColor}"></span>
          <span class="macro-manage-name">${macro.name}</span>
          <button class="btn-icon" onclick="LM.components.skillModal.renameMacro('${macro.id}')" title="Rename">✎</button>
          <button class="btn-icon danger" onclick="LM.components.skillModal.deleteMacro('${macro.id}')" title="Delete">✕</button>
        </div>
        <div class="micro-list" id="micro-list-${macro.id}">
          ${micros.map(ms => buildMicroRow(macro.id, ms)).join('')}
          <button class="btn-add-micro" onclick="LM.components.skillModal.addMicro('${macro.id}')">+ Add Micro Skill</button>
        </div>
      </div>`;
  }

  function buildMicroRow(macroId, ms) {
    return `
      <div class="micro-manage-row" data-id="${ms.id}">
        <span>${ms.name}</span>
        <div class="micro-actions">
          <button class="btn-icon" onclick="LM.components.skillModal.renameMicro('${macroId}','${ms.id}')" title="Rename">✎</button>
          <button class="btn-icon danger" onclick="LM.components.skillModal.deleteMicro('${macroId}','${ms.id}')" title="Delete">✕</button>
        </div>
      </div>`;
  }

  function initEvents() {
    document.getElementById('sm-add-macro')?.addEventListener('click', () => {
      document.getElementById('sm-add-macro-form').style.display = 'block';
    });
    document.getElementById('sm-save-macro')?.addEventListener('click', saveMacro);
    document.getElementById('modal-overlay')?.addEventListener('click', close);
  }

  function saveMacro() {
    const name = document.getElementById('sm-new-name')?.value?.trim();
    if (!name) { N.show('Skill name required', 'warning'); return; }
    const color = document.getElementById('sm-new-color')?.value || '#7c3aed';
    const exp = parseFloat(document.getElementById('sm-new-exponent')?.value || 1.6);
    const xp100 = parseInt(document.getElementById('sm-new-xp100')?.value || 500000);
    const macro = {
      id: S.uid(), name, accentColor: color,
      exponent: exp, totalXPtoL100: xp100,
      currentXP: 0, currentLevel: 0,
      base: xp100 / Math.pow(100, exp),
      microSkills: []
    };
    S.upsertMacro(macro);
    N.show(`Skill "${name}" created!`, 'success');
    open(); // re-render
  }

  function renameMacro(id) {
    const macro = S.getMacro(id);
    if (!macro) return;
    const name = prompt('Rename skill:', macro.name);
    if (name && name.trim()) { macro.name = name.trim(); S.upsertMacro(macro); open(); }
  }

  function deleteMacro(id) {
    const macro = S.getMacro(id);
    if (!macro) return;
    if (confirm(`Delete "${macro.name}"? This cannot be undone.`)) { S.deleteMacro(id); open(); }
  }

  function addMicro(macroId) {
    const name = prompt('New micro skill name:');
    if (!name || !name.trim()) return;
    const macro = S.getMacro(macroId);
    const e = macro.exponent, t = macro.totalXPtoL100 * 0.4;
    S.upsertMicroSkill(macroId, {
      id: S.uid(), parentMacroId: macroId, name: name.trim(),
      currentXP: 0, currentLevel: 0, exponent: e, totalXPtoL100: t, base: t / Math.pow(100, e)
    });
    open();
  }

  function renameMicro(macroId, microId) {
    const ms = S.getMicroSkills(macroId).find(m => m.id === microId);
    if (!ms) return;
    const name = prompt('Rename micro skill:', ms.name);
    if (name && name.trim()) { ms.name = name.trim(); S.upsertMicroSkill(macroId, ms); open(); }
  }

  function deleteMicro(macroId, microId) {
    if (confirm('Delete this micro skill?')) { S.deleteMicroSkill(macroId, microId); open(); }
  }

  return { open, close, renameMacro, deleteMacro, addMicro, renameMicro, deleteMicro };
})();
