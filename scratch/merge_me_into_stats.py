### SCRIPT: merge_me_into_stats.py

stats_content = r'''window.LM.views.stats = (function () {
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
    return `<polygon class="radar-path" fill="rgba(255,45,120,0.15)" points="${playerPoints.join(' ')}" stroke="#ff2d78" stroke-width="3"></polygon>${circles.join('')}`;
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

    const n = macros.length;
    const cx = 200, cy = 200, R = 150;
    const displayMacros = macros.slice(0, 5);
    let labelsHTML = '';
    for (let i = 0; i < n; i++) {
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      labelsHTML += `<text x="${cx + (R+30)*Math.cos(angle)}" y="${cy + (R+15)*Math.sin(angle)}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#00e5ff" style="text-shadow:0 0 6px #00e5ff">${macros[i].name.substring(0,8).toUpperCase()}</text>`;
    }

    const getIcon = (name) => {
      const l = name.toLowerCase();
      if (l.includes('body')||l.includes('phys')) return 'fitness_center';
      if (l.includes('intel')||l.includes('cogn')||l.includes('mind')) return 'psychology';
      if (l.includes('fin')||l.includes('wealth')) return 'payments';
      if (l.includes('soc')||l.includes('rel')) return 'hub';
      return 'stars';
    };

    return `
      <div class="fixed inset-0 wireframe-grid z-0 pointer-events-none opacity-40"></div>
      <div class="fixed inset-0 scanline-overlay z-50 opacity-20 pointer-events-none"></div>

      <div class="relative z-20 pt-24 pb-36 px-4 md:px-8 max-w-7xl mx-auto page-enter">

        <!-- ─────────────────────────────────── OPERATOR PROFILE SECTION ────────── -->
        <section class="mb-16">
          <p class="font-label-sm text-primary uppercase tracking-[0.3em] mb-2">OPERATOR FILE</p>
          <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg uppercase tracking-tighter text-on-surface neon-text-cyan mb-2">Profile & Stats</h2>
          <div class="h-1 w-24 bg-gradient-to-r from-primary to-secondary mb-8 shadow-[0_0_10px_rgba(0,229,255,0.8)]"></div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
            <!-- Operator Card -->
            <div class="lg:col-span-4 flex flex-col items-center lg:items-start p-6 bg-surface-container/60 backdrop-blur-lg border-l-4 border-primary relative overflow-hidden shadow-[8px_8px_0px_rgba(0,229,255,0.08)]">
              <div class="relative w-36 h-36 mb-4 group">
                <div class="absolute inset-0 border-2 border-primary animate-pulse opacity-40"></div>
                <div class="absolute -inset-2 border border-secondary/40 rotate-45"></div>
                <img alt="Operator Profile" class="w-full h-full object-cover grayscale brightness-110 contrast-125 saturate-150"
                     src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRG8upTgdEsgDsMMgTB7EdIw5OCPFDDBa-EiyV5b9dX8SRRKWuCqPIyINiyyScRIFIaMPmtfuVD2EfGqaRUVWHsY2C8gN_tV3j3ai8N1AmANfqXC7W3ZVDc1-QYSrDRfCbxkoclqPncYZIi4sBXKToWXCOwmUSU7Re-FFyc4mFqp_ViHvHY0wz3Kytbb7bItxhRjoS1Phfs3oFn8q-_SOL0dLlzNx57BmTZLKhPIZ0p_3FmJ-1hkijiSvVp8H0esq0wyI8TB9CLxLE"/>
                <div class="absolute bottom-0 left-0 bg-primary text-black font-bold px-2 py-0.5 text-[10px]">CONNECTED</div>
              </div>
              <h2 class="font-headline-md text-primary tracking-tighter vapor-glow-cyan uppercase">${settings.username || 'OPERATOR_X'}</h2>
              <p class="text-xs text-on-surface-variant uppercase tracking-widest mt-1">${rankInfo.title}</p>
              <div class="flex gap-2 mt-3 flex-wrap">
                <span class="bg-secondary text-white font-label-sm px-2 py-0.5 uppercase italic text-[10px]">PEAK</span>
                <span class="bg-primary text-black font-label-sm px-2 py-0.5 uppercase italic text-[10px]">NEURAL MAPPED</span>
              </div>
            </div>

            <!-- Quick Stats Grid -->
            <div class="lg:col-span-8 flex flex-col gap-4">
              <div class="p-5 bg-surface-container/60 backdrop-blur-lg border-l-4 border-secondary flex flex-col md:flex-row justify-between items-center gap-4 shadow-[8px_8px_0px_rgba(255,45,120,0.08)]">
                <div class="flex items-center gap-4">
                  <span class="material-symbols-outlined text-primary text-3xl" style="filter:drop-shadow(0 0 6px rgba(0,229,255,0.7))">cloud_sync</span>
                  <div>
                    <p class="font-label-sm text-on-surface-variant uppercase text-[10px]">SYNC STATUS</p>
                    <h3 class="font-headline-md text-primary">ENCRYPTED UPLINK ACTIVE</h3>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-label-sm text-on-surface-variant uppercase text-[10px]">SESSION</p>
                  <p class="text-secondary font-mono text-sm">${new Date().toISOString().slice(0,10)} // ONLINE</p>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div class="p-4 bg-surface-container/60 border-l-4 border-primary/40 hover:border-primary transition-all">
                  <p class="font-label-sm text-on-surface-variant text-[10px] mb-2">STREAK</p>
                  <p class="font-headline-md text-white text-lg">🔥 ${streak}</p>
                </div>
                <div class="p-4 bg-surface-container/60 border-l-4 border-primary/40 hover:border-primary transition-all">
                  <p class="font-label-sm text-on-surface-variant text-[10px] mb-2">RANK</p>
                  <p class="font-headline-md text-white text-sm">${rankInfo.title}</p>
                </div>
                <div class="p-4 bg-surface-container/60 border-l-4 border-primary/40 hover:border-primary transition-all">
                  <p class="font-label-sm text-on-surface-variant text-[10px] mb-2">LEVEL</p>
                  <p class="font-headline-md text-primary text-2xl neon-text-cyan">${overall.currentLevel || 0}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Weekly Quotas -->
          <h3 class="font-label-sm text-primary uppercase tracking-[0.3em] mb-4">WEEKLY QUOTAS — 7-DAY ROLLING</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
            ${macros.slice(0, 4).map((m, idx) => {
              const isPrimary = idx % 2 === 0;
              const color = isPrimary ? '#00e5ff' : '#ff2d78';
              const borderClass = isPrimary ? 'border-primary' : 'border-secondary';
              const completed = weeklyCompleted.filter(q => q.targetSkills && q.targetSkills.some(ts => ts.macroSkillId === m.id)).length;
              const pct = Math.min(100, (completed / quotaTarget) * 100);
              const dashOffset = 125.6 - (125.6 * pct / 100);
              let bars = '';
              for (let i = 0; i < quotaTarget; i++) {
                bars += i < completed
                  ? `<div class="h-1 flex-1" style="background:${color}; box-shadow:0 0 6px ${color}"></div>`
                  : `<div class="h-1 flex-1 bg-white/5"></div>`;
              }
              return `
                <div class="bg-surface-container/50 backdrop-blur-xl p-4 border-l-4 ${borderClass} group cursor-pointer hover:bg-surface-container/80 transition-all" onclick="LM.router.navigate('skills')">
                  <div class="flex justify-between items-center mb-4">
                    <span class="material-symbols-outlined text-xl" style="color:${color}">${getIcon(m.name)}</span>
                    <div class="w-10 h-10 relative">
                      <svg class="w-full h-full -rotate-90" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="3"/>
                        <circle cx="24" cy="24" r="20" fill="none" stroke="${color}" stroke-width="3"
                          stroke-dasharray="125.6" stroke-dashoffset="${dashOffset}" style="filter:drop-shadow(0 0 4px ${color})"/>
                      </svg>
                      <span class="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style="color:${color}">${Math.round(pct)}%</span>
                    </div>
                  </div>
                  <p class="font-bold text-on-surface text-sm uppercase">${m.name}</p>
                  <p class="font-label-sm text-on-surface-variant text-[10px]">${completed}/${quotaTarget} TARGETS</p>
                  <div class="flex gap-1 mt-3">${bars}</div>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <!-- ─────────────────────────────────── STATS SECTION ────────── -->
        <section>
          <div class="relative mb-8 flex flex-col items-center justify-center pt-8 pb-6 overflow-visible">
            <div class="absolute inset-0 flex items-center justify-center -z-10 opacity-50">
              <div class="w-64 h-64 synth-sun rounded-full"></div>
            </div>
            <p class="font-label-sm text-secondary uppercase tracking-[0.5em] mb-2">LIFETIME EXPERIENCE</p>
            <h2 class="font-display-xl text-primary text-[64px] md:text-[96px] drop-shadow-[0_0_25px_rgba(0,229,255,0.7)] select-none italic">${(overall.currentXP / 1000).toFixed(1)}K</h2>
            <div class="w-48 h-0.5 bg-gradient-to-r from-transparent via-secondary to-transparent mt-3 opacity-70"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <!-- Radar Chart -->
            <section class="lg:col-span-7 bg-surface-container/40 backdrop-blur-xl border-l-4 border-primary p-8 relative overflow-hidden shadow-[0_0_40px_rgba(0,229,255,0.08)] group">
              <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span class="material-symbols-outlined text-9xl text-primary">analytics</span>
              </div>
              <h3 class="font-headline-md text-primary mb-8 flex items-center gap-2 drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">
                <span class="material-symbols-outlined">radar</span> ATTRIBUTE SPREAD
              </h3>
              <div class="relative w-full aspect-square max-w-md mx-auto">
                <svg class="w-full h-full overflow-visible" viewBox="-20 -20 440 440">
                  <circle cx="200" cy="200" fill="none" r="150" stroke="rgba(0,229,255,0.15)" stroke-width="1"/>
                  <circle cx="200" cy="200" fill="none" r="100" stroke="rgba(0,229,255,0.15)" stroke-width="1"/>
                  <circle cx="200" cy="200" fill="none" r="50" stroke="rgba(0,229,255,0.15)" stroke-width="1"/>
                  ${macros.map((m, i) => {
                    const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
                    const x = 200 + 150 * Math.cos(angle);
                    const y = 200 + 150 * Math.sin(angle);
                    return `<line stroke="rgba(0,229,255,0.3)" stroke-dasharray="4" x1="200" x2="${x}" y1="200" y2="${y}"/>`;
                  }).join('')}
                  ${renderRadarChart(macros)}
                  ${labelsHTML}
                </svg>
              </div>
              <div class="mt-8 grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
                ${displayMacros.map(m => `
                  <div class="p-2 border border-primary/20 bg-primary/5">
                    <div class="text-[10px] text-primary/70 font-label-sm">${m.name.substring(0,3).toUpperCase()}</div>
                    <div class="text-primary font-bold">${m.currentLevel || 0}</div>
                  </div>
                `).join('')}
              </div>
            </section>

            <!-- XP Action Log -->
            <section class="lg:col-span-5 flex flex-col" style="min-height:500px">
              <div class="bg-surface-container/40 backdrop-blur-xl border-l-4 border-secondary p-8 flex-1 flex flex-col shadow-[0_0_40px_rgba(255,45,120,0.08)]">
                <h3 class="font-headline-md text-secondary mb-6 flex items-center gap-2 drop-shadow-[0_0_8px_rgba(255,45,120,0.5)]">
                  <span class="material-symbols-outlined">history</span> XP ACTION LOG
                </h3>
                <div class="flex-grow overflow-y-auto space-y-3 pr-2">
                  ${xpLog.length > 0 ? xpLog.map(l => {
                    const macro = macros.find(m => m.id === l.macroId);
                    const name = macro ? macro.name : 'System';
                    const isPositive = l.delta >= 0;
                    return `
                      <div class="p-4 bg-secondary/5 border border-secondary/20 hover:bg-secondary/15 transition-all cursor-pointer">
                        <div class="flex justify-between items-start">
                          <div>
                            <h4 class="font-bold text-on-surface text-sm uppercase tracking-wider truncate max-w-[180px]">${l.reason || 'Data Injected'}</h4>
                            <p class="text-xs text-on-surface-variant mt-1">${name}</p>
                          </div>
                          <span class="font-bold ${isPositive ? 'text-secondary' : 'text-error'}">${isPositive ? '+' : ''}${l.delta} XP</span>
                        </div>
                        <div class="mt-1 text-[10px] text-secondary/40 font-label-sm">${getTimeAgo(l.timestamp)}</div>
                      </div>`;
                  }).join('') : `<div class="text-center font-mono text-sm text-on-surface-variant py-8">NO ACTIVITY DETECTED</div>`}
                </div>
                <div class="flex gap-3 mt-4">
                  <button class="flex-1 py-3 bg-primary/10 border border-primary text-primary font-label-sm uppercase tracking-widest hover:bg-primary hover:text-black transition-all active:scale-95" onclick="LM.router.navigate('settings')">
                    SETTINGS
                  </button>
                </div>
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
'''

with open('js/views/stats.js', 'w', encoding='utf-8') as f:
    f.write(stats_content)

print("Done: stats.js now includes the Me profile section")
