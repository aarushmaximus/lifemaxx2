import re

with open('js/views/quest-log.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_content = """window.LM.views.questLog = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;

  let filters = { skill: 'all', status: 'all' }; 

  const isWithinTimeWindow = F.isWithinTimeWindow;

  function render() {
    const macros = S.getMacros();
    const quests = getFilteredQuests();

    return `
      <!-- Ambient Vaporwave Grid & Scanlines -->
      <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div class="scanline-overlay absolute inset-0 opacity-40"></div>
        <div class="absolute bottom-[-150px] left-[-20%] right-[-20%] h-[500px] wireframe-floor opacity-50"></div>
        <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-[#0d0d1a]/20 to-[#0d0d1a]"></div>
      </div>
      
      <div class="relative z-10 pt-28 pb-32 px-6 md:px-12 max-w-7xl mx-auto">
        <!-- Header Section -->
        <section class="mb-12 relative pt-8 pb-4">
          <div class="absolute -top-10 -left-10 w-64 h-64 bg-secondary/20 rounded-full blur-[100px]"></div>
          <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg uppercase tracking-tighter mb-2 text-on-surface neon-text-pink">Quest Log</h2>
          <div class="h-1.5 w-32 bg-gradient-to-r from-primary to-secondary mb-8 shadow-[0_0_15px_rgba(0,229,255,0.8)]"></div>
          
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <!-- Tabs -->
            <div class="flex gap-2 bg-surface-container/40 p-1 border border-primary/20 backdrop-blur-xl">
              ${['all', 'active', 'completed', 'missed', 'deleted'].map(s => `
                <button class="px-6 py-2 font-label-sm transition-all ${filters.status === s ? 'bg-primary text-on-primary shadow-[0_0_10px_rgba(0,229,255,0.5)]' : 'text-on-surface-variant hover:text-primary'}" onclick="LM.views.questLog.setStatusFilter('${s}')">
                  ${s.toUpperCase()}
                </button>
              `).join('')}
            </div>
            
            <!-- Skill Filter -->
            <div class="flex items-center gap-4">
              <label class="font-label-sm text-primary uppercase tracking-widest">Filter Skill:</label>
              <div class="relative group">
                <select class="bg-surface/50 border-b-2 border-primary text-primary py-2 pl-4 pr-10 font-body-md appearance-none focus:outline-none focus:shadow-[0_5px_20px_-5px_rgba(0,229,255,0.6)] transition-all" onchange="LM.views.questLog.setSkillFilter(this.value)">
                  <option value="all">ALL SKILLS</option>
                  ${macros.map(m => `<option value="${m.id}" ${filters.skill === m.id ? 'selected' : ''}>${m.name.toUpperCase()}</option>`).join('')}
                </select>
                <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-primary">expand_more</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Quest Cards Grid (Bento Style Layout) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6" id="quest-log-list">
          ${renderList(quests, macros)}
        </div>
      </div>

      <!-- Floating Action Button for New Quest -->
      <button class="fixed bottom-28 right-6 md:right-12 w-14 h-14 bg-primary text-on-primary rounded-full shadow-[0_0_20px_rgba(0,229,255,0.6)] flex items-center justify-center hover:scale-110 transition-transform z-50 neon-border-cyan" onclick="LM.components.questModal.open(null, false)">
        <span class="material-symbols-outlined text-3xl">add</span>
      </button>
    `;
  }

  function getFilteredQuests() {
    return S.getQuests().filter(q => {
      const tSkills = q.targetSkills || [];
      if (filters.skill !== 'all' && !tSkills.some(t => t.macroSkillId === filters.skill)) return false;
      if (filters.status !== 'all' && q.status !== filters.status) return false;
      return true;
    });
  }

  function renderList(quests, macros) {
    if (!quests.length) return `<div class="col-span-full p-8 text-center text-on-surface-variant font-mono uppercase tracking-widest bg-surface-container/30 border border-primary/20 backdrop-blur-md">No objectives found matching filters.</div>`;

    return quests.map((q, index) => {
      const tSkills = q.targetSkills || [];
      const isMissed = q.status === 'missed';
      const isCompleted = q.status === 'completed';
      const isDeleted = q.status === 'deleted';
      const withinWindow = isWithinTimeWindow(q.timeWindow);
      const isLocked = q.status === 'active' && !withinWindow;

      const primarySkill = (tSkills.length > 0) ? macros.find(m => m.id === tSkills[0].macroSkillId) : null;
      const color = primarySkill ? primarySkill.accentColor : '#00e5ff';
      const isSecondary = index % 2 !== 0; // Alternating styles
      const glowColor = isSecondary ? 'rgba(255,45,120,0.4)' : 'rgba(0,229,255,0.4)';
      const borderColor = isSecondary ? 'border-secondary' : 'border-primary';
      const textColor = isSecondary ? 'text-secondary neon-text-pink' : 'text-primary neon-text-cyan';

      // Determine span
      const span = (index % 4 === 0 || index % 4 === 3) ? 'lg:col-span-8' : 'lg:col-span-4';

      let statusBadge = '';
      if (isMissed) statusBadge = 'MISSED NODE';
      else if (isCompleted) statusBadge = 'COMPLETED NODE';
      else if (isDeleted) statusBadge = 'DELETED NODE';
      else if (isLocked) statusBadge = 'LOCKED NODE';
      else statusBadge = 'ACTIVE NODE';

      let subtasksHTML = '';
      if (q.subtasks && q.subtasks.length > 0) {
        subtasksHTML = `
          <div class="space-y-2 mt-4 mb-4">
            ${q.subtasks.map(st => `
              <div class="flex items-center gap-3 bg-white/5 p-2 px-3 border border-white/5 ${st.completed ? 'opacity-50' : ''}">
                <div class="w-3 h-3 border ${st.completed ? 'bg-primary border-primary' : 'border-on-surface-variant'}"></div>
                <span class="font-body-md text-sm ${st.completed ? 'text-on-surface-variant line-through' : 'text-on-surface'}">${st.title}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      if (isLocked || isMissed || isDeleted) {
        return `
          <article class="${span} bg-surface-container/30 border-l-4 border-on-surface-variant/20 p-6 grayscale transition-all opacity-50 hover:opacity-100 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">${statusBadge}</span>
                <span class="material-symbols-outlined text-on-surface-variant">${isLocked ? 'lock' : 'cancel'}</span>
              </div>
              <h3 class="font-headline-md text-headline-md uppercase tracking-tight text-on-surface-variant mb-3 ${isMissed ? 'line-through' : ''}">${q.name}</h3>
              ${q.description ? `<p class="text-body-md text-on-surface-variant/70 mb-4 line-clamp-2">${q.description}</p>` : ''}
            </div>
            <div class="flex justify-between items-end mt-4">
               <span class="text-label-sm font-bold text-on-surface-variant uppercase italic tracking-widest">
                 ${isLocked && q.timeWindow ? `Available ${q.timeWindow.start} - ${q.timeWindow.end}` : ''}
               </span>
               <button class="material-symbols-outlined text-danger text-lg hover:text-white" onclick="LM.views.questLog.deleteQuest('${q.id}')">delete</button>
            </div>
          </article>
        `;
      }

      return `
        <article class="${span} group bg-surface-container/60 border-l-4 ${borderColor} p-6 md:p-8 backdrop-blur-xl transition-all hover:bg-surface-container-high/80 relative overflow-hidden shadow-[0_0_15px_${glowColor}]">
          <div class="flex flex-col md:flex-row justify-between items-start mb-6 gap-4 relative z-10">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <span class="bg-white/10 text-white text-[10px] font-bold px-2 py-0.5 border border-white/20 uppercase tracking-widest">${statusBadge}</span>
                <span class="${textColor} text-[10px] font-bold uppercase tracking-widest">${primarySkill ? primarySkill.name : 'GENERAL'}</span>
              </div>
              <h3 class="font-headline-md text-headline-md uppercase tracking-tight text-white ${textColor.includes('cyan') ? 'neon-text-cyan' : 'neon-text-pink'}">${q.name}</h3>
            </div>
            <div class="text-right flex flex-col items-end gap-2">
              <button class="material-symbols-outlined text-on-surface-variant text-lg hover:text-danger z-20" onclick="LM.views.questLog.deleteQuest('${q.id}')">delete</button>
            </div>
          </div>
          
          ${q.description ? `<p class="text-body-md text-on-surface-variant mb-4 max-w-2xl relative z-10">${q.description}</p>` : ''}
          
          <div class="relative z-10">
             ${subtasksHTML}
          </div>

          <!-- Action Bar -->
          <div class="flex flex-wrap gap-4 items-center mt-auto relative z-10 pt-4">
            ${isCompleted ? `
               <span class="text-success font-bold text-label-sm uppercase tracking-widest border border-success/30 px-6 py-2 bg-success/10">Completed</span>
            ` : `
               <button class="bg-primary text-on-primary font-bold px-8 py-3 text-label-sm uppercase tracking-widest shadow-[0_0_20px_rgba(0,229,255,0.6)] glitch-hover active:scale-95 transition-all" onclick="LM.views.questLog.completeQuest('${q.id}')">COMPLETE</button>
               <button class="border border-primary/50 text-primary font-bold px-6 py-3 text-label-sm uppercase tracking-widest hover:bg-primary/10 active:scale-95 transition-all" onclick="LM.components.questModal.open('${q.id}', false)">EDIT</button>
            `}
          </div>
        </article>
      `;
    }).join('');
  }

  function setSkillFilter(val) {
    filters.skill = val;
    refresh();
  }

  function setStatusFilter(val) {
    filters.status = val;
    refresh();
  }

  function refresh() {
    const list = document.getElementById('quest-log-list');
    if (list) {
      list.innerHTML = renderList(getFilteredQuests(), S.getMacros());
    } else {
      LM.router.render();
    }
  }

  function completeQuest(questId) {
    const quest = S.getQuest(questId);
    if (!quest) return;
    
    if (quest.progressIndicator) {
      const pct = Math.round(quest.progressIndicator.value || 0);
      if (pct < 100) {
        const totalXP = (quest.targetSkills || []).reduce((sum, t) => sum + t.xpAmount, 0);
        const earnedXP = Math.round(totalXP * pct / 100);
        const ok = confirm(
          `⚠️ Partial Progress Warning\\n\\n` +
          `"${quest.name}" is only ${pct}% complete.\\n\\n` +
          `You will receive ${earnedXP} XP instead of ${totalXP} XP (${pct}% of the full reward).\\n\\n` +
          `Complete anyway?`
        );
        if (!ok) return;
      }
    }

    const s = S.getSettings();
    if (s.dragToRegister !== false) {
      S.markQuestReady(questId);
      LM.router.render();
    } else {
      window.LM.components.wheel.handleDrop(questId);
      LM.router.render();
    }
  }

  function deleteQuest(questId) {
    const quest = S.getQuest(questId);
    if (!quest) return;
    
    const isDestructive = quest.status === 'completed' || quest.status === 'deleted' || quest.status === 'missed';
    const msg = isDestructive 
      ? 'Delete this quest permanently from history?' 
      : 'Delete this active quest? (It will be preserved in your deleted history log)';
      
    if (confirm(msg)) {
      S.deleteQuest(questId, isDestructive);
      refresh();
    }
  }

  function init() { }

  return { render, init, setSkillFilter, setStatusFilter, completeQuest, deleteQuest };
})();"""

with open('js/views/quest-log.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updated quest-log.js")
