window.LM.views.stats = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;

  function getTimeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'JUST NOW';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}M AGO`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}H AGO`;
    const d = Math.floor(h / 24);
    return `${d}D AGO`;
  }

  function getDailyStreak(quests, xpLog) {
    const dates = new Set();
    quests.forEach(q => { if (q.status === 'completed' && q.completedAt) dates.add(new Date(q.completedAt).toDateString()); });
    xpLog.forEach(l => { if (l.timestamp) dates.add(new Date(l.timestamp).toDateString()); });
    const sortedDates = Array.from(dates).map(d => new Date(d)).sort((a, b) => b - a);
    if (!sortedDates.length) return 0;
    let streak = 0;
    let current = new Date(); current.setHours(0,0,0,0);
    const latest = new Date(sortedDates[0]); latest.setHours(0,0,0,0);
    if (Math.round((current - latest) / 86400000) > 1) return 0;
    let checkDate = new Date(latest);
    for (let i = 0; i < sortedDates.length; i++) {
      const d = new Date(sortedDates[i]); d.setHours(0,0,0,0);
      const diff = Math.round((checkDate - d) / 86400000);
      if (diff === 0) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
      else if (diff === 1) { streak++; checkDate = new Date(d); checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }
    return streak;
  }

  function getPlayerRank(level) {
    const tiers = [
      { name: 'RECRUIT', min: 0 }, { name: 'INITIATE', min: 10 },
      { name: 'VANGUARD', min: 20 }, { name: 'OPERATOR', min: 30 },
      { name: 'ELITE OPERATOR', min: 40 }, { name: 'CHAMPION', min: 50 },
      { name: 'LEGEND', min: 70 }, { name: 'MYTHIC MASTER', min: 90 }
    ];
    let activeTier = tiers[0], nextTier = tiers[1];
    for (let i = 0; i < tiers.length; i++) {
      if (level >= tiers[i].min) { activeTier = tiers[i]; nextTier = tiers[i+1] || { name: 'MAXED OUT', min: 100 }; }
    }
    return { title: `${activeTier.name} ${(level - activeTier.min) < 5 ? 'I' : 'II'}`, nextTitle: nextTier.name };
  }

  function renderRadarChart(macros) {
    if (!macros.length) return '';
    const cx = 200, cy = 200, R = 150, n = macros.length;
    const maxLevel = Math.max(10, ...macros.map(m => m.currentLevel || 0));
    const playerPoints = [], circles = [];
    for (let i = 0; i < n; i++) {
      const ratio = Math.max(0.15, (macros[i].currentLevel || 0) / maxLevel);
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      const x = cx + R * ratio * Math.cos(angle);
      const y = cy + R * ratio * Math.sin(angle);
      playerPoints.push(`${x},${y}`);
      circles.push(`<circle cx="${x}" cy="${y}" fill="#00e5ff" r="5" style="filter:drop-shadow(0 0 5px #00e5ff)"></circle>`);
    }
    return `<polygon class="radar-path" fill="rgba(74,124,255,0.15)" points="${playerPoints.join(' ')}" stroke="var(--accent)" stroke-width="3"></polygon>${circles.join('')}`;
  }

  function render() {
    const macros = S.getMacros();
    const overall = S.getOverall();
    const xpLog = S.getXPLog().slice(-20).reverse();
    const quests = S.getQuests();
    const streak = getDailyStreak(quests, S.getXPLog());
    const rankInfo = getPlayerRank(overall.currentLevel || 0);
    const settings = S.getSettings();

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyCompleted = quests.filter(q => q.status === 'completed' && q.completedAt >= sevenDaysAgo);
    const quotaTarget = 3;

    const displayMacros = macros.slice(0, 5);

    return `
      <div class="relative z-20 pt-24 pb-36 px-4 md:px-8 max-w-7xl mx-auto page-enter">

        <!-- ─────────────────────────────────── STATS SECTION ────────── -->
        <section>
          <div class="mb-12 flex flex-col items-center justify-center pt-8 pb-6 border-b border-surface-container-highest">
            <p class="font-label-sm text-on-surface-variant uppercase tracking-[0.5em] mb-2">LIFETIME EXPERIENCE</p>
            <h2 class="font-display text-primary text-[64px] md:text-[96px] select-none">${(overall.currentXP / 1000).toFixed(1)}K</h2>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <!-- Attribute Spread -->
            <section class="lg:col-span-5 flex flex-col">
              <h3 class="font-headline-md text-primary mb-6 flex items-center gap-2 uppercase tracking-widest">
                ATTRIBUTE SPREAD
              </h3>
              <div class="flex flex-col gap-4">
                ${displayMacros.map(m => `
                  <div class="flex justify-between items-center p-4 bg-surface-container/20 border border-surface-container-highest">
                    <span class="text-on-surface uppercase tracking-widest text-sm">${m.name}</span>
                    <span class="text-primary font-display text-xl">${m.currentLevel || 0}</span>
                  </div>
                `).join('')}
              </div>
            </section>

            <!-- XP Action Log -->
            <section class="lg:col-span-7 flex flex-col">
              <h3 class="font-headline-md text-primary mb-6 flex items-center gap-2 uppercase tracking-widest">
                XP ACTION LOG
              </h3>
              <div class="flex flex-col gap-3">
                ${xpLog.length > 0 ? xpLog.slice(0, 8).map(l => {
                  const macro = macros.find(m => m.id === l.macroId);
                  const name = macro ? macro.name : 'System';
                  const isPositive = l.delta >= 0;
                  return `
                    <div class="flex justify-between items-center py-3 border-b border-surface-container-highest">
                      <div class="flex flex-col">
                        <span class="text-on-surface text-sm uppercase tracking-wide truncate max-w-[200px]">${l.reason || 'Data Injected'}</span>
                        <span class="text-[10px] text-on-surface-variant tracking-widest mt-1">${name} • ${getTimeAgo(l.timestamp)}</span>
                      </div>
                      <span class="${isPositive ? 'text-primary' : 'text-error'} font-display text-sm">${isPositive ? '+' : ''}${l.delta} XP</span>
                    </div>`;
                }).join('') : `<div class="text-center font-mono text-sm text-on-surface-variant py-8">NO ACTIVITY DETECTED</div>`}
              </div>
            </section>
          </div>
        </section>
      </div>
    `;
  }

  function init() {}

  return { render, init };
})();
