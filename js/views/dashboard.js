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
      if (q.status === 'deleted') return false;
      
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
          timeStr = `<span class="quest-countdown-timer" data-expires-at="${q.expiresAt}" style="font-size:0.65rem;color:var(--accent);">Counting down...</span>`;
        } else {
          timeStr = `<span style="font-size:0.65rem;color:var(--danger);">Expired</span>`;
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

      let cardClass = '';
      if (isMissed) cardClass = 'quest-card-deleted-status';
      else if (isLocked) cardClass = 'quest-card-deleted-status';

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

  function renderHistoryBar() {
    const history = S.getHistory();
    const entries = history.slice().reverse(); // newest first

    if (entries.length === 0) {
      return `<div class="history-empty">
        <span class="material-symbols-outlined" style="font-size:28px;color:var(--text-3);opacity:0.4;">history</span>
        <p>No activity yet. Create and complete quests to see your history here.</p>
      </div>`;
    }

    return entries.map(entry => {
      const date = new Date(entry.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

      let icon = '📋';
      let accentClass = '';
      switch (entry.type) {
        case 'quest_created':  icon = '✦'; accentClass = 'history-accent'; break;
        case 'quest_completed': icon = '✓'; accentClass = 'history-success'; break;
        case 'quest_missed':   icon = '✕'; accentClass = 'history-danger'; break;
        case 'quest_deleted':  icon = '🗑'; accentClass = 'history-muted'; break;
        case 'xp_gain':        icon = '⬡'; accentClass = 'history-accent'; break;
        case 'level_up':       icon = '⬆'; accentClass = 'history-success'; break;
        default:               icon = 'ℹ'; accentClass = 'history-muted'; break;
      }

      const detailStr = entry.details?.skills ? `<span class="history-detail">${entry.details.skills}</span>` : 
                         entry.details?.xp ? `<span class="history-detail">+${entry.details.xp} XP</span>` : '';

      return `<div class="history-entry ${accentClass}">
        <span class="history-icon">${icon}</span>
        <div class="history-body">
          <span class="history-msg">${entry.message}</span>
          ${detailStr}
        </div>
        <div class="history-time">
          <span>${timeStr}</span>
          <span>${dateStr}</span>
        </div>
      </div>`;
    }).join('');
  }

  function render() {
    const macros = S.getMacros();
    const settings = S.getSettings();
    const wheelSkillId = settings.wheelSkillId || 'overall';
    const cachedReview = S.getCachedReview ? S.getCachedReview() : null;
    const activeEffects = S.getActiveStatusEffects ? S.getActiveStatusEffects() : [];
    let barData = getBarData(wheelSkillId, macros);
    const historyBarEnabled = settings.historyBarEnabled === true;

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

    // Build the wheel section based on layout mode
    let wheelSectionHTML;
    if (historyBarEnabled) {
      // ── SPLIT LAYOUT: Dual Wheels + History Bar ──
      const selectedMacroId = wheelSkillId !== 'overall' ? wheelSkillId : (macros[0]?.id || 'overall');
      const macroOptions = macros.map(m => 
        `<option value="${m.id}" ${selectedMacroId === m.id ? 'selected' : ''}>${m.name}</option>`
      ).join('');

      const wheelSplitHTML = `
        <div class="dash-split-layout">
          <div class="dash-split-wheels">
            <div class="mini-wheel-container">
              <p class="mini-wheel-label">OVERALL</p>
              ${W.renderMiniHTML('overall', 0)}
            </div>
            <div class="mini-wheel-container">
              <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:4px;">
                <select id="mini-wheel-skill-select" class="mini-wheel-select">${macroOptions}</select>
              </div>
              ${W.renderMiniHTML(selectedMacroId, 1)}
            </div>
          </div>
          <div class="history-bar" id="history-bar">
            <div class="history-bar-header">
              <span class="material-symbols-outlined" style="font-size:16px;opacity:0.6;">history</span>
              <span>ACTIVITY FEED</span>
            </div>
            <div class="history-bar-entries" id="history-bar-entries">
              ${renderHistoryBar()}
            </div>
          </div>
        </div>`;

      // Build Macro Skills Panel
      const F = window.LM.formulas;
      const overall = S.getOverall();
      const overallBarPct = F.progressPercent(overall.currentXP || 0, overall);
      const overallInto = F.xpIntoCurrentLevel(overall.currentXP || 0, overall);
      const overallReq = F.xpRequiredForNextLevel(overall.currentXP || 0, overall);
      
      const overallBarHTML = `
        <div class="macro-bar-row overall-bar-row" style="margin-bottom:18px;border-bottom:1px solid var(--border);padding-bottom:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;align-items:center;">
            <span style="font-family:var(--font-display);font-size:0.85rem;color:var(--text-1);font-weight:bold;display:flex;align-items:center;gap:8px;">
               <div style="width:8px;height:8px;border-radius:50%;background:var(--chrome,#E8E8E8);box-shadow:0 0 8px var(--chrome,#E8E8E8);"></div>
               OVERALL <span class="chrome-metallic-text" style="font-weight:bold;">LV${overall.currentLevel || 0}</span>
             </span>
            <span style="font-size:0.75rem;color:var(--text-2);font-weight:500;">${F.formatXP(overallInto)}/${F.formatXP(overallReq)}</span>
          </div>
          <div style="width:100%;height:8px;background:rgba(255,255,255,0.05);border-radius:100px;overflow:hidden;">
            <div class="xp-bar-fill-chrome" style="width:${overallBarPct}%;height:100%;"></div>
          </div>
        </div>
      `;

      const macroBarsHTML = overallBarHTML + macros.map(m => {
        const pct = F.progressPercent(m.currentXP || 0, m);
        const into = F.xpIntoCurrentLevel(m.currentXP || 0, m);
        const req = F.xpRequiredForNextLevel(m.currentXP || 0, m);
        return `
          <div class="macro-bar-row" style="margin-bottom:12px;cursor:pointer;" onclick="LM.router.navigate('#skill-hub/${m.id}')">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;align-items:center;">
              <span style="font-family:var(--font-display);font-size:0.75rem;color:var(--text-1);display:flex;align-items:center;gap:6px;">
                 <div style="width:6px;height:6px;border-radius:50%;background:${m.accentColor};"></div>
                 ${m.name} <span style="color:${m.accentColor};">LV${m.currentLevel || 0}</span>
              </span>
              <span style="font-size:0.65rem;color:var(--text-3);">${F.formatXP(into)}/${F.formatXP(req)}</span>
            </div>
            <div style="width:100%;height:4px;background:var(--bg-raised);border-radius:100px;overflow:hidden;">
              <div class="xp-bar-fill-chrome" style="width:${pct}%;height:100%;"></div>
            </div>
          </div>
        `;
      }).join('');

      const macrosPanelHTML = `
        <div class="dash-macros-panel">
          <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
             <span style="font-family:var(--font-display);font-size:0.75rem;color:var(--text-2);letter-spacing:0.1em;">MACRO SKILL PROGRESS</span>
          </div>
          <div class="dash-macros-list">
            ${macroBarsHTML}
          </div>
        </div>
      `;

      wheelSectionHTML = `
        <div class="dash-carousel-wrap">
          <div class="dash-carousel-viewport" id="dash-carousel" onscroll="LM.views.dashboard.updateCarouselNav()">
            <div class="dash-carousel-panel">
              ${wheelSplitHTML}
            </div>
            <div class="dash-carousel-panel" style="padding-left:16px;">
              ${macrosPanelHTML}
            </div>
          </div>
          <div class="carousel-nav-dots" id="dash-nav-dots">
            <div class="nav-dot active" onclick="document.getElementById('dash-carousel').scrollTo({left:0,behavior:'smooth'})"></div>
            <div class="nav-dot" onclick="document.getElementById('dash-carousel').scrollTo({left:9999,behavior:'smooth'})"></div>
          </div>
        </div>
      `;

    } else {
      // ── DEFAULT LAYOUT: Single Large Wheel ──
      wheelSectionHTML = `
        <div class="dash-carousel-wrap">
          <div class="dash-carousel-viewport" id="dash-carousel" onscroll="LM.views.dashboard.updateCarouselNav()">
            <div class="dash-carousel-panel">
              <div style="display:flex; flex-direction:column; align-items:center; padding:16px 0;">
                <p style="font-family:var(--font-display); font-size:0.68rem; letter-spacing:0.18em; color:var(--text-3); text-transform:uppercase; margin-bottom:12px;">SELECT SKILL · DRAG QUEST TO COMPLETE</p>
                ${W.renderHTML()}
              </div>
            </div>
            <div class="dash-carousel-panel" style="padding-left:16px;">
              ${ (() => {
                  const F = window.LM.formulas;
                  const overall = S.getOverall();
                  const overallBarPct = F.progressPercent(overall.currentXP || 0, overall);
                  const overallInto = F.xpIntoCurrentLevel(overall.currentXP || 0, overall);
                  const overallReq = F.xpRequiredForNextLevel(overall.currentXP || 0, overall);
                  
                  const overallBarHTML = `
                    <div class="macro-bar-row overall-bar-row" style="margin-bottom:18px;border-bottom:1px solid var(--border);padding-bottom:12px;">
                      <div style="display:flex;justify-content:space-between;margin-bottom:6px;align-items:center;">
                        <span style="font-family:var(--font-display);font-size:0.85rem;color:var(--text-1);font-weight:bold;display:flex;align-items:center;gap:8px;">
                           <div style="width:8px;height:8px;border-radius:50%;background:var(--chrome,#E8E8E8);box-shadow:0 0 8px var(--chrome,#E8E8E8);"></div>
                           OVERALL <span class="chrome-metallic-text" style="font-weight:bold;">LV${overall.currentLevel || 0}</span>
                         </span>
                        <span style="font-size:0.75rem;color:var(--text-2);font-weight:500;">${F.formatXP(overallInto)}/${F.formatXP(overallReq)}</span>
                      </div>
                      <div style="width:100%;height:8px;background:rgba(255,255,255,0.05);border-radius:100px;overflow:hidden;">
                        <div class="xp-bar-fill-chrome" style="width:${overallBarPct}%;height:100%;"></div>
                      </div>
                    </div>
                  `;

                  const mBars = overallBarHTML + macros.map(m => {
                    const pct = F.progressPercent(m.currentXP || 0, m);
                    const into = F.xpIntoCurrentLevel(m.currentXP || 0, m);
                    const req = F.xpRequiredForNextLevel(m.currentXP || 0, m);
                    return `<div class="macro-bar-row" style="margin-bottom:12px;cursor:pointer;" onclick="LM.router.navigate('#skill-hub/${m.id}')">
                      <div style="display:flex;justify-content:space-between;margin-bottom:4px;align-items:center;">
                        <span style="font-family:var(--font-display);font-size:0.75rem;color:var(--text-1);display:flex;align-items:center;gap:6px;">
                           <div style="width:6px;height:6px;border-radius:50%;background:${m.accentColor};"></div>
                           ${m.name} <span style="color:${m.accentColor};">LV${m.currentLevel || 0}</span>
                        </span>
                        <span style="font-size:0.65rem;color:var(--text-3);">${F.formatXP(into)}/${F.formatXP(req)}</span>
                      </div>
                      <div style="width:100%;height:4px;background:var(--bg-raised);border-radius:100px;overflow:hidden;">
                        <div class="xp-bar-fill-chrome" style="width:${pct}%;height:100%;"></div>
                      </div>
                    </div>`;
                  }).join('');
                  return `<div class="dash-macros-panel">
                    <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
                       <span style="font-family:var(--font-display);font-size:0.75rem;color:var(--text-2);letter-spacing:0.1em;">MACRO SKILL PROGRESS</span>
                    </div>
                    <div class="dash-macros-list">${mBars}</div>
                  </div>`;
              })() }
            </div>
          </div>
          <div class="carousel-nav-dots" id="dash-nav-dots">
            <div class="nav-dot active" onclick="document.getElementById('dash-carousel').scrollTo({left:0,behavior:'smooth'})"></div>
            <div class="nav-dot" onclick="document.getElementById('dash-carousel').scrollTo({left:9999,behavior:'smooth'})"></div>
          </div>
        </div>
      `;
    }

    return `
      <div class="dashboard-grid">
        <!-- CENTER COLUMN -->
        <div class="dash-center">
          
          <!-- XP WHEEL / SPLIT LAYOUT -->
          ${wheelSectionHTML}

          <!-- ACTIVE QUESTS -->
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h2 style="font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; margin: 0; color: var(--text-1);">
                ACTIVE OBJECTIVES
              </h2>
            </div>

            <!-- Active Cards -->
            <div class="quest-grid" id="quest-grid">
              ${renderQuestCards(macros, null, false)}
            </div>
          </div>

          <!-- LOCKED / UPCOMING QUESTS -->
          <div style="margin-top:24px;">
            <h2 style="font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px; color: var(--text-3);">
              UPCOMING / LOCKED OBJECTIVES
            </h2>
            <div class="quest-grid" id="upcoming-quest-grid">
              ${renderQuestCards(macros, null, true)}
            </div>
          </div>
        </div> <!-- End dash-center -->
      </div>`;

  }

  function init() {
    const settings = S.getSettings();
    const historyBarEnabled = settings.historyBarEnabled === true;

    if (historyBarEnabled) {
      // ── SPLIT LAYOUT INIT ──
      // Update mini wheels after initial render
      setTimeout(() => {
        W.updateMini('overall', 0);
        const selectedMacroId = settings.wheelSkillId !== 'overall' ? settings.wheelSkillId : (S.getMacros()[0]?.id || 'overall');
        W.updateMini(selectedMacroId, 1);
      }, 50);

      // Mini wheel skill selector
      const miniSel = document.getElementById('mini-wheel-skill-select');
      if (miniSel) {
        miniSel.addEventListener('change', (e) => {
          const newId = e.target.value;
          const s = S.getSettings();
          s.wheelSkillId = newId;
          S.saveSettings(s);
          // Re-render the second mini wheel
          const container = document.getElementById('mini-wheel-1');
          if (container) {
            container.outerHTML = W.renderMiniHTML(newId, 1);
            setTimeout(() => W.updateMini(newId, 1), 50);
          }
          updateBar(newId);
        });
      }
    } else {
      // ── DEFAULT LAYOUT INIT ──
      W.init();
    }

    // Macro tabs selector
    document.querySelectorAll('.dashboard-grid .chip').forEach(el => {
      // Inline onclick runs, but we add event listeners to ensure clean bindings
    });

    // Skill filter
    document.getElementById('skill-filter-sel')?.addEventListener('change', (e) => {
      activeSkillFilter = e.target.value;
      refreshCards();
    });

  }

  function selectMacro(macroId) {
    activeMacroId = macroId;
    // Set the settings wheelSkillId to this selected macro skill as well, to sync with progress bar updates and the wheel drop validation
    const s = S.getSettings();
    s.wheelSkillId = macroId;
    S.saveSettings(s);
    
    // Re-render macro indicators
    updateMacrosPanel();
  }

  function updateCarouselNav() {
    const v = document.getElementById('dash-carousel');
    const dots = document.getElementById('dash-nav-dots');
    if (!v || !dots) return;
    const index = Math.round(v.scrollLeft / v.clientWidth);
    const dotEls = dots.querySelectorAll('.nav-dot');
    dotEls.forEach((el, i) => {
      if (i === index) el.classList.add('active');
      else el.classList.remove('active');
    });
  }

  function updateBar(skillId) {
    const macros = S.getMacros();
    const data = getBarData(skillId, macros);
    const fill = document.getElementById('dash-xp-fill');
    const label = document.getElementById('dash-xp-label');
    if (fill) { fill.style.width = `${data.pct}%`; fill.style.background = data.color; }
    if (label) label.textContent = `${F.formatXP(data.into)} / ${F.formatXP(data.req)} XP (${Math.round(data.pct)}%)`;
    
    updateMacrosPanel();
  }

  function updateMacrosPanel() {
    const lists = document.querySelectorAll('.dash-macros-list');
    if (lists.length === 0) return;
    const macros = S.getMacros();
    const overall = S.getOverall();
    const F = window.LM.formulas;
    
    const overallBarPct = F.progressPercent(overall.currentXP || 0, overall);
    const overallInto = F.xpIntoCurrentLevel(overall.currentXP || 0, overall);
    const overallReq = F.xpRequiredForNextLevel(overall.currentXP || 0, overall);
    
    const overallBarHTML = `
      <div class="macro-bar-row overall-bar-row" style="margin-bottom:18px;border-bottom:1px solid var(--border);padding-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;align-items:center;">
          <span style="font-family:var(--font-display);font-size:0.85rem;color:var(--text-1);font-weight:bold;display:flex;align-items:center;gap:8px;">
             <div style="width:8px;height:8px;border-radius:50%;background:var(--chrome,#E8E8E8);box-shadow:0 0 8px var(--chrome,#E8E8E8);"></div>
             OVERALL <span class="chrome-metallic-text" style="font-weight:bold;">LV${overall.currentLevel || 0}</span>
           </span>
          <span style="font-size:0.75rem;color:var(--text-2);font-weight:500;">${F.formatXP(overallInto)}/${F.formatXP(overallReq)}</span>
        </div>
        <div style="width:100%;height:8px;background:rgba(255,255,255,0.05);border-radius:100px;overflow:hidden;">
          <div class="xp-bar-fill-chrome" style="width:${overallBarPct}%;height:100%;"></div>
        </div>
      </div>
    `;

    const mBars = overallBarHTML + macros.map(m => {
      const pct = F.progressPercent(m.currentXP || 0, m);
      const into = F.xpIntoCurrentLevel(m.currentXP || 0, m);
      const req = F.xpRequiredForNextLevel(m.currentXP || 0, m);
      return `<div class="macro-bar-row" style="margin-bottom:12px;cursor:pointer;" onclick="LM.router.navigate('#skill-hub/${m.id}')">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;align-items:center;">
          <span style="font-family:var(--font-display);font-size:0.75rem;color:var(--text-1);display:flex;align-items:center;gap:6px;">
             <div style="width:6px;height:6px;border-radius:50%;background:${m.accentColor};"></div>
             ${m.name} <span style="color:${m.accentColor};">LV${m.currentLevel || 0}</span>
          </span>
          <span style="font-size:0.65rem;color:var(--text-3);">${F.formatXP(into)}/${F.formatXP(req)}</span>
        </div>
        <div style="width:100%;height:4px;background:var(--bg-raised);border-radius:100px;overflow:hidden;">
          <div class="xp-bar-fill-chrome" style="width:${pct}%;height:100%;"></div>
        </div>
      </div>`;
    }).join('');

    lists.forEach(list => {
      list.innerHTML = mBars;
    });
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

  return { render, init, onDragStart, completeQuest, claimXPMobile, deleteQuest, updateBar, refreshCards, selectMacro, renderHistoryBar, updateCarouselNav, updateMacrosPanel };
})();
