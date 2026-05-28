// LIFEMAXX — Dashboard View (3-column layout)
window.LM.views.dashboard = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;
  const W = window.LM.components.wheel;
  const RT = window.LM.components.researchTimer;

  const TYPE_META = {
    weekly:   { label: 'Weekly',   color: '#3b82f6', icon: '' },
    project:  { label: 'Project',  color: '#8b5cf6', icon: '' },
    boss:     { label: 'Boss',     color: '#ef4444', icon: '' },
    research: { label: 'Research', color: '#f59e0b', icon: '' },
    habit:    { label: 'Habit',    color: '#14b8a6', icon: '' },
  };

  let activeFilter = 'all';
  let activeSkillFilter = 'all';

  function render() {
    const macros = S.getMacros();
    const settings = S.getSettings();
    const wheelSkillId = settings.wheelSkillId || 'overall';

    // Linear XP bar data
    let barData = getBarData(wheelSkillId, macros);

    return `
      <div class="dashboard-grid">
        <!-- CENTER COLUMN -->
        <div class="dash-center">
          <!-- Skill selector + XP bar -->
          <div class="skill-bar-panel">
            <div class="skill-bar-header">
              <select id="dash-skill-sel" class="skill-bar-select">
                <option value="overall" ${wheelSkillId==='overall'?'selected':''}>Overall Level</option>
                ${macros.map(m=>`<option value="${m.id}" ${wheelSkillId===m.id?'selected':''}>${m.name}</option>`).join('')}
              </select>
              <span class="skill-bar-level" id="dash-level-label">Lvl <strong>${barData.level}</strong></span>
            </div>
            <div class="xp-bar-wrap">
              <div class="xp-bar-track">
                <div class="xp-bar-fill" id="dash-xp-fill" style="width:${barData.pct}%;background:${barData.color}"></div>
              </div>
              <span class="xp-bar-label" id="dash-xp-label">${F.formatXP(barData.into)} / ${F.formatXP(barData.req)} XP</span>
            </div>
          </div>

          <!-- Quest Filters -->
          <div class="quest-filter-bar">
            <div class="filter-chips" id="type-filter-chips">
              ${['all','weekly','project','boss','research','habit'].map(f =>
                `<button class="chip ${activeFilter===f?'chip-active':''}" data-filter="${f}">
                  ${f==='all'?'All':TYPE_META[f]?.label||f}
                </button>`
              ).join('')}
            </div>
            <select class="chip skill-chip-sel" id="skill-filter-sel">
              <option value="all">All Skills</option>
              ${macros.map(m=>`<option value="${m.id}" ${activeSkillFilter===m.id?'selected':''}>${m.name}</option>`).join('')}
            </select>
          </div>

          <!-- Quest Cards Grid -->
          <div class="quest-grid" id="quest-grid">
            ${renderQuestCards(macros)}
          </div>
        </div>

        <!-- RIGHT COLUMN — Wheel -->
        <div class="dash-right">
          <div class="wheel-panel">
            <p class="wheel-hint-top">SELECT SKILL · DRAG QUEST TO COMPLETE</p>
            ${W.renderHTML()}
          </div>
        </div>
      </div>`;
  }

  function getBarData(skillId, macros) {
    if (skillId === 'overall') {
      const o = S.getOverall();
      return { level: o.currentLevel||0, color:'var(--accent)', into: F.xpIntoCurrentLevel(o.currentXP||0,o), req: F.xpRequiredForNextLevel(o.currentXP||0,o), pct: F.progressPercent(o.currentXP||0,o) };
    }
    const m = macros.find(x=>x.id===skillId);
    if (!m) return { level:0, color:'var(--accent)', into:0, req:1, pct:0 };
    return { level:m.currentLevel||0, color:m.accentColor, into:F.xpIntoCurrentLevel(m.currentXP||0,m), req:F.xpRequiredForNextLevel(m.currentXP||0,m), pct:F.progressPercent(m.currentXP||0,m) };
  }

  function renderQuestCards(macros) {
    const quests = S.getQuests().filter(q => {
      const tSkills = q.targetSkills || [];
      if (q.hiddenFromDashboard) return false;
      if (q.status === 'completed' && q.type !== 'habit' && q.type !== 'weekly' && !q.isReadyToClaim) return false;
      if (activeFilter !== 'all' && q.type !== activeFilter) return false;
      if (activeSkillFilter !== 'all' && !tSkills.some(t=>t.macroSkillId===activeSkillFilter)) return false;
      return true;
    });

    if (!quests.length) return `<div class="empty-state"><p>No active quests. Create one!</p></div>`;

    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    return quests.map(q => {
      const meta = TYPE_META[q.type] || TYPE_META.habit;
      const tSkills = q.targetSkills || [];
      const skillTags = tSkills.map(t => {
        const m = macros.find(x=>x.id===t.macroSkillId);
        return m ? `<span class="skill-tag" style="color:${m.accentColor};border-color:${m.accentColor}33">${m.name} +${t.xpAmount}xp</span>` : '';
      }).join('');

      const streakBadge = (q.type==='habit') && q.streak
        ? `<span class="streak-badge">${q.streak}d streak</span>` : '';

      let timeStr = '';
      if (q.expiresAt && q.status === 'active') {
        const leftMs = Math.max(0, q.expiresAt - Date.now());
        if (leftMs > 0) {
          const h = Math.floor(leftMs / 3600000);
          const m = Math.floor((leftMs % 3600000) / 60000);
          timeStr = `<span style="font-size:0.75rem;color:var(--text-3);display:flex;align-items:center;gap:4px">${h}h ${m}m left</span>`;
        } else {
          timeStr = `<span style="font-size:0.75rem;color:var(--danger);display:flex;align-items:center;gap:4px">Expired</span>`;
        }
      }

      const subProg = q.subTasks?.length
        ? `<div class="subtask-prog"><span>${q.subTasks.filter(s=>s.completed).length}/${q.subTasks.length} tasks</span>
           <div class="mini-bar"><div style="width:${(q.subTasks.filter(s=>s.completed).length/q.subTasks.length*100).toFixed(0)}%;background:${meta.color}"></div></div></div>` : '';

      const timerWidget = RT.renderButton(q);
      const isBoss = q.type === 'boss';

      return `
        <div class="quest-card ${isBoss?'quest-boss':''}" draggable="true" data-quest-id="${q.id}"
          ondragstart="LM.views.dashboard.onDragStart(event,'${q.id}')"
          ondragend="this.classList.remove('card-dragging')">
          <div class="quest-card-header">
            <span class="quest-type-badge" style="background:${meta.color}22;color:${meta.color}">${meta.icon} ${meta.label}</span>
            ${streakBadge}
            ${timeStr}
            <div class="quest-card-actions">
              <button class="btn-icon" onclick="LM.components.questModal.open('${q.id}')" title="Edit">✎</button>
              <button class="btn-icon danger" onclick="LM.views.dashboard.deleteQuest('${q.id}')" title="Delete">✕</button>
            </div>
          </div>
          <h3 class="quest-card-name">${q.name}</h3>
          ${q.description ? `<p class="quest-card-desc">${q.description}</p>` : ''}
          <div class="quest-skill-tags">${skillTags}</div>
          ${subProg}
          ${timerWidget}
          <div class="quest-card-footer">
            ${(S.getSettings().dragToRegister !== false && q.isReadyToClaim) 
              ? (isTouch 
                  ? `<button class="btn-complete" onclick="LM.views.dashboard.claimXPMobile('${q.id}')" style="background:var(--accent-dim);border:1px solid var(--accent);color:var(--accent);cursor:pointer;pointer-events:all;">✓ Claim XP</button>`
                  : `<button class="btn-complete" style="background:transparent;border:1px dashed var(--border);color:var(--text-3);cursor:grab;pointer-events:none;">✓ Completed (Drag to Claim XP)</button>`
                )
              : `<button class="btn-complete" onclick="LM.views.dashboard.completeQuest('${q.id}')">✓ Complete</button>`
            }
          </div>
        </div>`;
    }).join('');
  }

  function init() {
    // Wheel
    W.init();

    // Skill selector (syncs with wheel)
    document.getElementById('dash-skill-sel')?.addEventListener('change', (e) => {
      const skillId = e.target.value;
      const s = S.getSettings(); s.wheelSkillId = skillId; S.saveSettings(s);
      updateBar(skillId);
      W.update(0);
    });

    // Type filter
    document.getElementById('type-filter-chips')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      activeFilter = btn.dataset.filter || 'all';
      refreshCards();
      document.querySelectorAll('#type-filter-chips .chip').forEach(c => c.classList.toggle('chip-active', c.dataset.filter===activeFilter));
    });

    // Skill filter
    document.getElementById('skill-filter-sel')?.addEventListener('change', (e) => {
      activeSkillFilter = e.target.value;
      refreshCards();
    });
  }

  function updateBar(skillId) {
    const macros = S.getMacros();
    const data = getBarData(skillId, macros);
    const fill = document.getElementById('dash-xp-fill');
    const label = document.getElementById('dash-xp-label');
    const lvl = document.getElementById('dash-level-label');
    if (fill) { fill.style.width = `${data.pct}%`; fill.style.background = data.color; }
    if (label) label.textContent = `${F.formatXP(data.into)} / ${F.formatXP(data.req)} XP`;
    if (lvl) lvl.innerHTML = `Lvl <strong>${data.level}</strong>`;
  }

  function refreshCards() {
    const grid = document.getElementById('quest-grid');
    if (grid) grid.innerHTML = renderQuestCards(S.getMacros());
  }

  function onDragStart(event, questId) {
    event.dataTransfer.setData('questId', questId);
    event.target.classList.add('card-dragging');
  }

  function completeQuest(questId) {
    const s = S.getSettings();
    if (s.dragToRegister !== false) {
      S.markQuestReady(questId);
      refreshCards();
    } else {
      W.handleDrop(questId);
      updateBar(s.wheelSkillId || 'overall');
      refreshCards();
    }
  }

  function claimXPMobile(questId) {
    const s = S.getSettings();
    W.handleDrop(questId);
    updateBar(s.wheelSkillId || 'overall');
    refreshCards();
  }

  function deleteQuest(questId) {
    if (confirm('Delete this quest?')) { S.deleteQuest(questId); refreshCards(); }
  }

  return { render, init, onDragStart, completeQuest, claimXPMobile, deleteQuest, updateBar, refreshCards };
})();
