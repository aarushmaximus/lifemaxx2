// LIFEMAXX — Skill Hub View (4 option cards)
window.LM.views.skillHub = (function () {
  const S = window.LM.store;

  const OPTIONS = [
    {
      id: 'create-quest',
      title: 'Create Quest',
      desc: 'Add a new quest for this skill',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`
    },
    {
      id: 'create-habitual',
      title: 'Create Habitual',
      desc: 'Daily XP habit with gain/loss tracking',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>`
    },
    {
      id: 'create-statistic',
      title: 'Create Statistic',
      desc: 'Track metrics like calories or study hours',
      icon: `<span class="material-symbols-outlined" style="font-size:26px;">add_chart</span>`
    },
    {
      id: 'chain-quests',
      title: 'Chain Quests',
      desc: 'Multi-step ordered quest sequences',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><circle cx="5" cy="12" r="2.5"/><circle cx="12" cy="12" r="2.5"/><circle cx="19" cy="12" r="2.5"/><line x1="7.5" y1="12" x2="9.5" y2="12"/><line x1="14.5" y1="12" x2="16.5" y2="12"/></svg>`
    },
    {
      id: 'microskills',
      title: 'Microskills',
      desc: 'Sub-skills, XP history &amp; stats',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`
    },
    {
      id: 'widgets',
      title: 'Widgets',
      desc: 'Custom tracking &amp; display widgets',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`
    }
  ];

  function render(macroId) {
    const macro = S.getMacro(macroId);
    if (!macro) return `<div class="view-error">Skill not found.</div>`;
    const F = window.LM.formulas;
    const pct = F.progressPercent(macro.currentXP || 0, macro);
    const chains = S.getChains(macroId);
    const activeChains = chains.filter(c => c.steps.some(s => !s.completedAt)).length;
    const habituals = S.getHabituals().filter(h => h.macroId === macroId);

    return `
      <div class="skill-hub-view" style="--sk-accent:${macro.accentColor};">
        <div class="skill-hub-header">
          <button class="btn-back" onclick="LM.router.navigate('#skills')">← Skills</button>
          <div class="skill-hub-title-row">
            <div class="skill-hub-dot" style="background:${macro.accentColor};box-shadow:0 0 14px ${macro.accentColor};"></div>
            <h1 class="font-display skill-hub-name">${macro.name}</h1>
            <span class="skill-hub-lv font-display" style="color:${macro.accentColor};">Lv${macro.currentLevel || 0}</span>
          </div>
        </div>
        <div class="skill-hub-xp-bar-track">
          <div class="skill-hub-xp-bar-fill" style="width:${pct}%;background:${macro.accentColor};"></div>
        </div>

        <!-- Habitual creation panel (hidden by default) -->
        <div id="habitual-create-panel" style="display:none;background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h2 style="font-family:var(--font-display);font-size:0.85rem;letter-spacing:0.12em;color:#8FAF2A;">NEW HABITUAL</h2>
            <button class="btn-icon" onclick="document.getElementById('habitual-create-panel').style.display='none'">✕</button>
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:0.75rem;color:var(--text-3);font-family:var(--font-display);letter-spacing:0.08em;">NAME</label>
            <input type="text" class="form-input" id="habitual-name-inp" placeholder="e.g. Morning Run, Read 30 mins">
          </div>
          <div style="display:flex;gap:12px;margin-bottom:16px;">
            <div class="form-group" style="flex:1;">
              <label style="font-size:0.75rem;color:var(--text-3);font-family:var(--font-display);letter-spacing:0.08em;">XP GAIN (if done)</label>
              <input type="number" class="form-input" id="habitual-xpgain-inp" placeholder="e.g. 50" min="1">
            </div>
            <div class="form-group" style="flex:1;">
              <label style="font-size:0.75rem;color:var(--text-3);font-family:var(--font-display);letter-spacing:0.08em;">XP LOSS (if missed)</label>
              <input type="number" class="form-input" id="habitual-xploss-inp" placeholder="e.g. 25" min="0">
            </div>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('habitual-create-panel').style.display='none'">Cancel</button>
            <button class="btn btn-sm" id="btn-save-habitual" style="background:#8FAF2A;border:none;color:#08080c;font-weight:700;">Save Habitual</button>
          </div>
        </div>

        <!-- Active habituals for this skill -->
        ${habituals.length > 0 ? `
        <div style="margin-bottom:16px;">
          <div style="font-family:var(--font-display);font-size:0.7rem;letter-spacing:0.12em;color:var(--text-3);margin-bottom:8px;">ACTIVE HABITUALS</div>
          ${habituals.map(h => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg-surface);border:1px solid #8FAF2A33;border-radius:10px;margin-bottom:6px;">
              <div>
                <div style="font-size:0.85rem;font-weight:500;">${h.name}</div>
                <div style="font-size:0.7rem;color:var(--text-3);">+${h.xpGain} / -${h.xpLoss} XP</div>
              </div>
              <button class="btn-icon danger" onclick="LM.views.skillHub.deleteHabitual('${h.id}')" title="Delete habitual">✕</button>
            </div>`).join('')}
        </div>` : ''}

        <!-- Active statistics for this skill -->
        ${(() => {
          const stats = S.getStatistics().filter(s => s.targetSkill && s.targetSkill.macroSkillId === macroId);
          if (stats.length === 0) return '';
          return `
          <div style="margin-bottom:16px;">
            <div style="font-family:var(--font-display);font-size:0.7rem;letter-spacing:0.12em;color:var(--text-3);margin-bottom:8px;">ACTIVE STATISTICS</div>
            ${stats.map(s => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg-surface);border:1px solid rgba(255,255,255,0.1);border-radius:10px;margin-bottom:6px;">
                <div>
                  <div style="font-size:0.85rem;font-weight:500;">${s.name}</div>
                  <div style="font-size:0.7rem;color:var(--text-3);">Goal: ${s.goalValue} ${s.unit} • XP: +${s.maxXP} / -${s.negativeXP}</div>
                </div>
                <div style="display:flex;gap:8px;">
                  <button class="btn-icon" onclick="LM.components.statModal.open('${s.id}')" title="Edit Statistic" style="color:var(--text-2);">✎</button>
                  <button class="btn-icon danger" onclick="if(confirm('Delete ${s.name}?')) { LM.store.deleteStatistic('${s.id}'); LM.router.render(); }" title="Delete Statistic">✕</button>
                </div>
              </div>`).join('')}
          </div>`;
        })()}

        <div class="skill-hub-options">
          ${OPTIONS.map(opt => {
            let badge = '';
            if (opt.id === 'chain-quests' && activeChains > 0) {
              badge = `<span class="hub-badge" style="background:${macro.accentColor};">${activeChains}</span>`;
            }
            if (opt.id === 'create-habitual' && habituals.length > 0) {
              badge = `<span class="hub-badge" style="background:#8FAF2A;">${habituals.length}</span>`;
            }
            return `
              <button class="skill-hub-option" id="hub-opt-${opt.id}" data-macroi="${macroId}">
                <div class="hub-opt-icon" style="color:${opt.id === 'create-habitual' ? '#8FAF2A' : macro.accentColor};">${opt.icon}</div>
                <div class="hub-opt-text">
                  <div class="hub-opt-title">${opt.title}${badge}</div>
                  <div class="hub-opt-desc">${opt.desc}</div>
                </div>
                <div class="hub-opt-arrow">›</div>
              </button>`;
          }).join('')}
        </div>
      </div>`;
  }

  function init(macroId) {
    document.getElementById('hub-opt-create-quest')?.addEventListener('click', () => {
      window.LM.components.questModal.open(null, false);
    });
    document.getElementById('hub-opt-create-habitual')?.addEventListener('click', () => {
      const panel = document.getElementById('habitual-create-panel');
      if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('hub-opt-create-statistic')?.addEventListener('click', () => {
      window.LM.components.statModal.open(null);
    });
    document.getElementById('hub-opt-chain-quests')?.addEventListener('click', () => {
      LM.router.navigate(`#skill-chains/${macroId}`);
    });
    document.getElementById('hub-opt-microskills')?.addEventListener('click', () => {
      LM.router.navigate(`#skill/${macroId}`);
    });
    document.getElementById('hub-opt-widgets')?.addEventListener('click', () => {
      LM.router.navigate(`#skill-widgets/${macroId}`);
    });

    document.getElementById('btn-save-habitual')?.addEventListener('click', () => {
      const name = document.getElementById('habitual-name-inp')?.value?.trim();
      const xpGain = parseInt(document.getElementById('habitual-xpgain-inp')?.value) || 0;
      const xpLoss = parseInt(document.getElementById('habitual-xploss-inp')?.value) || 0;
      if (!name) { window.LM.components.notifications.show('Please enter a name.', 'error'); return; }
      if (xpGain <= 0) { window.LM.components.notifications.show('XP Gain must be > 0.', 'error'); return; }
      const S = window.LM.store;
      const now = new Date();
      const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
      const todayIST = new Date(istMs).toISOString().slice(0, 10);
      S.upsertHabitual({
        id: S.uid(),
        macroId,
        name,
        xpGain,
        xpLoss,
        createdAt: Date.now(),
        todayStatus: null,
        lastResetDate: todayIST
      });
      window.LM.components.notifications.show(`Habitual "${name}" created!`, 'success');
      LM.router.render();
    });
  }

  function deleteHabitual(id) {
    if (!confirm('Delete this habitual? This cannot be undone.')) return;
    window.LM.store.deleteHabitual(id);
    window.LM.components.notifications.show('Habitual deleted.', 'info');
    LM.router.render();
  }

  return { render, init, deleteHabitual };
})();