// LIFEMAXX — Quest Log View
window.LM.views.questLog = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;

  let activeTab = 'log'; // 'log' or 'timeline'
  let filters = { skill: 'all', status: 'active' }; // status: 'active', 'completed', 'missed', 'deleted', 'all'
  let expanded = new Set();

  const isWithinTimeWindow = F.isWithinTimeWindow;

  function render() {
    const macros = S.getMacros();
    const quests = getFilteredQuests(macros);
    const xpLog = S.getXPLog('all'); // get all logs

    return `
      <div class="view-container quest-log-view">
        <div class="view-header" style="margin-bottom: 24px;">
          <h1 class="font-display">QUEST ARCHIVE</h1>
          <button class="btn btn-primary" onclick="LM.components.questModal.open(null, false)">+ New Quest</button>
        </div>

        <!-- Navigation Tabs -->
        <div class="view-navigation-tabs" style="display: flex; border-bottom: 1px solid var(--border); margin-bottom: 20px;">
          <button class="nav-tab-btn ${activeTab === 'log' ? 'active-tab' : ''}" onclick="LM.views.questLog.setActiveTab('log')">Quest Log</button>
          <button class="nav-tab-btn ${activeTab === 'timeline' ? 'active-tab' : ''}" onclick="LM.views.questLog.setActiveTab('timeline')">XP Timeline</button>
        </div>

        ${activeTab === 'log' ? renderLogTab(quests, macros) : renderTimelineTab(xpLog, macros)}
      </div>`;
  }

  function renderLogTab(quests, macros) {
    return `
      <div class="quest-log-filters" style="margin-bottom: 16px;">
        <div class="filter-row" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <select class="form-input" onchange="LM.views.questLog.setSkillFilter(this.value)" style="width:160px; background:var(--bg-raised); border:1px solid var(--border); color:var(--text-1); padding: 8px 12px; border-radius: 8px; cursor: pointer;">
            <option value="all">All Skills</option>
            ${macros.map(m=>`<option value="${m.id}" ${filters.skill===m.id?'selected':''}>${m.name}</option>`).join('')}
          </select>
          <div class="filter-chips" style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${['active', 'completed', 'missed', 'deleted', 'all'].map(s =>
              `<button class="chip ${filters.status===s?'chip-active':''}" onclick="LM.views.questLog.setStatusFilter('${s}')" style="cursor: pointer;">${s.charAt(0).toUpperCase() + s.slice(1)}</button>`
            ).join('')}
          </div>
        </div>
      </div>

      <div class="quest-log-list" id="quest-log-list">
        ${renderList(quests, macros)}
      </div>`;
  }

  function renderTimelineTab(xpLog, macros) {
    if (!xpLog || !xpLog.length) {
      return `<div class="empty-state"><p>No XP events recorded yet. Complete some quests!</p></div>`;
    }

    // Sort by timestamp descending
    const sortedLog = [...xpLog].sort((a, b) => b.timestamp - a.timestamp);

    const timelineHtml = sortedLog.map(entry => {
      const macro = macros.find(m => m.id === entry.macroId);
      const skillName = macro ? macro.name : 'Unknown Skill';
      const skillColor = macro ? macro.accentColor : 'var(--accent)';
      
      const date = new Date(entry.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

      const isNegative = entry.delta < 0;
      const deltaClass = isNegative ? 'timeline-delta-neg' : 'timeline-delta-pos';
      const deltaSign = isNegative ? '' : '+';

      // Check if this XP event links to a quest in localStorage
      const hasQuest = entry.questId && S.getQuest(entry.questId);
      
      let reasonHtml = '';
      if (hasQuest) {
        reasonHtml = `<a href="#" class="timeline-quest-link" onclick="event.preventDefault(); LM.components.questModal.open('${entry.questId}', false);" style="color: var(--text-1); font-weight: 500; text-decoration: underline;">${entry.reason || 'Quest Completed'}</a>`;
      } else {
        reasonHtml = `<span class="timeline-reason-text" style="color: var(--text-2);">${entry.reason || 'XP Adjusted'}</span>`;
      }

      return `
        <div class="timeline-row" style="border-left: 2px solid ${skillColor}; display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255,255,255,0.02); border-radius: 10px; margin-bottom: 8px; border: 1px solid var(--border); border-left-width: 3px;">
          <div class="timeline-time-col" style="display: flex; flex-direction: column; gap: 2px; min-width: 80px;">
            <span class="timeline-date" style="font-size: 0.72rem; color: var(--text-3);">${dateStr}</span>
            <span class="timeline-time" style="font-size: 0.68rem; color: var(--text-3); opacity: 0.7;">${timeStr}</span>
          </div>
          <div class="timeline-content-col" style="flex: 1; padding: 0 16px; display: flex; flex-direction: column; gap: 3px;">
            <span class="timeline-skill" style="color: ${skillColor}; font-weight: 600; font-size: 0.7rem; letter-spacing: 0.08em; font-family: var(--font-display);">${skillName.toUpperCase()}</span>
            <div class="timeline-reason" style="font-size: 0.82rem;">${reasonHtml}</div>
          </div>
          <div class="timeline-xp-col" style="min-width: 80px; text-align: right;">
            <span class="timeline-delta ${deltaClass}" style="font-family: var(--font-display); font-weight: 600; font-size: 0.88rem; color: ${isNegative ? 'var(--danger)' : 'var(--success)'};">${deltaSign}${entry.delta} XP</span>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="timeline-container" style="display: flex; flex-direction: column; margin-top: 10px;">
        ${timelineHtml}
      </div>`;
  }

  function getFilteredQuests(macros) {
    return S.getQuests().filter(q => {
      const tSkills = q.targetSkills || [];
      
      // Skill filter
      if (filters.skill !== 'all' && !tSkills.some(t => t.macroSkillId === filters.skill)) return false;
      
      // Status filter
      if (filters.status !== 'all' && q.status !== filters.status) return false;
      
      return true;
    });
  }

  function renderList(quests, macros) {
    if (!quests.length) return `<div class="empty-state"><p>No quests match these filters.</p></div>`;

    return quests.map(q => {
      const tSkills = q.targetSkills || [];
      const skillTags = tSkills.map(t => {
        const m = macros.find(x=>x.id===t.macroSkillId);
        return m ? `<span class="skill-tag" style="color:${m.accentColor};border-color:${m.accentColor}33">${m.name} +${t.xpAmount}xp</span>` : '';
      }).join('');

      const isMissed = q.status === 'missed';
      const isCompleted = q.status === 'completed';
      const isDeleted = q.status === 'deleted';
      
      const withinWindow = isWithinTimeWindow(q.timeWindow);
      const isLocked = q.status === 'active' && !withinWindow;

      let timeStr = '';
      if (q.expiresAt && q.status === 'active') {
        const leftMs = q.expiresAt - Date.now();
        if (leftMs > 0) {
          timeStr = `<span class="quest-countdown-timer" data-expires-at="${q.expiresAt}" style="font-size:0.75rem;color:var(--accent);">Counting down...</span>`;
        } else {
          timeStr = `<span class="time-left" style="font-size:0.75rem;color:var(--danger);">Expired</span>`;
        }
      } else if (q.expiresAt) {
        timeStr = `<span class="time-left" style="font-size:0.75rem;color:var(--text-3);">Duration: ${q.timeLimitHours || 24}h</span>`;
      }

      let windowBadge = '';
      if (q.timeWindow) {
        windowBadge = `<span class="quest-type-badge" style="background:var(--accent-dim);color:var(--accent);border:1px solid var(--border);">${q.timeWindow.start} - ${q.timeWindow.end}</span>`;
      } else {
        windowBadge = `<span class="quest-type-badge" style="background:var(--bg-raised);color:var(--text-3);border:1px solid var(--border);">Anytime</span>`;
      }

      let statusBadge = '';
      if (isMissed) {
        statusBadge = `<span class="quest-type-badge" style="background:rgba(239,68,68,0.15);color:var(--danger);border:1px solid rgba(239,68,68,0.3);">MISSED</span>`;
      } else if (isCompleted) {
        statusBadge = `<span class="quest-type-badge" style="background:rgba(16,185,129,0.15);color:var(--success);border:1px solid rgba(16,185,129,0.3);">COMPLETED</span>`;
      } else if (isDeleted) {
        statusBadge = `<span class="quest-type-badge" style="background:rgba(120,120,120,0.15);color:var(--text-3);border:1px solid rgba(120,120,120,0.3);">DELETED</span>`;
      } else if (isLocked) {
        statusBadge = `<span class="quest-type-badge" style="background:rgba(120,120,140,0.15);color:var(--text-3);border:1px solid var(--border);">LOCKED</span>`;
      }

      let cardClass = '';
      if (isMissed) cardClass = 'quest-card-missed';
      else if (isCompleted) cardClass = 'quest-card-completed';
      else if (isDeleted) cardClass = 'quest-card-deleted-status';
      else if (isLocked) cardClass = 'quest-card-disabled';

      return `
        <div class="quest-log-row ${cardClass}" style="margin-bottom: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; transition: border-color 0.2s;">
          <div class="quest-log-main" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; cursor: pointer;" onclick="LM.components.questModal.open('${q.id}', false)">
            <div class="quest-log-left" style="display: flex; align-items: center; gap: 12px; flex: 1;">
              <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-start;">
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                  ${windowBadge}
                  ${statusBadge}
                </div>
                <div class="quest-log-info" style="display: flex; flex-direction: column; gap: 4px;">
                  <span class="quest-log-name" style="font-family: var(--font-display); font-size: 0.95rem; font-weight: 500; ${isMissed ? 'text-decoration:line-through;opacity:0.6;' : isCompleted ? 'opacity:0.8;' : ''}">${q.name}</span>
                  <div class="quest-log-meta" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px;">
                    ${skillTags}
                    ${timeStr}
                  </div>
                  ${window.LM.questProgress ? window.LM.questProgress.renderIndicator(q) : ''}
                </div>
              </div>
            </div>
            <div class="quest-log-right" style="display: flex; align-items: center; gap: 8px;" onclick="event.stopPropagation();">
              ${(!isLocked && !isMissed && !isCompleted && !isDeleted) 
                ? `<button class="btn btn-primary btn-sm" style="padding: 6px 12px; border-radius: 6px;" onclick="LM.views.questLog.completeQuest('${q.id}')">✓</button>`
                : ''
              }
              <button class="btn-icon danger" style="padding: 6px; font-size: 0.78rem;" onclick="LM.views.questLog.deleteQuest('${q.id}')" title="${(isCompleted || isDeleted || isMissed) ? 'Delete Permanently' : 'Delete'}">✕</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function setActiveTab(tab) {
    activeTab = tab;
    LM.router.render();
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
      list.innerHTML = renderList(getFilteredQuests(S.getMacros()), S.getMacros());
    }
  }

  function completeQuest(questId) {
    const quest = S.getQuest(questId);
    if (!quest) return;
    
    // Proportional XP scaled warnings
    if (quest.progressIndicator) {
      const pct = Math.round(quest.progressIndicator.value || 0);
      if (pct < 100) {
        const totalXP = (quest.targetSkills || []).reduce((sum, t) => sum + t.xpAmount, 0);
        const earnedXP = Math.round(totalXP * pct / 100);
        const ok = confirm(
          `⚠️ Partial Progress Warning\n\n` +
          `"${quest.name}" is only ${pct}% complete.\n\n` +
          `You will receive ${earnedXP} XP instead of ${totalXP} XP (${pct}% of the full reward).\n\n` +
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
      LM.router.render();
    }
  }

  function init() {
    refresh();
  }

  return { render, init, setActiveTab, setSkillFilter, setStatusFilter, completeQuest, deleteQuest };
})();
