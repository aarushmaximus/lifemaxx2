// LIFEMAXX — Dashboard View (3-column layout)
window.LM.views.dashboard = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;
  const W = window.LM.components.wheel;

  let activeStatusFilter = 'all'; // 'all', 'active', 'missed'
  let activeSkillFilter = 'all';

  const isWithinTimeWindow = F.isWithinTimeWindow;

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
            <div class="filter-chips" id="status-filter-chips">
              ${['all', 'active', 'missed'].map(f =>
                `<button class="chip ${activeStatusFilter===f?'chip-active':''}" data-filter="${f}">
                  ${f==='all'?'All Quests':f==='active'?'Active':'Missed'}
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
      if (q.status === 'completed' && !q.isReadyToClaim) return false;
      
      // Status Filter
      if (activeStatusFilter === 'active' && q.status !== 'active') return false;
      if (activeStatusFilter === 'missed' && q.status !== 'missed') return false;
      
      // Skill Filter
      if (activeSkillFilter !== 'all' && !tSkills.some(t=>t.macroSkillId===activeSkillFilter)) return false;
      return true;
    });

    if (!quests.length) return `<div class="empty-state"><p>No active quests today. Lock in some presets!</p></div>`;

    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    return quests.map(q => {
      const isMissed = q.status === 'missed';
      const withinWindow = isWithinTimeWindow(q.timeWindow);
      const isLocked = q.status === 'active' && !withinWindow;

      const tSkills = q.targetSkills || [];
      const skillTags = tSkills.map(t => {
        const m = macros.find(x=>x.id===t.macroSkillId);
        return m ? `<span class="skill-tag" style="color:${m.accentColor};border-color:${m.accentColor}33">${m.name} +${t.xpAmount}xp</span>` : '';
      }).join('');

      let timeStr = '';
      if (q.expiresAt && q.status === 'active') {
        const leftMs = Math.max(0, q.expiresAt - Date.now());
        if (leftMs > 0) {
          const h = Math.floor(leftMs / 3600000);
          const m = Math.floor((leftMs % 3600000) / 60000);
          timeStr = `<span style="font-size:0.75rem;color:var(--text-3);">${h}h ${m}m remaining</span>`;
        } else {
          timeStr = `<span style="font-size:0.75rem;color:var(--danger);">Expired</span>`;
        }
      }

      // Time Window label
      let windowBadge = '';
      if (q.timeWindow) {
        windowBadge = `<span class="quest-type-badge" style="background:var(--accent-dim);color:var(--accent);border:1px solid var(--border);">${q.timeWindow.start} - ${q.timeWindow.end}</span>`;
      } else {
        windowBadge = `<span class="quest-type-badge" style="background:var(--bg-raised);color:var(--text-3);border:1px solid var(--border);">Anytime</span>`;
      }

      let statusBadge = '';
      if (isMissed) {
        statusBadge = `<span class="quest-type-badge" style="background:rgba(239,68,68,0.15);color:var(--danger);border:1px solid rgba(239,68,68,0.3);">MISSED</span>`;
      } else if (isLocked) {
        statusBadge = `<span class="quest-type-badge" style="background:rgba(120,120,140,0.15);color:var(--text-3);border:1px solid var(--border);">LOCKED</span>`;
      }

      let cardClass = '';
      if (isMissed) cardClass = 'quest-card-missed';
      else if (isLocked) cardClass = 'quest-card-disabled';

      return `
        <div class="quest-card ${cardClass}" draggable="${(!isLocked && !isMissed) ? 'true' : 'false'}" data-quest-id="${q.id}"
          ondragstart="${(!isLocked && !isMissed) ? `LM.views.dashboard.onDragStart(event,'${q.id}')` : ''}"
          ondragend="this.classList.remove('card-dragging')">
          <div class="quest-card-header">
            ${windowBadge}
            ${statusBadge}
            ${timeStr}
            <div class="quest-card-actions">
              <button class="btn-icon danger" onclick="LM.views.dashboard.deleteQuest('${q.id}')" title="Delete">✕</button>
            </div>
          </div>
          <h3 class="quest-card-name" style="${isMissed ? 'text-decoration:line-through;opacity:0.6;' : ''}">${q.name}</h3>
          ${q.description ? `<p class="quest-card-desc" style="${isMissed ? 'opacity:0.5;' : ''}">${q.description}</p>` : ''}
          ${window.LM.questProgress ? window.LM.questProgress.renderIndicator(q) : ''}
          <div class="quest-skill-tags">${skillTags}</div>
          
          <div class="quest-card-footer">
            ${isMissed 
              ? `<button class="btn-complete" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:var(--text-3);cursor:not-allowed;" disabled>Missed (Click ✕ to delete)</button>`
              : isLocked
                ? `<button class="btn-complete" style="background:var(--bg-raised);border:1px solid var(--border);color:var(--text-3);cursor:not-allowed;" disabled>Locked (Available ${q.timeWindow.start} - ${q.timeWindow.end})</button>`
                : (S.getSettings().dragToRegister !== false && q.isReadyToClaim)
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

    // Status filter
    document.getElementById('status-filter-chips')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      activeStatusFilter = btn.dataset.filter || 'all';
      refreshCards();
      document.querySelectorAll('#status-filter-chips .chip').forEach(c => c.classList.toggle('chip-active', c.dataset.filter===activeStatusFilter));
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
    if (confirm('Delete this quest instance?')) { S.deleteQuest(questId); refreshCards(); }
  }

  return { render, init, onDragStart, completeQuest, claimXPMobile, deleteQuest, updateBar, refreshCards };
})();
