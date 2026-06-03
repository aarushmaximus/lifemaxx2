import re

with open('js/views/dashboard.js', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to replace the `renderQuestCards` and `render` functions
new_render_quests = """
  function renderQuestCards(macros, limit = null, upcoming = false) {
    const allQuests = S.getQuests();
    const quests = allQuests.filter(q => {
      const tSkills = q.targetSkills || [];
      if (q.hiddenFromDashboard) return false;
      if (q.status === 'completed' && !q.isReadyToClaim) return false;
      
      const isLocked = q.status === 'active' && !isWithinTimeWindow(q.timeWindow);

      if (upcoming) {
        return isLocked || q.status === 'missed';
      } else {
        if (isLocked || q.status === 'missed') return false;
        if (activeStatusFilter === 'active' && q.status !== 'active') return false;
        if (activeSkillFilter !== 'all' && !tSkills.some(t=>t.macroSkillId===activeSkillFilter)) return false;
        return true;
      }
    });

    const displayQuests = limit ? quests.slice(0, limit) : quests;

    if (!displayQuests.length) {
      return `<div class="p-4 text-center text-on-surface-variant font-mono text-sm uppercase tracking-widest col-span-full border border-white/5 bg-surface-container-low/20">
        ${upcoming ? 'NO UPCOMING OBJECTIVES' : 'NO ACTIVE OBJECTIVES DETECTED'}
      </div>`;
    }

    return displayQuests.map(q => {
      const isMissed = q.status === 'missed';
      const isLocked = q.status === 'active' && !isWithinTimeWindow(q.timeWindow);
      
      const primarySkill = (q.targetSkills && q.targetSkills.length > 0) ? macros.find(m => m.id === q.targetSkills[0].macroSkillId) : null;
      const color = primarySkill ? primarySkill.accentColor : '#00e5ff';
      const rgbMatch = color.match(/\d+,\s*\d+,\s*\d+/) || ['0, 229, 255'];
      const rgb = rgbMatch[0]; // Not perfect but good enough for neon-border if it were rgba
      
      // We will use standard tailwind primary/secondary for now to match Stitch, or inject color directly
      const borderClass = primarySkill ? '' : 'border-primary/20 border-l-primary';
      const borderStyle = primarySkill ? `border-color: ${color}33; border-left-color: ${color}; box-shadow: 0 0 10px ${color}44, inset 0 0 5px ${color}33;` : '';
      const textStyle = primarySkill ? `color: ${color}; text-shadow: 0 0 8px ${color};` : '';

      const energyCost = q.energyCost || 'Medium';
      const icon = energyCost === 'High' ? 'electric_bolt' : energyCost === 'Medium' ? 'water_drop' : 'self_improvement';

      if (isLocked || isMissed) {
        return `
          <div class="p-4 bg-surface-container-low/20 border border-white/5 border-l-4 border-l-on-surface-variant/20 flex items-start gap-4 opacity-40 grayscale group">
            <div class="material-symbols-outlined text-on-surface-variant text-2xl">${isMissed ? 'cancel' : 'lock'}</div>
            <div class="flex-1">
              <p class="font-bold text-on-surface/50 tracking-wide ${isMissed ? 'line-through' : ''}">${q.name}</p>
              <p class="text-[10px] text-on-surface-variant uppercase tracking-widest">${isMissed ? 'STATUS: MISSED' : 'STATUS: LOCKED'}</p>
            </div>
            ${isMissed ? `<span class="material-symbols-outlined text-danger text-sm cursor-pointer hover:text-white" onclick="LM.views.dashboard.deleteQuest('${q.id}')">delete</span>` : ''}
          </div>
        `;
      }

      // Progress bar if quest progress exists
      let progressHTML = '';
      if (window.LM.questProgress && q.subtasks && q.subtasks.length > 0) {
        const completedCount = q.subtasks.filter(st => st.completed).length;
        const pct = Math.round((completedCount / q.subtasks.length) * 100);
        progressHTML = `
          <p class="text-[10px] text-on-surface-variant mb-2 uppercase tracking-widest">Progress: ${completedCount} / ${q.subtasks.length}</p>
          <div class="h-1 w-full bg-white/5 overflow-hidden">
            <div class="h-full shadow-[0_0_8px_currentColor]" style="width: ${pct}%; background-color: ${color}; color: ${color};"></div>
          </div>
        `;
      } else {
        progressHTML = `
          <p class="text-[10px] text-on-surface-variant mb-2 uppercase tracking-widest">Status: Ready</p>
          <div class="h-1 w-full bg-white/5 overflow-hidden">
            <div class="h-full shadow-[0_0_8px_currentColor]" style="width: 100%; background-color: ${color}; color: ${color}; opacity: 0.5;"></div>
          </div>
        `;
      }

      return `
        <div class="p-4 bg-surface-container/40 backdrop-blur-sm border-l-4 flex items-start gap-4 group hover:bg-surface-container/80 transition-all cursor-pointer ${borderClass}" style="${borderStyle}" onclick="LM.views.dashboard.completeQuest('${q.id}')">
          <div class="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform" style="${textStyle}">${icon}</div>
          <div class="flex-1">
            <p class="font-bold text-white tracking-wide">${q.name}</p>
            ${progressHTML}
          </div>
          <span class="material-symbols-outlined text-on-surface-variant text-sm group-hover:text-white">chevron_right</span>
        </div>
      `;
    }).join('');
  }
"""

new_render = """
  function render() {
    const macros = S.getMacros();
    const settings = S.getSettings();
    const wheelSkillId = settings.wheelSkillId || 'overall';
    let barData = getBarData(wheelSkillId, macros);

    const xpLog = S.getXPLog();
    const streak = getDailyStreak(S.getQuests(), xpLog);
    const overall = S.getOverall();
    const rankInfo = getPlayerRank(overall.currentLevel || 0);

    const activeQuests = S.getQuests().filter(q => q.status === 'active' && isWithinTimeWindow(q.timeWindow));
    const nextSession = activeQuests[0];

    const activeEffects = S.getActiveStatusEffects ? S.getActiveStatusEffects() : [];

    return `
      <!-- Vaporwave Sun Background Element -->
      <div class="absolute top-0 right-0 -z-10 w-[500px] h-[500px] opacity-40 pointer-events-none">
        <div class="w-full h-full rounded-full bg-gradient-to-t from-transparent via-[#ff2d78] to-[#ff2d78] overflow-hidden">
          <div class="h-1 w-full bg-[#0d0d1a] mt-1"></div>
          <div class="h-2 w-full bg-[#0d0d1a] mt-2"></div>
          <div class="h-4 w-full bg-[#0d0d1a] mt-4"></div>
          <div class="h-8 w-full bg-[#0d0d1a] mt-6"></div>
          <div class="h-12 w-full bg-[#0d0d1a] mt-8"></div>
          <div class="h-20 w-full bg-[#0d0d1a] mt-10"></div>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-6 relative z-10 pt-24 pb-32 px-6 md:px-12 max-w-7xl mx-auto">
        <!-- Left Column: Operator Status -->
        <div class="col-span-12 lg:col-span-4 space-y-6">
          
          <!-- Operator Status Card -->
          <div class="bg-surface-container/60 backdrop-blur-md border border-primary/30 border-l-[6px] border-l-primary p-6 relative overflow-hidden group neon-border-cyan" id="operator-status">
            <div class="scanline"></div>
            <p class="font-label-sm text-label-sm text-primary mb-1 tracking-[0.2em] uppercase">OPERATOR_ID: ${settings.username || 'V-02'}</p>
            <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg leading-none mb-2 text-white uppercase">${rankInfo.title}</h2>
            <div class="flex items-end justify-between mb-4">
              <span class="text-on-surface-variant font-mono text-xs uppercase">CLASS: ${rankInfo.nextTitle}</span>
              <span class="text-primary font-mono text-lg neon-text-cyan">LVL ${overall.currentLevel || 0}</span>
            </div>
            <!-- Progression Bar -->
            <div class="h-1.5 w-full bg-white/5 relative">
              <div class="h-full bg-primary shadow-[0_0_15px_#00e5ff]" id="dash-xp-fill" style="width: ${barData.pct}%;"></div>
              <div class="absolute -top-1 right-[5%] w-2 h-4 bg-primary animate-pulse"></div>
            </div>
            <p class="text-[10px] text-on-surface-variant mt-2 text-right uppercase tracking-widest" id="dash-xp-label">${F.formatXP(barData.into)} / ${F.formatXP(barData.req)} XP — Phase: ${Math.round(barData.pct)}%</p>
          </div>
          
          <!-- Streak & Buff -->
          <div class="bg-surface-container/60 backdrop-blur-md border border-secondary/30 border-l-[6px] border-l-secondary p-6 neon-border-pink">
            <div class="flex items-center justify-between mb-4">
              <span class="material-symbols-outlined text-secondary text-4xl neon-text-pink">electric_bolt</span>
              <span class="bg-secondary text-white px-2 py-1 font-bold text-xs uppercase tracking-tighter shadow-[0_0_10px_rgba(255,45,120,0.5)]">Multi: 1.0X</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="font-display-xl text-display-xl text-secondary neon-text-pink">${streak}</span>
              <span class="font-headline-md text-on-surface-variant">DAY STREAK</span>
            </div>
            <p class="text-body-md text-on-surface-variant mt-2 font-body-md">Active Buffs: <span class="text-primary">${activeEffects.length > 0 ? activeEffects.map(e => e.name).join(', ') : 'None'}</span></p>
          </div>

          <!-- Macro Pills -->
          <div class="flex flex-wrap gap-2">
            ${macros.slice(0, 5).map(m => `
              <div class="px-4 py-2 border bg-white/5 font-bold text-xs uppercase tracking-[0.15em] flex items-center gap-2 group cursor-pointer hover:bg-white/10 transition-all" style="border-color:${m.accentColor}66; color:${m.accentColor}" onclick="LM.router.navigate('skill-detail?id=${m.id}')">
                <span class="w-1.5 h-1.5" style="background:${m.accentColor}; box-shadow:0 0 5px ${m.accentColor}"></span>
                ${m.name}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Right Column: Banner & Quests -->
        <div class="col-span-12 lg:col-span-8 space-y-6">
          <!-- Next Session Banner -->
          <div class="relative min-h-[280px] flex flex-col justify-end bg-surface-container-high overflow-hidden border border-primary/20 p-8 group">
            <div class="scanline"></div>
            <img class="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-color-dodge transition-transform duration-700 group-hover:scale-105" src="aero-bg-mobile.jpg" />
            <div class="absolute inset-0 bg-gradient-to-t from-[#0d0d1a] via-[#0d0d1a]/40 to-transparent"></div>
            <div class="relative z-10">
              <div class="flex items-center gap-3 mb-2">
                <span class="px-2 py-0.5 bg-primary text-black font-bold text-[10px] tracking-widest neon-border-cyan uppercase">Phase // Active</span>
                <span class="text-primary font-mono text-xs uppercase tracking-widest">${nextSession ? nextSession.energyCost || 'Medium' : ''} Energy Protocol</span>
              </div>
              <h3 class="font-display-xl text-headline-lg-mobile md:text-headline-lg text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                ${nextSession ? nextSession.name.toUpperCase() : 'NO SESSIONS ACTIVE'}
              </h3>
              <p class="text-on-surface-variant mb-6 text-sm uppercase tracking-widest max-w-lg">
                ${nextSession ? (nextSession.description || 'Lock in and execute this objective to claim your XP.') : 'Spawn daily quests from presets or ask Fletcher to build your agenda.'}
              </p>
              ${nextSession ? `
                <div class="flex gap-4 mt-6">
                  <button class="bg-primary text-black px-8 py-3 font-bold uppercase tracking-[0.2em] glitch-hover shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:bg-white transition-colors" onclick="LM.views.dashboard.completeQuest('${nextSession.id}')">INITIALIZE</button>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Objectives Grid -->
          <div id="quest-list">
            <div class="flex items-center justify-between mb-4 px-2">
              <h4 class="font-headline-md text-primary neon-text-cyan tracking-wider uppercase text-lg">Active Objectives</h4>
              <span class="text-secondary font-mono text-xs tracking-widest">SLOTS: ${activeQuests.length} ACTIVE</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="quest-grid">
              ${renderQuestCards(macros, null, false)}
            </div>
            
            <div class="flex items-center justify-between mt-8 mb-4 px-2">
              <h4 class="font-headline-md text-on-surface-variant tracking-wider uppercase text-sm">Upcoming / Locked</h4>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="upcoming-quest-grid">
              ${renderQuestCards(macros, null, true)}
            </div>
          </div>
        </div>
      </div>
    `;
  }
"""

start_render_quests = content.find('  function renderQuestCards(')
end_render_quests = content.find('  function render() {')
start_render = content.find('  function render() {')
end_render = content.find('  function init() {')

new_content = content[:start_render_quests] + new_render_quests + "\n" + new_render + "\n" + content[end_render:]

with open('js/views/dashboard.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Dashboard rewrite complete.")
