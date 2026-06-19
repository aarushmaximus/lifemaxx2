// LIFEMAXX — Quest and Preset Creation / Edit Modal
window.LM.components.questModal = (function () {
  const S = window.LM.store;
  const N = window.LM.components.notifications;

  let editingId = null;
  let isPresetMode = false;

  function open(id = null, isPreset = false, defaultType = 'task', defaultMacroId = null) {
    editingId = id;
    isPresetMode = isPreset;
    
    const item = id 
      ? (isPresetMode ? S.getPreset(id) : S.getQuest(id))
      : null;
      
    const presets = S.getPresets();
    const macros = S.getMacros();
    const modal = document.getElementById('quest-modal');
    const overlay = document.getElementById('modal-overlay');

    modal.innerHTML = buildHTML(item, presets, macros, defaultType, defaultMacroId);
    modal.classList.add('modal-open');
    overlay.classList.add('overlay-open');

    initEvents(modal, presets, macros);
  }

  function close() {
    const modal = document.getElementById('quest-modal');
    const overlay = document.getElementById('modal-overlay');
    modal.classList.remove('modal-open');
    overlay.classList.remove('overlay-open');
    editingId = null;
    isPresetMode = false;
    _submitting = false;
  }

  function buildHTML(item, presets, macros, defaultType = 'task', defaultMacroId = null) {
    const it = item || {};
    const isReadOnly = it.status && it.status !== 'active';
    const dis = isReadOnly ? 'disabled style="opacity: 0.7; pointer-events: none;"' : '';
    const typeValue = it.type || defaultType;
    
    // Core parameters
    const name = it.name || '';
    const description = it.description || '';
    const targetSkills = it.targetSkills || [];

    // Advanced / Schedule parameters
    const scheduledDays = it.scheduledDays || [0, 1, 2, 3, 4, 5, 6];
    const hasTimeWindow = !!it.timeWindow;
    const timeWindow = it.timeWindow || { start: '09:00', end: '17:00' };
    const hasTimeLimit = !!(it.expiresAt || it.hasTimeLimit);
    const isNegativeOnMiss = it.isNegativeOnMiss || false;
    const isNegativeOnComplete = it.isNegativeOnComplete || false;

    // Progress Indicator parameters
    const hasPI = !!it.progressIndicator;
    const piType = it.progressIndicator?.type || 'manual';
    const piChecksCount = it.progressIndicator?.checksCount || 4;
    const piTimerDuration = it.progressIndicator ? Math.round(it.progressIndicator.timerDuration / 60) : 20;

    const piAccordionHTML = `
        <div class="form-group" style="background: rgba(255,255,255,0.02); padding: 16px; border-radius: 12px; border: 1px solid var(--border); margin-top: 24px;">
          <div class="form-check" style="margin: 0; display: flex; justify-content: space-between; align-items: center;">
            <label for="qm-pi-enable" style="margin: 0; font-weight: 600; color: var(--text-1); cursor: pointer;">Enable Progress Tracker</label>
            <input type="checkbox" id="qm-pi-enable" ${hasPI ? 'checked' : ''} ${dis} style="width:18px;height:18px;cursor:pointer;">
          </div>
          
          <div id="qm-pi-fields" style="display: ${hasPI ? 'flex' : 'none'}; flex-direction: column; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--border);">
            <div class="form-group" style="margin: 0;">
              <label>Tracker Type</label>
              <select id="qm-pi-type" class="form-input" style="background:var(--bg-raised); border:1px solid var(--border); color:var(--text-1);" ${dis}>
                <option value="manual" ${piType === 'manual' ? 'selected' : ''}>Manual Slider (0% - 100%)</option>
                <option value="checks" ${piType === 'checks' ? 'selected' : ''}>Checklists (Custom number of steps)</option>
                <option value="timer" ${piType === 'timer' ? 'selected' : ''}>Time Tracker (Countdown timer)</option>
              </select>
            </div>
            
            <div class="form-group" id="qm-pi-checks-group" style="display: ${piType === 'checks' ? 'block' : 'none'}; margin: 0;">
              <label>Number of Checklist Steps</label>
              <input type="number" id="qm-pi-checks-count" class="form-input" min="1" max="20" value="${piChecksCount}" ${dis}>
            </div>
            
            <div class="form-group" id="qm-pi-timer-group" style="display: ${piType === 'timer' ? 'block' : 'none'}; margin: 0;">
              <label>Timer Target Duration (Minutes)</label>
              <input type="number" id="qm-pi-timer-duration" class="form-input" min="1" max="600" value="${piTimerDuration}" ${dis}>
            </div>
          </div>
        </div>
    `;

    // ── PRESET MODE HTML ──
    if (isPresetMode) {
      return `
        <div class="modal-header" style="border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:16px;">
          <h2 class="font-display" style="font-size:1.1rem; letter-spacing:0.04em; color:var(--text-1); margin:0;">${item ? 'EDIT TEMPLATE' : 'CREATE TEMPLATE'}</h2>
          <button type="button" class="modal-close" onclick="LM.components.questModal.close(); return false;">✕</button>
        </div>
        <div class="modal-body" style="padding-top:0;">
          
          <div style="margin-bottom:12px;">
            <label style="display:block; font-size:0.7rem; color:var(--text-3); margin-bottom:4px; font-weight:600;">TEMPLATE NAME</label>
            <input id="qm-name" type="text" placeholder="e.g. Morning Routine" value="${name}" style="width:100%; background:var(--bg-raised); border:1px solid var(--border); border-radius:8px; padding:10px 12px; font-size:0.9rem; color:var(--text-1); outline:none; transition:border 0.2s;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
          </div>
          
          <!-- Description & Skills Grid -->
          <div style="display:grid; grid-template-columns:3fr 2fr; gap:16px; margin-bottom:20px;">
            <div>
              <label style="display:block; font-size:0.7rem; color:var(--text-3); margin-bottom:4px; font-weight:600;">NOTES</label>
              <textarea id="qm-desc" placeholder="Details..." style="width:100%; background:var(--bg-raised); border:1px solid var(--border); border-radius:8px; padding:10px 12px; min-height:60px; height:100%; color:var(--text-2); font-size:0.85rem; outline:none; resize:none;"></textarea>
            </div>
            <div style="display:flex; flex-direction:column;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label style="font-size:0.7rem; color:var(--text-3); font-weight:600;">XP REWARDS</label>
                <button type="button" id="qm-add-skill" style="background:none; border:none; color:var(--primary); font-size:0.7rem; font-weight:bold; cursor:pointer; padding:0;">+ ADD</button>
              </div>
              <div id="qm-skills-list" style="display:flex; flex-direction:column; gap:6px; flex:1; background:var(--bg-raised); border:1px solid var(--border); border-radius:8px; padding:6px; overflow-y:auto; max-height:80px;">
                ${targetSkills.length > 0 ? targetSkills.map((t, i) => buildSkillRow(t, i, macros)).join('') : buildSkillRow({ macroSkillId: defaultMacroId }, 0, macros)}
              </div>
            </div>
          </div>

          <div style="font-size:0.75rem; letter-spacing:0.08em; color:var(--accent); font-weight:bold; border-bottom:1px solid var(--border); padding-bottom:6px; margin-bottom:12px;">SCHEDULING & CONFIG</div>

          <!-- Advanced Content Block (Always visible for presets) -->
          <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px; padding:12px; background:var(--bg-raised); border-radius:8px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
              <label style="font-size:0.75rem; color:var(--text-2); white-space:nowrap;">Auto-Spawn Days</label>
              <div class="type-tabs" style="display:flex; gap:2px; flex:1; max-width:260px;">
                ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => 
                  `<button type="button" class="type-tab day-tab ${scheduledDays.includes(i) ? 'active' : ''}" data-day="${i}" style="flex:1; padding:4px 0; font-size:0.7rem; text-align:center; min-width:0;">${d}</button>`
                ).join('')}
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:12px;">
              <label style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:var(--text-2); cursor:pointer;">
                <input type="checkbox" id="qm-time-window-check" ${hasTimeWindow ? 'checked' : ''} style="accent-color:var(--primary);">
                Time Window
              </label>
              <div id="qm-time-window-fields" style="display:${hasTimeWindow ? 'flex' : 'none'}; gap:8px; flex:1; align-items:center;">
                <input id="qm-time-start" type="time" value="${timeWindow.start}" style="background:transparent; border:1px solid var(--border); border-radius:6px; padding:4px 8px; font-size:0.75rem; color:var(--text-1);">
                <span style="color:var(--text-3); font-size:0.7rem;">to</span>
                <input id="qm-time-end" type="time" value="${timeWindow.end}" style="background:transparent; border:1px solid var(--border); border-radius:6px; padding:4px 8px; font-size:0.75rem; color:var(--text-1);">
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
              <label style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:var(--text-2); cursor:pointer;">
                <input type="checkbox" id="qm-has-time-limit" ${hasTimeLimit ? 'checked' : ''} style="accent-color:var(--primary);">
                Expire Timer
              </label>
              <div id="qm-time-limit-fields" style="display:${hasTimeLimit ? 'flex' : 'none'}; align-items:center; gap:6px;">
                <input id="qm-time-limit-duration" type="number" min="0.1" step="0.1" value="${it.timeLimitHours || 24}" style="width:60px; background:transparent; border:1px solid var(--border); border-radius:6px; padding:4px 8px; font-size:0.75rem; color:var(--text-1);">
                <span style="font-size:0.7rem; color:var(--text-3);">hrs</span>
              </div>
              <label style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:var(--text-2); cursor:pointer;">
                <input type="checkbox" id="qm-neg-miss" ${isNegativeOnMiss ? 'checked' : ''} style="accent-color:var(--primary);">
                Penalty (Miss)
              </label>
              <label style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:var(--text-2); cursor:pointer;">
                <input type="checkbox" id="qm-neg-complete" ${isNegativeOnComplete ? 'checked' : ''} style="accent-color:var(--primary);">
                Penalty (Done)
              </label>
            </div>
          </div>
          
          <div style="font-size:0.75rem; letter-spacing:0.08em; color:var(--accent); font-weight:bold; border-bottom:1px solid var(--border); padding-bottom:6px; margin-bottom:12px;">PROGRESS TRACKER</div>
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; padding:12px; background:var(--bg-raised); border-radius:8px;">
            <select id="qm-pi-type" style="background:transparent; border:1px solid var(--border); border-radius:6px; padding:6px 8px; font-size:0.75rem; color:var(--text-1);">
              <option value="none" ${!hasPI ? 'selected' : ''}>None</option>
              <option value="manual" ${piType === 'manual' ? 'selected' : ''}>Slider (0-100%)</option>
              <option value="checks" ${piType === 'checks' ? 'selected' : ''}>Checklists</option>
              <option value="timer" ${piType === 'timer' ? 'selected' : ''}>Time Tracker</option>
            </select>
            
            <div id="qm-pi-checks-group" style="display:${piType === 'checks' ? 'flex' : 'none'}; align-items:center; gap:6px;">
              <span style="font-size:0.7rem; color:var(--text-3);">Steps</span>
              <input type="number" id="qm-pi-checks-count" min="1" max="20" value="${piChecksCount}" style="width:50px; background:transparent; border:1px solid var(--border); border-radius:6px; padding:4px; font-size:0.75rem; color:var(--text-1);">
            </div>
            
            <div id="qm-pi-timer-group" style="display:${piType === 'timer' ? 'flex' : 'none'}; align-items:center; gap:6px;">
              <span style="font-size:0.7rem; color:var(--text-3);">Mins</span>
              <input type="number" id="qm-pi-timer-duration" min="1" max="600" value="${piTimerDuration}" style="width:60px; background:transparent; border:1px solid var(--border); border-radius:6px; padding:4px; font-size:0.75rem; color:var(--text-1);">
            </div>
          </div>

        </div>
        <div class="modal-footer" style="padding:0; display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" style="background:transparent; border:none; color:var(--text-2); padding:8px 16px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer;" onclick="LM.components.questModal.close(); return false;">Cancel</button>
          <button type="button" id="qm-submit" style="background:var(--primary); color:#000; border:none; padding:8px 20px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:0.85rem;">${item ? 'Save' : 'Create'}</button>
        </div>`;
    }

    // ── INDIVIDUAL QUEST MODE HTML ──
    return `
      <div class="modal-header" style="border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:16px;">
        <h2 class="font-display" style="font-size:1.1rem; letter-spacing:0.04em; color:var(--text-1); margin:0;">${item ? (isReadOnly ? 'VIEW QUEST' : 'EDIT QUEST') : 'CREATE QUEST'}</h2>
        <button type="button" class="modal-close" onclick="LM.components.questModal.close(); return false;">✕</button>
      </div>
      <div class="modal-body" style="padding-top:0;">
        
        <!-- Status Badge -->
        ${isReadOnly ? `
          <div style="background:var(--bg-raised); border-radius:8px; padding:8px 12px; display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
            <span style="font-size:0.7rem; font-family:var(--font-display); letter-spacing:0.1em; color:var(--text-2);">STATUS</span>
            <span class="quest-type-badge" style="background:${it.status === 'completed' ? 'rgba(16,185,129,0.15)' : it.status === 'missed' ? 'rgba(239,68,68,0.15)' : 'rgba(120,120,140,0.15)'}; color:${it.status === 'completed' ? 'var(--success)' : it.status === 'missed' ? 'var(--danger)' : 'var(--text-2)'}; border:1px solid currentColor;">${it.status.toUpperCase()}</span>
          </div>
        ` : ''}

        <!-- Name & Type Grid -->
        <div style="display:grid; grid-template-columns:2fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <label style="display:block; font-size:0.7rem; color:var(--text-3); margin-bottom:4px; font-weight:600;">OBJECTIVE</label>
            <input id="qm-name" type="text" placeholder="e.g. Read 15 pages..." value="${name}" ${dis} style="width:100%; background:var(--bg-raised); border:1px solid var(--border); border-radius:8px; padding:10px 12px; font-size:0.9rem; color:var(--text-1); outline:none; transition:border 0.2s;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
          </div>
          <div>
            <label style="display:block; font-size:0.7rem; color:var(--text-3); margin-bottom:4px; font-weight:600;">TYPE</label>
            <select id="qm-type" style="width:100%; background:var(--bg-raised); border:1px solid var(--border); border-radius:8px; padding:9px 12px; font-size:0.85rem; color:var(--text-1); outline:none;" ${dis}>
              <option value="task" ${typeValue !== 'statistic' ? 'selected' : ''}>Task</option>
              <option value="statistic" ${typeValue === 'statistic' ? 'selected' : ''}>Statistic</option>
            </select>
          </div>
        </div>

        <!-- Statistic / Template Grid -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          <div style="display:${isReadOnly ? 'none' : 'block'}; grid-column: ${typeValue === 'statistic' ? 'auto' : '1 / -1'};">
            <label style="display:block; font-size:0.7rem; color:var(--text-3); margin-bottom:4px; font-weight:600;">TEMPLATE</label>
            <select id="qm-preset-select" style="width:100%; background:var(--bg-raised); border:1px dashed var(--border); border-radius:8px; padding:9px 12px; font-size:0.85rem; color:var(--text-1); outline:none;" ${dis}>
              <option value="">— Blank —</option>
              ${presets.map(p => `<option value="${p.id}" ${it.presetId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
          </div>
          <div id="qm-statistic-fields" style="display:${typeValue === 'statistic' ? 'flex' : 'none'}; gap:12px;">
            <div style="flex:1;">
              <label style="display:block; font-size:0.7rem; color:var(--text-3); margin-bottom:4px; font-weight:600;">DAILY GOAL</label>
              <input id="qm-stat-goal" type="number" placeholder="2000" value="${it.dailyGoal || ''}" ${dis} style="width:100%; background:var(--bg-raised); border:1px solid var(--border); border-radius:8px; padding:10px 12px; font-size:0.9rem; color:var(--text-1); outline:none;">
            </div>
            <div style="flex:1;">
              <label style="display:block; font-size:0.7rem; color:var(--text-3); margin-bottom:4px; font-weight:600;">UNIT</label>
              <input id="qm-stat-unit" type="text" placeholder="kcal" value="${it.unit || ''}" ${dis} style="width:100%; background:var(--bg-raised); border:1px solid var(--border); border-radius:8px; padding:10px 12px; font-size:0.9rem; color:var(--text-1); outline:none;">
            </div>
          </div>
        </div>
        
        <!-- Description & Skills Grid -->
        <div style="display:grid; grid-template-columns:3fr 2fr; gap:16px; margin-bottom:16px;">
          <div>
            <label style="display:block; font-size:0.7rem; color:var(--text-3); margin-bottom:4px; font-weight:600;">NOTES</label>
            <textarea id="qm-desc" placeholder="Details..." ${dis} style="width:100%; background:var(--bg-raised); border:1px solid var(--border); border-radius:8px; padding:10px 12px; min-height:60px; height:100%; color:var(--text-2); font-size:0.85rem; outline:none; resize:none;"></textarea>
          </div>
          <div style="display:flex; flex-direction:column;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <label style="font-size:0.7rem; color:var(--text-3); font-weight:600;">XP REWARDS</label>
              ${!isReadOnly ? `<button type="button" id="qm-add-skill" style="background:none; border:none; color:var(--primary); font-size:0.7rem; font-weight:bold; cursor:pointer; padding:0;">+ ADD</button>` : ''}
            </div>
            <div id="qm-skills-list" style="display:flex; flex-direction:column; gap:6px; flex:1; background:var(--bg-raised); border:1px solid var(--border); border-radius:8px; padding:6px; overflow-y:auto; max-height:80px;">
              ${targetSkills.length > 0 ? targetSkills.map((t, i) => buildSkillRow(t, i, macros, isReadOnly)).join('') : buildSkillRow({ macroSkillId: defaultMacroId }, 0, macros, isReadOnly)}
            </div>
          </div>
        </div>

        <!-- AI Gen (Compact) -->
        ${!isReadOnly ? `
        <div style="border:1px solid var(--border); border-radius:8px; padding:8px 12px; background:rgba(255, 74, 141, 0.02); display:flex; gap:8px; align-items:center; margin-bottom:16px;">
          <span style="font-size:1.2rem;">✨</span>
          <input type="text" id="qm-ai-prompt" placeholder="AI Generate Tasks (e.g. Build a React App)..." style="flex:1; background:transparent; border:none; color:var(--text-1); font-size:0.85rem; outline:none;">
          <button type="button" id="qm-ai-generate-btn" style="background:var(--accent); color:#000; border:none; border-radius:6px; padding:6px 12px; font-weight:bold; font-size:0.75rem; cursor:pointer; white-space:nowrap;">Generate</button>
          <div id="qm-ai-status" style="font-size:0.7rem; color:var(--text-3); display:none; margin-left:8px;">Thinking...</div>
        </div>
        ` : ''}

        <!-- Compact Toggles -->
        <div style="display:flex; gap:16px; margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:12px;">
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
            <input type="checkbox" id="qm-advanced-enable" ${hasTimeWindow || hasTimeLimit || isNegativeOnMiss || isNegativeOnComplete || scheduledDays.length < 7 ? 'checked' : ''} style="width:14px;height:14px;accent-color:var(--primary);cursor:pointer;" ${dis}>
            <span style="font-size:0.8rem; color:var(--text-2);">Advanced Constraints</span>
          </label>
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
            <input type="checkbox" id="qm-pi-enable" ${hasPI ? 'checked' : ''} style="width:14px;height:14px;accent-color:var(--primary);cursor:pointer;" ${dis}>
            <span style="font-size:0.8rem; color:var(--text-2);">Progress Tracker</span>
          </label>
        </div>

        <!-- Advanced Content -->
        <div id="qm-advanced-content" style="display:${hasTimeWindow || hasTimeLimit || isNegativeOnMiss || isNegativeOnComplete || scheduledDays.length < 7 ? 'flex' : 'none'}; flex-direction:column; gap:12px; margin-bottom:16px; padding:12px; background:var(--bg-raised); border-radius:8px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <label style="font-size:0.75rem; color:var(--text-2); white-space:nowrap;">Scheduled Days</label>
            <div class="type-tabs" style="display:flex; gap:2px; flex:1; max-width:260px;">
              ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => 
                `<button type="button" class="type-tab day-tab ${scheduledDays.includes(i) ? 'active' : ''}" data-day="${i}" style="flex:1; padding:4px 0; font-size:0.7rem; text-align:center; min-width:0; ${isReadOnly ? 'pointer-events:none; opacity:0.7;' : ''}">${d}</button>`
              ).join('')}
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:12px;">
            <label style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:var(--text-2); cursor:pointer;">
              <input type="checkbox" id="qm-time-window-check" ${hasTimeWindow ? 'checked' : ''} ${dis} style="accent-color:var(--primary);">
              Time Window
            </label>
            <div id="qm-time-window-fields" style="display:${hasTimeWindow ? 'flex' : 'none'}; gap:8px; flex:1; align-items:center;">
              <input id="qm-time-start" type="time" value="${timeWindow.start}" ${dis} style="background:transparent; border:1px solid var(--border); border-radius:6px; padding:4px 8px; font-size:0.75rem; color:var(--text-1);">
              <span style="color:var(--text-3); font-size:0.7rem;">to</span>
              <input id="qm-time-end" type="time" value="${timeWindow.end}" ${dis} style="background:transparent; border:1px solid var(--border); border-radius:6px; padding:4px 8px; font-size:0.75rem; color:var(--text-1);">
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <label style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:var(--text-2); cursor:pointer;">
              <input type="checkbox" id="qm-has-time-limit" ${hasTimeLimit ? 'checked' : ''} ${dis} style="accent-color:var(--primary);">
              Expire Timer
            </label>
            <div id="qm-time-limit-fields" style="display:${hasTimeLimit ? 'flex' : 'none'}; align-items:center; gap:6px;">
              <input id="qm-time-limit-duration" type="number" min="0.1" step="0.1" value="${it.timeLimitHours || 24}" ${dis} style="width:60px; background:transparent; border:1px solid var(--border); border-radius:6px; padding:4px 8px; font-size:0.75rem; color:var(--text-1);">
              <span style="font-size:0.7rem; color:var(--text-3);">hrs</span>
            </div>
            <label style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:var(--text-2); cursor:pointer;">
              <input type="checkbox" id="qm-neg-miss" ${isNegativeOnMiss ? 'checked' : ''} ${dis} style="accent-color:var(--primary);">
              Penalty (Miss)
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:var(--text-2); cursor:pointer;">
              <input type="checkbox" id="qm-neg-complete" ${isNegativeOnComplete ? 'checked' : ''} ${dis} style="accent-color:var(--primary);">
              Penalty (Done)
            </label>
          </div>
        </div>
        
        <!-- Progress Tracker -->
        <div id="qm-pi-fields" style="display:${hasPI ? 'flex' : 'none'}; align-items:center; gap:12px; margin-bottom:16px; padding:12px; background:var(--bg-raised); border-radius:8px;">
          <label style="font-size:0.75rem; color:var(--text-2);">Tracker</label>
          <select id="qm-pi-type" style="background:transparent; border:1px solid var(--border); border-radius:6px; padding:6px 8px; font-size:0.75rem; color:var(--text-1);" ${dis}>
            <option value="manual" ${piType === 'manual' ? 'selected' : ''}>Slider (0-100%)</option>
            <option value="checks" ${piType === 'checks' ? 'selected' : ''}>Checklists</option>
            <option value="timer" ${piType === 'timer' ? 'selected' : ''}>Time Tracker</option>
          </select>
          
          <div id="qm-pi-checks-group" style="display:${piType === 'checks' ? 'flex' : 'none'}; align-items:center; gap:6px;">
            <span style="font-size:0.7rem; color:var(--text-3);">Steps</span>
            <input type="number" id="qm-pi-checks-count" min="1" max="20" value="${piChecksCount}" ${dis} style="width:50px; background:transparent; border:1px solid var(--border); border-radius:6px; padding:4px; font-size:0.75rem; color:var(--text-1);">
          </div>
          
          <div id="qm-pi-timer-group" style="display:${piType === 'timer' ? 'flex' : 'none'}; align-items:center; gap:6px;">
            <span style="font-size:0.7rem; color:var(--text-3);">Mins</span>
            <input type="number" id="qm-pi-timer-duration" min="1" max="600" value="${piTimerDuration}" ${dis} style="width:60px; background:transparent; border:1px solid var(--border); border-radius:6px; padding:4px; font-size:0.75rem; color:var(--text-1);">
          </div>
        </div>

      </div>
      <div class="modal-footer" style="padding:0; display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" style="background:transparent; border:none; color:var(--text-2); padding:8px 16px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer;" onclick="LM.components.questModal.close(); return false;">Cancel</button>
        ${!isReadOnly ? `<button type="button" id="qm-submit" style="background:var(--primary); color:#000; border:none; padding:8px 20px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:0.85rem;">${item ? 'Save' : 'Create'}</button>` : ''}
      </div>`;
  }

  function buildSkillRow(target, index, macros, isReadOnly = false) {
    const activeMacroId = target?.macroSkillId || (macros[0]?.id || '');
    const microSkills = activeMacroId ? S.getMicroSkills(activeMacroId) : [];
    const dis = isReadOnly ? 'disabled style="opacity: 0.7; pointer-events: none;"' : '';

    return `
      <div class="skill-row" data-idx="${index}" style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
        <select class="form-input skill-macro-sel" style="flex: 1;" ${dis}>
          ${macros.map(m => `<option value="${m.id}" ${activeMacroId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
        </select>
        <select class="form-input skill-micro-sel" style="flex: 1;" ${dis}>
          <option value="">— No Micro Skill —</option>
          ${microSkills.map(ms =>
            `<option value="${ms.id}" ${target?.microSkillId === ms.id ? 'selected' : ''}>${ms.name}</option>`
          ).join('')}
        </select>
        <input class="form-input skill-xp-input" type="number" value="${target?.xpAmount || 20}" min="1" style="width: 85px; text-align: center;" ${dis}>
        ${!isReadOnly ? `<button type="button" class="btn-remove-row" onclick="this.closest('.skill-row').remove(); return false;">✕</button>` : ''}
      </div>`;
  }

  function initEvents(modal, presets, macros) {
    // Advanced Config toggle
    const advToggle = document.getElementById('qm-advanced-enable');
    const advContent = document.getElementById('qm-advanced-content');
    if (advToggle && advContent) {
      advToggle.addEventListener('change', () => {
        advContent.style.display = advToggle.checked ? 'flex' : 'none';
      });
    }

    // Progress Indicator collapsible toggle
    const piToggle = document.getElementById('qm-pi-enable');
    const piContent = document.getElementById('qm-pi-fields');
    if (piToggle && piContent) {
      piToggle.addEventListener('change', () => {
        piContent.style.display = piToggle.checked ? 'flex' : 'none';
      });
    }



    // Quest Type toggle
    const typeSel = document.getElementById('qm-type');
    const statFields = document.getElementById('qm-statistic-fields');
    if (typeSel && statFields) {
      typeSel.addEventListener('change', () => {
        statFields.style.display = typeSel.value === 'statistic' ? 'flex' : 'none';
      });
    }

    // Progress Indicator type options toggle
    const piTypeSel = document.getElementById('qm-pi-type');
    const piChecksGroup = document.getElementById('qm-pi-checks-group');
    const piTimerGroup = document.getElementById('qm-pi-timer-group');
    if (piTypeSel && piChecksGroup && piTimerGroup) {
      piTypeSel.addEventListener('change', () => {
        const val = piTypeSel.value;
        piChecksGroup.style.display = val === 'checks' ? 'block' : 'none';
        piTimerGroup.style.display = val === 'timer' ? 'block' : 'none';
      });
    }

    // Day tabs toggle
    modal.querySelectorAll('.day-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        btn.classList.toggle('active');
      });
    });

    // Time window display toggle
    const twCheck = document.getElementById('qm-time-window-check');
    const twFields = document.getElementById('qm-time-window-fields');
    if (twCheck && twFields) {
      twCheck.addEventListener('change', () => {
        twFields.style.display = twCheck.checked ? 'flex' : 'none';
      });
    }

    // Expiration display toggle
    const extCheck = document.getElementById('qm-has-time-limit');
    const extFields = document.getElementById('qm-time-limit-fields');
    if (extCheck && extFields) {
      extCheck.addEventListener('change', () => {
        extFields.style.display = extCheck.checked ? 'flex' : 'none';
      });
    }

    // Add skill row
    document.getElementById('qm-add-skill')?.addEventListener('click', (e) => {
      e.preventDefault();
      const list = document.getElementById('qm-skills-list');
      const idx = list.children.length;
      const div = document.createElement('div');
      div.innerHTML = buildSkillRow(null, idx, macros);
      list.appendChild(div.firstElementChild);
      initMacroSelChange(list.lastElementChild);
    });

    modal.querySelectorAll('.skill-row').forEach(row => initMacroSelChange(row));

    // Preset dropdown auto-fill logic (Only in Quest Mode)
    const presetSelect = document.getElementById('qm-preset-select');
    if (presetSelect) {
      presetSelect.addEventListener('change', () => {
        const presetId = presetSelect.value;
        if (!presetId) return;

        const preset = presets.find(p => p.id === presetId);
        if (!preset) return;

        // 1. Fill Name
        const nameInput = document.getElementById('qm-name');
        if (nameInput) {
          nameInput.value = preset.name;
        }

        // 2. Fill Skills
        const skillsList = document.getElementById('qm-skills-list');
        if (skillsList && preset.targetSkills) {
          skillsList.innerHTML = preset.targetSkills.map((t, i) => buildSkillRow(t, i, macros)).join('');
          skillsList.querySelectorAll('.skill-row').forEach(row => initMacroSelChange(row));
        }

        // 3. Fill Advanced options
        // Days
        modal.querySelectorAll('.day-tab').forEach(btn => {
          const day = parseInt(btn.dataset.day);
          btn.classList.toggle('active', preset.scheduledDays.includes(day));
        });

        // Time window
        const presetHasTW = !!preset.timeWindow;
        if (twCheck) twCheck.checked = presetHasTW;
        if (twFields) twFields.style.display = presetHasTW ? 'flex' : 'none';
        if (presetHasTW) {
          document.getElementById('qm-time-start').value = preset.timeWindow.start;
          document.getElementById('qm-time-end').value = preset.timeWindow.end;
        }

        // Expiration
        const expirationCheck = document.getElementById('qm-has-time-limit');
        if (expirationCheck) {
          expirationCheck.checked = !!preset.hasTimeLimit;
          const extFields = document.getElementById('qm-time-limit-fields');
          if (extFields) extFields.style.display = preset.hasTimeLimit ? 'flex' : 'none';
          const extDuration = document.getElementById('qm-time-limit-duration');
          if (extDuration) extDuration.value = preset.timeLimitHours || 24;
        }

        // Penalties
        const negMiss = document.getElementById('qm-neg-miss');
        if (negMiss) negMiss.checked = !!preset.isNegativeOnMiss;
        const negComplete = document.getElementById('qm-neg-complete');
        if (negComplete) negComplete.checked = !!preset.isNegativeOnComplete;
        // Progress Indicator copy
        const piEnable = document.getElementById('qm-pi-enable');
        const piType = document.getElementById('qm-pi-type');
        const piChecksCount = document.getElementById('qm-pi-checks-count');
        const piTimerDuration = document.getElementById('qm-pi-timer-duration');
        const piFields = document.getElementById('qm-pi-fields');
        const piChecksGroup = document.getElementById('qm-pi-checks-group');
        const piTimerGroup = document.getElementById('qm-pi-timer-group');

        const presetHasPI = !!preset.progressIndicator;
        if (piEnable) piEnable.checked = presetHasPI;
        if (piFields) piFields.style.display = presetHasPI ? 'flex' : 'none';

        if (presetHasPI) {
          const pi = preset.progressIndicator;
          if (piType) piType.value = pi.type;
          if (piChecksCount && pi.checksCount) piChecksCount.value = pi.checksCount;
          if (piTimerDuration && pi.timerDuration) piTimerDuration.value = Math.round(pi.timerDuration / 60);
          
          if (piChecksGroup) piChecksGroup.style.display = pi.type === 'checks' ? 'block' : 'none';
          if (piTimerGroup) piTimerGroup.style.display = pi.type === 'timer' ? 'block' : 'none';
        }

        N.show(`Applied template settings from "${preset.name}"`, 'info');
      });
    }

    // AI Generate Quest Chain logic
    const aiGenBtn = document.getElementById('qm-ai-generate-btn');
    if (aiGenBtn) {
      aiGenBtn.addEventListener('click', async () => {
        const promptInput = document.getElementById('qm-ai-prompt');
        const statusDiv = document.getElementById('qm-ai-status');
        const prompt = promptInput?.value?.trim();
        if (!prompt) {
          N.show('Please enter a goal description first.', 'warning');
          return;
        }

        const settings = S.getSettings();
        if (!settings.geminiApiKey) {
          N.show('Please configure your Gemini API Key in Settings first.', 'warning');
          return;
        }

        aiGenBtn.disabled = true;
        if (statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.textContent = 'Generating quest chain with Gemini...';
          statusDiv.style.color = 'var(--accent)';
        }

        const systemInstruction = `You are a life RPG planning assistant. The user wants to achieve a goal. Break down the goal into a logical, sequential sequence of quests (at least 3-5 steps).
For each quest, return:
- title: concise, actionable task name.
- macroCategory: the high-level category representing the main skill targeted. Choose EXACTLY one of: "Mind", "Body", "Soul", "Work" (or "Creative" if it fits work/learning).
- timeLimitHours: numeric duration in hours representing expiration (e.g. 1.5, 3, 24).

You MUST return a JSON object with this exact structure:
{
  "quests": [
    {
      "title": "Quest Name",
      "macroCategory": "Mind",
      "timeLimitHours": 2
    }
  ]
}`;

        try {
          const response = await window.LM.aiEngine.generateContent(prompt, systemInstruction);
          if (response.error) {
            throw new Error(response.error);
          }

          let jsonText = response.data.candidates[0].content.parts[0].text;
          // Clean up markdown block if returned
          jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
          
          const parsed = JSON.parse(jsonText);
          if (!parsed.quests || !Array.isArray(parsed.quests)) {
            throw new Error("Invalid response format received from AI.");
          }

          S.addQuestChain(parsed);
          N.show(`Successfully generated and added a chain of ${parsed.quests.length} quests!`, 'success');
          close();
          window.LM.router.render(); // Redraw dashboard to show new quests
        } catch (err) {
          console.error("AI Generation failed:", err);
          if (statusDiv) {
            statusDiv.textContent = `Error: ${err.message}`;
            statusDiv.style.color = 'var(--danger)';
          }
          N.show(`AI Generation failed: ${err.message}`, 'danger');
        } finally {
          aiGenBtn.disabled = false;
        }
      });
    }

    // Submit
    document.getElementById('qm-submit')?.addEventListener('click', submit);
  }

  function initMacroSelChange(row) {
    const macroSel = row.querySelector('.skill-macro-sel');
    const microSel = row.querySelector('.skill-micro-sel');
    if (!macroSel || !microSel) return;
    macroSel.addEventListener('change', () => {
      const micros = S.getMicroSkills(macroSel.value);
      microSel.innerHTML = `<option value="">— No Micro Skill —</option>` +
        micros.map(ms => `<option value="${ms.id}">${ms.name}</option>`).join('');
    });
  }

  let _submitting = false;
  function submit(e) {
    if (e) e.preventDefault();
    if (_submitting) return;
    const name = document.getElementById('qm-name')?.value?.trim();
    if (!name) { N.show('Name is required', 'warning'); return; }
    _submitting = true;
    const submitBtn = document.getElementById('qm-submit');
    if (submitBtn) submitBtn.disabled = true;

    const desc = document.getElementById('qm-desc')?.value?.trim() || '';

    // Collect active days
    const scheduledDays = [];
    document.querySelectorAll('.day-tab.active').forEach(btn => {
      scheduledDays.push(parseInt(btn.dataset.day));
    });

    // Collect time window bounds
    const twCheck = document.getElementById('qm-time-window-check')?.checked || false;
    let timeWindow = null;
    if (twCheck) {
      const start = document.getElementById('qm-time-start')?.value || '09:00';
      const end = document.getElementById('qm-time-end')?.value || '17:00';
      timeWindow = { start, end };
    }

    // Collect timer flags
    const hasTimeLimit = document.getElementById('qm-has-time-limit')?.checked || false;
    const timeLimitHours = parseFloat(document.getElementById('qm-time-limit-duration')?.value || 24);
    const isNegativeOnMiss = document.getElementById('qm-neg-miss')?.checked || false;
    const isNegativeOnComplete = document.getElementById('qm-neg-complete')?.checked || false;

    // Collect skill rewards
    const targetSkills = [];
    document.querySelectorAll('#qm-skills-list .skill-row').forEach(row => {
      const macroId = row.querySelector('.skill-macro-sel')?.value;
      const microId = row.querySelector('.skill-micro-sel')?.value || null;
      const xp = parseFloat(row.querySelector('.skill-xp-input')?.value || 20);
      if (macroId) {
        targetSkills.push({ macroSkillId: macroId, microSkillId: microId, xpAmount: isNaN(xp) ? 20 : xp });
      }
    });

    if (targetSkills.length === 0) {
      N.show('Add at least one skill reward', 'warning');
      _submitting = false;
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    // Gather Progress Indicator details
    const piEnable = document.getElementById('qm-pi-enable')?.checked || false;
    let progressIndicator = null;
    if (piEnable) {
      const type = document.getElementById('qm-pi-type')?.value || 'manual';
      const checksCount = parseInt(document.getElementById('qm-pi-checks-count')?.value || 4);
      const durationMin = parseFloat(document.getElementById('qm-pi-timer-duration')?.value || 20);

      const existingItem = editingId ? (isPresetMode ? S.getPreset(editingId) : S.getQuest(editingId)) : null;
      const existingPI = existingItem?.progressIndicator;

      progressIndicator = {
        type,
        value: existingPI && existingPI.type === type ? existingPI.value : 0,
        checksCount,
        checklist: existingPI && existingPI.type === type && existingPI.checklist && existingPI.checklist.length === checksCount 
          ? existingPI.checklist 
          : Array(checksCount).fill(false),
        timerDuration: durationMin * 60,
        timerRemaining: existingPI && existingPI.type === type ? existingPI.timerRemaining : durationMin * 60,
        timerEndTime: existingPI && existingPI.type === type ? existingPI.timerEndTime : 0,
        timerIsRunning: existingPI && existingPI.type === type ? existingPI.timerIsRunning : false
      };
    }


    // ── SAVE PRESET MODE ──
    if (isPresetMode) {
      const preset = {
        id: editingId || S.uid(),
        name,
        description: desc,
        targetSkills,
        scheduledDays: scheduledDays.length ? scheduledDays : [0,1,2,3,4,5,6],
        timeWindow,
        hasTimeLimit,
        timeLimitHours,
        isNegativeOnMiss,
        isNegativeOnComplete,
        progressIndicator
      };
      
      S.upsertPreset(preset);
      close();
      N.show(`Preset template "${name}" saved!`, 'success');
      window.LM.router.render(); // Refreshes Settings list
      return;
    }

    // ── SAVE QUEST MODE ──
    const presetId = document.getElementById('qm-preset-select')?.value || null;
    const existing = editingId ? S.getQuest(editingId) : null;
    
    const questType = document.getElementById('qm-type')?.value || 'task';

    const quest = {
      id: editingId || S.uid(),
      name,
      description: desc,
      type: questType,
      presetId,
      status: existing?.status || 'active',
      scheduledDate: existing?.scheduledDate || new Date().toDateString(),
      createdAt: existing?.createdAt || Date.now(),
      timeLimitHours,
      expiresAt: hasTimeLimit ? (existing?.expiresAt || (Date.now() + timeLimitHours * 60 * 60 * 1000)) : null,
      timeWindow,
      scheduledDays: scheduledDays.length ? scheduledDays : [0,1,2,3,4,5,6],
      isNegativeOnMiss,
      isNegativeOnComplete,
      targetSkills,
      progressIndicator
    };

    if (questType === 'statistic') {
      quest.dailyGoal = parseFloat(document.getElementById('qm-stat-goal')?.value || 0);
      quest.unit = document.getElementById('qm-stat-unit')?.value?.trim() || '';
      quest.currentValue = existing?.currentValue || 0;
    }

    S.upsertQuest(quest);
    close();
    N.show(`Quest "${name}" saved!`, 'success');
  }

  return { open, close };
})();
