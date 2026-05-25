// LIFEMAXX — Skill Detail View
window.LM.views.skillDetail = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;

  function render(macroId) {
    const macro = S.getMacro(macroId);
    if (!macro) return `<div class="view-error">Skill not found.</div>`;

    const micros = macro.microSkills || [];
    const quests = S.getQuests().filter(q => (q.targetSkills || []).some(t => t.macroSkillId === macroId));
    const research = quests.filter(q => q.type === 'research');
    const allEntries = research.flatMap(q => (q.researchLog||[]).map(e => ({ ...e, questName: q.name })));
    allEntries.sort((a,b) => b.createdAt - a.createdAt);

    const xplog = S.getXPLog(macroId);
    xplog.sort((a,b) => b.timestamp - a.timestamp);

    const pct = F.progressPercent(macro.currentXP||0, macro);
    const into = F.xpIntoCurrentLevel(macro.currentXP||0, macro);
    const req = F.xpRequiredForNextLevel(macro.currentXP||0, macro);

    return `
      <div class="view-container skill-detail-view">
        <div class="view-header">
          <button class="btn-back" onclick="LM.router.navigate('#dashboard')">← Back</button>
          <div class="skill-detail-title">
            <span class="macro-dot-lg" style="background:${macro.accentColor}"></span>
            <h1>${macro.name}</h1>
          </div>
          <button class="btn btn-ghost" onclick="LM.components.skillModal.open()">Manage Skills</button>
        </div>

        <!-- Main XP Bar -->
        <div class="skill-detail-bar-wrap">
          <div class="skill-detail-level" style="color:${macro.accentColor}">
            <span class="font-display level-big">${macro.currentLevel||0}</span>
            <span class="level-label">LEVEL</span>
          </div>
          <div class="skill-detail-bar-section">
            <div class="xp-bar-track xp-bar-lg">
              <div class="xp-bar-fill" style="width:${pct}%;background:${macro.accentColor}"></div>
            </div>
            <div class="xp-bar-meta">
              <span>${F.formatXP(into)} / ${F.formatXP(req)} XP to next level</span>
              <span>Total: ${F.formatXP(macro.currentXP||0)} XP</span>
            </div>
          </div>
        </div>

        <!-- Micro Skills -->
        <div class="section-block">
          <div class="section-header">
            <h2>Micro Skills</h2>
            <button class="btn btn-ghost btn-sm" onclick="LM.components.skillModal.open()">+ Add</button>
          </div>
          <div class="micro-skill-list">
            ${micros.length ? micros.map(ms => {
              const mPct = F.progressPercent(ms.currentXP||0, ms);
              const mInto = F.xpIntoCurrentLevel(ms.currentXP||0, ms);
              const mReq = F.xpRequiredForNextLevel(ms.currentXP||0, ms);
              const tier = getTier(ms.currentLevel||0);
              return `
                <div class="micro-skill-row">
                  <div class="micro-skill-header">
                    <span class="micro-skill-name">${ms.name}</span>
                    <span class="micro-tier" style="color:${macro.accentColor}">${tier}</span>
                    <span class="micro-level">Lvl ${ms.currentLevel||0}</span>
                  </div>
                  <div class="xp-bar-track xp-bar-sm">
                    <div class="xp-bar-fill" style="width:${mPct}%;background:${macro.accentColor}88"></div>
                  </div>
                  <div class="micro-xp-label">${F.formatXP(mInto)} / ${F.formatXP(mReq)} XP</div>
                </div>`;
            }).join('') : '<p class="empty-text">No micro skills yet.</p>'}
          </div>
        </div>

        <!-- Quests -->
        <div class="section-block">
          <h2>Quests</h2>
          <div class="quest-list-simple">
            ${quests.length ? quests.map(q => `
              <div class="quest-simple-row ${q.status==='completed'?'quest-done':''}">
                <span class="quest-type-dot" style="background:${{daily:'#10b981',weekly:'#3b82f6',project:'#8b5cf6',boss:'#ef4444',research:'#f59e0b'}[q.type]||'#888'}"></span>
                <span class="quest-simple-name">${q.name}</span>
                <span class="quest-simple-status">${q.status}</span>
              </div>`).join('') : '<p class="empty-text">No quests for this skill.</p>'}
          </div>
        </div>

        <!-- Research Entries -->
        ${allEntries.length ? `
          <div class="section-block">
            <h2>Research Log</h2>
            <div class="research-entry-list">
              ${allEntries.map(e => `
                <div class="research-entry-card">
                  <div class="re-header">
                    <span class="re-title">${e.title}</span>
                    <span class="re-date">${new Date(e.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p class="re-content">${e.content}</p>
                  <div class="re-tags">${(e.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
                </div>`).join('')}
            </div>
          </div>` : ''}

        <!-- XP History -->
        <div class="section-block">
          <h2>XP History</h2>
          <div class="xp-log-list">
            ${xplog.length ? xplog.map(l => `
              <div class="xp-log-entry" style="padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 8px; border-left: 4px solid ${l.delta > 0 ? '#10b981' : '#ef4444'}">
                <div class="log-meta" style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.85rem; color: var(--text-2)">
                  <span class="log-date">${new Date(l.timestamp).toLocaleString()}</span>
                  <span class="log-delta font-display" style="color: ${l.delta > 0 ? '#10b981' : '#ef4444'}">${l.delta > 0 ? '+' : ''}${Math.round(l.delta)} XP</span>
                </div>
                <div class="log-reason" style="color: var(--text-1)">${l.reason || 'System Action'}</div>
              </div>`).join('') : '<p class="empty-text">No XP recorded yet.</p>'}
          </div>
        </div>

      </div>`;
  }

  function getTier(level) {
    if (level >= 80) return 'LEGEND';
    if (level >= 60) return 'MASTER';
    if (level >= 40) return 'EXPERT';
    if (level >= 20) return 'ADEPT';
    if (level >= 10) return 'APPRENTICE';
    return 'NOVICE';
  }

  function init() {}

  return { render, init };
})();
