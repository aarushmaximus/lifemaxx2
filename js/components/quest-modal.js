// LIFEMAXX — Quest Creation / Edit Modal
window.LM.components.questModal = (function () {
  const S = window.LM.store;
  const N = window.LM.components.notifications;

  const TYPE_XP = { habit: 20, weekly: 100, project: 400, boss: 2500, research: 150 };
  const TYPE_LABELS = { habit: 'Habit', weekly: 'Weekly Mission', project: 'Project Quest', boss: 'Boss Quest', research: 'Research Quest' };

  let editingQuestId = null;

  function open(questId = null) {
    editingQuestId = questId;
    const quest = questId ? S.getQuest(questId) : null;
    const macros = S.getMacros();
    const modal = document.getElementById('quest-modal');
    const overlay = document.getElementById('modal-overlay');

    modal.innerHTML = buildHTML(quest, macros);
    modal.classList.add('modal-open');
    overlay.classList.add('overlay-open');

    initEvents(modal, macros);
  }

  function close() {
    const modal = document.getElementById('quest-modal');
    const overlay = document.getElementById('modal-overlay');
    modal.classList.remove('modal-open');
    overlay.classList.remove('overlay-open');
    editingQuestId = null;
  }

  function buildHTML(quest, macros) {
    const q = quest || {};
    const type = q.type || 'habit';
    return `
      <div class="modal-header">
        <h2 class="font-display">${quest ? 'EDIT QUEST' : 'CREATE QUEST'}</h2>
        <button type="button" class="modal-close" onclick="LM.components.questModal.close(); return false;">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Quest Name</label>
          <input id="qm-name" class="form-input" type="text" placeholder="Name your quest..." value="${q.name||''}">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="qm-desc" class="form-input form-textarea" placeholder="What does this quest involve?">${q.description||''}</textarea>
        </div>
        <div class="form-group">
          <label>Quest Type</label>
          <div class="type-tabs" id="qm-type-tabs">
            ${Object.entries(TYPE_LABELS).map(([k,v]) =>
              `<button type="button" class="type-tab type-selector ${type===k?'active':''}" data-type="${k}">${v}</button>`
            ).join('')}
          </div>
          <input type="hidden" id="qm-type" value="${type}">
        </div>
        <div class="form-row">
          <div class="form-check">
            <input type="checkbox" id="qm-neg-miss" ${q.isNegativeOnMiss?'checked':''}>
            <label for="qm-neg-miss">Negative XP on Miss</label>
          </div>
          <div class="form-check">
            <input type="checkbox" id="qm-neg-complete" ${q.isNegativeOnComplete?'checked':''}>
            <label for="qm-neg-complete">Negative XP on Complete</label>
          </div>
        </div>

        <!-- Habit Schedule Group -->
        <div class="form-group" id="qm-habit-schedule-group" style="display:${type==='habit'?'block':'none'}">
          <label>Scheduled Days (Repeats Weekly)</label>
          <div class="type-tabs" id="qm-habit-days">
            ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => 
              `<button type="button" class="type-tab day-tab ${(q.scheduledDays||[]).includes(i)?'active':''}" data-day="${i}">${d}</button>`
            ).join('')}
          </div>
        </div>

        <div class="form-group" id="qm-timer-group">
          <label>Optional Time Limit (Hours)</label>
          <input id="qm-time-limit" class="form-input" type="number" min="0.1" step="0.1" placeholder="Leave empty for no limit" value="${q.timeLimitHours||''}">
        </div>

        <!-- Timed Focus Mode (Universal) -->
        <div class="form-group" id="qm-timed-group">
          <div class="form-check">
            <input type="checkbox" id="qm-timed-enabled" ${q.timedResearch?.enabled?'checked':''}>
            <label for="qm-timed-enabled">Enable Focus Timer (XP per Second)</label>
          </div>
          <div id="qm-timed-fields" style="display:${q.timedResearch?.enabled?'flex':'none'};gap:12px;margin-top:10px;">
            <div class="form-group" style="flex:1;margin:0">
              <label>XP / Second</label>
              <input id="qm-xp-per-sec" class="form-input" type="number" step="0.01" min="0.01" value="${q.timedResearch?.xpPerSecond||0.05}">
            </div>
            <div class="form-group" style="flex:1;margin:0">
              <label>Session XP Cap</label>
              <input id="qm-xp-cap" class="form-input" type="number" min="1" value="${q.timedResearch?.sessionXPCap||50}">
            </div>
          </div>
        </div>

        <!-- Target Skills -->
        <div class="form-group">
          <label>Target Skills</label>
          <div id="qm-skills-list">
            ${(q.targetSkills||[]).map((t,i) => buildSkillRow(t, i, macros, type)).join('')}
          </div>
          <button type="button" class="btn-add-skill" id="qm-add-skill">+ Add Skill</button>
        </div>

        <!-- Sub-tasks (project/boss) -->
        <div class="form-group" id="qm-subtasks-group" style="display:${['project','boss'].includes(type)?'block':'none'}">
          <label>Sub-Tasks</label>
          <div id="qm-subtasks-list">
            ${(q.subTasks||[]).map((st,i) => buildSubtaskRow(st,i)).join('')}
          </div>
          <button type="button" class="btn-add-skill" id="qm-add-subtask">+ Add Sub-task</button>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="LM.components.questModal.close(); return false;">Cancel</button>
        <button type="button" class="btn btn-primary" id="qm-submit">${quest ? 'Save Changes' : 'Create Quest'}</button>
      </div>`;
  }

  function buildSkillRow(target, index, macros, type) {
    const defaultXP = TYPE_XP[type] || 20;
    const activeMacroId = target?.macroSkillId || (macros[0]?.id || '');
    const microSkills = activeMacroId ? S.getMicroSkills(activeMacroId) : [];

    return `
      <div class="skill-row" data-idx="${index}">
        <select class="form-input skill-macro-sel" style="flex:1">
          ${macros.map(m => `<option value="${m.id}" ${activeMacroId===m.id?'selected':''}>${m.name}</option>`).join('')}
        </select>
        <select class="form-input skill-micro-sel" style="flex:1">
          <option value="">— No Micro Skill —</option>
          ${microSkills.map(ms =>
            `<option value="${ms.id}" ${target?.microSkillId===ms.id?'selected':''}>${ms.name}</option>`
          ).join('')}
        </select>
        <input class="form-input skill-xp-input" type="number" value="${target?.xpAmount||defaultXP}" min="1" style="width:80px">
        <button type="button" class="btn-remove-row" onclick="this.closest('.skill-row').remove(); return false;">✕</button>
      </div>`;
  }

  function buildSubtaskRow(st, index) {
    return `
      <div class="subtask-row" data-idx="${index}">
        <input type="checkbox" ${st?.completed?'checked':''} class="st-check">
        <input class="form-input" type="text" value="${st?.name||''}" placeholder="Sub-task name..." style="flex:1">
        <button type="button" class="btn-remove-row" onclick="this.closest('.subtask-row').remove(); return false;">✕</button>
      </div>`;
  }

  function initEvents(modal, macros) {
    // Type tabs
    modal.querySelectorAll('.type-tab.type-selector').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.querySelectorAll('.type-tab.type-selector').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const type = btn.dataset.type;
        document.getElementById('qm-type').value = type;
        const subtasksGroup = document.getElementById('qm-subtasks-group');
        const habitGroup = document.getElementById('qm-habit-schedule-group');
        if (subtasksGroup) subtasksGroup.style.display = ['project','boss'].includes(type) ? 'block' : 'none';
        if (habitGroup) habitGroup.style.display = type === 'habit' ? 'block' : 'none';
      });
    });

    // Day tabs
    modal.querySelectorAll('.day-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        btn.classList.toggle('active');
      });
    });

    // Timed research toggle
    const timedCheck = document.getElementById('qm-timed-enabled');
    const timedFields = document.getElementById('qm-timed-fields');
    if (timedCheck) timedCheck.addEventListener('change', () => {
      if (timedFields) timedFields.style.display = timedCheck.checked ? 'flex' : 'none';
    });

    // Add skill row
    document.getElementById('qm-add-skill')?.addEventListener('click', (e) => {
      e.preventDefault();
      const list = document.getElementById('qm-skills-list');
      const idx = list.children.length;
      const type = document.getElementById('qm-type').value;
      const div = document.createElement('div');
      div.innerHTML = buildSkillRow(null, idx, macros, type);
      list.appendChild(div.firstElementChild);
      initMacroSelChange(list.lastElementChild);
    });

    // Macro select → update micro options
    modal.querySelectorAll('.skill-row').forEach(row => initMacroSelChange(row));

    // Add subtask
    document.getElementById('qm-add-subtask')?.addEventListener('click', (e) => {
      e.preventDefault();
      const list = document.getElementById('qm-subtasks-list');
      const idx = list.children.length;
      const div = document.createElement('div');
      div.innerHTML = buildSubtaskRow(null, idx);
      list.appendChild(div.firstElementChild);
    });

    // Submit
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
    if (!name) { N.show('Quest name is required', 'warning'); return; }

    const type = document.getElementById('qm-type')?.value || 'habit';
    const timedEnabled = document.getElementById('qm-timed-enabled')?.checked || false;

    const targetSkills = [];
    document.querySelectorAll('#qm-skills-list .skill-row').forEach(row => {
      const macroId = row.querySelector('.skill-macro-sel')?.value;
      const microId = row.querySelector('.skill-micro-sel')?.value || null;
      const xp = parseFloat(row.querySelector('.skill-xp-input')?.value || 20);
      if (macroId) targetSkills.push({ macroSkillId: macroId, microSkillId: microId, xpAmount: xp });
    });

    const subTasks = [];
    document.querySelectorAll('#qm-subtasks-list .subtask-row').forEach(row => {
      const n = row.querySelector('input[type=text]')?.value?.trim();
      const done = row.querySelector('.st-check')?.checked || false;
      if (n) subTasks.push({ id: S.uid(), name: n, completed: done });
    });

    const scheduledDays = [];
    document.querySelectorAll('.day-tab.active').forEach(btn => scheduledDays.push(parseInt(btn.dataset.day)));

    const existing = editingQuestId ? S.getQuest(editingQuestId) : null;
    
    let expiresAt = existing?.expiresAt || null;
    let timeLimitHours = existing?.timeLimitHours || null;
    
    // For habits, the system sets expiresAt to midnight automatically.
    if (type !== 'habit') {
      const customLimit = parseFloat(document.getElementById('qm-time-limit')?.value);
      if (!isNaN(customLimit) && customLimit > 0) {
        if (!existing || customLimit !== existing.timeLimitHours) {
          expiresAt = Date.now() + (customLimit * 60 * 60 * 1000);
          timeLimitHours = customLimit;
        }
      } else {
        expiresAt = null;
        timeLimitHours = null;
      }
    } else {
      timeLimitHours = null;
    }

    const quest = {
      id: editingQuestId || S.uid(),
      name,
      description: document.getElementById('qm-desc')?.value?.trim() || '',
      type, status: existing?.status || 'active',
      isNegativeOnMiss: type === 'habit' ? true : (document.getElementById('qm-neg-miss')?.checked || false),
      isNegativeOnComplete: document.getElementById('qm-neg-complete')?.checked || false,
      targetSkills,
      isCustom: true,
      scheduledDays: type === 'habit' ? scheduledDays : null,
      createdAt: existing?.createdAt || Date.now(),
      completedAt: existing?.completedAt || null,
      expiresAt,
      timeLimitHours,
      streak: existing?.streak || (type === 'habit' ? 0 : null),
      lastCompletedDate: existing?.lastCompletedDate || null,
      lastResetDate: existing?.lastResetDate || null,
      researchLog: existing?.researchLog || (type === 'research' ? [] : null),
      subTasks: ['project','boss'].includes(type) ? (subTasks.length ? subTasks : null) : null,
      timedResearch: {
        enabled: timedEnabled,
        xpPerSecond: isNaN(parseFloat(document.getElementById('qm-xp-per-sec')?.value)) ? 0.05 : parseFloat(document.getElementById('qm-xp-per-sec').value),
        sessionXPCap: isNaN(parseFloat(document.getElementById('qm-xp-cap')?.value)) ? 50 : parseFloat(document.getElementById('qm-xp-cap').value),
        sessions: existing?.timedResearch?.sessions || []
      }
    };

    S.upsertQuest(quest);
    close();
    N.show(`Quest "${name}" ${editingQuestId ? 'updated' : 'created'}!`, 'success');
  }

  return { open, close };
})();
