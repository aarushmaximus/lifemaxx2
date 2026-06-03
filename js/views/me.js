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

  function render() {
    const macros = S.getMacros();
    const quests = S.getQuests();
    const streak = getDailyStreak(quests, S.getXPLog());
    
    // Calculate weekly stats (completed within last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyCompletedQuests = quests.filter(q => q.status === 'completed' && q.completedAt && q.completedAt >= sevenDaysAgo);

    // Default target of 3 quests completed per skill per week
    const quotaTarget = 3;

    return `
      <div class="view-container page-enter">
        <div class="view-header">
          <h1 class="font-display-uppercase">OPERATOR PROFILE</h1>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 24px;">
          
          <!-- Profile Header Block -->
          <div class="profile-header">
            <div class="profile-avatar">OP</div>
            <div class="profile-info">
              <h2 class="profile-username">OPERATOR_X</h2>
              <div style="font-family: var(--font-display); font-size: 0.72rem; color: var(--text-3); text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em; margin-bottom: 6px;">
                OPTIMIZATION STATUS
              </div>
              <div class="profile-badges">
                <span class="profile-badge cyan">PEAK</span>
                <span class="profile-badge pink">NEURAL MAPPED</span>
                <span class="profile-badge cyan" style="background: rgba(16,185,129,0.1); color: var(--success); border-color: var(--success);">BIO-SYNC</span>
              </div>
            </div>
          </div>

          <!-- Weekly Quotas Progression -->
          <div class="flat-card">
            <h2 style="font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0; margin-bottom: 16px; color: var(--text-1);">
              Weekly Skill Quota (7-Day Rolling)
            </h2>
            <p style="font-size: 0.8rem; color: var(--text-2); margin-top: -8px; margin-bottom: 16px; line-height: 1.4;">
              Aim for a quota of <strong>${quotaTarget} quests</strong> completed per skill categories every 7 days.
            </p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
              ${macros.map(m => {
                const completedCount = weeklyCompletedQuests.filter(q => q.targetSkills && q.targetSkills.some(ts => ts.macroSkillId === m.id)).length;
                const pct = Math.min(100, (completedCount / quotaTarget) * 100);
                const color = m.accentColor || 'var(--accent)';
                return `
                  <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); padding: 12px; border-radius: 8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                      <span style="font-family: var(--font-display); font-size: 0.85rem; font-weight: 700; color: #fff; display:flex; align-items:center; gap:6px;">
                        <span style="width:6px; height:6px; border-radius:50%; background:${color}"></span>
                        ${m.name}
                      </span>
                      <span style="font-size: 0.75rem; color: var(--text-2); font-weight: 600;">${completedCount} / ${quotaTarget}</span>
                    </div>
                    <div class="xp-bar-wrap">
                      <div class="xp-bar-track" style="height: 4px; background: rgba(255,255,255,0.05);">
                        <div class="xp-bar-fill" style="width: ${pct}%; background: ${color}; color: ${color};"></div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Operator Statistics Summary -->
          <div class="flat-card">
            <h2 style="font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0; margin-bottom: 16px; color: var(--text-1);">
              OPERATOR STATS SUMMARY
            </h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center;">
              <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); padding: 12px; border-radius: 8px;">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent);">${quests.filter(q => q.status === 'completed').length}</div>
                <div style="font-size: 0.65rem; color: var(--text-3); text-transform: uppercase; margin-top: 4px; font-weight: bold; letter-spacing: 0.05em;">Completions</div>
              </div>
              <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); padding: 12px; border-radius: 8px;">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--secondary);">${quests.filter(q => q.status === 'active').length}</div>
                <div style="font-size: 0.65rem; color: var(--text-3); text-transform: uppercase; margin-top: 4px; font-weight: bold; letter-spacing: 0.05em;">Active Quests</div>
              </div>
              <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); padding: 12px; border-radius: 8px;">
                <div style="font-size: 1.5rem; font-weight: 700; color: #fff;">🔥 ${streak}</div>
                <div style="font-size: 0.65rem; color: var(--text-3); text-transform: uppercase; margin-top: 4px; font-weight: bold; letter-spacing: 0.05em;">Win Streak</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  function init() {
    // Nav items clicked instantly trigger route switches via hashchange
  }

  return { render, init };
})();

