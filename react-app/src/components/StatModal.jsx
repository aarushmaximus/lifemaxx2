import React, { useState, useEffect } from 'react';
import { store } from '../lib/store';

/**
 * StatModal — Create / Edit Statistics.
 *
 * Props:
 *   isOpen    {boolean}
 *   onClose   {() => void}
 *   statId    {string|null}   null = create mode
 *   mode      {'create'|'edit'}
 */
export default function StatModal({ isOpen, onClose, statId = null, mode = 'create' }) {
  const isEdit = mode === 'edit' && !!statId;

  /* ── Form state ── */
  const [statName, setStatName] = useState('');
  const [unit, setUnit] = useState('');
  const [goalValue, setGoalValue] = useState(2000);
  const [maxXP, setMaxXP] = useState(50);
  const [penaltyRange, setPenaltyRange] = useState(1000);
  const [negativeXP, setNegativeXP] = useState(50);
  const [targetMacroId, setTargetMacroId] = useState('');
  const [targetMicroId, setTargetMicroId] = useState('');

  /* ── Macros list for selectors ── */
  const [macros, setMacros] = useState([]);

  /* ── Micro skills derived from selected macro ── */
  const [availableMicros, setAvailableMicros] = useState([]);

  /* ── Load data on open ── */
  useEffect(() => {
    if (!isOpen) return;

    const allMacros = store.getMacros();
    setMacros(allMacros);

    if (isEdit && statId) {
      const stat = store.getStatistic(statId);
      if (stat) {
        setStatName(stat.name || '');
        setUnit(stat.unit || '');
        setGoalValue(stat.goalValue ?? 2000);
        setMaxXP(stat.maxXP ?? 50);
        setPenaltyRange(stat.penaltyRange ?? 1000);
        setNegativeXP(stat.negativeXP ?? 50);
        const mId = stat.targetSkill?.macroSkillId || '';
        const msId = stat.targetSkill?.microSkillId || '';
        setTargetMacroId(mId);
        setTargetMicroId(msId);

        // Populate micros for the pre-selected macro
        if (mId) {
          const macro = allMacros.find((m) => m.id === mId);
          setAvailableMicros(macro?.microSkills || []);
        } else {
          setAvailableMicros([]);
        }
      }
    } else {
      // Reset to defaults for create mode
      setStatName('');
      setUnit('');
      setGoalValue(2000);
      setMaxXP(50);
      setPenaltyRange(1000);
      setNegativeXP(50);
      setTargetMacroId('');
      setTargetMicroId('');
      setAvailableMicros([]);
    }
  }, [isOpen, statId, isEdit]);

  /* ── Update micro list when macro selection changes ── */
  useEffect(() => {
    if (!targetMacroId) {
      setAvailableMicros([]);
      setTargetMicroId('');
      return;
    }
    const macro = macros.find((m) => m.id === targetMacroId);
    setAvailableMicros(macro?.microSkills || []);
    setTargetMicroId('');
  }, [targetMacroId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  /* ── Submit handler ── */
  function handleSubmit() {
    const trimmedName = statName.trim();
    if (!trimmedName) return alert('Statistic name is required.');

    let targetSkill = null;
    if (targetMacroId) {
      targetSkill = {
        macroSkillId: targetMacroId,
        microSkillId: targetMicroId || null,
      };
    }

    const stat = {
      id: isEdit ? statId : ('stat_' + Date.now()),
      name: trimmedName,
      unit: unit.trim(),
      goalValue: parseFloat(goalValue) || 0,
      maxXP: parseFloat(maxXP) || 0,
      penaltyRange: parseFloat(penaltyRange) || 0,
      negativeXP: parseFloat(negativeXP) || 0,
      targetSkill,
    };

    store.upsertStatistic(stat);
    onClose();
  }

  /* ── Shared input style ── */
  const inputCls =
    'w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors';
  const labelCls = 'block text-xs font-display tracking-wider text-gray-400 mb-1 uppercase';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-[#0e0e14] border border-white/10 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="font-display uppercase tracking-widest text-white text-base">
            {isEdit ? 'Edit Statistic' : 'Create Statistic'}
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
            <label className={labelCls}>Statistic Name</label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. Calories, Steps, Study Hours"
              value={statName}
              onChange={(e) => setStatName(e.target.value)}
            />
          </div>

          {/* Unit */}
          <div>
            <label className={labelCls}>Unit of Measurement</label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. kcal, miles, hours"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>

          {/* Target Skill */}
          <div>
            <label className={labelCls}>Target Skill (Optional)</label>
            <select
              className={inputCls + ' mb-2'}
              value={targetMacroId}
              onChange={(e) => setTargetMacroId(e.target.value)}
            >
              <option value="">— Select Macro Skill —</option>
              {macros.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {targetMacroId && (
              <select
                className={inputCls}
                value={targetMicroId}
                onChange={(e) => setTargetMicroId(e.target.value)}
              >
                <option value="">— Select Micro Skill (Optional) —</option>
                {availableMicros.map((ms) => (
                  <option key={ms.id} value={ms.id}>{ms.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Goal Value */}
          <div style={{ borderLeft: '2px solid #7c3aed', paddingLeft: '12px' }}>
            <label className={labelCls}>Goal Value</label>
            <p className="text-xs text-gray-500 mb-1">The optimal number you are trying to hit each day.</p>
            <input
              type="number"
              className={inputCls}
              step="any"
              value={goalValue}
              onChange={(e) => setGoalValue(e.target.value)}
            />
          </div>

          {/* Max XP Reward */}
          <div>
            <label className={labelCls}>Max XP Reward</label>
            <p className="text-xs text-gray-500 mb-1">XP gained if you hit the goal exactly.</p>
            <input
              type="number"
              className={inputCls}
              min={0}
              value={maxXP}
              onChange={(e) => setMaxXP(e.target.value)}
            />
          </div>

          {/* Penalty Range */}
          <div style={{ borderLeft: '2px solid #dc2626', paddingLeft: '12px' }}>
            <label className={labelCls}>Penalty Range (Deviation)</label>
            <p className="text-xs text-gray-500 mb-1">
              How far from goal before maximum penalty kicks in.
              E.g. Goal 2000, Range 1000 → hitting 1000 or 3000 = max penalty.
            </p>
            <input
              type="number"
              className={inputCls}
              min={0}
              step="any"
              value={penaltyRange}
              onChange={(e) => setPenaltyRange(e.target.value)}
            />
          </div>

          {/* Max Negative XP */}
          <div>
            <label className={labelCls}>Max Negative XP Penalty</label>
            <p className="text-xs text-gray-500 mb-1">XP subtracted when you deviate by the full penalty range.</p>
            <input
              type="number"
              className={inputCls}
              min={0}
              value={negativeXP}
              onChange={(e) => setNegativeXP(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
          >Cancel</button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >{isEdit ? 'Save Statistic' : 'Create Statistic'}</button>
        </div>
      </div>
    </div>
  );
}
