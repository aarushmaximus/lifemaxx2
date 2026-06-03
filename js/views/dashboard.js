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
    const currentEnergy = localStorage.getItem('lm_user_energy') || 'High';
    const cachedReview = S.getCachedReview ? S.getCachedReview() : null;
    const activeEffects = S.getActiveStatusEffects ? S.getActiveStatusEffects() : [];
    let barData = getBarData(wheelSkillId, macros);

    return `
      <div class="dashboard-grid">
        <!-- CENTER COLUMN -->
        <div class="dash-center">
          ${cachedReview ? `
            <div class="section-block" style="border: 1px solid var(--accent); background: rgba(255, 74, 141, 0.02); margin-bottom: 16px; padding: 16px; border-radius: 12px; display: flex; flex-direction: column; gap: 8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-family: var(--font-display); font-size: 0.8rem; letter-spacing: 0.1em; color: var(--accent); font-weight: bold;">📢 GAME MASTER'S DAILY REVIEW</span>
                <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-3);">${cachedReview.date}</span>
              </div>
              <p style="font-size: 0.88rem; line-height: 1.5; color: var(--text-1); font-style: italic;">"${cachedReview.text}"</p>
            </div>
          ` : ''}
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
            
            <!-- Status Effects -->
            ${activeEffects.length > 0 ? `
              <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center;">
                <span style="font-size:0.7rem;font-family:var(--font-mono);color:var(--text-3);text-transform:uppercase;">Status:</span>
                ${activeEffects.map(e => {
                  const color = e.type === 'buff' ? 'var(--success)' : 'var(--danger)';
                  const bg = e.type === 'buff' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
                  const hoursLeft = Math.max(0.1, (e.expiresAt - Date.now()) / 3600000).toFixed(1);
                  return `<span class="quest-type-badge" style="background:${bg};color:${color};border:1px solid ${color}44;font-family:var(--font-mono);font-size:0.75rem;" title="${e.name} multiplier: x${e.multiplier} (${hoursLeft}h left)">${e.name.toUpperCase()} (x${e.multiplier})</span>`;
                }).join('')}
              </div>
            ` : ''}
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

            <!-- Energy Selection Widget -->
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:0.7rem;font-family:var(--font-mono);color:var(--text-3);text-transform:uppercase;">Energy:</span>
              <select id="dash-energy-sel" class="chip" style="background:var(--bg-raised);color:var(--text-2);border:1px solid var(--border);padding:4px 8px;font-size:0.75rem;cursor:pointer;border-radius:100px;">
                <option value="High" ${currentEnergy === 'High' ? 'selected' : ''}>High ⚡</option>
                <option value="Medium" ${currentEnergy === 'Medium' ? 'selected' : ''}>Med 🔋</option>
                <option value="Low" ${currentEnergy === 'Low' ? 'selected' : ''}>Low 💤</option>
              </select>
            </div>

            <select class="chip skill-chip-sel" id="skill-filter-sel">
              <option value="all">All Skills</option>
              ${macros.map(m=>`<option value="${m.id}" ${activeSkillFilter===m.id?'selected':''}>${m.name}</option>`).join('')}
            </select>
          </div>

          <!-- Quest Cards Grid -->
          <div class="quest-grid ${currentEnergy === 'Low' ? 'low-energy-active' : ''}" id="quest-grid">
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
        const leftMs = q.expiresAt - Date.now();
        if (leftMs > 0) {
          timeStr = `<span class="quest-countdown-timer" data-expires-at="${q.expiresAt}" style="font-size:0.75rem;color:var(--accent);">Counting down...</span>`;
        } else {
          timeStr = `<span style="font-size:0.75rem;color:var(--danger);">Expired</span>`;
        }
      } else if (q.expiresAt && q.status === 'missed') {
        timeStr = `<span style="font-size:0.75rem;color:var(--danger);">Expired</span>`;
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

      const energyCost = q.energyCost || 'Medium';
      const energyIcon = energyCost === 'High' ? '⚡' : energyCost === 'Medium' ? '🔋' : '💤';
      let energyBadge = `<span class="quest-type-badge" title="Energy: ${energyCost}" style="background:var(--bg-raised);color:var(--text-2);border:1px solid var(--border);">${energyIcon} ${energyCost}</span>`;

      let cardClass = '';
      if (isMissed) cardClass = 'quest-card-missed';
      else if (isLocked) cardClass = 'quest-card-disabled';

      return `
        <div class="quest-card ${cardClass}" draggable="${(!isLocked && !isMissed) ? 'true' : 'false'}" data-quest-id="${q.id}" data-energy="${energyCost}"
          ondragstart="${(!isLocked && !isMissed) ? `LM.views.dashboard.onDragStart(event,'${q.id}')` : ''}"
          ondragend="this.classList.remove('card-dragging')">
          <div class="quest-card-header">
            ${windowBadge}
            ${statusBadge}
            ${energyBadge}
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

    // Energy filter
    document.getElementById('dash-energy-sel')?.addEventListener('change', (e) => {
      const val = e.target.value;
      localStorage.setItem('lm_user_energy', val);
      const grid = document.getElementById('quest-grid');
      if (grid) {
        grid.classList.toggle('low-energy-active', val === 'Low');
      }
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

  // Warns user about partial XP when progress indicator is < 100%.
  // Returns true to proceed, false to abort.
  function confirmPartialXP(questId) {
    const quest = S.getQuest(questId);
    if (!quest || !quest.progressIndicator) return true; // no indicator → always proceed
    const pct = Math.round(quest.progressIndicator.value || 0);
    if (pct >= 100) return true; // full progress → no warning needed
    const totalXP = (quest.targetSkills || []).reduce((sum, t) => sum + t.xpAmount, 0);
    const earnedXP = Math.round(totalXP * pct / 100);
    return confirm(
      `⚠️ Partial Progress Warning\n\n` +
      `"${quest.name}" is only ${pct}% complete.\n\n` +
      `You will receive ${earnedXP} XP instead of ${totalXP} XP (${pct}% of the full reward).\n\n` +
      `Complete anyway?`
    );
  }

  function completeQuest(questId) {
    if (!confirmPartialXP(questId)) return;
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
    if (!confirmPartialXP(questId)) return;
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
