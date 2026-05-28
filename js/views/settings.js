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
    const aeroOn = s.aeroTheme !== false; // default ON

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
          </div>
        </div>

        <div class="section-block" id="theme-settings-container">
          <h2>Appearance</h2>
          <div style="display:flex;flex-direction:column;gap:16px;margin-top:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:0.95rem;font-weight:500;margin-bottom:4px;">Frutiger Aero Theme</div>
                <div style="font-size:0.8rem;color:var(--text-3);">Enables the sky, glass bubbles & nature-inspired background aesthetic.</div>
              </div>
              <label class="aero-toggle" title="Toggle Frutiger Aero Theme">
                <input type="checkbox" id="set-aero" ${aeroOn ? 'checked' : ''}>
                <span class="aero-toggle-track"></span>
              </label>
            </div>

            <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
              <button class="btn btn-ghost" id="btn-theme-toggle">Toggle Night/Morning Mode</button>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:0.85rem;color:var(--text-2);font-family:var(--font-display);">ACCENT COLOR</span>
                <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                  <input type="color" id="accent-color-input" value="${s.accentColor || '#7c3aed'}" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;z-index:2;">
                  <div class="accent-dot" id="accent-dot" style="background:${s.accentColor || '#7c3aed'};position:absolute;inset:2px;z-index:1;pointer-events:none;border-radius:50%;border:2px solid var(--border);box-shadow:0 0 6px rgba(0,0,0,0.15);width:20px;height:20px;"></div>
                </div>
              </div>
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

        <!-- Data Backup & Recovery Section -->
        <div class="section-block">
          <h2>Data Migration & Backup</h2>
          <p style="font-size:0.8rem;color:var(--text-3);margin-top:4px;margin-bottom:16px;">
            Migrating from Netlify to Cloudflare or switching devices? Export your progress from your old site and import it here to restore your levels, XP, and presets instantly!
          </p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <button class="btn btn-ghost" id="btn-export-data">📤 Export Backup File</button>
            <button class="btn btn-ghost" id="btn-import-trigger">📥 Import Backup File</button>
            <input type="file" id="import-data-file" accept=".json" style="display:none;">
          </div>
        </div>

      </div>
    `;
  }

  function applyAeroTheme(on) {
    if (on) {
      document.documentElement.removeAttribute('data-aero-off');
    } else {
      document.documentElement.setAttribute('data-aero-off', 'true');
    }
  }

  function init() {
    // Restore aero preference on load
    const s = S.getSettings();
    applyAeroTheme(s.aeroTheme !== false);

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

    // Theme bindings
    const toggleBtn = document.getElementById('btn-theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const current = S.getSettings().theme || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        const st = S.getSettings();
        st.theme = next;
        S.saveSettings(st);
        window.LM.components.theme.applyTheme(next);
      });
    }

    // Aero theme toggle
    const aeroCheck = document.getElementById('set-aero');
    if (aeroCheck) {
      aeroCheck.addEventListener('change', (e) => {
        const st = S.getSettings();
        st.aeroTheme = e.target.checked;
        S.saveSettings(st);
        window.LM.views.settings.applyAeroTheme(e.target.checked);
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
  }

  return { render, init, applyAeroTheme };
})();
