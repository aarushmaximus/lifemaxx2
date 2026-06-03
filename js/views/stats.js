window.LM.views.stats = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;

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

  function renderRadarChart(macros) {
    if (macros.length === 0) return '';
    const cx = 150;
    const cy = 150;
    const R = 100;
    const n = macros.length;

    // Get max level to scale chart
    const maxLevel = Math.max(10, ...macros.map(m => m.currentLevel || 0));

    // Background polygon circles at 25%, 50%, 75%, 100%
    const levels = [0.25, 0.5, 0.75, 1.0];
    const gridPolygons = levels.map(levelScale => {
      const points = [];
      for (let i = 0; i < n; i++) {
        const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
        const x = cx + R * levelScale * Math.cos(angle);
        const y = cy + R * levelScale * Math.sin(angle);
        points.push(`${x},${y}`);
      }
      return `<polygon points="${points.join(' ')}" fill="none" stroke="var(--border)" stroke-width="1" />`;
    }).join('\n');

    // Axis lines
    const axisLines = [];
    const labels = [];
    for (let i = 0; i < n; i++) {
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      const x = cx + R * Math.cos(angle);
      const y = cy + R * Math.sin(angle);
      axisLines.push(`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--border)" stroke-width="1" />`);

      // Label (abbreviate to 4 letters)
      const labelText = macros[i].name.substring(0, 4).toUpperCase();
      const lx = cx + (R + 20) * Math.cos(angle);
      const ly = cy + (R + 10) * Math.sin(angle) + 4; // slight vertical correction
      labels.push(`<text x="${lx}" y="${ly}" text-anchor="middle" fill="var(--text-2)" font-size="8.5" font-family="var(--font-display)" font-weight="bold">${labelText}</text>`);
    }

    // Player Data Polygon
    const playerPoints = [];
    for (let i = 0; i < n; i++) {
      const level = macros[i].currentLevel || 0;
      const ratio = Math.max(0.15, level / maxLevel);
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      const x = cx + R * ratio * Math.cos(angle);
      const y = cy + R * ratio * Math.sin(angle);
      playerPoints.push(`${x},${y}`);
    }

    const playerPolygon = `<polygon points="${playerPoints.join(' ')}" fill="rgba(255, 45, 120, 0.15)" stroke="var(--secondary)" stroke-width="2" style="filter: drop-shadow(0 0 6px rgba(255, 45, 120, 0.4))" />`;

    return `
      <svg width="320" height="300" viewBox="0 0 300 300" style="margin: 0 auto; display: block;">
        ${gridPolygons}
        ${axisLines.join('\n')}
        ${playerPolygon}
        ${labels.join('\n')}
      </svg>
    `;
  }

  function render() {
    const macros = S.getMacros();
    const overall = S.getOverall();
    const xpLog = S.getXPLog().slice(-15).reverse(); // last 15 entries
    const rankInfo = getPlayerRank(overall.currentLevel || 0);

    const into = F.xpIntoCurrentLevel(overall.currentXP, overall);
    const req = F.xpRequiredForNextLevel(overall.currentXP, overall);
    const pct = F.progressPercent(overall.currentXP, overall);

    const macroDict = {};
    macros.forEach(m => { macroDict[m.id] = m; });

    return `
      <div class="view-container page-enter">
        <div class="view-header">
          <h1 class="font-display-uppercase">STATS & PROGRESSION</h1>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 24px;">
          
          <!-- Tier and Status Card -->
          <div class="operator-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="operator-title">${rankInfo.title}</span>
              <span style="font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: var(--accent);">LEVEL ${overall.currentLevel || 0}</span>
            </div>
            
            <div class="xp-bar-wrap" style="margin: 8px 0;">
              <div class="xp-bar-track" style="height: 6px;">
                <div class="xp-bar-fill" style="width: ${pct}%; background: var(--accent); color: var(--accent);"></div>
              </div>
            </div>

            <div class="operator-stats">
              <span>RANK: ${rankInfo.title}</span>
              <span>XP ${F.formatXP(into)} / ${F.formatXP(req)} XP (${Math.round(pct)}%)</span>
            </div>
            <div style="font-family: var(--font-display); font-size: 0.72rem; color: var(--text-3); text-transform: uppercase; margin-top: -4px;">
              NEXT TIER: ${rankInfo.nextTitle}
            </div>
          </div>

          <!-- Loud Total XP Display -->
          <div class="flat-card" style="text-align: center; padding: 24px 16px;">
            <div style="font-family: var(--font-display); font-size: 0.75rem; letter-spacing: 0.1em; color: var(--text-3); text-transform: uppercase; margin-bottom: 6px;">
              TOTAL LIFETIME XP CLAIMED
            </div>
            <div style="font-family: var(--font-display); font-size: 3rem; font-weight: 700; color: #fff; text-shadow: 0 0 15px rgba(255,255,255,0.1); line-height: 1.1;">
              ${F.formatXP(overall.currentXP || 0)} <span style="font-size: 1.2rem; color: var(--accent);">XP</span>
            </div>
          </div>

          <!-- Grid: Radar Chart + Skills Progression -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
            
            <!-- Attribute Spread Radar Chart -->
            <div class="flat-card">
              <h2 style="font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0; margin-bottom: 16px; color: var(--text-1);">
                Attribute Spread
              </h2>
              <div class="radar-container" style="background: transparent; border: none; padding: 0;">
                ${renderRadarChart(macros)}
              </div>
            </div>

            <!-- Skills Progression -->
            <div class="flat-card" style="display:flex; flex-direction:column; gap:16px;">
              <h2 style="font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; margin: 0; color: var(--text-1);">
                Skills Directory
              </h2>
              <div style="display:flex; flex-direction:column; gap:12px; max-height: 360px; overflow-y:auto; padding-right:4px;">
                ${macros.map(m => {
                  const mPct = F.progressPercent(m.currentXP || 0, m);
                  const mInto = F.xpIntoCurrentLevel(m.currentXP || 0, m);
                  const mReq = F.xpRequiredForNextLevel(m.currentXP || 0, m);
                  return `
                    <div style="border-bottom: 1px solid var(--border); padding-bottom: 10px;">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                        <span style="font-family: var(--font-display); font-weight: 700; font-size: 0.9rem; color: #fff; display:flex; align-items:center; gap:8px;">
                          <span style="width:8px; height:8px; border-radius:50%; background:${m.accentColor || 'var(--accent)'}"></span>
                          ${m.name}
                        </span>
                        <span style="font-family: var(--font-display); font-size: 0.78rem; color: var(--text-2);">Lv ${m.currentLevel || 0}</span>
                      </div>
                      <div class="xp-bar-wrap">
                        <div class="xp-bar-track" style="height: 4px;">
                          <div class="xp-bar-fill" style="width: ${mPct}%; background: ${m.accentColor || 'var(--accent)'}; color: ${m.accentColor || 'var(--accent)'};"></div>
                        </div>
                      </div>
                      <div style="display:flex; justify-content:space-between; font-size: 0.68rem; color: var(--text-3); margin-top: 4px;">
                        <span>${F.formatXP(mInto)} / ${F.formatXP(mReq)} XP</span>
                        <span>${Math.round(mPct)}%</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

          </div>

          <!-- XP Completion Log -->
          <div class="flat-card">
            <h2 style="font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0; margin-bottom: 16px; color: var(--text-1);">
              XP Action Log
            </h2>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${xpLog.map(l => {
                const macro = macroDict[l.macroId];
                const color = macro ? macro.accentColor : 'var(--accent)';
                const dateStr = new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `
                  <div class="xp-log-row" style="border-left-color: ${color}">
                    <div style="display:flex; flex-direction:column; gap:4px; min-width:0;">
                      <span style="font-size:0.85rem; font-weight: 500; color: #fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${l.reason || 'Quest Claimed'}
                      </span>
                      <span style="font-size:0.7rem; color: var(--text-2); display:flex; align-items:center; gap:6px;">
                        <span style="width:6px; height:6px; border-radius:50%; background:${color}"></span>
                        ${macro ? macro.name : 'Unknown Skill'} &middot; ${dateStr}
                      </span>
                    </div>
                    <div style="font-family: var(--font-display); font-weight: 700; font-size: 1rem; color: ${l.delta >= 0 ? 'var(--accent)' : 'var(--danger)'}; white-space:nowrap; margin-left: 12px;">
                      ${l.delta >= 0 ? '+' : ''}${l.delta} XP
                    </div>
                  </div>
                `;
              }).join('') || `<div style="text-align:center; padding: 20px; font-size: 0.85rem; color: var(--text-3);">No completed quests logged yet. Go crush some quests!</div>`}
            </div>
          </div>

        </div>
      </div>
    `;
  }

  function init() {
    // View loaded, no active bindings needed
  }

  return { render, init };
})();
