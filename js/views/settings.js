window.LM.views.settings = (function () {
  const S = window.LM.store;
  const T = window.LM.components.theme;

  const MACRO_NAMES = {
    'Physique': ['Physique', 'Corpus', 'Forge', 'Brawn', 'Titan'],
    'Looks': ['Looks', 'Aura', 'Glow', 'Visage', 'Presence', 'Allure'],
    'Education': ['Education', 'Psyche', 'Mind', 'Logos', 'Gnosis', 'Intellect'],
    'Finance': ['Finance', 'Stack', 'Aurum', 'Wealth', 'Capital', 'Grind'],
    'Romance': ['Romance', 'Eros', 'Charm', 'Ardor', 'Bond', 'Allure'],
    'Creative': ['Creative', 'Craft', 'Opus', 'Flux', 'Vision', 'Genesis'],
    'Founder': ['Founder', 'Ascent', 'Empire', 'Drive', 'Hustle', 'Praxis'],
    'Character': ['Character', 'Core', 'Ethos', 'Grit', 'Valor', 'Virtue']
  };

  function getMacroCategory(name) {
    for (const [key, names] of Object.entries(MACRO_NAMES)) {
      if (names.includes(name)) return key;
    }
    return null;
  }

  function render() {
    const s = S.getSettings();
    const dragOn = s.dragToRegister !== false; // default true
    const deleteOn = s.deleteAfterDragged === true; // default false
    const historyBarOn = s.historyBarEnabled === true; // default false

    return `
      <div class="view-container">
        <div class="view-header">
          <h1 class="font-display">SETTINGS</h1>
        </div>
        
        <!-- Quest Presets Administration Section -->
        <div class="section-block">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="margin:0;">Quest Presets</h2>
            <button class="btn btn-primary btn-sm" id="btn-create-preset-settings">+ Create Preset</button>
          </div>
          <p style="font-size:0.8rem;color:var(--text-3);margin-top:4px;margin-bottom:16px;">
            Create custom quest templates. Quests will automatically spawn in your active list on scheduled days.
          </p>
          <div style="display:flex;flex-direction:column;gap:12px;" id="presets-list-container">
            ${S.getPresets().map(p => {
              const daysStr = p.scheduledDays.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ');
              const timeStr = p.timeWindow ? `${p.timeWindow.start} - ${p.timeWindow.end}` : 'Anytime';
              const xpSummary = p.targetSkills.map(ts => {
                const macro = S.getMacro(ts.macroSkillId);
                return `${macro ? macro.name : 'Skill'}: +${ts.xpAmount}xp`;
              }).join(', ');
              return `
                <div style="display:flex;flex-direction:column;gap:8px;background:var(--bg-raised);padding:14px;border-radius:10px;border:1px solid var(--border);">
                  <div style="display:flex;align-items:center;justify-content:space-between;">
                    <strong style="font-size:0.95rem;color:var(--text-1);">${p.name}</strong>
                    <div style="display:flex;gap:8px;">
                      <button class="btn-icon btn-edit-preset" data-id="${p.id}" title="Edit Preset">✎</button>
                      <button class="btn-icon danger btn-delete-preset" data-id="${p.id}" title="Delete Preset">✕</button>
                    </div>
                  </div>
                  <div style="font-size:0.8rem;color:var(--text-2);">${p.description || 'No description'}</div>
                  <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:0.75rem;color:var(--text-3);margin-top:4px;">
                    <span>📅 ${daysStr}</span>
                    <span>⏳ ${timeStr}</span>
                    <span style="color:var(--accent); font-weight:500;">★ ${xpSummary}</span>
                  </div>
                </div>
              `;
            }).join('') || `<div style="font-size:0.85rem;color:var(--text-3);text-align:center;padding:12px;">No quest presets created yet. Click "+ Create Preset" to start!</div>`}
          </div>
        </div>

        <!-- Grid Status Presets Administration Section -->
        <div class="section-block">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="margin:0;">Grid Status Presets</h2>
            <button class="btn btn-primary btn-sm" id="btn-create-grid-preset-settings">+ Custom Preset+</button>
          </div>
          <p style="font-size:0.8rem;color:var(--text-3);margin-top:4px;margin-bottom:16px;">
            Customize activity statuses for your 24-hour log grid in the Analysis tab.
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:12px;" id="grid-presets-list-container">
            ${S.getCellPresets().map(p => `
              <div style="display:flex;align-items:center;gap:12px;background:var(--bg-raised);padding:10px 16px;border-radius:12px;border:1px solid var(--border);flex:1;min-width:140px;">
                <div style="width:24px;height:24px;border-radius:6px;background:${p.color};display:flex;align-items:center;justify-content:center;">
                  <span class="material-symbols-outlined text-white" style="font-size:14px;">${p.icon}</span>
                </div>
                <div style="flex:1;">
                  <strong style="font-size:0.9rem;color:var(--text-1);">${p.label}</strong>
                  <div style="font-size:0.7rem;color:var(--text-3); opacity: 0.7;">ID: ${p.id}</div>
                </div>
                <div style="display:flex;gap:4px;">
                  <button class="btn-icon btn-edit-grid-preset" data-id="${p.id}" title="Edit Grid Preset" style="padding:4px;">✎</button>
                  <button class="btn-icon danger btn-delete-grid-preset" data-id="${p.id}" title="Delete Grid Preset" style="padding:4px;">✕</button>
                </div>
              </div>
            `).join('') || `<div style="font-size:0.85rem;color:var(--text-3);text-align:center;padding:12px;width:100%;">No grid presets.</div>`}
          </div>
        </div>

        <div class="section-block">
          <h2>Gameplay Mechanics</h2>
          <div class="form-group" style="margin-top:16px;gap:12px">
            <div>
              <label class="form-check" style="font-size:0.95rem;font-weight:500;">
                <input type="checkbox" id="set-drag" ${dragOn ? 'checked' : ''}>
                Drag to Register XP
              </label>
              <p style="font-size:0.8rem;color:var(--text-3);margin-left:24px;margin-top:4px;">
                If enabled, marking a quest complete requires you to physically drag it to the wheel to claim your XP.
              </p>
            </div>
            
            <div id="set-delete-wrap" style="opacity: ${dragOn ? '1' : '0.5'};transition:opacity 0.2s">
              <label class="form-check" style="font-size:0.95rem;font-weight:500;">
                <input type="checkbox" id="set-delete" ${deleteOn ? 'checked' : ''} ${!dragOn ? 'disabled' : ''}>
                Delete after dragged
              </label>
              <p style="font-size:0.8rem;color:var(--text-3);margin-left:24px;margin-top:4px;">
                If enabled, dragged quests are removed from the dashboard and only appear in the Quest Log.
              </p>
            </div>
            
            <div>
              <label class="form-check" style="font-size:0.95rem;font-weight:500;">
                <input type="checkbox" id="set-history-bar" ${historyBarOn ? 'checked' : ''}>
                History Bar Layout
              </label>
              <p style="font-size:0.8rem;color:var(--text-3);margin-left:24px;margin-top:4px;">
                Show a dual-wheel layout with a live activity feed on the Dashboard. Splits the XP wheel into Overall + Skill wheels with a scrollable history panel.
              </p>
              <div id="set-filling-indicator-wrap" style="margin-left:24px; margin-top:12px; display: ${historyBarOn ? 'block' : 'none'}; transition: opacity 0.2s;">
                <label class="form-check" style="font-size:0.88rem;font-weight:500;">
                  <input type="checkbox" id="set-filling-indicator" ${s.fillingIndicatorEnabled !== false ? 'checked' : ''}>
                  Filling Indicator
                </label>
                <p style="font-size:0.78rem;color:var(--text-3);margin-left:24px;margin-top:4px;">
                  When turned on, the wheels display the animated liquid wave filling. When turned off, they only show the rings.
                </p>
              </div>
            </div>
            <div>
              <label class="form-check" style="font-size:0.95rem;font-weight:500;">
                Quest Selector Style
              </label>
              <p style="font-size:0.8rem;color:var(--text-3);margin-left:24px;margin-top:4px;">
                Choose how you switch between Quests, Habituals, and Chains on the Dashboard.
              </p>
              <div style="margin-left:24px; margin-top:8px;">
                <select class="form-input" id="set-quest-selector" style="width:200px;padding:6px 10px;font-size:0.85rem;cursor:pointer;">
                  <option value="wheel" ${s.questSelectorStyle === 'wheel' ? 'selected' : ''}>Interactive Wheel</option>
                  <option value="arrows" ${s.questSelectorStyle === 'arrows' ? 'selected' : ''}>Dropdown Menu</option>
                  <option value="swipe" ${s.questSelectorStyle === 'swipe' ? 'selected' : ''}>Swipe Gestures</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="section-block" id="theme-settings-container">
          <h2>Appearance</h2>
          <div style="display:flex;flex-direction:column;gap:16px;margin-top:16px;">
            <div>
              <label class="form-check" style="font-size:0.95rem;font-weight:500;">
                <input type="checkbox" id="set-chrome-accents" ${s.chromeAccentsEnabled !== false ? 'checked' : ''}>
                Enable Chrome Accents
              </label>
              <p style="font-size:0.8rem;color:var(--text-3);margin-left:24px;margin-top:4px;">
                When enabled, primary UI elements will use a high-fidelity reflective chrome gradient. Disable to use your flat accent color.
              </p>
            </div>
            <!-- Theme selector removed. The app uses a unified Chrome design system now. -->
            <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:0.85rem;color:var(--text-2);font-family:var(--font-display);">ACCENT COLOR</span>
                <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                  <input type="color" id="accent-color-input" value="${s.accentColor || '#4a7cff'}" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;z-index:2;">
                  <div class="accent-dot" id="accent-dot" style="background:${s.accentColor || '#4a7cff'};position:absolute;inset:2px;z-index:1;pointer-events:none;border-radius:50%;border:2px solid var(--border);box-shadow:0 0 6px rgba(0,0,0,0.15);width:20px;height:20px;"></div>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" id="btn-reset-accent" style="padding:4px 8px;font-size:0.7rem;">Reset to Theme Default</button>
            </div>
          </div>
        </div>

        <div class="section-block" id="ai-settings-container">
          <h2>Intelligence Engine</h2>
          <div style="display:flex;flex-direction:column;gap:16px;margin-top:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
              <div style="flex:1;min-width:200px;">
                <div style="font-size:0.95rem;font-weight:500;margin-bottom:4px;">Gemini API Key</div>
                <div style="font-size:0.8rem;color:var(--text-3);">Configure your Google AI Studio Key for Intelligence features.</div>
              </div>
              <input type="password" class="form-input" id="input-gemini-key" value="${s.geminiApiKey || ''}" placeholder="AIzaSy..." style="width:250px;padding:8px 12px;font-size:0.85rem;">
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
              <div style="flex:1;min-width:200px;">
                <div style="font-size:0.95rem;font-weight:500;margin-bottom:4px;">AI Model</div>
                <div style="font-size:0.8rem;color:var(--text-3);">Choose the Gemini model version. Flash is faster; Pro is smarter.</div>
              </div>
              <select class="form-input" id="select-gemini-model" style="width:250px;padding:8px 12px;font-size:0.85rem;cursor:pointer;">
                <option value="gemini-3.5-flash" ${s.geminiModel === 'gemini-3.5-flash' ? 'selected' : ''}>Gemini 3.5 Flash (Latest)</option>
                <option value="gemini-2.0-flash" ${s.geminiModel === 'gemini-2.0-flash' || !s.geminiModel || (s.geminiModel && (s.geminiModel.includes('1.5') || s.geminiModel.includes('2.5'))) ? 'selected' : ''}>Gemini 2.0 Flash (Recommended/Free)</option>
                <option value="gemini-2.0-pro-exp-02-05" ${s.geminiModel === 'gemini-2.0-pro-exp-02-05' ? 'selected' : ''}>Gemini 2.0 Pro (Advanced/Smarter)</option>
              </select>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
              <div style="flex:1;min-width:200px;">
                <div style="font-size:0.95rem;font-weight:500;margin-bottom:4px;">Daily Limit Cap</div>
                <div style="font-size:0.8rem;color:var(--text-3);">Protect against excessive API calls. Set to a higher value for Pro/Paid tiers.</div>
              </div>
              <select class="form-input" id="select-gemini-quota" style="width:250px;padding:8px 12px;font-size:0.85rem;cursor:pointer;">
                <option value="20" ${s.geminiQuotaLimit === 20 ? 'selected' : ''}>20 calls (Old limit)</option>
                <option value="100" ${s.geminiQuotaLimit === 100 ? 'selected' : ''}>100 calls</option>
                <option value="500" ${s.geminiQuotaLimit === 500 ? 'selected' : ''}>500 calls</option>
                <option value="1000" ${s.geminiQuotaLimit === 1000 || !s.geminiQuotaLimit ? 'selected' : ''}>1000 calls (Default/Free)</option>
                <option value="99999" ${s.geminiQuotaLimit === 99999 ? 'selected' : ''}>Unlimited (Paid Tier)</option>
              </select>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
              <div style="flex:1;min-width:200px;">
                <div style="font-size:0.95rem;font-weight:500;margin-bottom:4px;">Coach Profile Picture (URL)</div>
                <div style="font-size:0.8rem;color:var(--text-3);">Customize Fletcher's avatar with any image URL.</div>
              </div>
              <input type="text" class="form-input" id="input-coach-avatar" value="${s.coachAvatarUrl || ''}" placeholder="https://..." style="width:250px;padding:8px 12px;font-size:0.85rem;">
            </div>

            <div style="font-size:0.85rem;color:var(--text-2);">
              Daily Call Quota Usage: <span id="lbl-ai-quota" style="font-family:var(--font-mono);font-weight:bold;">${window.LM.aiEngine ? window.LM.aiEngine.getQuotaCount() : 0} / ${s.geminiQuotaLimit || 1000}</span> calls today (rolling 24h)
            </div>
            <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;">

            </div>
          </div>
        </div>

        <div class="section-block">
          <h2>Macro Skill Nomenclature</h2>
          <p style="font-size:0.8rem;color:var(--text-3);margin-top:4px;margin-bottom:16px;">
            Customize the names of your core macro skills to fit your personal aesthetic.
          </p>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${S.getMacros().map(m => {
              const cat = getMacroCategory(m.name);
              if (!cat) return ''; // Only show default categories
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-raised);padding:8px 16px;border-radius:8px;border:1px solid var(--border);">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div class="macro-dot" style="background:${m.accentColor};width:12px;height:12px;"></div>
                    <span style="font-weight:500;font-size:0.9rem;">${cat}</span>
                  </div>
                  <select class="form-input macro-name-select" data-id="${m.id}" style="width:160px;padding:6px 10px;font-size:0.85rem;">
                    ${MACRO_NAMES[cat].map(n => `<option value="${n}" ${m.name === n ? 'selected' : ''}>${n}</option>`).join('')}
                  </select>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Cloud Auto-Sync Section -->
        <div class="section-block">
          <h2>Cloud Auto-Sync</h2>
          <p style="font-size:0.8rem;color:var(--text-3);margin-top:4px;margin-bottom:16px;">
            Synchronize your levels, custom presets, XP progress, and active quests automatically in real-time across your PC and mobile devices.
          </p>
          <div id="qm-sync-container">
            ${buildSyncStatusHTML(s)}
          </div>
        </div>

        <!-- Data Migration & Backup Section -->
        <div class="section-block">
          <h2>Data Migration & Backup</h2>
          <p style="font-size:0.8rem;color:var(--text-3);margin-top:4px;margin-bottom:16px;">
            Export your complete database as a JSON backup file to archive your progress or manually transfer stats between browsers.
          </p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <button class="btn btn-ghost" id="btn-export-data">📤 Export Backup File</button>
            <button class="btn btn-ghost" id="btn-import-trigger">📥 Import Backup File</button>
            <button class="btn btn-ghost" id="btn-force-update-app" style="color:var(--accent); border-color:var(--accent); font-weight:600;">🚀 Force Update App</button>
            <input type="file" id="import-data-file" accept=".json" style="display:none;">
          </div>
        </div>

        <!-- Activity Presets Administration Section -->
        <div class="section-block">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="margin:0;">Activity Presets</h2>
            <button class="btn btn-primary btn-sm" id="btn-create-activity-preset">+ Create Preset</button>
          </div>
          <p style="font-size:0.8rem;color:var(--text-3);margin-top:4px;margin-bottom:16px;">
            Manage the activity status presets available in your Hourly Tracker grid.
          </p>
          <div style="display:flex;flex-direction:column;gap:12px;" id="activity-presets-container">
            ${S.getCellPresets().map(p => `
              <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-raised);padding:10px 14px;border-radius:10px;border:1px solid var(--border);">
                <div style="display:flex;align-items:center;gap:12px;">
                  <div style="width:32px;height:32px;border-radius:8px;background:${p.color};display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 0 10px ${p.color}40;">
                    <span class="material-symbols-outlined text-sm">${p.icon}</span>
                  </div>
                  <strong style="font-size:0.95rem;color:var(--text-1);">${p.label}</strong>
                </div>
                <div style="display:flex;gap:8px;">
                  <button class="btn-icon btn-edit-activity-preset" data-id="${p.id}" title="Edit Preset">✎</button>
                  <button class="btn-icon danger btn-delete-activity-preset" data-id="${p.id}" title="Delete Preset">✕</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
      
      <!-- App Version Info -->
      <div style="text-align:center; padding: 10px 20px 40px; font-size: 0.75rem; color: var(--text-3); font-family: var(--font-mono); letter-spacing: 0.1em; opacity: 0.7;">
        LIFEMAXX SYSTEM VERSION: v${localStorage.getItem('lm_app_version') || 'UNKNOWN'}
      </div>

      <!-- Activity Preset Modal Container -->
      <div id="activity-preset-modal-root"></div>
    `;
  }

  const PRESET_ICONS = [
    'bedtime', 'work', 'fitness_center', 'coffee', 'laptop_mac', 'menu_book', 
    'directions_run', 'restaurant', 'self_improvement', 'local_cafe', 'brush', 
    'music_note', 'movie', 'shopping_cart', 'airplanemode_active', 'favorite', 
    'water_drop', 'medication', 'group', 'school', 'pets', 'home', 'code', 
    'sports_esports', 'palette', 'edit_document', 'local_laundry_service',
    'directions_car', 'train', 'pedal_bike', 'park', 'stadium', 'forest',
    'spa', 'bathtub', 'shower', 'cleaning_services', 'iron', 'kitchen',
    'volunteer_activism', 'handshake', 'child_care', 'diversity_1',
    'mosque', 'church', 'synagogue', 'temple_buddhist', 'temple_hindu',
    'shopping_bag', 'storefront', 'wallet', 'savings', 'account_balance',
    'monitor_heart', 'healing', 'psychology', 'dentistry', 'pill',
    'local_bar', 'local_pizza', 'cake', 'icecream', 'liquor',
    'headset', 'mic', 'piano', 'videogame_asset', 'tv', 'radio'
  ];

  function openActivityPresetModal(presetId = null) {
    const root = document.getElementById('activity-preset-modal-root');
    if (!root) return;

    let preset = presetId ? S.getCellPresets().find(p => p.id === presetId) : null;
    let currentIcon = preset ? preset.icon : 'star';
    let currentColor = preset ? preset.color : '#00ADB5';
    let currentLabel = preset ? preset.label : '';

    function renderModal() {
      root.innerHTML = `
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" id="apm-overlay">
          <div class="bg-surface-container border border-surface-container-highest rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div class="p-6 border-b border-surface-container-highest flex justify-between items-center bg-surface-container-low">
              <h3 class="font-headline-sm text-primary">${presetId ? 'Edit Preset' : 'Create Preset+'}</h3>
              <button class="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-white transition-colors" id="apm-close">
                <span class="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            <div class="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              
              <!-- Preview -->
              <div class="flex flex-col items-center gap-2">
                <span class="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Preview</span>
                <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-colors" style="background-color: ${currentColor};">
                  <span class="material-symbols-outlined text-3xl" id="apm-preview-icon">${currentIcon}</span>
                </div>
                <span class="font-label-lg text-on-surface mt-1" id="apm-preview-label">${currentLabel || 'New Preset'}</span>
              </div>

              <!-- Name Input -->
              <div>
                <label class="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Preset Name</label>
                <input type="text" id="apm-input-name" class="w-full bg-surface-container-highest border border-surface-container-highest rounded-xl px-4 py-3 text-on-surface font-body-md focus:outline-none focus:border-primary transition-colors" placeholder="e.g. Reading" value="${currentLabel}">
              </div>

              <!-- Color Picker -->
              <div>
                <label class="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Color Picker</label>
                <div class="flex items-center gap-4">
                  <input type="color" id="apm-input-color" value="${currentColor}" class="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-none p-0 outline-none">
                  <span class="font-mono text-sm text-on-surface-variant" id="apm-color-hex">${currentColor}</span>
                </div>
              </div>

              <!-- Icon Gallery -->
              <div>
                <label class="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Icon Gallery</label>
                <div class="grid grid-cols-5 sm:grid-cols-6 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar p-2 bg-surface-container-low rounded-xl border border-surface-container-highest">
                  ${PRESET_ICONS.map(icon => `
                    <button class="aspect-square rounded-xl flex items-center justify-center transition-all ${icon === currentIcon ? 'bg-primary text-black shadow-md scale-110' : 'bg-surface-container-highest text-on-surface-variant hover:text-white hover:bg-surface-container-highest/80'} apm-icon-btn" data-icon="${icon}">
                      <span class="material-symbols-outlined">${icon}</span>
                    </button>
                  `).join('')}
                </div>
              </div>

            </div>
            
            <div class="p-6 border-t border-surface-container-highest bg-surface-container-low flex justify-end gap-3">
              <button class="px-5 py-2.5 rounded-xl font-bold text-sm text-on-surface bg-surface-container-highest hover:bg-surface-container-highest/80 transition-colors" id="apm-cancel">Cancel</button>
              <button class="px-5 py-2.5 rounded-xl font-bold text-sm text-black bg-primary hover:scale-105 transition-transform" id="apm-save">Save Preset</button>
            </div>
          </div>
        </div>
      `;

      // Bindings for modal
      document.getElementById('apm-close').addEventListener('click', () => root.innerHTML = '');
      document.getElementById('apm-cancel').addEventListener('click', () => root.innerHTML = '');
      
      const inputName = document.getElementById('apm-input-name');
      const inputColor = document.getElementById('apm-input-color');
      const hexLabel = document.getElementById('apm-color-hex');
      const previewIcon = document.getElementById('apm-preview-icon');
      const previewLabel = document.getElementById('apm-preview-label');

      inputName.addEventListener('input', (e) => {
        currentLabel = e.target.value;
        previewLabel.textContent = currentLabel || 'New Preset';
      });

      inputColor.addEventListener('input', (e) => {
        currentColor = e.target.value;
        hexLabel.textContent = currentColor;
        previewIcon.parentElement.style.backgroundColor = currentColor;
      });

      document.querySelectorAll('.apm-icon-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          currentIcon = e.currentTarget.dataset.icon;
          renderModal(); // re-render to update selected state
        });
      });

      document.getElementById('apm-save').addEventListener('click', () => {
        const finalLabel = inputName.value.trim();
        if (!finalLabel) {
          alert('Please provide a name for the preset.');
          return;
        }

        const newPreset = {
          id: presetId || 'preset_' + Date.now() + Math.random().toString(36).substring(2, 6),
          label: finalLabel,
          color: currentColor,
          icon: currentIcon
        };

        S.upsertCellPreset(newPreset);
        root.innerHTML = '';
        window.LM.components.notifications.show('Preset Saved!', 'success');
        window.LM.router.render(); // Redraw settings to show new list
      });
    }

    renderModal();
  }

  function buildSyncStatusHTML(settings) {
    if (settings.syncKey) {
      return `
        <div style="background:var(--bg-raised); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="background:#10b981; width:8px; height:8px; border-radius:50%; box-shadow:0 0 6px #10b981;"></div>
              <span style="font-size:0.9rem; font-weight:600; color:var(--text-1);">Cloud Sync Connected</span>
            </div>
            <button class="btn btn-ghost" id="btn-sync-force" style="padding:4px 10px; font-size:0.75rem; font-family:var(--font-display);">🔄 Sync Now</button>
          </div>
          
          <div style="display:flex; flex-direction:column; gap:4px; margin-top:4px;">
            <label style="font-size:0.75rem; color:var(--text-3); text-transform:uppercase; letter-spacing:0.05em;">Your Secret Sync Key</label>
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="text" readonly value="${settings.syncKey}" style="flex:1; background:var(--bg); border:1px solid var(--border); padding:8px 12px; border-radius:8px; font-family:var(--font-mono); font-size:0.9rem; color:var(--accent); text-align:center;" id="qm-sync-key-input">
              <button class="btn btn-ghost" id="btn-sync-copy" style="padding:8px 12px; font-size:0.85rem;">📋 Copy</button>
            </div>
            <p style="font-size:0.7rem; color:var(--text-3); margin-top:2px;">
              Enter this exact key on your other devices to link them instantly.
            </p>
          </div>

          <div style="display:flex; justify-content:flex-end; margin-top:4px;">
            <button class="btn btn-ghost" id="btn-sync-disconnect" style="color:#ef4444; border-color:rgba(239,68,68,0.2); font-size:0.8rem; padding:6px 12px;">Disconnect Sync</button>
          </div>
        </div>
      `;
    }

    return `
      <div style="background:var(--bg-raised); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:14px; text-align:center;">
        <p style="font-size:0.8rem; color:var(--text-2); margin:0;">
          Cloud sync is currently inactive. You can activate it to backup your progress, or enter an existing key to link this device.
        </p>
        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:4px;">
          <button class="btn btn-primary" id="btn-sync-enable">☁️ Activate Cloud Sync</button>
          <button class="btn btn-ghost" id="btn-sync-link">🔗 Link Existing Device</button>
        </div>
      </div>
    `;
  }

  function init() {
    
    // Activity Presets bindings
    const createActivityPresetBtn = document.getElementById('btn-create-grid-preset-settings');
    if (createActivityPresetBtn) {
      createActivityPresetBtn.addEventListener('click', () => {
        openActivityPresetModal(null);
      });
    }

    document.querySelectorAll('.btn-edit-grid-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (id) openActivityPresetModal(id);
      });
    });

    document.querySelectorAll('.btn-delete-grid-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (id && confirm('Are you sure you want to delete this Grid Preset?')) {
          S.deleteCellPreset(id);
          window.LM.router.render();
        }
      });
    });

    // Create preset click handler
    const createPresetBtn = document.getElementById('btn-create-preset-settings');
    if (createPresetBtn) {
      createPresetBtn.addEventListener('click', () => {
        window.LM.components.questModal.open(null, true);
      });
    }

    // Edit preset click handlers
    document.querySelectorAll('.btn-edit-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        if (id) window.LM.components.questModal.open(id, true);
      });
    });

    // Delete preset click handlers
    document.querySelectorAll('.btn-delete-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        if (id && confirm('Are you sure you want to delete this quest preset? This will also remove any uncompleted instances of it.')) {
          S.deletePreset(id);
          window.LM.router.render(); // Redraw view
        }
      });
    });

    // Theme bindings removed

    // Reset accent button
    const resetAccentBtn = document.getElementById('btn-reset-accent');
    if (resetAccentBtn) {
      resetAccentBtn.addEventListener('click', () => {
        const st = S.getSettings();
        delete st.accentColor;
        S.saveSettings(st);
        window.LM.components.theme.applyTheme('chrome');
        window.LM.router.render();
      });
    }

    // Force Update App button
    const forceUpdateAppBtn = document.getElementById('btn-force-update-app');
    if (forceUpdateAppBtn) {
      forceUpdateAppBtn.addEventListener('click', async () => {
        if (confirm("Force update will clear all cached resources and hard-reload your app to the newest version. Proceed?")) {
          if (window.clearAndReload) {
            await window.clearAndReload();
          } else {
            window.location.reload(true);
          }
        }
      });
    }

    // Gemini key binding
    const geminiInput = document.getElementById('input-gemini-key');
    if (geminiInput) {
      geminiInput.addEventListener('change', (e) => {
        const st = S.getSettings();
        st.geminiApiKey = e.target.value.trim();
        S.saveSettings(st);
      });
    }

    const coachAvatarInput = document.getElementById('input-coach-avatar');
    if (coachAvatarInput) {
      coachAvatarInput.addEventListener('change', (e) => {
        const st = S.getSettings();
        st.coachAvatarUrl = e.target.value.trim();
        S.saveSettings(st);
      });
    }

    const modelSelect = document.getElementById('select-gemini-model');
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        const st = S.getSettings();
        st.geminiModel = e.target.value;
        S.saveSettings(st);
      });
    }

    const quotaSelect = document.getElementById('select-gemini-quota');
    if (quotaSelect) {
      quotaSelect.addEventListener('change', (e) => {
        const st = S.getSettings();
        st.geminiQuotaLimit = parseInt(e.target.value);
        S.saveSettings(st);
        window.LM.router.render(); // Redraw view to update quota label
      });
    }



    const accentInput = document.getElementById('accent-color-input');
    if (accentInput) {
      const accentBtn = document.getElementById('btn-accent-color');
      if (accentBtn) {
        accentBtn.addEventListener('click', () => accentInput.click());
      }
      accentInput.addEventListener('input', (e) => {
        const color = e.target.value;
        window.LM.components.theme.applyAccent(color);
        const st = S.getSettings();
        st.accentColor = color;
        S.saveSettings(st);
      });
    }

    // Drag settings bindings
    const dragCheck = document.getElementById('set-drag');
    const deleteCheck = document.getElementById('set-delete');
    const deleteWrap = document.getElementById('set-delete-wrap');
    
    if (dragCheck) {
      dragCheck.addEventListener('change', (e) => {
        const st = S.getSettings();
        st.dragToRegister = e.target.checked;
        S.saveSettings(st);
        
        if (deleteCheck && deleteWrap) {
          deleteCheck.disabled = !e.target.checked;
          deleteWrap.style.opacity = e.target.checked ? '1' : '0.5';
        }
      });
    }
    
    if (deleteCheck) {
      deleteCheck.addEventListener('change', (e) => {
        const st = S.getSettings();
        st.deleteAfterDragged = e.target.checked;
        S.saveSettings(st);
      });
    }

    const chromeAccentsCheck = document.getElementById('set-chrome-accents');
    if (chromeAccentsCheck) {
      chromeAccentsCheck.addEventListener('change', (e) => {
        const st = S.getSettings();
        st.chromeAccentsEnabled = e.target.checked;
        S.saveSettings(st);
        window.LM.components.theme.applyTheme('chrome');
      });
    }

    const questSelector = document.getElementById('set-quest-selector');
    if (questSelector) {
      questSelector.addEventListener('change', (e) => {
        const st = S.getSettings();
        st.questSelectorStyle = e.target.value;
        S.saveSettings(st);
      });
    }

    const historyBarCheck = document.getElementById('set-history-bar');
    const fillingIndicatorCheck = document.getElementById('set-filling-indicator');
    const fillingIndicatorWrap = document.getElementById('set-filling-indicator-wrap');

    if (historyBarCheck) {
      historyBarCheck.addEventListener('change', (e) => {
        const st = S.getSettings();
        st.historyBarEnabled = e.target.checked;
        S.saveSettings(st);
        if (fillingIndicatorWrap) {
          fillingIndicatorWrap.style.display = e.target.checked ? 'block' : 'none';
        }
      });
    }

    if (fillingIndicatorCheck) {
      fillingIndicatorCheck.addEventListener('change', (e) => {
        const st = S.getSettings();
        st.fillingIndicatorEnabled = e.target.checked;
        S.saveSettings(st);
      });
    }

    // Macro Rename
    document.querySelectorAll('.macro-name-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const newName = e.target.value;
        const m = S.getMacro(id);
        if (m) {
          m.name = newName;
          S.upsertMacro(m);
          window.LM.components.notifications.show(`Skill renamed to ${newName}`, 'success');
        }
      });
    });

    // ── Export Progress ──
    const exportBtn = document.getElementById('btn-export-data');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const backup = S.exportBackup();
        const str = JSON.stringify(backup, null, 2);
        const blob = new Blob([str], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lifemaxx_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.LM.components.notifications.show('Progress Backup exported successfully!', 'success');
      });
    }

    // ── Import Progress ──
    const importTrigger = document.getElementById('btn-import-trigger');
    const importFile = document.getElementById('import-data-file');
    if (importTrigger && importFile) {
      importTrigger.addEventListener('click', () => {
        importFile.click();
      });
      
      importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const backup = JSON.parse(event.target.result);
            if (backup && backup.macros && backup.overall) {
              const success = S.importBackup(backup);
              if (success) {
                window.LM.components.notifications.show('Progress restored! Reloading...', 'success');
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } else {
                window.LM.components.notifications.show('Invalid backup file structure.', 'error');
              }
            } else {
              window.LM.components.notifications.show('Invalid backup file content.', 'error');
            }
          } catch (err) {
            window.LM.components.notifications.show('Error parsing backup file.', 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    // ── Enable Cloud Sync ──
    const enableSyncBtn = document.getElementById('btn-sync-enable');
    if (enableSyncBtn) {
      enableSyncBtn.addEventListener('click', async () => {
        enableSyncBtn.disabled = true;
        enableSyncBtn.textContent = 'Activating...';
        
        try {
          const backup = S.exportBackup();
          const endpoint = S.getSyncEndpoint();
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backup)
          });
          
          if (!res.ok) throw new Error("Server response not OK");
          const data = await res.json();
          
          if (data.id) {
            const st = S.getSettings();
            st.syncKey = data.id;
            S.saveSettings(st);
            
            // Push updated settings with sync parameters embedded
            await S.pushCloudSync();
            
            window.LM.components.notifications.show('Cloud sync successfully activated!', 'success');
            window.LM.router.render(); // Redraw settings view
          } else {
            throw new Error("Invalid server data response");
          }
        } catch (err) {
          window.LM.components.notifications.show('Failed to connect to cloud sync host.', 'error');
          console.error(err);
          enableSyncBtn.disabled = false;
          enableSyncBtn.textContent = '☁️ Activate Cloud Sync';
        }
      });
    }

    // ── Link Existing Device via Sync Key ──
    const linkSyncBtn = document.getElementById('btn-sync-link');
    if (linkSyncBtn) {
      linkSyncBtn.addEventListener('click', async () => {
        const key = prompt("Enter your Secret Sync Key (e.g. uI5bfPDhOe):");
        if (!key) return;
        const cleanKey = key.trim();
        if (cleanKey.length < 5) {
          alert("Invalid key format. Sync keys are usually 10 characters long.");
          return;
        }
        
        linkSyncBtn.disabled = true;
        linkSyncBtn.textContent = 'Linking...';
        
        try {
          const endpoint = S.getSyncEndpoint(cleanKey);
          const res = await fetch(endpoint);
          if (!res.ok) throw new Error("Sync Key not found");
          
          const responseBody = await res.json();
          // jsonbin-zeta returns stored data at root level (not wrapped in .data)
          const cloudData = (responseBody && responseBody.macros) ? responseBody : responseBody.data;
          
          if (cloudData && cloudData.macros && cloudData.settings) {
            const success = S.importBackup(cloudData);
            if (success) {
              // Ensure local settings have the sync parameters
              const st = S.getSettings();
              st.syncKey = cleanKey;
              S.saveSettings(st);
              
              window.LM.components.notifications.show('Sync linked successfully!', 'success');
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            } else {
              throw new Error("Failed to restore save data");
            }
          } else {
            throw new Error("Invalid save file structure");
          }
        } catch (err) {
          alert("Failed to link device: " + err.message);
          linkSyncBtn.disabled = false;
          linkSyncBtn.textContent = '🔗 Link Existing Device';
        }
      });
    }

    // ── Force Sync ──
    const forceSyncBtn = document.getElementById('btn-sync-force');
    if (forceSyncBtn) {
      forceSyncBtn.addEventListener('click', async () => {
        forceSyncBtn.disabled = true;
        forceSyncBtn.textContent = 'Syncing...';
        
        const result = await S.pullCloudSync();
        if (result === 'pulled') {
          window.LM.components.notifications.show('Pulled newest cloud progress!', 'success');
          setTimeout(() => { window.location.reload(); }, 800);
        } else if (result === 'pushed') {
          window.LM.components.notifications.show('Uploaded local progress to cloud!', 'success');
          forceSyncBtn.disabled = false;
          forceSyncBtn.textContent = '🔄 Sync Now';
        } else if (result === 'synced') {
          window.LM.components.notifications.show('All devices fully in sync!', 'success');
          forceSyncBtn.disabled = false;
          forceSyncBtn.textContent = '🔄 Sync Now';
        } else {
          window.LM.components.notifications.show('Cloud sync check failed.', 'error');
          forceSyncBtn.disabled = false;
          forceSyncBtn.textContent = '🔄 Sync Now';
        }
      });
    }

    // ── Copy Sync Key ──
    const copySyncBtn = document.getElementById('btn-sync-copy');
    const syncKeyInput = document.getElementById('qm-sync-key-input');
    if (copySyncBtn && syncKeyInput) {
      copySyncBtn.addEventListener('click', () => {
        syncKeyInput.select();
        navigator.clipboard.writeText(syncKeyInput.value);
        window.LM.components.notifications.show('Sync Key copied to clipboard!', 'info');
      });
    }

    // ── Disconnect Sync ──
    const disconnectSyncBtn = document.getElementById('btn-sync-disconnect');
    if (disconnectSyncBtn) {
      disconnectSyncBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to disconnect cloud sync? This device will stop backing up or downloading shared progress.")) {
          const st = S.getSettings();
          delete st.syncKey;
          S.saveSettings(st);
          window.LM.components.notifications.show('Cloud sync deactivated.', 'warning');
          window.LM.router.render();
        }
      });
    }
  }

  return { render, init };
})();
