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

        <div class="section-block">
          <h2>Home Screen Greetings</h2>
          <p style="font-size:0.8rem;color:var(--text-3);margin-top:4px;margin-bottom:16px;">One of these is picked randomly each time you open the app.</p>

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div>
              <div style="font-size:0.95rem;font-weight:500;margin-bottom:4px;">Show on launch</div>
              <div style="font-size:0.8rem;color:var(--text-3);">Display the intro screen each time the app loads.</div>
            </div>
            <label class="aero-toggle">
              <input type="checkbox" id="set-home-splash" ${s.homeSplash !== false ? 'checked' : ''}>
              <span class="aero-toggle-track"></span>
            </label>
          </div>
          <div id="greetings-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
            ${(s.greetings || LM.views.home.DEFAULT_GREETINGS).map((g, i) => `
              <div style="display:flex;align-items:center;gap:8px;background:var(--bg-raised);padding:8px 14px;border-radius:10px;border:1px solid var(--border);">
                <span style="flex:1;font-size:0.88rem;font-style:italic;">${g}</span>
                <button class="btn-remove-row" onclick="LM.views.settings.removeGreeting(${i})">✕</button>
              </div>`).join('')}
          </div>
          <div style="display:flex;gap:8px;">
            <input class="form-input" id="new-greeting-input" placeholder="Add a greeting..." style="flex:1">
            <button class="btn btn-primary" onclick="LM.views.settings.addGreeting()">Add</button>
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

  function _defaultGreetings() {
    return [...(window.LM.views.home?.DEFAULT_GREETINGS || ['welcome, aarush', 'locking in time aarush??', 'salutations batman'])];
  }

  function _saveAndRefreshGreetings(list) {
    const st = S.getSettings();
    st.greetings = list;
    S.saveSettings(st);
    const el = document.getElementById('greetings-list');
    if (el) el.innerHTML = list.map((g, i) => `
      <div style="display:flex;align-items:center;gap:8px;background:var(--bg-raised);padding:8px 14px;border-radius:10px;border:1px solid var(--border);">
        <span style="flex:1;font-size:0.88rem;font-style:italic;">${g}</span>
        <button class="btn-remove-row" onclick="LM.views.settings.removeGreeting(${i})">✕</button>
      </div>`).join('');
  }

  function addGreeting() {
    const input = document.getElementById('new-greeting-input');
    const val = input?.value.trim();
    if (!val) return;
    const st = S.getSettings();
    const list = st.greetings || _defaultGreetings();
    list.push(val);
    _saveAndRefreshGreetings(list);
    input.value = '';
  }

  function removeGreeting(idx) {
    const st = S.getSettings();
    const list = (st.greetings || _defaultGreetings()).filter((_, i) => i !== idx);
    _saveAndRefreshGreetings(list);
  }

  function init() {
    // Restore aero preference on load
    const s = S.getSettings();
    applyAeroTheme(s.aeroTheme !== false);
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

    // Home splash toggle
    const homeSplashCheck = document.getElementById('set-home-splash');
    if (homeSplashCheck) {
      homeSplashCheck.addEventListener('change', (e) => {
        const st = S.getSettings();
        st.homeSplash = e.target.checked;
        S.saveSettings(st);
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
  }

  return { render, init, applyAeroTheme, addGreeting, removeGreeting };
})();
