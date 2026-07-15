import React, { useState, useEffect } from 'react';
import { store } from '../lib/store';

const EXPONENT_PRESETS = [
  { label: 'Easy (1.3)', value: 1.3 },
  { label: 'Normal (1.6)', value: 1.6 },
  { label: 'Hard (2.0)', value: 2.0 },
  { label: 'Brutal (2.2)', value: 2.2 },
];

const COLOR_PRESETS = [
  '#7c3aed', '#2563eb', '#dc2626', '#16a34a',
  '#d97706', '#db2777', '#0891b2', '#65a30d',
];

/**
 * SkillModal — Create/Edit Macro Skills and their Micro Skills.
 *
 * Props:
 *   isOpen      {boolean}
 *   onClose     {() => void}
 *   macroId     {string|null}  null = create mode, string = edit mode
 */
export default function SkillModal({ isOpen, onClose, macroId = null }) {
  const isEdit = !!macroId;

  /* ── Macro form state ── */
  const [name, setName] = useState('');
  const [color, setColor] = useState('#7c3aed');
  const [exponent, setExponent] = useState(1.6);
  const [xp100, setXp100] = useState(500000);

  /* ── Micro skill list ── */
  const [micros, setMicros] = useState([]);

  /* ── Add-micro inline form ── */
  const [showMicroForm, setShowMicroForm] = useState(false);
  const [microName, setMicroName] = useState('');
  const [microExp, setMicroExp] = useState(1.6);

  /* ── Load existing macro data in edit mode ── */
  useEffect(() => {
    if (!isOpen) return;
    if (isEdit) {
      const macro = store.getMacro(macroId);
      if (macro) {
        setName(macro.name || '');
        setColor(macro.accentColor || '#7c3aed');
        setExponent(macro.exponent || 1.6);
        setXp100(macro.totalXPtoL100 || 500000);
        setMicros(macro.microSkills || []);
      }
    } else {
      setName('');
      setColor('#7c3aed');
      setExponent(1.6);
      setXp100(500000);
      setMicros([]);
    }
    setShowMicroForm(false);
    setMicroName('');
    setMicroExp(1.6);
  }, [isOpen, macroId, isEdit]);

  /* ── Listen for store changes to keep micro list fresh in edit mode ── */
  useEffect(() => {
    if (!isOpen || !isEdit) return;
    const refresh = () => {
      const macro = store.getMacro(macroId);
      if (macro) setMicros(macro.microSkills || []);
    };
    store.on('change', refresh);
    return () => store.off('change', refresh);
  }, [isOpen, isEdit, macroId]);

  if (!isOpen) return null;

  /* ── Handlers ── */
  function handleSaveMacro() {
    const trimmed = name.trim();
    if (!trimmed) return alert('Skill name is required.');

    const exp = parseFloat(exponent);
    const total = parseInt(xp100) || 500000;

    if (isEdit) {
      const existing = store.getMacro(macroId);
      if (!existing) return;
      store.upsertMacro({
        ...existing,
        name: trimmed,
        accentColor: color,
        exponent: exp,
        totalXPtoL100: total,
        base: total / Math.pow(100, exp),
      });
    } else {
      store.upsertMacro({
        id: store.uid(),
        name: trimmed,
        accentColor: color,
        exponent: exp,
        totalXPtoL100: total,
        currentXP: 0,
        currentLevel: 0,
        base: total / Math.pow(100, exp),
        microSkills: [],
      });
    }
    onClose();
  }

  function handleAddMicro() {
    const trimmed = microName.trim();
    if (!trimmed) return alert('Micro skill name is required.');
    if (!isEdit) return alert('Save the macro skill first, then add micro skills.');

    const macro = store.getMacro(macroId);
    if (!macro) return;
    const e = parseFloat(microExp);
    const t = (macro.totalXPtoL100 || 500000) * 0.4;

    store.upsertMicroSkill(macroId, {
      id: store.uid(),
      parentMacroId: macroId,
      name: trimmed,
      currentXP: 0,
      currentLevel: 0,
      exponent: e,
      totalXPtoL100: t,
      base: t / Math.pow(100, e),
    });
    setMicroName('');
    setMicroExp(1.6);
    setShowMicroForm(false);
  }

  function handleRenameMicro(micro) {
    const newName = window.prompt('Rename micro skill:', micro.name);
    if (newName && newName.trim()) {
      store.upsertMicroSkill(macroId, { ...micro, name: newName.trim() });
    }
  }

  function handleDeleteMicro(microId) {
    if (window.confirm('Delete this micro skill? This cannot be undone.')) {
      store.deleteMicroSkill(macroId, microId);
    }
  }

  /* ── Styles ── */
  const inputCls = 'w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-[var(--modal-accent)] transition-colors';
  const labelCls = 'block text-xs font-display tracking-wider text-gray-400 mb-1 uppercase';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-[#0e0e14] border border-white/10 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl"
        style={{ '--modal-accent': color, maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="font-display uppercase tracking-widest text-white text-base">
            {isEdit ? 'Edit Macro Skill' : 'New Macro Skill'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
          >✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">

          {/* Name */}
          <div>
            <label className={labelCls}>Name</label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. Titan, Gnosis, Aether…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Accent Color */}
          <div>
            <label className={labelCls}>Accent Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-white/10 bg-black/30 cursor-pointer p-0.5"
              />
              <div className="flex gap-2 flex-wrap">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{
                      background: c,
                      borderColor: color === c ? '#fff' : 'transparent',
                      boxShadow: color === c ? `0 0 8px ${c}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* XP Exponent (difficulty) */}
          <div>
            <label className={labelCls}>Difficulty (XP Exponent)</label>
            <select
              className={inputCls}
              value={exponent}
              onChange={(e) => setExponent(parseFloat(e.target.value))}
            >
              {EXPONENT_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* XP to Level 100 */}
          <div>
            <label className={labelCls}>Total XP to Level 100</label>
            <input
              type="number"
              className={inputCls}
              value={xp100}
              min={10000}
              onChange={(e) => setXp100(parseInt(e.target.value) || 500000)}
            />
          </div>

          {/* ── Micro Skills section (edit mode only) ── */}
          {isEdit && (
            <div className="border-t border-white/10 pt-4 space-y-3">
              <h3 className="font-display text-xs tracking-widest text-gray-400 uppercase">Micro Skills</h3>

              {micros.length === 0 && (
                <p className="text-gray-600 text-xs">No micro skills yet.</p>
              )}

              <div className="space-y-2">
                {micros.map((ms) => (
                  <div
                    key={ms.id}
                    className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5"
                  >
                    <div>
                      <div className="text-sm text-white font-medium">{ms.name}</div>
                      <div className="text-[10px] text-gray-500">Lvl {ms.currentLevel || 0} · {ms.currentXP || 0} XP</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRenameMicro(ms)}
                        className="text-gray-500 hover:text-white transition-colors text-sm px-2"
                        title="Rename"
                      >✎</button>
                      <button
                        onClick={() => handleDeleteMicro(ms.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors text-sm px-2"
                        title="Delete"
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Micro inline form */}
              {showMicroForm ? (
                <div className="bg-black/20 rounded-xl p-4 space-y-3 border border-white/5">
                  <div>
                    <label className={labelCls}>Micro Skill Name</label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="e.g. Bench Press, Vocabulary…"
                      value={microName}
                      onChange={(e) => setMicroName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddMicro(); }}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Difficulty</label>
                    <select
                      className={inputCls}
                      value={microExp}
                      onChange={(e) => setMicroExp(parseFloat(e.target.value))}
                    >
                      {EXPONENT_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setShowMicroForm(false); setMicroName(''); }}
                      className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                    >Cancel</button>
                    <button
                      onClick={handleAddMicro}
                      className="px-4 py-1.5 rounded-lg text-sm font-bold text-black transition-colors"
                      style={{ background: color }}
                    >Add</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowMicroForm(true)}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-colors border border-white/5"
                >+ Add Micro Skill</button>
              )}
            </div>
          )}

          {!isEdit && (
            <p className="text-xs text-gray-600 italic">
              After creating the macro skill, you can add micro skills by opening the edit modal.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
          >Cancel</button>
          <button
            onClick={handleSaveMacro}
            className="px-5 py-2 rounded-lg text-sm font-bold text-black transition-all hover:opacity-90"
            style={{ background: color }}
          >{isEdit ? 'Save Changes' : 'Create Skill'}</button>
        </div>
      </div>
    </div>
  );
}
