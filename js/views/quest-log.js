// LIFEMAXX — Quest Log View
window.LM.views.questLog = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;
  const RT = window.LM.components.researchTimer;

  const TYPE_META = {
    weekly:   { label: 'Weekly',   color: '#3b82f6', icon: '' },
    project:  { label: 'Project',  color: '#8b5cf6', icon: '' },
    boss:     { label: 'Boss',     color: '#ef4444', icon: '' },
    research: { label: 'Research', color: '#f59e0b', icon: '' },
    habit:    { label: 'Habit',    color: '#14b8a6', icon: '' },
  };

  let filters = { type: 'all', skill: 'all', status: 'active' };
  let expanded = new Set();

  function render() {
    const macros = S.getMacros();
    const quests = getFilteredQuests(macros);

    return `
      <div class="view-container quest-log-view">
        <div class="view-header">
          <h1 class="font-display">QUEST LOG</h1>
          <button class="btn btn-primary" onclick="LM.components.questModal.open()">+ New Quest</button>
        </div>

        <div class="quest-log-filters">
          <div class="filter-row">
            <div class="filter-chips">
              ${['all','weekly','project','boss','research','habit'].map(f =>
                `<button class="chip ${filters.type===f?'chip-active':''}" onclick="LM.views.questLog.setFilter('type','${f}')">${f==='all'?'All Types':TYPE_META[f]?.label||f}</button>`
              ).join('')}
            </div>
          </div>
          <div class="filter-row">
            <select class="form-input" onchange="LM.views.questLog.setFilter('skill',this.value)" style="width:160px">
              <option value="all">All Skills</option>
              ${macros.map(m=>`<option value="${m.id}" ${filters.skill===m.id?'selected':''}>${m.name}</option>`).join('')}
            </select>
            <div class="filter-chips">
              ${['active','completed','failed'].map(s =>
                `<button class="chip ${filters.status===s?'chip-active':''}" onclick="LM.views.questLog.setFilter('status','${s}')">${s.charAt(0).toUpperCase()+s.slice(1)}</button>`
              ).join('')}
            </div>
          </div>
        </div>

        <div class="quest-log-list" id="quest-log-list">
          ${renderList(quests, macros)}
        </div>
      </div>`;
  }

  function getFilteredQuests(macros) {
    return S.getQuests().filter(q => {
      const tSkills = q.targetSkills || [];
      if (filters.type !== 'all' && q.type !== filters.type) return false;
      if (filters.skill !== 'all' && !tSkills.some(t => t.macroSkillId === filters.skill)) return false;
      if (filters.status === 'active' && q.status !== 'active') return false;
      if (filters.status === 'completed' && q.status !== 'completed') return false;
      if (filters.status === 'failed' && q.status !== 'failed') return false;
      return true;
    });
  }

  function renderList(quests, macros) {
    if (!quests.length) return `<div class="empty-state"><p>No quests match these filters.</p></div>`;

    return quests.map(q => {
      const meta = TYPE_META[q.type] || TYPE_META.habit;
      const isExpanded = expanded.has(q.id);
      const tSkills = q.targetSkills || [];
      const skillTags = tSkills.map(t => {
        const m = macros.find(x=>x.id===t.macroSkillId);
        return m ? `<span class="skill-tag" style="color:${m.accentColor};border-color:${m.accentColor}33">${m.name} +${t.xpAmount}xp</span>` : '';
      }).join('');

      const streakInfo = (q.type==='habit') ? `<span class="streak-badge">${q.streak||0}d streak</span>` : '';
      const resetInfo = q.type==='weekly' ? `<span class="reset-info">Resets Monday</span>` : '';

      let timeStr = '';
      if (q.expiresAt && q.status === 'active') {
        const leftMs = Math.max(0, q.expiresAt - Date.now());
        if (leftMs > 0) {
          const h = Math.floor(leftMs / 3600000);
          const m = Math.floor((leftMs % 3600000) / 60000);
          timeStr = `<span class="time-left">${h}h ${m}m</span>`;
        } else {
          timeStr = `<span class="time-left" style="color:var(--danger)">Expired</span>`;
        }
      }

      const subTasksHTML = isExpanded && q.subTasks?.length ? `
        <div class="subtask-list">
          ${q.subTasks.map(st => `
            <label class="subtask-item">
              <input type="checkbox" ${st.completed?'checked':''} onchange="LM.views.questLog.toggleSubtask('${q.id}','${st.id}',this.checked)">
              <span class="${st.completed?'st-done':''}">${st.name}</span>
            </label>`).join('')}
        </div>` : '';

      const researchHTML = isExpanded && q.researchLog !== null ? `
        <div class="research-section">
          ${RT.renderButton(q)}
          ${(q.researchLog||[]).slice(0,3).map(e => `
            <div class="research-entry-mini">
              <strong>${e.title}</strong>
              <p>${e.content.substring(0,120)}${e.content.length>120?'…':''}</p>
              <span class="re-date">${new Date(e.createdAt).toLocaleDateString()}</span>
            </div>`).join('')}
          ${q.researchLog.length > 3 ? `<p class="view-more">+${q.researchLog.length-3} more entries</p>` : ''}
        </div>` : '';

      return `
        <div class="quest-log-row ${q.status==='completed'?'quest-done':''} ${q.type==='boss'?'quest-boss-row':''}">
          <div class="quest-log-main" onclick="LM.views.questLog.toggleExpand('${q.id}')">
            <div class="quest-log-left">
              <span class="quest-type-badge" style="background:${meta.color}22;color:${meta.color}">${meta.icon} ${meta.label}</span>
              <div class="quest-log-info">
                <span class="quest-log-name">${q.name}</span>
                <div class="quest-log-meta">${skillTags} ${streakInfo} ${resetInfo} ${timeStr}</div>
              </div>
            </div>
            <div class="quest-log-right">
              ${q.subTasks ? `<span class="subtask-ratio">${q.subTasks.filter(s=>s.completed).length}/${q.subTasks.length}</span>` : ''}
              <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();LM.components.questModal.open('${q.id}')">Edit</button>
              <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();LM.views.questLog.completeQuest('${q.id}')">✓</button>
              <button class="btn-icon danger" onclick="event.stopPropagation();LM.views.questLog.deleteQuest('${q.id}')">✕</button>
              <span class="expand-arrow">${isExpanded?'▲':'▼'}</span>
            </div>
          </div>
          ${isExpanded ? `
            <div class="quest-log-expanded">
              ${q.description ? `<p class="quest-desc-full">${q.description}</p>` : ''}
              ${subTasksHTML}
              ${researchHTML}
            </div>` : ''}
        </div>`;
    }).join('');
  }

  function setFilter(key, val) {
    filters[key] = val;
    const list = document.getElementById('quest-log-list');
    if (list) list.innerHTML = renderList(getFilteredQuests(S.getMacros()), S.getMacros());
    // Update chip states
    document.querySelectorAll('.quest-log-view .chip').forEach(c => {
      if (c.getAttribute('onclick')?.includes(`'type'`) && filters.type) {
        c.classList.toggle('chip-active', c.getAttribute('onclick')?.includes(`'${filters.type}'`));
      }
    });
  }

  function toggleExpand(questId) {
    if (expanded.has(questId)) expanded.delete(questId); else expanded.add(questId);
    const list = document.getElementById('quest-log-list');
    if (list) list.innerHTML = renderList(getFilteredQuests(S.getMacros()), S.getMacros());
  }

  function toggleSubtask(questId, subtaskId, checked) {
    const quest = S.getQuest(questId);
    if (!quest || !quest.subTasks) return;
    const st = quest.subTasks.find(s => s.id === subtaskId);
    if (st) { st.completed = checked; S.upsertQuest(quest); }
    // Auto-complete project/boss if all subtasks done
    if (quest.subTasks.every(s => s.completed)) {
      LM.components.notifications.show(`All sub-tasks done! Complete "${quest.name}" to claim XP.`, 'info', 5000);
    }
  }

  function completeQuest(questId) {
    window.LM.components.wheel.handleDrop(questId);
    const list = document.getElementById('quest-log-list');
    if (list) list.innerHTML = renderList(getFilteredQuests(S.getMacros()), S.getMacros());
  }

  function deleteQuest(questId) {
    if (confirm('Delete this quest?')) {
      S.deleteQuest(questId);
      const list = document.getElementById('quest-log-list');
      if (list) list.innerHTML = renderList(getFilteredQuests(S.getMacros()), S.getMacros());
    }
  }

  function init() {}

  return { render, init, setFilter, toggleExpand, toggleSubtask, completeQuest, deleteQuest };
})();
