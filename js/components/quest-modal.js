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
      <div class="modal-header" style="border-bottom:none; padding-bottom:0; display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
        <div>
          <div style="font-family:var(--font-display); font-size:0.6rem; letter-spacing:0.3em; color:var(--text-3); margin-bottom:4px;">LIFEMAXX // SYSTEM PRESET</div>
          <h2 class="font-display" style="font-size:1.4rem; letter-spacing:0.05em; color:var(--text-1); margin:0; text-shadow:0 0 10px rgba(255,255,255,0.2);">${item ? 'RECALIBRATE LOADOUT' : 'INITIALIZE LOADOUT'}</h2>
        </div>
        <button type="button" class="modal-close" style="background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:4px; color:var(--text-2); width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="LM.components.questModal.close(); return false;">✕</button>
      </div>
      <div class="modal-body cockpit-grid" style="padding-top:0; display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
        
        <!-- MAIN CALIBRATION PANEL -->
        <div style="grid-column: 1 / -1; background:linear-gradient(180deg, rgba(20,19,19,0.8) 0%, rgba(10,10,10,0.9) 100%); border:1px solid var(--border); border-radius:12px; padding:20px; box-shadow:inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.5);">
          <div style="font-size:0.65rem; color:var(--text-3); font-family:var(--font-display); letter-spacing:0.2em; margin-bottom:16px;">LOADOUT TARGET</div>
          <input id="qm-name" type="text" placeholder="ENTER LOADOUT DESIGNATION..." value="${name}" ${dis} style="width:100%; background:transparent; border:none; border-bottom:2px solid var(--primary); padding:10px 0; font-size:1.5rem; font-family:var(--font-display); letter-spacing:0.02em; color:var(--text-1); outline:none; text-shadow:0 0 12px rgba(255,255,255,0.3); margin-bottom:20px;">
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div>
              <label style="display:block; font-size:0.65rem; color:var(--text-3); margin-bottom:6px; font-family:var(--font-display); letter-spacing:0.1em;">CLASS</label>
              <select id="qm-type" style="width:100%; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:6px; padding:10px 12px; font-size:0.85rem; color:var(--text-2); outline:none;" ${dis}>
                <option value="task" ${typeValue !== 'statistic' ? 'selected' : ''}>Action Task [EXECUTE]</option>
                <option value="statistic" ${typeValue === 'statistic' ? 'selected' : ''}>Statistic [MONITOR]</option>
              </select>
            </div>
            <div>
               <!-- Empty for symmetry in preset mode -->
            </div>
          </div>

          <div id="qm-statistic-fields" style="display:${typeValue === 'statistic' ? 'grid' : 'none'}; grid-template-columns:1fr 1fr; gap:16px; margin-top:16px; padding-top:16px; border-top:1px dashed var(--border);">
            <div>
              <label style="display:block; font-size:0.65rem; color:var(--text-3); margin-bottom:6px; font-family:var(--font-display); letter-spacing:0.1em;">DEFAULT TARGET</label>
              <input id="qm-stat-goal" type="number" placeholder="0" value="${it.dailyGoal || ''}" ${dis} style="width:100%; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:6px; padding:10px 12px; font-size:1.1rem; color:var(--text-1); font-family:monospace; outline:none;">
            </div>
            <div>
              <label style="display:block; font-size:0.65rem; color:var(--text-3); margin-bottom:6px; font-family:var(--font-display); letter-spacing:0.1em;">UNIT DIMENSION</label>
              <input id="qm-stat-unit" type="text" placeholder="e.g. rep" value="${it.unit || ''}" ${dis} style="width:100%; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:6px; padding:10px 12px; font-size:1.1rem; color:var(--text-1); font-family:monospace; outline:none;">
            </div>
          </div>
        </div>
        
        <!-- REWARD MATRIX PANEL -->
        <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:8px; margin-bottom:12px;">
            <div style="font-size:0.65rem; color:var(--primary); font-family:var(--font-display); letter-spacing:0.2em;">REWARD MATRIX</div>
            ${!isReadOnly ? `<button type="button" id="qm-add-skill" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:4px; color:var(--text-1); font-size:0.6rem; padding:2px 6px; cursor:pointer;">ADD INJECTION</button>` : ''}
          </div>
          <div id="qm-skills-list" style="display:flex; flex-direction:column; gap:8px; overflow-y:auto; max-height:140px; flex:1;">
            ${targetSkills.length > 0 ? targetSkills.map((t, i) => buildSkillRow(t, i, macros, isReadOnly)).join('') : buildSkillRow({ macroSkillId: defaultMacroId }, 0, macros, isReadOnly)}
          </div>
        </div>

        <!-- TELEMETRY / NOTES PANEL -->
        <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; flex-direction:column;">
          <div style="font-size:0.65rem; color:var(--text-3); font-family:var(--font-display); letter-spacing:0.2em; border-bottom:1px solid var(--border); padding-bottom:8px; margin-bottom:12px;">TELEMETRY / NOTES</div>
          <textarea id="qm-desc" placeholder="Append operational details..." ${dis} style="flex:1; width:100%; background:rgba(0,0,0,0.3); border:1px solid transparent; border-radius:6px; padding:10px; color:var(--text-2); font-size:0.85rem; outline:none; resize:none; font-family:monospace;"></textarea>
        </div>

        <!-- COCKPIT TOGGLES -->
        <div style="grid-column: 1 / -1; display:flex; gap:16px; margin-top:8px;">
          <label style="flex:1; display:flex; align-items:center; gap:10px; background:var(--bg-raised); border:1px solid var(--border); border-radius:8px; padding:12px; cursor:pointer;">
            <input type="checkbox" id="qm-advanced-enable" ${hasTimeWindow || hasTimeLimit || isNegativeOnMiss || isNegativeOnComplete ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);" ${dis}>
            <span style="font-size:0.75rem; font-family:var(--font-display); letter-spacing:0.1em; color:var(--text-1);">CHRONO CONSTRAINTS</span>
          </label>
          <label style="flex:1; display:flex; align-items:center; gap:10px; background:var(--bg-raised); border:1px solid var(--border); border-radius:8px; padding:12px; cursor:pointer;">
            <input type="checkbox" id="qm-pi-enable" ${hasPI ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);" ${dis}>
            <span style="font-size:0.75rem; font-family:var(--font-display); letter-spacing:0.1em; color:var(--text-1);">PROGRESS ENGINE</span>
          </label>
        </div>

        <!-- CHRONO CONSTRAINTS PANEL -->
        <div id="qm-advanced-content" style="grid-column: 1 / -1; display:${hasTimeWindow || hasTimeLimit || isNegativeOnMiss || isNegativeOnComplete ? 'grid' : 'none'}; grid-template-columns:1fr 1fr; gap:16px; background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:16px;">
          
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:6px; padding:10px;">
              <label style="display:flex; align-items:center; gap:8px; font-size:0.75rem; color:var(--text-2); cursor:pointer;">
                <input type="checkbox" id="qm-time-window-check" ${hasTimeWindow ? 'checked' : ''} ${dis} style="accent-color:var(--primary);">
                ENFORCE TIME WINDOW
              </label>
              <div id="qm-time-window-fields" style="display:${hasTimeWindow ? 'flex' : 'none'}; gap:8px; margin-top:10px; align-items:center;">
                <input id="qm-time-start" type="time" value="${timeWindow.start}" ${dis} style="background:var(--bg-raised); border:1px solid var(--border); border-radius:4px; padding:6px 8px; font-size:0.85rem; color:var(--text-1); font-family:monospace;">
                <span style="color:var(--text-3); font-size:0.7rem;">//</span>
                <input id="qm-time-end" type="time" value="${timeWindow.end}" ${dis} style="background:var(--bg-raised); border:1px solid var(--border); border-radius:4px; padding:6px 8px; font-size:0.85rem; color:var(--text-1); font-family:monospace;">
              </div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px; justify-content:center;">
            <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:6px; padding:10px;">
              <label style="display:flex; align-items:center; gap:8px; font-size:0.75rem; color:var(--text-2); cursor:pointer;">
                <input type="checkbox" id="qm-has-time-limit" ${hasTimeLimit ? 'checked' : ''} ${dis} style="accent-color:var(--primary);">
                EXPIRATION TIMER
              </label>
              <div id="qm-time-limit-fields" style="display:${hasTimeLimit ? 'flex' : 'none'}; align-items:center; gap:8px; margin-top:10px;">
                <input id="qm-time-limit-duration" type="number" min="0.1" step="0.1" value="${it.timeLimitHours || 24}" ${dis} style="width:70px; background:var(--bg-raised); border:1px solid var(--border); border-radius:4px; padding:6px 8px; font-size:0.85rem; color:var(--text-1); font-family:monospace;">
                <span style="font-size:0.65rem; color:var(--text-3); font-family:var(--font-display); letter-spacing:0.1em;">HOURS</span>
              </div>
            </div>

            <div style="display:flex; gap:8px;">
              <label style="flex:1; display:flex; align-items:center; gap:6px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:6px; padding:8px; font-size:0.7rem; color:var(--danger); cursor:pointer;">
                <input type="checkbox" id="qm-neg-miss" ${isNegativeOnMiss ? 'checked' : ''} ${dis} style="accent-color:var(--danger);">
                PENALTY (MISS)
              </label>
              <label style="flex:1; display:flex; align-items:center; gap:6px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:6px; padding:8px; font-size:0.7rem; color:var(--success); cursor:pointer;">
                <input type="checkbox" id="qm-neg-complete" ${isNegativeOnComplete ? 'checked' : ''} ${dis} style="accent-color:var(--success);">
                PENALTY (DONE)
              </label>
            </div>
          </div>
        </div>
        
        <!-- PROGRESS ENGINE PANEL -->
        <div id="qm-pi-fields" style="grid-column: 1 / -1; display:${hasPI ? 'grid' : 'none'}; grid-template-columns:1fr 1fr; gap:16px; background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:16px;">
          <div>
            <label style="display:block; font-size:0.65rem; color:var(--text-3); margin-bottom:6px; font-family:var(--font-display); letter-spacing:0.1em;">ENGINE TYPE</label>
            <select id="qm-pi-type" style="width:100%; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:6px; padding:10px 12px; font-size:0.85rem; color:var(--text-1); outline:none;" ${dis}>
              <option value="manual" ${piType === 'manual' ? 'selected' : ''}>Slider Sensor (0-100%)</option>
              <option value="checks" ${piType === 'checks' ? 'selected' : ''}>Sub-routine Checklists</option>
              <option value="timer" ${piType === 'timer' ? 'selected' : ''}>Chrono Tracker</option>
            </select>
          </div>
          
          <div style="display:flex; align-items:flex-end;">
            <div id="qm-pi-checks-group" style="display:${piType === 'checks' ? 'block' : 'none'}; width:100%;">
              <label style="display:block; font-size:0.65rem; color:var(--text-3); margin-bottom:6px; font-family:var(--font-display); letter-spacing:0.1em;">SUB-ROUTINE COUNT</label>
              <input type="number" id="qm-pi-checks-count" min="1" max="20" value="${piChecksCount}" ${dis} style="width:100%; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:6px; padding:10px 12px; font-size:1.1rem; color:var(--text-1); font-family:monospace; outline:none;">
            </div>
            
            <div id="qm-pi-timer-group" style="display:${piType === 'timer' ? 'block' : 'none'}; width:100%;">
              <label style="display:block; font-size:0.65rem; color:var(--text-3); margin-bottom:6px; font-family:var(--font-display); letter-spacing:0.1em;">CHRONO DURATION (MIN)</label>
              <input type="number" id="qm-pi-timer-duration" min="1" max="600" value="${piTimerDuration}" ${dis} style="width:100%; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:6px; padding:10px 12px; font-size:1.1rem; color:var(--text-1); font-family:monospace; outline:none;">
            </div>
          </div>
        </div>

      </div>
      <div class="modal-footer" style="padding-top:20px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.05); margin-top:16px;">
        <div style="font-size:0.6rem; color:var(--text-3); font-family:monospace;">SYS.REQ // CONFIGURATION</div>
        <div style="display:flex; gap:12px;">
          <button type="button" style="background:transparent; border:1px solid var(--border); color:var(--text-2); padding:10px 24px; border-radius:6px; font-size:0.75rem; font-family:var(--font-display); letter-spacing:0.1em; cursor:pointer; text-transform:uppercase;" onclick="LM.components.questModal.close(); return false;">Abort</button>
          ${!isReadOnly ? `<button type="button" id="qm-submit" style="background:var(--text-1); color:#000; border:none; padding:10px 32px; border-radius:6px; font-weight:800; font-size:0.8rem; font-family:var(--font-display); letter-spacing:0.15em; cursor:pointer; text-transform:uppercase; box-shadow:0 0 15px rgba(255,255,255,0.2);">${item ? 'Commit' : 'Engage'}</button>` : ''}
        </div>
      </div>`;
    }

    // ── HUD COCKPIT LAYOUT HTML (INDIVIDUAL QUEST) ──
    return `
      <div class="modal-header" style="border-bottom:none; padding-bottom:0; display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
        <div>
          <div style="font-family:var(--font-display); font-size:0.6rem; letter-spacing:0.3em; color:var(--text-3); margin-bottom:4px;">LIFEMAXX // SYSTEM DIRECTIVE</div>
          <h2 class="font-display" style="font-size:1.4rem; letter-spacing:0.05em; color:var(--text-1); margin:0; text-shadow:0 0 10px rgba(255,255,255,0.2);">${item ? (isReadOnly ? 'VIEW DIRECTIVE' : 'RECALIBRATE DIRECTIVE') : 'INITIALIZE DIRECTIVE'}</h2>
        </div>
        <button type="button" class="modal-close" style="background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:4px; color:var(--text-2); width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="LM.components.questModal.close(); return false;">✕</button>
      </div>

      <div class="modal-body cockpit-grid" style="padding-top:0; display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
        
        <!-- MAIN CALIBRATION PANEL -->
        <div style="grid-column: 1 / -1; background:linear-gradient(180deg, rgba(20,19,19,0.8) 0%, rgba(10,10,10,0.9) 100%); border:1px solid var(--border); border-radius:12px; padding:20px; box-shadow:inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.5);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div style="font-size:0.65rem; color:var(--text-3); font-family:var(--font-display); letter-spacing:0.2em;">PRIMARY TARGET</div>
            ${isReadOnly ? `
              <div style="font-size:0.6rem; font-family:var(--font-display); letter-spacing:0.1em; color:${it.status === 'completed' ? 'var(--success)' : it.status === 'missed' ? 'var(--danger)' : 'var(--text-2)'}; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px; border:1px solid currentColor;">STATUS: ${it.status.toUpperCase()}</div>
            ` : ''}
          </div>
          
          <input id="qm-name" type="text" placeholder="ENTER DIRECTIVE PARAMETERS..." value="${name}" ${dis} style="width:100%; background:transparent; border:none; border-bottom:2px solid var(--primary); padding:10px 0; font-size:1.5rem; font-family:var(--font-display); letter-spacing:0.02em; color:var(--text-1); outline:none; text-shadow:0 0 12px rgba(255,255,255,0.3); margin-bottom:20px;">
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div>
              <label style="display:block; font-size:0.65rem; color:var(--text-3); margin-bottom:6px; font-family:var(--font-display); letter-spacing:0.1em;">CLASS</label>
              <select id="qm-type" style="width:100%; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:6px; padding:10px 12px; font-size:0.85rem; color:var(--text-2); outline:none;" ${dis}>
                <option value="task" ${typeValue !== 'statistic' ? 'selected' : ''}>Action Task [EXECUTE]</option>
                <option value="statistic" ${typeValue === 'statistic' ? 'selected' : ''}>Statistic [MONITOR]</option>
              </select>
            </div>
            <div style="display:${isReadOnly ? 'none' : 'block'};">
              <label style="display:block; font-size:0.65rem; color:var(--text-3); margin-bottom:6px; font-family:var(--font-display); letter-spacing:0.1em;">PRESET LOADOUT</label>
              <select id="qm-preset-select" style="width:100%; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:6px; padding:10px 12px; font-size:0.85rem; color:var(--primary); outline:none;" ${dis}>
                <option value="">— NULL —</option>
                ${presets.map(p => `<option value="${p.id}" ${it.presetId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <div id="qm-statistic-fields" style="display:${typeValue === 'statistic' ? 'grid' : 'none'}; grid-template-columns:1fr 1fr; gap:16px; margin-top:16px; padding-top:16px; border-top:1px dashed var(--border);">
            <div>
              <label style="display:block; font-size:0.65rem; color:var(--text-3); margin-bottom:6px; font-family:var(--font-display); letter-spacing:0.1em;">TARGET METRIC</label>
              <input id="qm-stat-goal" type="number" placeholder="0" value="${it.dailyGoal || ''}" ${dis} style="width:100%; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:6px; padding:10px 12px; font-size:1.1rem; color:var(--text-1); font-family:monospace; outline:none;">
            </div>
            <div>
              <label style="display:block; font-size:0.65rem; color:var(--text-3); margin-bottom:6px; font-family:var(--font-display); letter-spacing:0.1em;">UNIT DIMENSION</label>
              <input id="qm-stat-unit" type="text" placeholder="e.g. rep" value="${it.unit || ''}" ${dis} style="width:100%; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:6px; padding:10px 12px; font-size:1.1rem; color:var(--text-1); font-family:monospace; outline:none;">
            </div>
          </div>
        </div>

        <!-- REWARD MATRIX PANEL -->
        <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:8px; margin-bottom:12px;">
            <div style="font-size:0.65rem; color:var(--primary); font-family:var(--font-display); letter-spacing:0.2em;">REWARD MATRIX</div>
            ${!isReadOnly ? `<button type="button" id="qm-add-skill" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:4px; color:var(--text-1); font-size:0.6rem; padding:2px 6px; cursor:pointer;">ADD INJECTION</button>` : ''}
          </div>
          <div id="qm-skills-list" style="display:flex; flex-direction:column; gap:8px; overflow-y:auto; max-height:140px; flex:1;">
            ${targetSkills.length > 0 ? targetSkills.map((t, i) => buildSkillRow(t, i, macros, isReadOnly)).join('') : buildSkillRow({ macroSkillId: defaultMacroId }, 0, macros, isReadOnly)}
          </div>
        </div>

        <!-- TELEMETRY / NOTES PANEL -->
        <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; flex-direction:column;">
          <div style="font-size:0.65rem; color:var(--text-3); font-family:var(--font-display); letter-spacing:0.2em; border-bottom:1px solid var(--border); padding-bottom:8px; margin-bottom:12px;">TELEMETRY / NOTES</div>
          <textarea id="qm-desc" placeholder="Append operational details..." ${dis} style="flex:1; width:100%; background:rgba(0,0,0,0.3); border:1px solid transparent; border-radius:6px; padding:10px; color:var(--text-2); font-size:0.85rem; outline:none; resize:none; font-family:monospace;"></textarea>
        </div>

        <!-- AI OVERRIDE PANEL -->
        ${!isReadOnly ? `
        <div style="grid-column: 1 / -1; background:linear-gradient(90deg, rgba(255,74,141,0.05) 0%, rgba(0,0,0,0) 100%); border:1px solid rgba(255,74,141,0.2); border-left:4px solid var(--accent); border-radius:8px; padding:12px 16px; display:flex; gap:12px; align-items:center;">
          <div style="color:var(--accent); font-family:var(--font-display); font-size:1.2rem; text-shadow:0 0 8px var(--accent);">⚡</div>
          <input type="text" id="qm-ai-prompt" placeholder="AI OVERRIDE: Generate optimal task sequence (e.g. 'Leg Day')..." style="flex:1; background:transparent; border:none; color:var(--text-1); font-size:0.85rem; font-family:monospace; outline:none;">
          <button type="button" id="qm-ai-generate-btn" style="background:var(--accent); color:#000; border:none; border-radius:4px; padding:6px 16px; font-weight:800; font-size:0.7rem; letter-spacing:0.1em; cursor:pointer; text-transform:uppercase;">Execute</button>
          <div id="qm-ai-status" style="font-size:0.65rem; color:var(--accent); display:none; font-family:monospace;">PROCESSING...</div>
        </div>
        ` : ''}

        <!-- COCKPIT TOGGLES -->
        <div style="grid-column: 1 / -1; display:flex; gap:16px; margin-top:8px;">
          <label style="flex:1; display:flex; align-items:center; gap:10px; background:var(--bg-raised); border:1px solid var(--border); border-radius:8px; padding:12px; cursor:pointer;">
            <input type="checkbox" id="qm-advanced-enable" ${hasTimeWindow || hasTimeLimit || isNegativeOnMiss || isNegativeOnComplete || scheduledDays.length < 7 ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);" ${dis}>
            <span style="font-size:0.75rem; font-family:var(--font-display); letter-spacing:0.1em; color:var(--text-1);">CHRONO CONSTRAINTS</span>
          </label>
          <label style="flex:1; display:flex; align-items:center; gap:10px; background:var(--bg-raised); border:1px solid var(--border); border-radius:8px; padding:12px; cursor:pointer;">
            <input type="checkbox" id="qm-pi-enable" ${hasPI ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);" ${dis}>
            <span style="font-size:0.75rem; font-family:var(--font-display); letter-spacing:0.1em; color:var(--text-1);">PROGRESS ENGINE</span>
          </label>
        </div>

        <!-- CHRONO CONSTRAINTS PANEL -->
        <div id="qm-advanced-content" style="grid-column: 1 / -1; display:${hasTimeWindow || hasTimeLimit || isNegativeOnMiss || isNegativeOnComplete || scheduledDays.length < 7 ? 'grid' : 'none'}; grid-template-columns:1fr 1fr; gap:16px; background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:16px;">
          
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div>
              <label style="display:block; font-size:0.65rem; color:var(--text-3); margin-bottom:6px; font-family:var(--font-display); letter-spacing:0.1em;">ACTIVE CYCLE (DAYS)</label>
              <div class="type-tabs" style="display:flex; gap:2px;">
                ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => 
                  `<button type="button" class="type-tab day-tab ${scheduledDays.includes(i) ? 'active' : ''}" data-day="${i}" style="flex:1; padding:6px 0; font-size:0.75rem; font-family:monospace; text-align:center; min-width:0; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:4px; ${isReadOnly ? 'pointer-events:none; opacity:0.7;' : ''}">${d}</button>`
                ).join('')}
              </div>
            </div>

            <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:6px; padding:10px;">
              <label style="display:flex; align-items:center; gap:8px; font-size:0.75rem; color:var(--text-2); cursor:pointer;">
                <input type="checkbox" id="qm-time-window-check" ${hasTimeWindow ? 'checked' : ''} ${dis} style="accent-color:var(--primary);">
                ENFORCE TIME WINDOW
              </label>
              <div id="qm-time-window-fields" style="display:${hasTimeWindow ? 'flex' : 'none'}; gap:8px; margin-top:10px; align-items:center;">
                <input id="qm-time-start" type="time" value="${timeWindow.start}" ${dis} style="background:var(--bg-raised); border:1px solid var(--border); border-radius:4px; padding:6px 8px; font-size:0.85rem; color:var(--text-1); font-family:monospace;">
                <span style="color:var(--text-3); font-size:0.7rem;">//</span>
                <input id="qm-time-end" type="time" value="${timeWindow.end}" ${dis} style="background:var(--bg-raised); border:1px solid var(--border); border-radius:4px; padding:6px 8px; font-size:0.85rem; color:var(--text-1); font-family:monospace;">
              </div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px; justify-content:center;">
            <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border); border-radius:6px; padding:10px;">
              <label style="display:flex; align-items:center; gap:8px; font-size:0.75rem; color:var(--text-2); cursor:pointer;">
                <input type="checkbox" id="qm-has-time-limit" ${hasTimeLimit ? 'checked' : ''} ${dis} style="accent-color:var(--primary);">
                EXPIRATION TIMER
              </label>
              <div id="qm-time-limit-fields" style="display:${hasTimeLimit ? 'flex' : 'none'}; align-items:center; gap:8px; margin-top:10px;">
                <input id="qm-time-limit-duration" type="number" min="0.1" step="0.1" value="${it.timeLimitHours || 24}" ${dis} style="width:70px; background:var(--bg-raised); border:1px solid var(--border); border-radius:4px; padding:6px 8px; font-size:0.85rem; color:var(--text-1); font-family:monospace;">
                <span style="font-size:0.65rem; color:var(--text-3); font-family:var(--font-display); letter-spacing:0.1em;">HOURS</span>
              </div>
            </div>

            <div style="display:flex; gap:8px;">
              <label style="flex:1; display:flex; align-items:center; gap:6px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:6px; padding:8px; font-size:0.7rem; color:var(--danger); cursor:pointer;">
                <input type="checkbox" id="qm-neg-miss" ${isNegativeOnMiss ? 'checked' : ''} ${dis} style="accent-color:var(--danger);">
                PENALTY (MISS)
              </label>
              <label style="flex:1; display:flex; align-items:center; gap:6px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:6px; padding:8px; font-size:0.7rem; color:var(--success); cursor:pointer;">
                <input type="checkbox" id="qm-neg-complete" ${isNegativeOnComplete ? 'checked' : ''} ${dis} style="accent-color:var(--success);">
                PENALTY (DONE)
              </label>
            </div>
          </div>
        </div>
        
        <!-- PROGRESS ENGINE PANEL -->
        <div id="qm-pi-fields" style="grid-column: 1 / -1; display:${hasPI ? 'grid' : 'none'}; grid-template-columns:1fr 1fr; gap:16px; background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:16px;">
          <div>
            <label style="display:block; font-size:0.65rem; color:var(--text-3); margin-bottom:6px; font-family:var(--font-display); letter-spacing:0.1em;">ENGINE TYPE</label>
            <select id="qm-pi-type" style="width:100%; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:6px; padding:10px 12px; font-size:0.85rem; color:var(--text-1); outline:none;" ${dis}>
              <option value="manual" ${piType === 'manual' ? 'selected' : ''}>Slider Sensor (0-100%)</option>
              <option value="checks" ${piType === 'checks' ? 'selected' : ''}>Sub-routine Checklists</option>
              <option value="timer" ${piType === 'timer' ? 'selected' : ''}>Chrono Tracker</option>
            </select>
          </div>
          
          <div style="display:flex; align-items:flex-end;">
            <div id="qm-pi-checks-group" style="display:${piType === 'checks' ? 'block' : 'none'}; width:100%;">
              <label style="display:block; font-size:0.65rem; color:var(--text-3); margin-bottom:6px; font-family:var(--font-display); letter-spacing:0.1em;">SUB-ROUTINE COUNT</label>
              <input type="number" id="qm-pi-checks-count" min="1" max="20" value="${piChecksCount}" ${dis} style="width:100%; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:6px; padding:10px 12px; font-size:1.1rem; color:var(--text-1); font-family:monospace; outline:none;">
            </div>
            
            <div id="qm-pi-timer-group" style="display:${piType === 'timer' ? 'block' : 'none'}; width:100%;">
              <label style="display:block; font-size:0.65rem; color:var(--text-3); margin-bottom:6px; font-family:var(--font-display); letter-spacing:0.1em;">CHRONO DURATION (MIN)</label>
              <input type="number" id="qm-pi-timer-duration" min="1" max="600" value="${piTimerDuration}" ${dis} style="width:100%; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:6px; padding:10px 12px; font-size:1.1rem; color:var(--text-1); font-family:monospace; outline:none;">
            </div>
          </div>
        </div>

      </div>
      <div class="modal-footer" style="padding-top:20px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.05); margin-top:16px;">
        <div style="font-size:0.6rem; color:var(--text-3); font-family:monospace;">SYS.REQ // CONFIGURATION</div>
        <div style="display:flex; gap:12px;">
          <button type="button" style="background:transparent; border:1px solid var(--border); color:var(--text-2); padding:10px 24px; border-radius:6px; font-size:0.75rem; font-family:var(--font-display); letter-spacing:0.1em; cursor:pointer; text-transform:uppercase;" onclick="LM.components.questModal.close(); return false;">Abort</button>
          ${!isReadOnly ? `<button type="button" id="qm-submit" style="background:var(--text-1); color:#000; border:none; padding:10px 32px; border-radius:6px; font-weight:800; font-size:0.8rem; font-family:var(--font-display); letter-spacing:0.15em; cursor:pointer; text-transform:uppercase; box-shadow:0 0 15px rgba(255,255,255,0.2);">${item ? 'Commit' : 'Engage'}</button>` : ''}
        </div>
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
