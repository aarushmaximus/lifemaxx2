window.LM.views.me = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;

  function render() {
    const macros = S.getMacros();
    const quests = S.getQuests();
    
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

          <!-- System Preferences Links -->
          <div class="flat-card" style="display: flex; flex-direction: column; gap: 4px;">
            <h2 style="font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0; margin-bottom: 12px; color: var(--text-1);">
              SYSTEM PREFERENCES
            </h2>

            <div class="pref-item" onclick="window.LM.router.navigate('#coach')">
              <div class="pref-item-left">
                <span class="pref-item-icon">🎓</span>
                <span class="pref-item-label">AI COACH & BRIEFINGS</span>
              </div>
              <span class="pref-item-chevron">▶</span>
            </div>

            <div class="pref-item" onclick="window.LM.router.navigate('#settings')">
              <div class="pref-item-left">
                <span class="pref-item-icon">🛠️</span>
                <span class="pref-item-label">GAME RULES & PRESETS</span>
              </div>
              <span class="pref-item-chevron">▶</span>
            </div>

            <div class="pref-item" onclick="window.LM.router.navigate('#settings')">
              <div class="pref-item-left">
                <span class="pref-item-icon">🧠</span>
                <span class="pref-item-label">INTELLIGENCE API SETTINGS</span>
              </div>
              <span class="pref-item-chevron">▶</span>
            </div>

            <div class="pref-item" onclick="window.LM.router.navigate('#settings')">
              <div class="pref-item-left">
                <span class="pref-item-icon">☁️</span>
                <span class="pref-item-label">CLOUD SYNC & BACKUPS</span>
              </div>
              <span class="pref-item-chevron">▶</span>
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
