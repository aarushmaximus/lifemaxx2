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
          <div class="lg:col-span-4 flex flex-col items-center lg:items-start p-8 bg-surface-container border border-surface-container-highest relative overflow-hidden">
            <div class="relative w-32 h-32 mb-6 group">
              <div class="absolute inset-0 border border-surface-container-highest opacity-50 rounded-full"></div>
              <div class="w-full h-full rounded-full chrome-metallic flex items-center justify-center font-display text-5xl text-black shadow-lg">
                ${settings.username ? settings.username.charAt(0).toUpperCase() : 'O'}
              </div>
            </div>
            <div class="text-center lg:text-left">
              <h2 class="font-display text-primary mb-2 text-3xl tracking-widest uppercase">${settings.username || 'User'}</h2>
              <div class="flex flex-wrap gap-2 justify-center lg:justify-start">
                <span class="text-on-surface font-mono text-sm px-3 py-1 uppercase tracking-widest border border-surface-container-highest">Level ${overall.currentLevel || 0}</span>
              </div>
            </div>
          </div>
          
          <!-- Sync Status & Meta -->
          <div class="lg:col-span-8 flex flex-col justify-between gap-6">
            <div class="p-6 bg-surface-container border border-surface-container-highest flex flex-col md:flex-row justify-between items-center">
              <div class="flex items-center gap-4 mb-4 md:mb-0">
                <span class="material-symbols-outlined text-primary text-4xl" style="font-variation-settings: 'FILL' 1;">cloud_sync</span>
                <div>
                  <p class="font-label-sm text-on-surface-variant uppercase tracking-widest">SYNC STATUS</p>
                  <h3 class="font-display text-primary text-xl tracking-widest uppercase">CONNECTED</h3>
                </div>
              </div>
              <div class="text-center md:text-right">
                <p class="font-label-sm text-on-surface-variant uppercase tracking-widest">LAST BACKUP</p>
                <p class="text-on-surface font-mono text-sm tracking-widest">${new Date().toISOString().slice(0,10)} // ONLINE</p>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
              <!-- Quick Stat Cards -->
              <div class="p-4 bg-surface-container border border-surface-container-highest transition-all group cursor-default">
                <p class="font-label-sm text-on-surface-variant mb-2 tracking-widest uppercase">STREAK</p>
                <p class="font-display text-on-surface group-hover:text-primary transition-colors text-xl tracking-widest">🔥 ${streak} DAYS</p>
              </div>
              <div class="p-4 bg-surface-container border border-surface-container-highest transition-all group cursor-default">
                <p class="font-label-sm text-on-surface-variant mb-2 tracking-widest uppercase">RANK</p>
                <p class="font-display text-on-surface group-hover:text-primary transition-colors text-lg md:text-xl xl:text-2xl tracking-widest">${rankInfo.title}</p>
              </div>
              <div class="p-4 bg-surface-container border border-surface-container-highest transition-all group cursor-default">
                <p class="font-label-sm text-on-surface-variant mb-2 tracking-widest uppercase">SYSTEM LOAD</p>
                <p class="font-display text-on-surface group-hover:text-primary transition-colors text-xl tracking-widest">${loadPct}%</p>
              </div>
            </div>
          </div>
        </section>
        
        <!-- Weekly Quotas Bento -->
        <section>
          <div class="flex items-center gap-4 mb-8">
            <h2 class="font-display text-on-surface uppercase tracking-widest text-2xl">WEEKLY QUOTAS</h2>
            <div class="h-[1px] flex-grow bg-surface-container-highest"></div>
            <span class="text-on-surface-variant font-mono text-xs tracking-widest">7-DAY ROLLING</span>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            ${macros.slice(0, 4).map((m, index) => {
              const isPrimary = index % 2 === 0;
              const borderClass = isPrimary ? 'border-primary' : 'border-surface-container-highest';
              const textClass = isPrimary ? 'text-primary' : 'text-on-surface-variant';
              
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
                <div class="bg-surface-container p-6 border ${borderClass} relative group cursor-pointer overflow-hidden" onclick="LM.router.navigate('skill-detail?id=${m.id}')">
                  <div class="absolute -right-4 -top-4 opacity-10 group-hover:opacity-30 transition-opacity">
                    <span class="material-symbols-outlined text-8xl ${textClass}">${iconName}</span>
                  </div>
                  <div class="flex justify-between items-start mb-8">
                    <span class="material-symbols-outlined ${textClass} text-3xl">${iconName}</span>
                    <div class="w-12 h-12 flex items-center justify-center relative">
                      <svg class="w-full h-full -rotate-90" viewBox="0 0 48 48">
                        <circle class="text-white/5" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" stroke-width="3"></circle>
                        <circle class="${textClass} drop-shadow-sm" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" stroke-dasharray="125.6" stroke-dashoffset="${dashOffset}" stroke-width="3"></circle>
                      </svg>
                      <span class="absolute text-[10px] font-bold ${textClass}">${Math.round(pct)}%</span>
                    </div>
                  </div>
                  <h3 class="font-display text-on-surface mb-1 text-xl tracking-widest uppercase">${m.name}</h3>
                  <p class="font-label-sm text-on-surface-variant tracking-widest">${completedCount}/${quotaTarget} TARGETS MET</p>
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
          <div class="bg-surface-container p-8 border border-surface-container-highest shadow-lg">
            <h3 class="font-headline-md text-primary mb-6 flex items-center gap-2 tracking-widest uppercase">
              <span class="material-symbols-outlined">history</span> RECENT ACTIVITY
            </h3>
            <ul class="space-y-4">
              ${recentActivity.length > 0 ? recentActivity.map(l => {
                const m = macros.find(x => x.id === l.macroId);
                const skillName = m ? m.name : 'Unknown';
                const sign = l.delta >= 0 ? '+' : '';
                const safeReason = (l.reason || 'Data Registered').replace(/"/g, '&quot;').replace(/'/g, "\\'").replace(/(\r\n|\n|\r)/gm, " ");
                return `
                  <li class="flex justify-between items-center py-2 border-b border-surface-container-highest hover:bg-surface-container-highest transition-all px-2 cursor-pointer" onclick="LM.views.me.showActivityBubble('${safeReason}')">
                    <div>
                      <p class="text-on-surface font-bold text-sm truncate max-w-[200px] tracking-wider uppercase">${l.reason || 'Data Registered'}</p>
                      <p class="text-[10px] text-primary font-mono tracking-widest uppercase">${skillName} ${sign}${l.delta}</p>
                    </div>
                    <span class="text-[10px] font-mono text-on-surface-variant tracking-widest">${getTimeAgo(l.timestamp)}</span>
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

  function showActivityBubble(text) {
    const existing = document.getElementById('activity-bubble');
    if (existing) existing.remove();
    const bubble = document.createElement('div');
    bubble.id = 'activity-bubble';
    bubble.style.position = 'fixed';
    bubble.style.top = '50%';
    bubble.style.left = '50%';
    bubble.style.transform = 'translate(-50%, -50%) scale(0.9)';
    bubble.style.background = 'var(--bg-surface)';
    bubble.style.border = '1px solid var(--border)';
    bubble.style.padding = '24px';
    bubble.style.borderRadius = '12px';
    bubble.style.zIndex = '9999';
    bubble.style.maxWidth = '80vw';
    bubble.style.width = '320px';
    bubble.style.color = 'var(--text-1)';
    bubble.style.boxShadow = '0 10px 40px rgba(0,0,0,0.8), 0 0 0 100vmax rgba(0,0,0,0.5)';
    bubble.style.opacity = '0';
    bubble.style.transition = 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
    
    bubble.innerHTML = `
      <h3 style="font-family: var(--font-display); color: var(--accent); margin-bottom: 12px; font-size: 0.85rem; letter-spacing: 0.1em;">ACTIVITY DETAIL</h3>
      <p style="font-size: 0.85rem; line-height: 1.5; color: var(--text-2); margin-bottom: 20px;">${text}</p>
      <button onclick="this.parentElement.remove()" style="padding: 8px 12px; background: var(--bg-raised); border: 1px solid var(--border); color: var(--text-1); border-radius: 8px; cursor: pointer; width: 100%; font-family: var(--font-display); letter-spacing: 0.1em; transition: all 0.2s;">DISMISS</button>
    `;
    
    document.body.appendChild(bubble);
    // Animate in
    requestAnimationFrame(() => {
      bubble.style.opacity = '1';
      bubble.style.transform = 'translate(-50%, -50%) scale(1)';
    });
  }

  function init() {
    // Nav items clicked instantly trigger route switches via hashchange
  }

  return { render, init, showActivityBubble };
})();