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
        <div class="modal-header" style="border-bottom:none; padding-bottom:0;">
          <h2 class="font-display" style="font-size:1.4rem; letter-spacing:0.05em; color:var(--text-1);">${item ? 'EDIT TEMPLATE' : 'CREATE NEW TEMPLATE'}</h2>
          <button type="button" class="modal-close" onclick="LM.components.questModal.close(); return false;">✕</button>
        </div>
        <div class="modal-body" style="padding-top:10px;">
          
          <div style="margin-bottom:24px;">
            <input id="qm-name" type="text" placeholder="Template Name (e.g. Morning Routine)" value="${name}" style="width:100%; background:transparent; border:none; border-bottom:2px solid var(--border); padding:10px 0; font-size:1.6rem; font-weight:600; color:var(--text-1); outline:none; transition:border-color 0.3s;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
          </div>
          
          <div style="margin-bottom:24px;">
            <textarea id="qm-desc" placeholder="What does this template cover?" style="width:100%; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:12px; padding:16px; min-height:80px; color:var(--text-2); font-size:0.95rem; outline:none; resize:vertical; transition:border-color 0.3s;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">${description}</textarea>
          </div>

          <!-- Target Skills Box -->
          <div style="margin-bottom:24px; background:var(--bg-surface); border:1px solid var(--border); border-radius:14px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <label style="font-family:var(--font-display); font-size:0.8rem; letter-spacing:0.1em; color:var(--text-1);">XP REWARDS</label>
              <button type="button" id="qm-add-skill" style="background:rgba(255,255,255,0.1); border:none; color:var(--text-1); padding:4px 10px; border-radius:8px; font-size:0.75rem; font-weight:600; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">+ ADD</button>
            </div>
            <div id="qm-skills-list" style="display:flex; flex-direction:column; gap:12px;">
              ${targetSkills.length > 0 ? targetSkills.map((t, i) => buildSkillRow(t, i, macros)).join('') : buildSkillRow({ macroSkillId: defaultMacroId }, 0, macros)}
            </div>
            
            <!-- Scheduled Days -->
            <div style="margin-top:24px; margin-bottom:24px;">
              <label style="display:block; font-size:0.75rem; color:var(--text-3); margin-bottom:8px;">AUTO-SPAWN DAYS</label>
              <div class="type-tabs" style="display:flex; gap:4px; flex-wrap:wrap;">
                ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => 
                  `<button type="button" class="type-tab day-tab ${scheduledDays.includes(i) ? 'active' : ''}" data-day="${i}" style="flex:1; min-width:40px; padding:6px 0; text-align:center;">${d}</button>`
                ).join('')}
              </div>
            </div>

            <!-- Time Window Restrict -->
            <div style="margin-bottom:24px;">
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-1); cursor:pointer; margin-bottom:8px;">
                <input type="checkbox" id="qm-time-window-check" ${hasTimeWindow ? 'checked' : ''} style="accent-color:var(--primary);">
                Restrict to daily time window
              </label>
              <div id="qm-time-window-fields" style="display:${hasTimeWindow ? 'flex' : 'none'}; gap:12px; margin-top:8px;">
                <div style="flex:1;">
                  <label style="display:block; font-size:0.7rem; color:var(--text-3); margin-bottom:4px;">START</label>
                  <input id="qm-time-start" class="form-input" type="time" value="${timeWindow.start}" style="width:100%; padding:8px;">
                </div>
                <div style="flex:1;">
                  <label style="display:block; font-size:0.7rem; color:var(--text-3); margin-bottom:4px;">END</label>
                  <input id="qm-time-end" class="form-input" type="time" value="${timeWindow.end}" style="width:100%; padding:8px;">
                </div>
              </div>
            </div>

            <!-- Expiration & Penalties -->
            <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:24px;">
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-1); cursor:pointer;">
                <input type="checkbox" id="qm-has-time-limit" ${hasTimeLimit ? 'checked' : ''} style="accent-color:var(--primary);">
                Enable Expiration Timer
              </label>
              <div id="qm-time-limit-fields" style="display:${hasTimeLimit ? 'flex' : 'none'}; gap:12px;">
                <div style="flex:1;">
                  <label style="display:block; font-size:0.7rem; color:var(--text-3); margin-bottom:4px;">DURATION (HOURS)</label>
                  <input id="qm-time-limit-duration" class="form-input" type="number" min="0.1" step="0.1" value="${it.timeLimitHours || 24}" style="width:100%; padding:8px;">
                </div>
              </div>
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-1); cursor:pointer;">
                <input type="checkbox" id="qm-neg-miss" ${isNegativeOnMiss ? 'checked' : ''} style="accent-color:var(--primary);">
                Penalty if missed
              </label>
              <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-1); cursor:pointer;">
                <input type="checkbox" id="qm-neg-complete" ${isNegativeOnComplete ? 'checked' : ''} style="accent-color:var(--primary);">
                Penalty on completion
              </label>
            </div>
            
            ${piAccordionHTML}
          </div>
        </div>
        <div class="modal-footer" style="border-top:1px solid var(--border); padding-top:20px; display:flex; justify-content:flex-end; gap:12px;">
          <button type="button" style="background:transparent; border:1px solid var(--border); color:var(--text-1); padding:10px 24px; border-radius:10px; font-weight:600; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'" onclick="LM.components.questModal.close(); return false;">Cancel</button>
          <button type="button" id="qm-submit" style="background:var(--primary); color:#000; border:none; padding:10px 28px; border-radius:10px; font-weight:bold; cursor:pointer; font-size:1rem; box-shadow:0 4px 14px rgba(42,157,143,0.3); transition:transform 0.1s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(42,157,143,0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 14px rgba(42,157,143,0.3)'">${item ? 'Save Template' : 'Create Template'}</button>
        </div>`;
    }

    // ── INDIVIDUAL QUEST MODE HTML ──
    return `
      <div class="modal-header" style="border-bottom:none; padding-bottom:0;">
        <h2 class="font-display" style="font-size:1.4rem; letter-spacing:0.05em; color:var(--text-1);">${item ? (isReadOnly ? 'VIEW QUEST' : 'EDIT QUEST') : 'CREATE NEW QUEST'}</h2>
        <button type="button" class="modal-close" onclick="LM.components.questModal.close(); return false;">✕</button>
      </div>
      <div class="modal-body" style="padding-top:10px;">
        
        <!-- Status Badge -->
        ${isReadOnly ? `
          <div style="background:var(--bg-raised); border-radius:12px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
            <span style="font-size:0.8rem; font-family:var(--font-display); letter-spacing:0.1em; color:var(--text-2);">STATUS</span>
            <span class="quest-type-badge" style="background:${it.status === 'completed' ? 'rgba(16,185,129,0.15)' : it.status === 'missed' ? 'rgba(239,68,68,0.15)' : 'rgba(120,120,140,0.15)'}; color:${it.status === 'completed' ? 'var(--success)' : it.status === 'missed' ? 'var(--danger)' : 'var(--text-2)'}; border:1px solid currentColor;">${it.status.toUpperCase()}</span>
          </div>
        ` : ''}

        <!-- Big Name Input -->
        <div style="margin-bottom:24px;">
           <input id="qm-name" type="text" placeholder="What is your objective?" value="${name}" ${dis} style="width:100%; background:transparent; border:none; border-bottom:2px solid var(--border); padding:10px 0; font-size:1.6rem; font-weight:600; color:var(--text-1); outline:none; transition:border-color 0.3s;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
        </div>

        <div style="display:flex; gap:16px; margin-bottom:24px;">
          <!-- Type Selection -->
          <div style="flex:1;">
            <label style="display:block; font-size:0.75rem; color:var(--text-3); margin-bottom:8px; font-family:var(--font-display); letter-spacing:0.05em;">QUEST TYPE</label>
            <select id="qm-type" class="form-input" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:10px; padding:12px; width:100%; font-weight:500;" ${dis}>
              <option value="task" ${typeValue !== 'statistic' ? 'selected' : ''}>Action Task</option>
              <option value="statistic" ${typeValue === 'statistic' ? 'selected' : ''}>Statistic Tracker</option>
            </select>
          </div>
          <!-- Preset -->
          <div style="flex:1; display:${isReadOnly ? 'none' : 'block'};">
            <label style="display:block; font-size:0.75rem; color:var(--text-3); margin-bottom:8px; font-family:var(--font-display); letter-spacing:0.05em;">TEMPLATE</label>
            <select id="qm-preset-select" class="form-input" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:10px; padding:12px; width:100%; font-weight:500;" ${dis}>
              <option value="">— Blank —</option>
              ${presets.map(p => `<option value="${p.id}" ${it.presetId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Statistic Fields -->
        <div id="qm-statistic-fields" style="display:${typeValue === 'statistic' ? 'flex' : 'none'}; gap:16px; margin-bottom:24px; background:rgba(255,255,255,0.02); padding:16px; border-radius:12px; border:1px solid var(--border);">
           <div style="flex:1;">
             <label style="display:block; font-size:0.75rem; color:var(--text-3); margin-bottom:8px;">DAILY GOAL</label>
             <input id="qm-stat-goal" type="number" placeholder="e.g. 2000" value="${it.dailyGoal || ''}" ${dis} style="width:100%; background:transparent; border:none; border-bottom:1px solid var(--border); padding:8px 0; font-size:1.2rem; color:var(--text-1); outline:none;">
           </div>
           <div style="flex:1;">
             <label style="display:block; font-size:0.75rem; color:var(--text-3); margin-bottom:8px;">UNIT (OPTIONAL)</label>
             <input id="qm-stat-unit" type="text" placeholder="e.g. kcal" value="${it.unit || ''}" ${dis} style="width:100%; background:transparent; border:none; border-bottom:1px solid var(--border); padding:8px 0; font-size:1.2rem; color:var(--text-1); outline:none;">
           </div>
        </div>
        
        <!-- Description -->
        <div style="margin-bottom:24px;">
          <textarea id="qm-desc" placeholder="Add some notes or details..." ${dis} style="width:100%; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:12px; padding:16px; min-height:80px; color:var(--text-2); font-size:0.95rem; outline:none; resize:vertical; transition:border-color 0.3s;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">${description}</textarea>
        </div>

        <!-- Target Skills Box -->
        <div style="margin-bottom:24px; background:var(--bg-surface); border:1px solid var(--border); border-radius:14px; padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <label style="font-family:var(--font-display); font-size:0.8rem; letter-spacing:0.1em; color:var(--text-1);">XP REWARDS</label>
            ${!isReadOnly ? `<button type="button" id="qm-add-skill" style="background:rgba(255,255,255,0.1); border:none; color:var(--text-1); padding:4px 10px; border-radius:8px; font-size:0.75rem; font-weight:600; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">+ ADD</button>` : ''}
          </div>
          <div id="qm-skills-list" style="display:flex; flex-direction:column; gap:12px;">
            ${targetSkills.length > 0 ? targetSkills.map((t, i) => buildSkillRow(t, i, macros, isReadOnly)).join('') : buildSkillRow({ macroSkillId: defaultMacroId }, 0, macros, isReadOnly)}
          </div>
        </div>

        <!-- Config Toggles -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
          <label style="display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:16px; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
            <input type="checkbox" id="qm-advanced-enable" ${hasTimeWindow || hasTimeLimit || isNegativeOnMiss || isNegativeOnComplete || scheduledDays.length < 7 ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--primary);cursor:pointer;" ${dis}>
            <span style="font-weight:600; font-size:0.85rem;">Constraints</span>
          </label>
          <label style="display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:16px; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
            <input type="checkbox" id="qm-pi-enable" ${hasPI ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--primary);cursor:pointer;" ${dis}>
            <span style="font-weight:600; font-size:0.85rem;">Progress Tracker</span>
          </label>
        </div>

        <!-- Advanced Content Hidden Panel -->
        <div id="qm-advanced-content" style="display:${hasTimeWindow || hasTimeLimit || isNegativeOnMiss || isNegativeOnComplete || scheduledDays.length < 7 ? 'flex' : 'none'}; flex-direction:column; gap:16px; background:rgba(255,255,255,0.01); border:1px solid var(--border); border-radius:12px; padding:20px; margin-bottom:16px;">
          <!-- Scheduled Days -->
          <div>
            <label style="display:block; font-size:0.75rem; color:var(--text-3); margin-bottom:8px;">SCHEDULED DAYS</label>
            <div class="type-tabs" style="display:flex; gap:4px; flex-wrap:wrap;">
              ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => 
                `<button type="button" class="type-tab day-tab ${scheduledDays.includes(i) ? 'active' : ''}" data-day="${i}" style="flex:1; min-width:40px; padding:6px 0; text-align:center; ${isReadOnly ? 'pointer-events:none; opacity:0.7;' : ''}">${d}</button>`
              ).join('')}
            </div>
          </div>

          <!-- Time Window Restrict -->
          <div>
            <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-1); cursor:pointer; margin-bottom:8px;">
              <input type="checkbox" id="qm-time-window-check" ${hasTimeWindow ? 'checked' : ''} ${dis} style="accent-color:var(--primary);">
              Restrict to time window
            </label>
            <div id="qm-time-window-fields" style="display:${hasTimeWindow ? 'flex' : 'none'}; gap:12px; margin-top:8px;">
              <div style="flex:1;">
                <label style="display:block; font-size:0.7rem; color:var(--text-3); margin-bottom:4px;">START</label>
                <input id="qm-time-start" class="form-input" type="time" value="${timeWindow.start}" ${dis} style="width:100%; padding:8px;">
              </div>
              <div style="flex:1;">
                <label style="display:block; font-size:0.7rem; color:var(--text-3); margin-bottom:4px;">END</label>
                <input id="qm-time-end" class="form-input" type="time" value="${timeWindow.end}" ${dis} style="width:100%; padding:8px;">
              </div>
            </div>
          </div>

          <!-- Expiration & Penalties -->
          <div style="display:flex; flex-direction:column; gap:12px;">
            <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-1); cursor:pointer;">
              <input type="checkbox" id="qm-has-time-limit" ${hasTimeLimit ? 'checked' : ''} ${dis} style="accent-color:var(--primary);">
              Enable Expiration Timer
            </label>
            <div id="qm-time-limit-fields" style="display:${hasTimeLimit ? 'flex' : 'none'}; gap:12px;">
              <div style="flex:1;">
                <label style="display:block; font-size:0.7rem; color:var(--text-3); margin-bottom:4px;">DURATION (HOURS)</label>
                <input id="qm-time-limit-duration" class="form-input" type="number" min="0.1" step="0.1" value="${it.timeLimitHours || 24}" ${dis} style="width:100%; padding:8px;">
              </div>
            </div>
            <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-1); cursor:pointer;">
              <input type="checkbox" id="qm-neg-miss" ${isNegativeOnMiss ? 'checked' : ''} ${dis} style="accent-color:var(--primary);">
              Penalty if missed
            </label>
            <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-1); cursor:pointer;">
              <input type="checkbox" id="qm-neg-complete" ${isNegativeOnComplete ? 'checked' : ''} ${dis} style="accent-color:var(--primary);">
              Penalty on completion
            </label>
          </div>
        </div>
        
        <!-- Progress Hidden Panel -->
        <div id="qm-pi-fields" style="display:${hasPI ? 'flex' : 'none'}; flex-direction:column; gap:16px; background:rgba(255,255,255,0.01); border:1px solid var(--border); border-radius:12px; padding:20px; margin-bottom:16px;">
          <div>
            <label style="display:block; font-size:0.75rem; color:var(--text-3); margin-bottom:8px;">TRACKER TYPE</label>
            <select id="qm-pi-type" class="form-input" style="width:100%; padding:10px;" ${dis}>
              <option value="manual" ${piType === 'manual' ? 'selected' : ''}>Manual Slider (0% - 100%)</option>
              <option value="checks" ${piType === 'checks' ? 'selected' : ''}>Checklists</option>
              <option value="timer" ${piType === 'timer' ? 'selected' : ''}>Time Tracker</option>
            </select>
          </div>
          
          <div id="qm-pi-checks-group" style="display:${piType === 'checks' ? 'block' : 'none'};">
            <label style="display:block; font-size:0.75rem; color:var(--text-3); margin-bottom:8px;">NUMBER OF STEPS</label>
            <input type="number" id="qm-pi-checks-count" class="form-input" min="1" max="20" value="${piChecksCount}" ${dis} style="width:100%; padding:10px;">
          </div>
          
          <div id="qm-pi-timer-group" style="display:${piType === 'timer' ? 'block' : 'none'};">
            <label style="display:block; font-size:0.75rem; color:var(--text-3); margin-bottom:8px;">DURATION (MINUTES)</label>
            <input type="number" id="qm-pi-timer-duration" class="form-input" min="1" max="600" value="${piTimerDuration}" ${dis} style="width:100%; padding:10px;">
          </div>
        </div>

        <!-- AI Gen -->
        ${!isReadOnly ? `
        <div style="border:1px dashed var(--accent); border-radius:12px; padding:20px; background:rgba(255, 74, 141, 0.03); text-align:center;">
          <div style="color:var(--accent); font-weight:bold; font-family:var(--font-display); letter-spacing:0.05em; margin-bottom:12px;">⚡ AI QUEST CHAIN GENERATOR</div>
          <textarea id="qm-ai-prompt" placeholder="e.g. 'Build a React project'..." style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,74,141,0.2); border-radius:8px; padding:12px; color:var(--text-1); font-size:0.95rem; margin-bottom:12px; resize:none; outline:none; min-height:70px; transition:border-color 0.2s;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,74,141,0.2)'"></textarea>
          <button type="button" id="qm-ai-generate-btn" style="background:var(--accent); color:#000; border:none; border-radius:8px; padding:10px 20px; font-weight:bold; cursor:pointer; width:100%; transition:opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">Generate Tasks</button>
          <div id="qm-ai-status" style="font-size:0.75rem; color:var(--text-3); margin-top:10px; display:none;">Thinking...</div>
        </div>
        ` : ''}

      </div>
      <div class="modal-footer" style="border-top:1px solid var(--border); padding-top:20px; display:flex; justify-content:flex-end; gap:12px;">
        <button type="button" style="background:transparent; border:1px solid var(--border); color:var(--text-1); padding:10px 24px; border-radius:10px; font-weight:600; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'" onclick="LM.components.questModal.close(); return false;">Cancel</button>
        ${!isReadOnly ? `<button type="button" id="qm-submit" style="background:var(--primary); color:#000; border:none; padding:10px 28px; border-radius:10px; font-weight:bold; cursor:pointer; font-size:1rem; box-shadow:0 4px 14px rgba(42,157,143,0.3); transition:transform 0.1s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(42,157,143,0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 14px rgba(42,157,143,0.3)'">${item ? 'Save Quest' : 'Create Quest'}</button>` : ''}
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
