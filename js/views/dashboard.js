window.LM.views.dashboard = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;
  const W = window.LM.components.wheel;

  let activeStatusFilter = 'all'; // 'all', 'active', 'missed'
  let activeSkillFilter = 'all';
  let activeMacroId = null; // for the expanded macro skill widget
  let activeQuestType = 'quests'; // 'quests' | 'habituals' | 'chains'

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

  // ── Quest Type Wheel ──────────────────────────────────────────────────────
  // A rotating disc with 3 coloured dots. Fixed chrome arrow at top points to
  // the active type. The user drags/taps the disc to rotate it. Each type is
  // 120° apart. Dot at top = active type.
  // Types & their rotation offsets so that the dot lands under the top arrow:
  //   quests    (cyan)       → wheel rotation = 0°
  //   habituals (olive)      → wheel rotation = -120°
  //   chains    (yellow)     → wheel rotation = -240°
  const QUEST_TYPES = [
    { id: 'quests',    label: 'QUESTS',    dot: '#00E5FF', rotDeg: 0   },
    { id: 'habituals', label: 'HABITUALS', dot: '#8FAF2A', rotDeg: 120 },
    { id: 'chains',    label: 'CHAINS',    dot: '#FFD600', rotDeg: 240 },
  ];

  function renderQuestTypeWheel() {
    const activeType = QUEST_TYPES.find(t => t.id === activeQuestType);
    const settings = S.getSettings();

    // The options dropdown that mirrors the mini-wheel skill select
    const selectOptions = QUEST_TYPES.map(t => `<option value="${t.id}" ${t.id === activeQuestType ? 'selected' : ''}>${t.label}</option>`).join('');

    // Dropdown view (formerly arrows) or Swipe view
    if (settings.questSelectorStyle === 'arrows' || settings.questSelectorStyle === 'swipe') {
      const isSwipe = settings.questSelectorStyle === 'swipe';
      const swipeHints = isSwipe ? `
        <div style="display:flex;align-items:center;gap:6px;margin-left:12px;">
          ${QUEST_TYPES.map(t => `<div style="width:5px;height:5px;border-radius:50%;background:var(--text-1);opacity:${t.id === activeQuestType ? '1' : '0.2'};transform:scale(${t.id === activeQuestType ? '1.2' : '1'});transition:0.2s;"></div>`).join('')}
        </div>
      ` : '';

      return `
        <div id="quest-swipe-zone" style="display:flex;align-items:center;position:relative;cursor:pointer;width:100%;justify-content:flex-start;">
          <span class="quest-type-dot-label" style="background:${activeType.dot};box-shadow:0 0 10px ${activeType.dot};width:8px;height:8px;border-radius:50%;margin-right:10px;"></span>
          <span class="quest-type-name" style="font-size:0.9rem;margin:0;">${activeType.label}</span>
          ${swipeHints}
          <select style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;" onchange="LM.views.dashboard.setQuestType(this.value)">
            ${selectOptions}
          </select>
        </div>
      `;
    }

    // Wheel view
    const wheelRot = -activeType.rotDeg; // rotate so active dot reaches the top

    // Wheel dimensions (smaller)
    const CX = 36, CY = 36, R_MID = 20, STROKE_W = 14;
    function p2c(r, deg) {
      const rad = (deg - 90) * Math.PI / 180;
      return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
    }
    // Simple arc for a thick stroke
    function arcStroke(startDeg, endDeg, r) {
      const [x1, y1] = p2c(r, startDeg);
      const [x2, y2] = p2c(r, endDeg);
      return `M${x1.toFixed(3)},${y1.toFixed(3)} A${r},${r} 0 0,1 ${x2.toFixed(3)},${y2.toFixed(3)}`;
    }

    const segs = QUEST_TYPES.map((t, i) => {
      // Dot is at the clockwise end of the segment
      const endDeg = i * 120;
      // Use 40 degree arc to leave 80 deg gap
      const startDeg = endDeg - 40; 
      const [dx, dy] = p2c(R_MID, endDeg);
      const segPath = arcStroke(startDeg, endDeg, R_MID);
      return `
        <!-- Chrome outline/background layer -->
        <path d="${segPath}"
              fill="none"
              stroke="url(#chrome-seg)"
              stroke-width="${STROKE_W}"
              stroke-linecap="round" />
        <!-- Jet black inside layer -->
        <path d="${segPath}"
              fill="none"
              stroke="#050505"
              stroke-width="${STROKE_W - 2}"
              stroke-linecap="round" />
        <!-- Dot at the end -->
        <circle cx="${dx.toFixed(3)}" cy="${dy.toFixed(3)}" r="4.5"
                fill="${t.dot}"
                style="filter:drop-shadow(0 0 4px ${t.dot}88);"/>`;
    }).join('');

    return `
      <!-- Type label -->
      <div class="quest-type-label">
        <span class="quest-type-dot-label" style="background:${activeType.dot};box-shadow:0 0 10px ${activeType.dot};"></span>
        <span class="quest-type-name">${activeType.label}</span>
      </div>

      <!-- Wheel on the extreme right -->
      <div class="quest-wheel-wrap" id="quest-wheel-wrap">
        <!-- Fixed chrome grey arrow pointer -->
        <svg class="quest-wheel-arrow" viewBox="0 0 16 12" width="16" height="12">
          <defs>
            <linearGradient id="arrow-chrome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="40%" stop-color="#a0a0a0"/>
              <stop offset="100%" stop-color="#404040"/>
            </linearGradient>
          </defs>
          <polygon points="8,12 0,0 16,0" fill="url(#arrow-chrome)" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
        </svg>

        <!-- The rotating disc -->
        <svg id="quest-type-svg"
             width="72" height="72"
             viewBox="0 0 72 72"
             class="quest-type-wheel"
             style="cursor:grab;touch-action:none;display:block;">
          <defs>
            <!-- Chrome gradient for segments -->
            <linearGradient id="chrome-seg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stop-color="#e0e0e0"/>
              <stop offset="50%"  stop-color="#a8a8a8"/>
              <stop offset="100%" stop-color="#555555"/>
            </linearGradient>
          </defs>

          <!-- Outer chrome ring background (Black) -->
          <circle cx="${CX}" cy="${CY}" r="34"
                  fill="#050505"
                  stroke="rgba(200,200,200,0.3)"
                  stroke-width="1"/>

          <!-- Rotating group -->
          <g id="quest-wheel-disc" style="transform-origin:${CX}px ${CY}px;transform:rotate(${wheelRot}deg);transition:transform 0.35s cubic-bezier(0.34,1.3,0.64,1);">
            <!-- Segments -->
            ${segs}
          </g>

          <!-- Small center chrome dot -->
          <circle cx="${CX}" cy="${CY}" r="3"
                  fill="#e8e8e8"
                  stroke="rgba(255,255,255,0.8)"
                  stroke-width="0.5"
                  style="filter:drop-shadow(0 0 2px rgba(255,255,255,0.8));"/>
        </svg>
      </div>`;
  }

  // ── Habitual Cards ─────────────────────────────────────────────────────────
  function renderHabitualCards(macros) {
    const habituals = S.getHabituals();
    if (habituals.length === 0) {
      return `<div class="empty-state"><p>No habituals yet. Create one from a Skill's hub page.</p></div>`;
    }
    return habituals.map(h => {
      const macro = macros.find(m => m.id === h.macroId);
      const accentColor = macro ? macro.accentColor : '#8FAF2A';
      const macroName = macro ? macro.name : 'Unknown Skill';
      const isYes = h.todayStatus === 'yes';
      const isNo = h.todayStatus === 'no';
      const isPending = !isYes && !isNo;
      return `
        <div class="habitual-card ${isYes ? 'habitual-done' : isNo ? 'habitual-failed' : ''}">
          <div class="habitual-card-header">
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="habitual-dot" style="background:#8FAF2A;box-shadow:0 0 6px #8FAF2A44;"></div>
              <span class="habitual-tag">HABITUAL</span>
            </div>
            <span class="habitual-skill-tag" style="color:${accentColor};border-color:${accentColor}44;">${macroName}</span>
          </div>
          <h3 class="habitual-name">${h.name}</h3>
          <div class="habitual-xp-row">
            <span class="habitual-xp-pill gain">+${h.xpGain} XP if done</span>
            <span class="habitual-xp-pill loss">-${h.xpLoss} XP if missed</span>
          </div>
          <div class="habitual-actions ${isPending ? '' : 'habitual-answered'}">
            <button class="habitual-btn yes ${isYes ? 'active' : ''}" 
                    onclick="LM.views.dashboard.setHabitualStatus('${h.id}', 'yes')"
                    ${!isPending && !isYes ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22"><path d="M20 6L9 17l-5-5"/></svg>
            </button>
            <button class="habitual-btn no ${isNo ? 'active' : ''}" 
                    onclick="LM.views.dashboard.setHabitualStatus('${h.id}', 'no')"
                    ${!isPending && !isNo ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          ${!isPending ? `<p class="habitual-status-msg">${isYes ? '✓ Marked done · +'+h.xpGain+' XP earned' : '✕ Marked missed · -'+h.xpLoss+' XP deducted'}</p>` : ''}
        </div>`;
    }).join('');
  }

  // ── Chain Quests on Dashboard ──────────────────────────────────────────────
  function renderChainDashCards(macros) {
    const allChains = S.getAllChains ? S.getAllChains() : [];
    const activeChains = allChains.filter(c => c.steps.some(s => !s.completedAt));
    if (activeChains.length === 0) {
      return `<div class="empty-state"><p>No active chain quests. Create one from a Skill's hub page.</p></div>`;
    }
    return activeChains.map(c => {
      const macro = macros.find(m => m.id === c.macroId);
      const accent = macro ? macro.accentColor : 'var(--accent)';
      const macroName = macro ? macro.name : 'Unknown';
      const total = c.steps.length;
      const doneCount = c.steps.filter(s => s.completedAt).length;
      const actIdx = c.steps.findIndex(s => !s.completedAt);
      const pct = total > 0 ? Math.round((doneCount / total) * 100) : 100;
      const activeStep = actIdx >= 0 ? c.steps[actIdx] : null;
      return `
        <div class="quest-card chain-dash-card" style="border-color:${accent}22;">
          <div class="quest-card-header">
            <span class="quest-type-badge" style="background:rgba(255,214,0,0.1);color:#FFD600;border:1px solid rgba(255,214,0,0.3);">CHAIN</span>
            <span class="quest-type-badge" style="color:${accent};border-color:${accent}33;">${macroName}</span>
            <div class="quest-card-actions">
              <span style="font-size:0.7rem;color:var(--text-3);">${pct}% done</span>
            </div>
          </div>
          <h3 class="quest-card-name">${c.name}</h3>
          <div style="margin:4px 0 8px;display:flex;gap:4px;align-items:center;">
            ${c.steps.map((s, i) => `<div style="width:${Math.floor(80/total)}px;height:4px;border-radius:100px;background:${s.completedAt ? accent : 'rgba(255,255,255,0.08)'};"></div>`).join('')}
          </div>
          ${activeStep ? `
          <div class="quest-card-footer">
            <div style="font-size:0.7rem;color:var(--text-3);margin-bottom:6px;">Step ${actIdx+1}/${total}: ${activeStep.name} · +${activeStep.xpAmount}XP</div>
            <button class="btn-complete" onclick="LM.views.dashboard.completeChainStep('${c.id}','${activeStep.id}')">✓ Complete Step</button>
          </div>` : `<div style="font-size:0.75rem;color:var(--success);padding:8px 0;">🏆 Chain Complete!</div>`}
        </div>`;
    }).join('');
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
                : q.isWorkoutQuest
                  ? `<button class="btn-complete" onclick="window.location.hash='#workout/${q.id}'" style="background:var(--accent);color:#000;border:none;font-weight:700;letter-spacing:0.08em;">⚡ START WORKOUT</button>`
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
    const activeEffects = S.getActiveStatusEffects ? S.getActiveStatusEffects() : [];
    let barData = getBarData(wheelSkillId, macros);
    const historyBarEnabled = settings.historyBarEnabled === true;
    const statsInCarousel = settings.statsInCarousel !== false;

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

    let statsHTML = '';
    const stats = S.getStatistics();
    if (stats.length > 0) {
      statsHTML = `
        <div class="dash-macros-panel" style="height:100%; display:flex; flex-direction:column; background:var(--bg-surface); padding:16px; border-radius:16px; border:1px solid var(--border);">
          <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
             <span style="font-family:var(--font-display);font-size:0.75rem;color:var(--text-2);letter-spacing:0.1em;">DAILY STATISTICS</span>
          </div>
          <div style="display:grid; grid-template-rows: repeat(3, max-content); grid-auto-flow: column; grid-auto-columns: 100%; overflow-x:auto; overflow-y:hidden; scroll-snap-type: x mandatory; gap: 8px; flex:1; padding-bottom:4px;" class="custom-scrollbar hide-scrollbar">
            ${stats.map(s => {
              const todayStr = new Date().toDateString();
              const logs = S.getStatLogs().filter(l => l.statId === s.id && l.dateStr === todayStr);
              const todayTotal = logs.reduce((sum, log) => sum + log.value, 0);
              const left = s.goalValue - todayTotal;
              
              let leftHtml = '';
              if (left >= 0) {
                leftHtml = `<span style="font-size:0.65rem; color:var(--success); font-weight:bold; margin-left:auto; text-transform:uppercase;">+${left} ${s.unit || ''} left</span>`;
              } else {
                leftHtml = `<span style="font-size:0.65rem; color:var(--danger); font-weight:bold; margin-left:auto; text-transform:uppercase;">${left} ${s.unit || ''} left</span>`;
              }

              return `
              <div class="quest-card" style="border-color:var(--border); margin-bottom:0; display:flex; align-items:center; justify-content:space-between; padding: 12px 16px; scroll-snap-align: start;">
                <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
                  <h3 class="quest-card-name" style="margin:0; font-size:0.95rem;">${s.name}</h3>
                  <div class="stat-controls" style="display:flex; align-items:center; gap:6px;">
                    <input type="number" id="stat-val-top-${s.id}" class="form-input" placeholder="Amt" style="width:70px; padding:4px 8px; font-size:0.85rem; height:32px;" onclick="event.stopPropagation();">
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); const el = document.getElementById('stat-val-top-${s.id}'); if(el.value){LM.views.dashboard.logStatistic('${s.id}', Number(el.value)); el.value='';}" style="padding:4px 10px; font-size:0.75rem; height:32px; min-width:unset;">LOG</button>
                  </div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px; min-width: 100px;">
                  <div style="font-size:1.6rem; font-weight:900; color:var(--text-1); font-family:var(--font-display); line-height:1; white-space:nowrap; margin-bottom:4px;">
                    ${todayTotal}<span style="font-size:0.9rem; color:var(--text-3); font-weight:normal;">/${s.goalValue}</span>
                  </div>
                  ${leftHtml}
                </div>
              </div>
            `}).join('')}
          </div>
        </div>
      `;
    }

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
            <div class="history-bar-header" style="display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:4px;">
                <span class="material-symbols-outlined" style="font-size:16px;opacity:0.6;">history</span>
                <span>ACTIVITY FEED</span>
              </div>
              <button onclick="LM.store.clearHistory(); LM.router.render();" style="background:transparent; border:none; color:var(--text-3); cursor:pointer;" class="hover:text-danger transition-colors" title="Clear History">
                <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
              </button>
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
            ${statsInCarousel && statsHTML ? `<div class="dash-carousel-panel" style="padding-left:16px;">${statsHTML}</div>` : ''}
          </div>
          <div class="carousel-nav-dots" id="dash-nav-dots">
            <div class="nav-dot active" onclick="document.getElementById('dash-carousel').scrollTo({left:0,behavior:'smooth'})"></div>
            <div class="nav-dot" onclick="document.getElementById('dash-carousel').scrollTo({left:document.getElementById('dash-carousel').clientWidth,behavior:'smooth'})"></div>
            ${statsInCarousel && statsHTML ? `<div class="nav-dot" onclick="document.getElementById('dash-carousel').scrollTo({left:9999,behavior:'smooth'})"></div>` : ''}
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
            ${statsInCarousel && statsHTML ? `<div class="dash-carousel-panel" style="padding-left:16px;">${statsHTML}</div>` : ''}
          </div>
          <div class="carousel-nav-dots" id="dash-nav-dots">
            <div class="nav-dot active" onclick="document.getElementById('dash-carousel').scrollTo({left:0,behavior:'smooth'})"></div>
            <div class="nav-dot" onclick="document.getElementById('dash-carousel').scrollTo({left:document.getElementById('dash-carousel').clientWidth,behavior:'smooth'})"></div>
            ${statsInCarousel && statsHTML ? `<div class="nav-dot" onclick="document.getElementById('dash-carousel').scrollTo({left:9999,behavior:'smooth'})"></div>` : ''}
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

          <!-- ACTIVE QUESTS (Fluid Swipe Carousel) -->
          <div class="quest-area-wrap" style="overflow:hidden;">
            <div class="quest-area-header" id="quest-area-header-container">
              ${renderQuestTypeWheel()}
            </div>
            
            <div class="dash-carousel-viewport" id="quest-list-carousel" onscroll="LM.views.dashboard.updateQuestCarouselNav()">
              <!-- 0: Quests -->
              <div class="dash-carousel-panel" style="min-width:100%; padding-right:8px;">
                <div class="quest-grid" id="quest-grid">
                  ${renderQuestCards(macros, null, false)}
                </div>
              </div>

              <!-- 1: Habituals -->
              <div class="dash-carousel-panel" style="min-width:100%; padding-right:8px;">
                <div class="quest-grid">
                  ${renderHabitualCards(macros)}
                </div>
              </div>

              <!-- 2: Chains -->
              <div class="dash-carousel-panel" style="min-width:100%; padding-right:8px;">
                <div class="quest-grid">
                  ${renderChainDashCards(macros)}
                </div>
              </div>
            </div>
          </div>
          
          ${!statsInCarousel ? (() => {
            const stats = S.getStatistics();
            if (stats.length === 0) return '';
            return `
              <div class="dash-statistics-wrap" style="margin-top:24px; padding-bottom: 24px;">
                <h2 style="font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px; color: var(--text-3);">
                  DAILY STATISTICS
                </h2>
                <div class="quest-grid">
                  ${stats.map(s => {
                    const todayStr = new Date().toDateString();
                    const logs = S.getStatLogs().filter(l => l.statId === s.id && l.dateStr === todayStr);
                    const todayTotal = logs.reduce((sum, log) => sum + log.value, 0);
                    const left = s.goalValue - todayTotal;
                    
                    let leftHtml = '';
                    if (left >= 0) {
                      leftHtml = `<span style="font-size:0.65rem; color:var(--success); font-weight:bold; margin-left:auto; text-transform:uppercase;">+${left} ${s.unit || ''} left</span>`;
                    } else {
                      leftHtml = `<span style="font-size:0.65rem; color:var(--danger); font-weight:bold; margin-left:auto; text-transform:uppercase;">${left} ${s.unit || ''} left</span>`;
                    }

                    return `
                    <div class="quest-card" style="border-color:var(--border); margin-bottom:0; display:flex; align-items:center; justify-content:space-between; padding: 12px 16px;">
                      <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
                        <h3 class="quest-card-name" style="margin:0; font-size:0.95rem;">${s.name}</h3>
                        <div class="stat-controls" style="display:flex; align-items:center; gap:6px;">
                          <input type="number" id="stat-val-bot-${s.id}" class="form-input" placeholder="Amt" style="width:70px; padding:4px 8px; font-size:0.85rem; height:32px;" onclick="event.stopPropagation();">
                          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); const el = document.getElementById('stat-val-bot-${s.id}'); if(el.value){LM.views.dashboard.logStatistic('${s.id}', Number(el.value)); el.value='';}" style="padding:4px 10px; font-size:0.75rem; height:32px; min-width:unset;">LOG</button>
                        </div>
                      </div>
                      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px; min-width: 100px;">
                        <div style="font-size:1.6rem; font-weight:900; color:var(--text-1); font-family:var(--font-display); line-height:1; white-space:nowrap; margin-bottom:4px;">
                          ${todayTotal}<span style="font-size:0.9rem; color:var(--text-3); font-weight:normal;">/${s.goalValue}</span>
                        </div>
                        ${leftHtml}
                      </div>
                    </div>
                  `}).join('')}
                </div>
              </div>
            `;
          })() : ''}

        </div> <!-- End dash-center -->
      </div>`;

  } // end render()

  function setQuestType(type) {
    activeQuestType = type;
    const qv = document.getElementById('quest-list-carousel');
    if (qv) {
      const idx = QUEST_TYPES.findIndex(t => t.id === type);
      if (idx !== -1) {
        qv.scrollTo({ left: qv.clientWidth * idx, behavior: 'smooth' });
      }
    }
    const header = document.getElementById('quest-area-header-container');
    if (header) {
      header.innerHTML = renderQuestTypeWheel();
      initWheelInteraction();
    }
  }

  function updateQuestCarouselNav() {
    const qv = document.getElementById('quest-list-carousel');
    if (!qv) return;
    const idx = Math.round(qv.scrollLeft / qv.clientWidth);
    const type = QUEST_TYPES[idx];
    if (type && type.id !== activeQuestType) {
      activeQuestType = type.id;
      const header = document.getElementById('quest-area-header-container');
      if (header) {
        header.innerHTML = renderQuestTypeWheel();
        initWheelInteraction();
      }
    }
  }

  function setHabitualStatus(id, status) {
    const h = S.getHabitual(id);
    if (!h) return;
    const macros = S.getMacros();
    const macro = macros.find(m => m.id === h.macroId);
    if (status === 'yes' && h.todayStatus !== 'yes') {
      S.awardXP([{ macroSkillId: h.macroId, xpAmount: h.xpGain }], false, `Habitual done: ${h.name}`);
      S.addHistoryEntry('habitual_done', `Habitual done: ${h.name}`, { habitualId: id, xp: h.xpGain });
      window.LM.components.notifications.show(`✓ Habitual done! +${h.xpGain} XP`, 'success');
    } else if (status === 'no' && h.todayStatus !== 'no') {
      S.awardXP([{ macroSkillId: h.macroId, xpAmount: -h.xpLoss }], false, `Habitual missed: ${h.name}`);
      S.addHistoryEntry('habitual_missed', `Habitual missed: ${h.name}`, { habitualId: id, xp: -h.xpLoss });
      window.LM.components.notifications.show(`✕ Habitual missed. -${h.xpLoss} XP`, 'warning');
    }
    S.upsertHabitual({ ...h, todayStatus: status });
    // Re-render only habituals grid to avoid full reload
    const grid = document.getElementById('quest-grid-habituals') || document.querySelector('#qpanel-habituals .quest-grid');
    if (grid) grid.innerHTML = renderHabitualCards(S.getMacros());
    else LM.router.render();
  }

  function completeChainStep(chainId, stepId) {
    const result = S.completeChainStep(chainId, stepId);
    if (result) {
      window.LM.components.notifications.show(`✓ Step complete! +${result.xpAmount} XP`, 'success');
      const grid = document.getElementById('quest-grid-chains') || document.querySelector('#qpanel-chains .quest-grid');
      if (grid) grid.innerHTML = renderChainDashCards(S.getMacros());
      else LM.router.render();
    }
  }

  // ── Quest Type Wheel Interaction ─────────────────────────────────────────
  function initWheelInteraction() {
    const svg  = document.getElementById('quest-type-svg');
    const disc = document.getElementById('quest-wheel-disc');
    if (!svg || !disc) return;

    const TYPES = ['quests', 'habituals', 'chains'];
    const ROT   = { quests: 0, habituals: -120, chains: -240 };
    let currentType = activeQuestType;
    let isDragging  = false;
    let dragMoved   = false;
    let startAngle  = 0;
    let accumRot    = ROT[currentType];

    function getCenterOf(el) {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    function getAngle(cx, cy, px, py) {
      return Math.atan2(py - cy, px - cx) * 180 / Math.PI;
    }
    function snapToNearest(rot) {
      const snaps = [0, -120, -240];
      const dists = snaps.map((s, i) => {
        let d = ((s - rot) % 360 + 360) % 360;
        if (d > 180) d -= 360;
        return { idx: i, dist: Math.abs(d) };
      });
      return TYPES[dists.reduce((a, b) => a.dist < b.dist ? a : b).idx];
    }
    function applyRotation(deg, animated) {
      disc.style.transition = animated ? 'transform 0.35s cubic-bezier(0.34,1.3,0.64,1)' : 'none';
      disc.style.transform  = `rotate(${deg}deg)`;
    }
    function onTap() {
      const next = TYPES[(TYPES.indexOf(currentType) + 1) % TYPES.length];
      currentType = next;
      accumRot    = ROT[next];
      applyRotation(accumRot, true);
      LM.views.dashboard.setQuestType(next);
    }
    function pointerDown(e) {
      const pt = e.touches ? e.touches[0] : e;
      const c  = getCenterOf(svg);
      startAngle  = getAngle(c.x, c.y, pt.clientX, pt.clientY);
      const prevAccum = accumRot;
      isDragging  = true;
      dragMoved   = false;
      svg.style.cursor = 'grabbing';
      e.preventDefault();
      // Store the rotation at drag start
      svg._dragStartRot = accumRot;
    }
    function pointerMove(e) {
      if (!isDragging) return;
      const pt    = e.touches ? e.touches[0] : e;
      const c     = getCenterOf(svg);
      const angle = getAngle(c.x, c.y, pt.clientX, pt.clientY);
      const delta = angle - startAngle;
      if (Math.abs(delta) > 3) dragMoved = true;
      const rot = svg._dragStartRot + delta;
      applyRotation(rot, false);
      accumRot = rot;
      e.preventDefault();
    }
    function pointerUp() {
      if (!isDragging) return;
      isDragging = false;
      svg.style.cursor = 'grab';
      if (!dragMoved) { onTap(); return; }
      const snapped = snapToNearest(accumRot);
      accumRot    = ROT[snapped];
      applyRotation(accumRot, true);
      if (snapped !== currentType) {
        currentType = snapped;
        LM.views.dashboard.setQuestType(snapped);
      }
    }

    svg.addEventListener('mousedown',  pointerDown, { passive: false });
    svg.addEventListener('touchstart', pointerDown, { passive: false });
    window.addEventListener('mousemove',  pointerMove, { passive: false });
    window.addEventListener('touchmove',  pointerMove, { passive: false });
    window.addEventListener('mouseup',   pointerUp);
    window.addEventListener('touchend',  pointerUp);
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

    // Restore fluid swipe quest carousel position
    const qv = document.getElementById('quest-list-carousel');
    if (qv) {
      const activeIdx = QUEST_TYPES.findIndex(t => t.id === activeQuestType);
      if (activeIdx > 0) {
        setTimeout(() => { qv.scrollLeft = qv.clientWidth * activeIdx; }, 10);
      }
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

    initWheelInteraction();
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

  function logStatistic(statId) {
    const input = document.getElementById(`stat-val-${statId}`);
    if (!input || !input.value) return;
    const loggedValue = parseFloat(input.value);
    
    const stat = S.getStatistic(statId);
    if (!stat) return;

    // Calculate XP based on the *daily total* against the goal, not just this individual log!
    const todayStr = new Date().toDateString();
    const todayLogs = S.getStatLogs().filter(l => l.statId === stat.id && l.dateStr === todayStr);
    const prevTotal = todayLogs.reduce((sum, log) => sum + log.value, 0);
    const newTotal = prevTotal + loggedValue;

    // Calculate XP delta
    const xpWithNew = F.calculateStatisticXP(newTotal, stat.goalValue, stat.maxXP, stat.penaltyRange, stat.negativeXP);
    const xpWithOld = F.calculateStatisticXP(prevTotal, stat.goalValue, stat.maxXP, stat.penaltyRange, stat.negativeXP);
    const finalXP = xpWithNew - xpWithOld;

    S.addStatLog(stat.id, loggedValue, todayStr, finalXP);
    
    if (stat.targetSkill && stat.targetSkill.macroSkillId) {
      S.awardXP([{ macroSkillId: stat.targetSkill.macroSkillId, microSkillId: stat.targetSkill.microSkillId, xpAmount: finalXP }], false, `Stat Log: ${stat.name} (+${loggedValue})`);
    } else {
      S.addHistoryEntry('xp_gain', `Stat Log: ${stat.name} (+${loggedValue})`, { xp: finalXP });
      S.awardXP([], false, `Stat Log: ${stat.name} (+${loggedValue})`);
      const o = S.getOverall();
      o.currentXP = (o.currentXP || 0) + finalXP;
      S.saveOverall(o);
      S.saveXPLog([...S.getXPLog(), { id: S.uid(), timestamp: Date.now(), amount: finalXP, source: 'statistic' }]);
      if (finalXP > 0) window.LM.components.notifications.show(`+${finalXP} XP`, 'success');
      else if (finalXP < 0) window.LM.components.notifications.show(`${finalXP} XP`, 'warning');
    }

    input.value = '';
    LM.router.render();
  }

  return { render, init, onDragStart, completeQuest, claimXPMobile, deleteQuest, logStatistic, updateBar, refreshCards, selectMacro, renderHistoryBar, updateCarouselNav, updateQuestCarouselNav, updateMacrosPanel, setQuestType, setHabitualStatus, completeChainStep };
})();
