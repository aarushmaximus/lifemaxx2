import React, { useState, useEffect } from 'react';
import { store } from '../lib/store';

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

export default function Settings() {
  const [settings, setSettings] = useState(store.getSettings());
  const [presets, setPresets] = useState(store.getPresets());
  const [gridPresets, setGridPresets] = useState(store.getCellPresets());
  const [macros, setMacros] = useState(store.getMacros());

  useEffect(() => {
    const handleStoreChange = () => {
      setSettings(store.getSettings());
      setPresets(store.getPresets());
      setGridPresets(store.getCellPresets());
      setMacros(store.getMacros());
    };
    store.on('change', handleStoreChange);
    return () => store.off('change', handleStoreChange);
  }, []);

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    store.saveSettings(newSettings);
  };

  const dragOn = settings.dragToRegister !== false;
  const deleteOn = settings.deleteAfterDragged === true;
  const historyBarOn = settings.historyBarEnabled === true;

  const handleMacroNameChange = (macroId, newName) => {
    const m = store.getMacro(macroId);
    if (m) {
      m.name = newName;
      store.upsertMacro(m);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="font-display uppercase tracking-widest">Settings</h1>
      </div>
      
      {/* Quest Presets Administration Section */}
      <div className="section-block">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
          <h2 style={{margin: 0}}>Quest Presets</h2>
          <button className="btn btn-primary btn-sm" onClick={() => alert('Quest Modal not implemented in React yet')}>+ Create Preset</button>
        </div>
        <p style={{fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '4px', marginBottom: '16px'}}>
          Create custom quest templates. Quests will automatically spawn in your active list on scheduled days.
        </p>
        <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          {presets.length > 0 ? presets.map(p => {
            const daysStr = p.scheduledDays.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ');
            const timeStr = p.timeWindow ? `${p.timeWindow.start} - ${p.timeWindow.end}` : 'Anytime';
            const xpSummary = p.targetSkills.map(ts => {
              const macro = macros.find(m => m.id === ts.macroSkillId);
              return `${macro ? macro.name : 'Skill'}: +${ts.xpAmount}xp`;
            }).join(', ');
            return (
              <div key={p.id} style={{display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-raised)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <strong style={{fontSize: '0.95rem', color: 'var(--text-1)'}}>{p.name}</strong>
                  <div style={{display: 'flex', gap: '8px'}}>
                    <button className="btn-icon" onClick={() => alert('Edit preset not implemented')}>✎</button>
                    <button className="btn-icon danger" onClick={() => {
                      if (window.confirm('Delete preset?')) store.deletePreset(p.id);
                    }}>✕</button>
                  </div>
                </div>
                <div style={{fontSize: '0.8rem', color: 'var(--text-2)'}}>{p.description || 'No description'}</div>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px'}}>
                  <span>📅 {daysStr}</span>
                  <span>⏳ {timeStr}</span>
                  <span style={{color: 'var(--accent)', fontWeight: 500}}>★ {xpSummary}</span>
                </div>
              </div>
            );
          }) : <div style={{fontSize: '0.85rem', color: 'var(--text-3)', textAlign: 'center', padding: '12px'}}>No quest presets created yet. Click "+ Create Preset" to start!</div>}
        </div>
      </div>

      {/* Gameplay Mechanics */}
      <div className="section-block">
        <h2>Gameplay Mechanics</h2>
        <div className="form-group" style={{marginTop: '16px', gap: '12px'}}>
          <div>
            <label className="form-check" style={{fontSize: '0.95rem', fontWeight: 500}}>
              <input type="checkbox" checked={dragOn} onChange={e => updateSetting('dragToRegister', e.target.checked)} />
              Drag to Register XP
            </label>
            <p style={{fontSize: '0.8rem', color: 'var(--text-3)', marginLeft: '24px', marginTop: '4px'}}>
              If enabled, marking a quest complete requires you to physically drag it to the wheel to claim your XP.
            </p>
          </div>
          
          <div style={{opacity: dragOn ? 1 : 0.5, transition: 'opacity 0.2s'}}>
            <label className="form-check" style={{fontSize: '0.95rem', fontWeight: 500}}>
              <input type="checkbox" checked={deleteOn} disabled={!dragOn} onChange={e => updateSetting('deleteAfterDragged', e.target.checked)} />
              Delete after dragged
            </label>
            <p style={{fontSize: '0.8rem', color: 'var(--text-3)', marginLeft: '24px', marginTop: '4px'}}>
              If enabled, dragged quests are removed from the dashboard and only appear in the Quest Log.
            </p>
          </div>
          
          <div>
            <label className="form-check" style={{fontSize: '0.95rem', fontWeight: 500}}>
              <input type="checkbox" checked={historyBarOn} onChange={e => updateSetting('historyBarEnabled', e.target.checked)} />
              History Bar Layout
            </label>
            <p style={{fontSize: '0.8rem', color: 'var(--text-3)', marginLeft: '24px', marginTop: '4px'}}>
              Show a dual-wheel layout with a live activity feed on the Dashboard. Splits the XP wheel into Overall + Skill wheels with a scrollable history panel.
            </p>
            <div style={{marginLeft: '24px', marginTop: '12px', display: historyBarOn ? 'block' : 'none', transition: 'opacity 0.2s'}}>
              <label className="form-check" style={{fontSize: '0.88rem', fontWeight: 500}}>
                <input type="checkbox" checked={settings.fillingIndicatorEnabled !== false} onChange={e => updateSetting('fillingIndicatorEnabled', e.target.checked)} />
                Filling Indicator
              </label>
              <p style={{fontSize: '0.78rem', color: 'var(--text-3)', marginLeft: '24px', marginTop: '4px'}}>
                When turned on, the wheels display the animated liquid wave filling. When turned off, they only show the rings.
              </p>
            </div>
          </div>
          <div>
            <label className="form-check" style={{fontSize: '0.95rem', fontWeight: 500}}>Quest Selector Style</label>
            <p style={{fontSize: '0.8rem', color: 'var(--text-3)', marginLeft: '24px', marginTop: '4px'}}>
              Choose how you switch between Quests, Habituals, and Chains on the Dashboard.
            </p>
            <div style={{marginLeft: '24px', marginTop: '8px'}}>
              <select className="form-input" style={{width: '200px', padding: '6px 10px', fontSize: '0.85rem', cursor: 'pointer'}} value={settings.questSelectorStyle || 'wheel'} onChange={e => updateSetting('questSelectorStyle', e.target.value)}>
                <option value="wheel">Interactive Wheel</option>
                <option value="arrows">Dropdown Menu</option>
                <option value="swipe">Swipe Gestures</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="section-block">
        <h2>Appearance</h2>
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px'}}>
          <div>
            <label className="form-check" style={{fontSize: '0.95rem', fontWeight: 500}}>
              <input type="checkbox" checked={settings.chromeAccentsEnabled !== false} onChange={e => updateSetting('chromeAccentsEnabled', e.target.checked)} />
              Enable Chrome Accents
            </label>
            <p style={{fontSize: '0.8rem', color: 'var(--text-3)', marginLeft: '24px', marginTop: '4px'}}>
              When enabled, primary UI elements will use a high-fidelity reflective chrome gradient. Disable to use your flat accent color.
            </p>
          </div>
          <div>
            <label className="form-check" style={{fontSize: '0.95rem', fontWeight: 500}}>
              <input type="checkbox" checked={settings.statsInCarousel !== false} onChange={e => updateSetting('statsInCarousel', e.target.checked)} />
              Daily Statistics in Carousel
            </label>
            <p style={{fontSize: '0.8rem', color: 'var(--text-3)', marginLeft: '24px', marginTop: '4px'}}>
              When enabled, Daily Statistics are placed in the top dashboard carousel. Disable to show them at the bottom.
            </p>
          </div>
        </div>
      </div>

      {/* Macro Skill Nomenclature */}
      <div className="section-block">
        <h2>Macro Skill Nomenclature</h2>
        <p style={{fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '4px', marginBottom: '16px'}}>
          Customize the names of your core macro skills to fit your personal aesthetic.
        </p>
        <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          {macros.map(m => {
            const cat = getMacroCategory(m.name) || m.name;
            return (
              <div key={m.id} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-raised)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <div style={{background: m.accentColor, width: '12px', height: '12px', borderRadius: '50%'}}></div>
                  <span style={{fontWeight: 500, fontSize: '0.9rem'}}>{cat}</span>
                </div>
                <select 
                  className="form-input" 
                  style={{width: '160px', padding: '6px 10px', fontSize: '0.85rem'}}
                  value={m.name}
                  onChange={e => handleMacroNameChange(m.id, e.target.value)}
                >
                  {(MACRO_NAMES[cat] || [cat]).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vanilla UI Switch */}
      <div className="section-block">
        <h2>Vanilla UI (Reliable Code)</h2>
        <p style={{fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '4px', marginBottom: '16px'}}>
          Switch back to the original Vanilla JS interface. The React interface is still in Beta and being synced with the mobile layout.
        </p>
        <button 
          className="btn btn-primary"
          onClick={() => window.location.href = '/'}
        >
          Switch to Vanilla
        </button>
      </div>
      
    </div>
  );
}
