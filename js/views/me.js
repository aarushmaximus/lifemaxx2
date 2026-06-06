window.LM.views.me = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;

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
    for (let i = 0; i < tiers.length; i++) {
      if (level >= tiers[i].min) {
        activeTier = tiers[i];
      }
    }
    const offset = level - activeTier.min;
    const sub = offset < 5 ? 'I' : 'II';
    return { title: `${activeTier.name} ${sub}` };
  }

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

  function render() {
    const macros = S.getMacros();
    const quests = S.getQuests();
    const xpLog = S.getXPLog();
    const streak = getDailyStreak(quests, xpLog);
    const overall = S.getOverall();
    const rankInfo = getPlayerRank(overall.currentLevel || 0);
    const settings = S.getSettings();
    
    // Calculate weekly stats
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyCompletedQuests = quests.filter(q => q.status === 'completed' && q.completedAt && q.completedAt >= sevenDaysAgo);
    const quotaTarget = 3;
    
    const activeQuestsCount = quests.filter(q => q.status === 'active').length;
    const loadPct = Math.min(100, Math.round((activeQuestsCount / 10) * 100)); // Arbitrary load calc

    // Recent activity log (up to 3)
    const recentActivity = [...xpLog].sort((a,b) => b.timestamp - a.timestamp).slice(0, 3);
    
    // Determine icon for macros, generic mapping
    const getIcon = (name) => {
      const lower = name.toLowerCase();
      if (lower.includes('body') || lower.includes('phys')) return 'fitness_center';
      if (lower.includes('intel') || lower.includes('cogn') || lower.includes('mind')) return 'psychology';
      if (lower.includes('fin') || lower.includes('wealth')) return 'payments';
      if (lower.includes('soc') || lower.includes('rel')) return 'hub';
      return 'stars';
    };

    return `
      <!-- Background Layer (Minimal Chrome) -->
      <div class="fixed inset-0 bg-background z-0 pointer-events-none"></div>
      
      <div class="relative z-10 pt-24 pb-32 px-6 max-w-7xl mx-auto page-enter">
        
        <!-- Profile Hero Section -->
        <section class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12 pb-10">
          <!-- Avatar & Basic Info -->
          <div class="lg:col-span-4 flex flex-col items-center lg:items-start p-8 bg-surface-container/60 backdrop-blur-lg border-l-4 border-primary relative overflow-hidden shadow-sm">
            <div class="relative w-48 h-48 mb-6 group">
              <div class="absolute inset-0 border-2 border-primary animate-pulse opacity-50"></div>
              <div class="absolute -inset-2 border border-surface-container-highest rotate-45"></div>
              <img alt="Operator Profile" class="w-full h-full object-cover grayscale brightness-110 contrast-125 saturate-150" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRG8upTgdEsgDsMMgTB7EdIw5OCPFDDBa-EiyV5b9dX8SRRKWuCqPIyINiyyScRIFIaMPmtfuVD2EfGqaRUVWHsY2C8gN_tV3j3ai8N1AmANfqXC7W3ZVDc1-QYSrDRfCbxkoclqPncYZIi4sBXKToWXCOwmUSU7Re-FFyc4mFqp_ViHvHY0wz3Kytbb7bItxhRjoS1Phfs3oFn8q-_SOL0dLlzNx57BmTZLKhPIZ0p_3FmJ-1hkijiSvVp8H0esq0wyI8TB9CLxLE"/>
              <div class="absolute bottom-0 left-0 bg-primary text-surface font-bold px-2 py-1 text-xs">CONNECTED</div>
            </div>
            <div class="text-center lg:text-left">
              <h2 class="font-headline-lg text-primary mb-2 tracking-tighter uppercase">${settings.username || 'OPERATOR_X'}</h2>
              <div class="flex flex-wrap gap-2 justify-center lg:justify-start">
                <span class="bg-surface-container-highest text-on-surface font-label-sm px-3 py-1 uppercase tracking-tighter">PEAK</span>
                <span class="bg-primary text-surface font-label-sm px-3 py-1 uppercase tracking-tighter">NEURAL MAPPED</span>
              </div>
            </div>
          </div>
          
          <!-- Sync Status & Meta -->
          <div class="lg:col-span-8 flex flex-col justify-between gap-6">
            <div class="p-6 bg-surface-container/60 backdrop-blur-lg border-l-4 border-surface-container-highest flex flex-col md:flex-row justify-between items-center shadow-sm">
              <div class="flex items-center gap-4 mb-4 md:mb-0">
                <span class="material-symbols-outlined text-primary text-4xl" style="font-variation-settings: 'FILL' 1;">cloud_sync</span>
                <div>
                  <p class="font-label-sm text-on-surface-variant uppercase">SYNC STATUS</p>
                  <h3 class="font-headline-md text-primary">ENCRYPTED UPLINK ACTIVE</h3>
                </div>
              </div>
              <div class="text-center md:text-right">
                <p class="font-label-sm text-on-surface-variant uppercase">LAST BACKUP</p>
                <p class="text-on-surface font-mono">${new Date().toISOString().slice(0,10)} // ONLINE</p>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
              <!-- Quick Stat Cards -->
              <div class="p-4 bg-surface-container/60 backdrop-blur-md border-l-4 border-primary/40 hover:border-primary transition-all group cursor-default">
                <p class="font-label-sm text-on-surface-variant mb-2">STREAK</p>
                <p class="font-headline-md text-on-surface group-hover:text-primary transition-colors">🔥 ${streak} DAYS</p>
              </div>
              <div class="p-4 bg-surface-container/60 backdrop-blur-md border-l-4 border-primary/40 hover:border-primary transition-all group cursor-default">
                <p class="font-label-sm text-on-surface-variant mb-2">RANK</p>
                <p class="font-headline-md text-on-surface group-hover:text-primary transition-colors text-lg md:text-xl xl:text-2xl">${rankInfo.title}</p>
              </div>
              <div class="p-4 bg-surface-container/60 backdrop-blur-md border-l-4 border-primary/40 hover:border-primary transition-all group cursor-default">
                <p class="font-label-sm text-on-surface-variant mb-2">SYSTEM LOAD</p>
                <p class="font-headline-md text-on-surface group-hover:text-primary transition-colors">${loadPct}%</p>
              </div>
            </div>
          </div>
        </section>
        
        <!-- Weekly Quotas Bento -->
        <section>
          <div class="flex items-center gap-4 mb-8">
            <h2 class="font-headline-lg-mobile md:font-headline-lg text-on-surface uppercase tracking-tighter">WEEKLY QUOTAS</h2>
            <div class="h-[1px] flex-grow bg-surface-container-highest"></div>
            <span class="text-on-surface-variant font-mono text-xs">7-DAY ROLLING</span>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            ${macros.slice(0, 4).map((m, index) => {
              const isPrimary = index % 2 === 0;
              const borderClass = isPrimary ? 'border-primary' : 'border-surface-container-highest';
              const textClass = isPrimary ? 'text-primary' : 'text-on-surface-variant';
              const shadowClass = isPrimary ? 'shadow-sm' : 'shadow-none border border-surface-container-highest';
              
              const completedCount = weeklyCompletedQuests.filter(q => q.targetSkills && q.targetSkills.some(ts => ts.macroSkillId === m.id)).length;
              const rawPct = (completedCount / quotaTarget) * 100;
              const pct = Math.min(100, rawPct);
              
              const dashOffset = 125.6 - (125.6 * (pct / 100));
              const iconName = getIcon(m.name);
              
              let barsHTML = '';
              for (let i = 0; i < quotaTarget; i++) {
                if (i < completedCount) barsHTML += `<div class="h-1 w-full bg-${isPrimary ? 'primary' : 'surface-container-highest'}"></div>`;
                else barsHTML += `<div class="h-1 w-full bg-white/5"></div>`;
              }
              
              return `
                <div class="bg-surface-container/50 backdrop-blur-xl p-6 border-l-4 ${borderClass} relative group cursor-pointer overflow-hidden ${shadowClass}" onclick="LM.router.navigate('skill-detail?id=${m.id}')">
                  <div class="absolute -right-4 -top-4 opacity-10 group-hover:opacity-30 transition-opacity">
                    <span class="material-symbols-outlined text-8xl ${textClass}">${iconName}</span>
                  </div>
                  <div class="flex justify-between items-start mb-8">
                    <span class="material-symbols-outlined ${textClass} text-3xl">${iconName}</span>
                    <div class="w-12 h-12 flex items-center justify-center relative">
                      <svg class="w-full h-full -rotate-90">
                        <circle class="text-white/5" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" stroke-width="3"></circle>
                        <circle class="${textClass} drop-shadow-sm" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" stroke-dasharray="125.6" stroke-dashoffset="${dashOffset}" stroke-width="3"></circle>
                      </svg>
                      <span class="absolute text-[10px] font-bold ${textClass}">${Math.round(pct)}%</span>
                    </div>
                  </div>
                  <h3 class="font-headline-md text-on-surface mb-1">${m.name.toUpperCase()}</h3>
                  <p class="font-label-sm text-on-surface-variant">${completedCount}/${quotaTarget} TARGETS MET</p>
                  <div class="mt-4 flex space-x-1">
                    ${barsHTML}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>
        
        <!-- Recent History / Action Buttons -->
        <section class="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-surface-container/40 backdrop-blur-xl p-8 border-l-4 border-primary shadow-lg">
            <h3 class="font-headline-md text-primary mb-6 flex items-center gap-2">
              <span class="material-symbols-outlined">history</span> RECENT ACTIVITY
            </h3>
            <ul class="space-y-4">
              ${recentActivity.length > 0 ? recentActivity.map(l => {
                const m = macros.find(x => x.id === l.macroId);
                const skillName = m ? m.name : 'Unknown';
                const sign = l.delta >= 0 ? '+' : '';
                return `
                  <li class="flex justify-between items-center py-2 border-b border-primary/10 hover:bg-primary/5 transition-all px-2 cursor-default">
                    <div>
                      <p class="text-on-surface font-bold text-sm truncate max-w-[200px]">${l.reason || 'Data Registered'}</p>
                      <p class="text-[10px] text-primary font-mono uppercase">${skillName} ${sign}${l.delta}</p>
                    </div>
                    <span class="text-[10px] font-mono text-on-surface-variant">${getTimeAgo(l.timestamp)}</span>
                  </li>
                `;
              }).join('') : `<li class="text-on-surface-variant font-mono text-xs py-4 text-center">NO RECENT ACTIVITY DETECTED.</li>`}
            </ul>
          </div>
          
          <div class="flex flex-col gap-4">
            <button class="h-full group relative flex items-center justify-between px-8 py-6 border border-primary/30 bg-primary/10 text-primary font-headline-md tracking-tighter uppercase transition-all overflow-hidden active:scale-95 shadow-sm hover:bg-primary hover:text-black" onclick="LM.router.navigate('settings')">
              <span class="relative z-10">SYSTEM SETTINGS</span>
              <span class="material-symbols-outlined text-4xl relative z-10">settings</span>
            </button>
            <button class="h-full group relative flex items-center justify-between px-8 py-6 border border-surface-container-highest text-on-surface font-headline-md tracking-tighter uppercase transition-all overflow-hidden active:scale-95 shadow-sm" onclick="LM.router.navigate('quests')">
              <span class="relative z-10">ACQUIRE NEW OBJECTIVES</span>
              <span class="material-symbols-outlined text-4xl relative z-10">terminal</span>
              <div class="absolute inset-0 bg-surface-container-highest/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
            </button>
          </div>
        </section>
        
      </div>
    `;
  }

  function init() {
    // Nav items clicked instantly trigger route switches via hashchange
  }

  return { render, init };
})();