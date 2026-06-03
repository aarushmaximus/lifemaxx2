window.LM.views.dashboard = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;
  const W = window.LM.components.wheel;

  let activeStatusFilter = 'all'; // 'all', 'active', 'missed'
  let activeSkillFilter = 'all';
  let activeMacroId = null; // for the expanded macro skill widget

  const isWithinTimeWindow = F.isWithinTimeWindow;

  function getPlayerRank(level) {
    const tiers = [
      { name: 'RECRUIT', min: 0 },
      { name: 'INITIATE', min: 10 },
      { name: 'VANGUARD', min: 20 },
      { name: 'OPERATOR', min: 30 },
      { name: 'ELITE OPERATOR', min: 40 },
      { name: 'CHAMPION', min: 50 },
      { name: 'LEGEND', min: 70 },
      { name: 'MYTHIC MASTER', min: 90 }
    ];
    let activeTier = tiers[0];
    let nextTier = tiers[1] || tiers[0];
    for (let i = 0; i < tiers.length; i++) {
      if (level >= tiers[i].min) {
        activeTier = tiers[i];
        nextTier = tiers[i+1] || { name: 'MAXED OUT', min: 100 };
      }
    }
    const offset = level - activeTier.min;
    const sub = offset < 5 ? 'I' : 'II';
    return {
      title: `${activeTier.name} ${sub}`,
      nextTitle: nextTier.name
    };
  }

  function getDailyStreak(quests, xpLog) {
    const dates = new Set();
    quests.forEach(q => {
      if (q.status === 'completed' && q.completedAt) {
        dates.add(new Date(q.completedAt).toDateString());
      }
    });
    xpLog.forEach(l => {
      if (l.timestamp) {
        dates.add(new Date(l.timestamp).toDateString());
      }
    });

    const sortedDates = Array.from(dates).map(d => new Date(d)).sort((a, b) => b - a);
    if (sortedDates.length === 0) return 0;

    let streak = 0;
    let current = new Date();
    current.setHours(0, 0, 0, 0);

    const latest = sortedDates[0];
    latest.setHours(0, 0, 0, 0);

    const diffMs = current - latest;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      return 0; // broken
    }

    let checkDate = new Date(latest);
    for (let i = 0; i < sortedDates.length; i++) {
      const d = sortedDates[i];
      d.setHours(0, 0, 0, 0);

      const diff = Math.round((checkDate - d) / (1000 * 60 * 60 * 24));
      if (diff === 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (diff === 1) {
        streak++;
        checkDate = new Date(d);
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
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

  function renderQuestCards(macros, limit = null, upcoming = false) {
    const allQuests = S.getQuests();
    const quests = allQuests.filter(q => {
      const tSkills = q.targetSkills || [];
      if (q.hiddenFromDashboard) return false;
      if (q.status === 'completed' && !q.isReadyToClaim) return false;
      
      const isLocked = q.status === 'active' && !isWithinTimeWindow(q.timeWindow);

      if (upcoming) {
        // Only return locked / upcoming / missed quests
        return isLocked || q.status === 'missed';
      } else {
        // Return active and unlockable quests
        if (isLocked || q.status === 'missed') return false;
        if (activeStatusFilter === 'active' && q.status !== 'active') return false;
        if (activeSkillFilter !== 'all' && !tSkills.some(t=>t.macroSkillId===activeSkillFilter)) return false;
        return true;
      }
    });

    const displayQuests = limit ? quests.slice(0, limit) : quests;

    if (!displayQuests.length) {
      return `<div class="empty-state"><p>${upcoming ? 'No locked or missed quests.' : 'No active quests. Let\'s get to work!'}</p></div>`;
    }

    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    return displayQuests.map(q => {
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
      }

      let windowBadge = '';
      if (q.timeWindow) {
        windowBadge = `<span class="quest-type-badge" style="background:var(--accent-dim);color:var(--accent);border:1px solid var(--border);">${q.timeWindow.start} - ${q.timeWindow.end}</span>`;
      } else {
        windowBadge = `<span class="quest-type-badge" style="background:var(--bg-raised);color:var(--text-3);border:1px solid var(--border);">Anytime</span>`;
      }

      let statusBadge = '';
      if (isMissed) {
        statusBadge = `<span class="quest-type-badge" style="background:rgba(255,45,120,0.15);color:var(--danger);border:1px solid rgba(255,45,120,0.3);">MISSED</span>`;
      } else if (isLocked) {
        statusBadge = `<span class="quest-type-badge" style="background:rgba(120,120,140,0.15);color:var(--text-3);border:1px solid var(--border);">LOCKED 🔒</span>`;
      }

      const energyCost = q.energyCost || 'Medium';
      const energyIcon = energyCost === 'High' ? '⚡' : energyCost === 'Medium' ? '🔋' : '💤';
      let energyBadge = `<span class="quest-type-badge" title="Energy: ${energyCost}" style="background:var(--bg-raised);color:var(--text-2);border:1px solid var(--border);">${energyIcon} ${energyCost}</span>`;

      let cardClass = '';
      if (isMissed) cardClass = 'quest-card-deleted-status';
      else if (isLocked) cardClass = 'quest-card-deleted-status';

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
              ? `<button class="btn-complete" style="background:rgba(255,45,120,0.08);border:1px solid rgba(255,45,120,0.2);color:var(--text-3);cursor:not-allowed;" disabled>Missed (Click ✕ to delete)</button>`
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

  function render() {
    const macros = S.getMacros();
    const settings = S.getSettings();
    const wheelSkillId = settings.wheelSkillId || 'overall';
    const currentEnergy = localStorage.getItem('lm_user_energy') || 'High';
    const cachedReview = S.getCachedReview ? S.getCachedReview() : null;
    const activeEffects = S.getActiveStatusEffects ? S.getActiveStatusEffects() : [];
    let barData = getBarData(wheelSkillId, macros);

    // Dynamic Streak & Rank
    const xpLog = S.getXPLog();
    const streak = getDailyStreak(S.getQuests(), xpLog);
    const overall = S.getOverall();
    const rankInfo = getPlayerRank(overall.currentLevel || 0);

    // Selected macro skill for detail card
    if (!activeMacroId && macros.length > 0) {
      activeMacroId = macros[0].id;
    }
    const activeMacro = macros.find(m => m.id === activeMacroId) || macros[0];

    // Find next session (upcoming habit or active project)
    const activeQuests = S.getQuests().filter(q => q.status === 'active' && isWithinTimeWindow(q.timeWindow));
    const nextSession = activeQuests[0];

    return `
      <div class="dashboard-grid">
        <!-- CENTER COLUMN -->
        <div class="dash-center">
          
          <!-- Mid-review Notification banner if active -->
          ${cachedReview ? `
            <div class="section-block" style="border: 1px solid var(--accent); background: rgba(255, 45, 120, 0.02); margin-bottom: 8px; padding: 16px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-family: var(--font-display); font-size: 0.8rem; letter-spacing: 0.1em; color: var(--accent); font-weight: bold;">📢 DAILY REVIEW</span>
                <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-3);">${cachedReview.date}</span>
              </div>
              <p style="font-size: 0.88rem; line-height: 1.5; color: var(--text-1); font-style: italic;">"${cachedReview.text}"</p>
            </div>
          ` : ''}

          <!-- Operator Status Card -->
          <div class="operator-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="operator-title">${rankInfo.title}</span>
              <span style="font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: var(--accent);">LEVEL ${overall.currentLevel || 0}</span>
            </div>
            
            <div class="xp-bar-wrap" style="margin: 8px 0;">
              <div class="xp-bar-track" style="height: 6px;">
                <div class="xp-bar-fill" id="dash-xp-fill" style="width:${barData.pct}%;background:${barData.color}"></div>
              </div>
            </div>

            <div class="operator-stats">
              <span>RANK: ${rankInfo.title}</span>
              <span id="dash-xp-label">${F.formatXP(barData.into)} / ${F.formatXP(barData.req)} XP (${Math.round(barData.pct)}%)</span>
            </div>
            <div style="font-family: var(--font-display); font-size: 0.72rem; color: var(--text-3); text-transform: uppercase; margin-top: -4px;">
              NEXT LEVEL: ${rankInfo.nextTitle}
            </div>
          </div>

          <!-- Streak & Active Effects -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div class="streak-banner">
              <span class="streak-number">🔥 ${streak}</span>
              <div style="display:flex; flex-direction:column;">
                <span class="streak-label">Day Win Streak</span>
                <span style="font-size: 0.72rem; color: var(--text-2);">Complete quests daily to grow</span>
              </div>
            </div>

            <!-- Active Status Effects -->
            <div class="flat-card" style="display:flex; flex-direction:column; justify-content:center; gap:6px;">
              <span style="font-family: var(--font-display); font-size: 0.75rem; letter-spacing: 0.08em; color: var(--text-3); text-transform: uppercase;">Active Buffs/Debuffs</span>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                ${activeEffects.length > 0 ? activeEffects.map(e => {
                  const color = e.type === 'buff' ? 'var(--success)' : 'var(--danger)';
                  const bg = e.type === 'buff' ? 'rgba(16,185,129,0.1)' : 'rgba(255,45,120,0.1)';
                  return `<span class="quest-type-badge" style="background:${bg};color:${color};border:1px solid ${color}33;">${e.name.toUpperCase()} (x${e.multiplier})</span>`;
                }).join('') : `<span style="font-size:0.8rem; color:var(--text-3);">No active status modifiers.</span>`}
              </div>
            </div>
          </div>

          <!-- Default macro skill expanded showing its micro skills -->
          ${activeMacro ? `
            <div class="flat-card flat-card-cyan" style="display:flex; flex-direction:column; gap:16px;">
              <div>
                <span style="font-family: var(--font-display); font-size: 0.75rem; letter-spacing: 0.08em; color: var(--text-3); text-transform: uppercase; display:block; margin-bottom:8px;">Macro-to-Micro Skill Progression</span>
                
                <!-- Horizontal Tab Toggles for Macro Skills -->
                <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; margin-bottom:12px;">
                  ${macros.map(m => `
                    <button class="chip ${m.id === activeMacroId ? 'chip-active' : ''}" style="border-color:${m.accentColor}44; white-space:nowrap;" onclick="LM.views.dashboard.selectMacro('${m.id}')">
                      ${m.name} (Lv ${m.currentLevel || 0})
                    </button>
                  `).join('')}
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <h3 style="font-family: var(--font-display); font-size: 1.1rem; font-weight:700; color:#fff;">${activeMacro.name}</h3>
                  <span style="font-family: var(--font-display); font-size: 0.82rem; color: var(--accent); font-weight:bold;">LEVEL ${activeMacro.currentLevel || 0}</span>
                </div>
              </div>

              <!-- Micro Skills List -->
              <div style="display:flex; flex-direction:column; gap:12px; border-top:1px solid var(--border); padding-top:14px;">
                ${(activeMacro.microSkills || []).length > 0 ? (activeMacro.microSkills || []).map(ms => {
                  const msPct = F.progressPercent(ms.currentXP || 0, ms);
                  const msInto = F.xpIntoCurrentLevel(ms.currentXP || 0, ms);
                  const msReq = F.xpRequiredForNextLevel(ms.currentXP || 0, ms);
                  return `
                    <div>
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-size:0.85rem; font-weight:600; color:var(--text-1);">${ms.name}</span>
                        <span style="font-size:0.75rem; color:var(--text-2);">Lvl ${ms.currentLevel || 0}</span>
                      </div>
                      <div class="xp-bar-wrap">
                        <div class="xp-bar-track" style="height:4px; background: rgba(255,255,255,0.04);">
                          <div class="xp-bar-fill" style="width:${msPct}%; background:${activeMacro.accentColor}; color:${activeMacro.accentColor};"></div>
                        </div>
                      </div>
                      <div style="display:flex; justify-content:space-between; font-size:0.68rem; color:var(--text-3); margin-top:3px;">
                        <span>${F.formatXP(msInto)} / ${F.formatXP(msReq)} XP</span>
                        <span>${Math.round(msPct)}%</span>
                      </div>
                    </div>
                  `;
                }).join('') : `<div style="text-align:center; padding:10px; font-size:0.8rem; color:var(--text-3);">No micro skills defined for ${activeMacro.name}.</div>`}
              </div>
            </div>
          ` : ''}

          <!-- NEXT SESSION workout/quest card with background image -->
          <div class="session-card">
            <span style="font-family: var(--font-display); font-size: 0.72rem; letter-spacing: 0.1em; color: var(--secondary); font-weight: bold; text-transform: uppercase;">
              NEXT SCHEDULED SESSION
            </span>
            <h2 style="font-family: var(--font-display); font-weight: 700; font-size: 1.3rem; margin: 4px 0; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
              ${nextSession ? nextSession.name : 'NO SESSIONS ACTIVE'}
            </h2>
            <p style="font-size: 0.82rem; color: var(--text-2); margin: 0; line-height: 1.4;">
              ${nextSession ? (nextSession.description || 'Lock in and execute this objective to claim your XP.') : 'Spawn daily quests from presets or ask Fletcher to build your agenda.'}
            </p>
            ${nextSession ? `
              <div style="display:flex; gap:8px; margin-top:8px;">
                <button class="btn btn-primary btn-sm" onclick="LM.views.dashboard.completeQuest('${nextSession.id}')">COMPLETE SESSION</button>
              </div>
            ` : ''}
          </div>

          <!-- ACTIVE QUESTS (Top 3) -->
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h2 style="font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; margin: 0; color: var(--text-1);">
                ACTIVE OBJECTIVES (TOP 3)
              </h2>
              
              <!-- Quick Energy & Skill selectors -->
              <div style="display:flex; align-items:center; gap:8px;">
                <select id="dash-energy-sel" class="chip" style="background:var(--bg-raised);color:var(--text-2);border:1px solid var(--border);padding:3px 8px;font-size:0.72rem;cursor:pointer;border-radius:100px;">
                  <option value="High" ${currentEnergy === 'High' ? 'selected' : ''}>High ⚡</option>
                  <option value="Medium" ${currentEnergy === 'Medium' ? 'selected' : ''}>Med 🔋</option>
                  <option value="Low" ${currentEnergy === 'Low' ? 'selected' : ''}>Low 💤</option>
                </select>
                <select class="chip skill-chip-sel" id="skill-filter-sel" style="padding:3px 8px; font-size:0.72rem;">
                  <option value="all">All Skills</option>
                  ${macros.map(m=>`<option value="${m.id}" ${activeSkillFilter===m.id?'selected':''}>${m.name}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Active Cards -->
            <div class="quest-grid ${currentEnergy === 'Low' ? 'low-energy-active' : ''}" id="quest-grid">
              ${renderQuestCards(macros, 3, false)}
            </div>
          </div>

          <!-- LOCKED / UPCOMING QUESTS (At the bottom, greyed out) -->
          <div>
            <h2 style="font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px; color: var(--text-3);">
              UPCOMING / LOCKED OBJECTIVES
            </h2>
            <div class="quest-grid" id="upcoming-quest-grid">
              ${renderQuestCards(macros, 3, true)}
            </div>
          </div>

        </div>

        <!-- RIGHT COLUMN — Wheel (Keep circular wheel exact same) -->
        <div class="dash-right">
          <div class="wheel-panel">
            <p class="wheel-hint-top">SELECT SKILL · DRAG QUEST TO COMPLETE</p>
            ${W.renderHTML()}
          </div>
        </div>

        <!-- Floating Action Buttons at bottom right -->
        <button class="coach-float-btn" onclick="window.LM.router.navigate('#coach')" title="Chat with Coach Fletcher">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </button>
      </div>`;
  }

  function init() {
    // Wheel Component Init
    W.init();

    // Macro tabs selector
    document.querySelectorAll('.dashboard-grid .chip').forEach(el => {
      // Inline onclick runs, but we add event listeners to ensure clean bindings
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
      refreshCards();
    });
  }

  function selectMacro(macroId) {
    activeMacroId = macroId;
    // Set the settings wheelSkillId to this selected macro skill as well, to sync with progress bar updates and the wheel drop validation
    const s = S.getSettings();
    s.wheelSkillId = macroId;
    S.saveSettings(s);
    
    // Re-render
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = render();
      init();
    }
  }

  function updateBar(skillId) {
    const macros = S.getMacros();
    const data = getBarData(skillId, macros);
    const fill = document.getElementById('dash-xp-fill');
    const label = document.getElementById('dash-xp-label');
    if (fill) { fill.style.width = `${data.pct}%`; fill.style.background = data.color; }
    if (label) label.textContent = `${F.formatXP(data.into)} / ${F.formatXP(data.req)} XP (${Math.round(data.pct)}%)`;
  }

  function refreshCards() {
    const macros = S.getMacros();
    const grid = document.getElementById('quest-grid');
    if (grid) grid.innerHTML = renderQuestCards(macros, 3, false);
    
    const upcomingGrid = document.getElementById('upcoming-quest-grid');
    if (upcomingGrid) upcomingGrid.innerHTML = renderQuestCards(macros, 3, true);
  }

  function onDragStart(event, questId) {
    event.dataTransfer.setData('questId', questId);
    const card = event.target.closest('.quest-card');
    if (card) card.classList.add('card-dragging');
  }

  function confirmPartialXP(questId) {
    const quest = S.getQuest(questId);
    if (!quest || !quest.progressIndicator) return true;
    const pct = Math.round(quest.progressIndicator.value || 0);
    if (pct >= 100) return true;
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

  return { render, init, onDragStart, completeQuest, claimXPMobile, deleteQuest, updateBar, refreshCards, selectMacro };
})();
