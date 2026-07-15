import { useState, useEffect, useCallback } from 'react';
import { store } from '../lib/store';

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const QUEST_TYPES = [
  { value: 'daily',    label: 'Daily' },
  { value: 'habit',   label: 'Habit' },
  { value: 'project', label: 'Project' },
  { value: 'boss',    label: 'Boss Quest' },
  { value: 'chain',   label: 'Chain' },
  { value: 'research',label: 'Research' },
];

function buildBlankSkill(macros) {
  return { macroSkillId: macros[0]?.id || '', microSkillId: '', xpAmount: 50 };
}

function buildSkillsFromQuest(quest) {
  return (quest.targetSkills || []).map(t => ({
    macroSkillId: t.macroSkillId || '',
    microSkillId: t.microSkillId || '',
    xpAmount: t.xpAmount ?? 50,
  }));
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SkillRow({ skill, index, macros, onChange, onRemove }) {
  const macro = macros.find(m => m.id === skill.macroSkillId);
  const microSkills = macro ? (macro.microSkills || []) : [];

  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8,
      padding: '8px', borderRadius: 8,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border)'
    }}>
      <select
        value={skill.macroSkillId}
        onChange={e => onChange(index, 'macroSkillId', e.target.value)}
        style={selectStyle}
      >
        {macros.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>

      <select
        value={skill.microSkillId}
        onChange={e => onChange(index, 'microSkillId', e.target.value)}
        style={{ ...selectStyle, flex: 1 }}
      >
        <option value="">— No Micro Skill —</option>
        {microSkills.map(ms => (
          <option key={ms.id} value={ms.id}>{ms.name}</option>
        ))}
      </select>

      <input
        type="number"
        value={skill.xpAmount}
        min={1}
        onChange={e => onChange(index, 'xpAmount', parseFloat(e.target.value) || 0)}
        style={{ ...inputStyle, width: 80, textAlign: 'center' }}
        placeholder="XP"
      />

      <button
        type="button"
        onClick={() => onRemove(index)}
        style={removeRowBtnStyle}
        title="Remove skill"
      >✕</button>
    </div>
  );
}

// ── Tab Components ───────────────────────────────────────────────────────────

function TabBasicInfo({ name, setName, description, setDescription, questType, setQuestType }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={formGroupStyle}>
        <label style={labelStyle}>Quest Name / Action</label>
        <input
          id="qm-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Read 15 pages, Run 5km..."
          style={inputStyle}
          autoFocus
        />
      </div>

      <div style={formGroupStyle}>
        <label style={labelStyle}>Description</label>
        <textarea
          id="qm-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What does this quest involve?"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
        />
      </div>

      <div style={formGroupStyle}>
        <label style={labelStyle}>Quest Type</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {QUEST_TYPES.map(qt => (
            <button
              key={qt.value}
              type="button"
              onClick={() => setQuestType(qt.value)}
              style={{
                ...typeTabStyle,
                ...(questType === qt.value ? typeTabActiveStyle : {}),
              }}
            >
              {qt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabSkills({ skills, setSkills, macros }) {
  function handleChange(index, field, value) {
    setSkills(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  function handleRemove(index) {
    setSkills(prev => prev.filter((_, i) => i !== index));
  }

  function handleAdd() {
    setSkills(prev => [...prev, buildBlankSkill(macros)]);
  }

  if (macros.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-2)', fontSize: '0.85rem' }}>
        No skills found. Create a macro skill first.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={labelStyle}>Target Skills &amp; XP Rewards</label>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: 4 }}>
        Select skills rewarded on quest completion.
      </div>
      {skills.map((skill, i) => (
        <SkillRow
          key={i}
          skill={skill}
          index={i}
          macros={macros}
          onChange={handleChange}
          onRemove={handleRemove}
        />
      ))}
      <button type="button" onClick={handleAdd} style={addSkillBtnStyle}>
        + Add Skill Reward
      </button>
    </div>
  );
}

function TabSchedule({ timeWindow, setTimeWindow, hasExpiry, setHasExpiry, expiryHours, setExpiryHours, scheduledDays, setScheduledDays }) {
  function toggleDay(i) {
    setScheduledDays(prev =>
      prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Scheduled Days */}
      <div style={formGroupStyle}>
        <label style={labelStyle}>Scheduled Days (Weekly Repeat)</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {DAY_LABELS.map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              style={{
                ...typeTabStyle,
                flex: 1,
                minWidth: 40,
                padding: '6px 0',
                ...(scheduledDays.includes(i) ? typeTabActiveStyle : {}),
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Time Window */}
      <div style={formGroupStyle}>
        <div style={checkRowStyle}>
          <input
            id="qm-tw-enable"
            type="checkbox"
            checked={!!timeWindow}
            onChange={e => setTimeWindow(e.target.checked ? { start: '09:00', end: '17:00' } : null)}
            style={checkboxStyle}
          />
          <label htmlFor="qm-tw-enable" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>
            Restrict to daily time window
          </label>
        </div>
        {timeWindow && (
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <div style={{ ...formGroupStyle, flex: 1 }}>
              <label style={labelStyle}>Start Time</label>
              <input
                type="time"
                value={timeWindow.start}
                onChange={e => setTimeWindow(prev => ({ ...prev, start: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={{ ...formGroupStyle, flex: 1 }}>
              <label style={labelStyle}>End Time</label>
              <input
                type="time"
                value={timeWindow.end}
                onChange={e => setTimeWindow(prev => ({ ...prev, end: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expiry Timer */}
      <div style={formGroupStyle}>
        <div style={checkRowStyle}>
          <input
            id="qm-expiry-enable"
            type="checkbox"
            checked={hasExpiry}
            onChange={e => setHasExpiry(e.target.checked)}
            style={checkboxStyle}
          />
          <label htmlFor="qm-expiry-enable" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>
            Enable Quest Expiration Timer
          </label>
        </div>
        {hasExpiry && (
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>Expiration Duration (Hours)</label>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={expiryHours}
              onChange={e => setExpiryHours(parseFloat(e.target.value) || 24)}
              style={{ ...inputStyle, width: 120 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TabAdvanced({ isNegative, setIsNegative, isNegativeOnComplete, setIsNegativeOnComplete, hasProgressIndicator, setHasProgressIndicator, piType, setPiType, piChecksCount, setPiChecksCount, piTimerDuration, setPiTimerDuration }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Negative XP Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ ...labelStyle, fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--accent)' }}>
          XP PENALTY OPTIONS
        </label>
        <div style={checkRowStyle}>
          <input
            id="qm-neg-miss"
            type="checkbox"
            checked={isNegative}
            onChange={e => setIsNegative(e.target.checked)}
            style={checkboxStyle}
          />
          <label htmlFor="qm-neg-miss" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>
            Negative XP penalty if missed
          </label>
        </div>
        <div style={checkRowStyle}>
          <input
            id="qm-neg-complete"
            type="checkbox"
            checked={isNegativeOnComplete}
            onChange={e => setIsNegativeOnComplete(e.target.checked)}
            style={checkboxStyle}
          />
          <label htmlFor="qm-neg-complete" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>
            Negative XP on completion (for bad habits)
          </label>
        </div>
      </div>

      {/* Progress Indicator */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <label style={{ ...labelStyle, fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--accent)' }}>
          PROGRESS INDICATOR
        </label>
        <div style={{ ...checkRowStyle, marginTop: 10 }}>
          <input
            id="qm-pi-enable"
            type="checkbox"
            checked={hasProgressIndicator}
            onChange={e => setHasProgressIndicator(e.target.checked)}
            style={checkboxStyle}
          />
          <label htmlFor="qm-pi-enable" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>
            Enable Progress Indicator
          </label>
        </div>

        {hasProgressIndicator && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '2px solid var(--border)', paddingLeft: 14 }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Indicator Type</label>
              <select value={piType} onChange={e => setPiType(e.target.value)} style={selectStyle}>
                <option value="manual">Manual Slider (0% – 100%)</option>
                <option value="checks">Checklists (custom number of steps)</option>
                <option value="timer">Time Tracker (study/practice countdown)</option>
              </select>
            </div>

            {piType === 'checks' && (
              <div style={formGroupStyle}>
                <label style={labelStyle}>Number of Checklist Steps</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={piChecksCount}
                  onChange={e => setPiChecksCount(parseInt(e.target.value) || 4)}
                  style={{ ...inputStyle, width: 100 }}
                />
              </div>
            )}

            {piType === 'timer' && (
              <div style={formGroupStyle}>
                <label style={labelStyle}>Timer Target Duration (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={piTimerDuration}
                  onChange={e => setPiTimerDuration(parseFloat(e.target.value) || 20)}
                  style={{ ...inputStyle, width: 120 }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Modal Component ─────────────────────────────────────────────────────

export default function QuestModal({ isOpen, onClose, editQuest = null }) {
  const macros = store.getMacros();

  // ── State ──
  const [activeTab, setActiveTab] = useState('basic');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [questType, setQuestType] = useState('daily');
  const [skills, setSkills] = useState([]);
  const [scheduledDays, setScheduledDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [timeWindow, setTimeWindow] = useState(null);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryHours, setExpiryHours] = useState(24);
  const [isNegative, setIsNegative] = useState(false);
  const [isNegativeOnComplete, setIsNegativeOnComplete] = useState(false);
  const [hasProgressIndicator, setHasProgressIndicator] = useState(false);
  const [piType, setPiType] = useState('manual');
  const [piChecksCount, setPiChecksCount] = useState(4);
  const [piTimerDuration, setPiTimerDuration] = useState(20);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Pre-fill when editQuest changes ──
  useEffect(() => {
    setActiveTab('basic');
    setError('');
    if (editQuest) {
      setName(editQuest.name || '');
      setDescription(editQuest.description || '');
      setQuestType(editQuest.type || 'daily');
      setSkills(buildSkillsFromQuest(editQuest));
      setScheduledDays(editQuest.scheduledDays || [0, 1, 2, 3, 4, 5, 6]);
      setTimeWindow(editQuest.timeWindow || null);
      setHasExpiry(!!(editQuest.expiresAt || editQuest.hasTimeLimit));
      setExpiryHours(editQuest.timeLimitHours || 24);
      setIsNegative(editQuest.isNegativeOnMiss || false);
      setIsNegativeOnComplete(editQuest.isNegativeOnComplete || false);
      const pi = editQuest.progressIndicator;
      setHasProgressIndicator(!!pi);
      setPiType(pi?.type || 'manual');
      setPiChecksCount(pi?.checksCount || 4);
      setPiTimerDuration(pi ? Math.round(pi.timerDuration / 60) : 20);
    } else {
      setName('');
      setDescription('');
      setQuestType('daily');
      setSkills(macros.length > 0 ? [buildBlankSkill(macros)] : []);
      setScheduledDays([0, 1, 2, 3, 4, 5, 6]);
      setTimeWindow(null);
      setHasExpiry(false);
      setExpiryHours(24);
      setIsNegative(false);
      setIsNegativeOnComplete(false);
      setHasProgressIndicator(false);
      setPiType('manual');
      setPiChecksCount(4);
      setPiTimerDuration(20);
    }
  }, [editQuest, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close on Escape ──
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // ── Submit ──
  const handleSubmit = useCallback(() => {
    if (submitting) return;
    const trimmedName = name.trim();
    if (!trimmedName) { setError('Quest name is required.'); setActiveTab('basic'); return; }
    if (skills.length === 0) { setError('Add at least one skill reward.'); setActiveTab('skills'); return; }

    setSubmitting(true);
    setError('');

    let progressIndicator = null;
    if (hasProgressIndicator) {
      const existingPI = editQuest?.progressIndicator;
      progressIndicator = {
        type: piType,
        value: existingPI?.type === piType ? (existingPI.value || 0) : 0,
        checksCount: piChecksCount,
        checklist: existingPI?.type === piType && existingPI.checklist?.length === piChecksCount
          ? existingPI.checklist
          : Array(piChecksCount).fill(false),
        timerDuration: piTimerDuration * 60,
        timerRemaining: existingPI?.type === piType ? existingPI.timerRemaining : piTimerDuration * 60,
        timerEndTime: existingPI?.type === piType ? existingPI.timerEndTime : 0,
        timerIsRunning: existingPI?.type === piType ? existingPI.timerIsRunning : false,
      };
    }

    const targetSkills = skills
      .filter(s => s.macroSkillId)
      .map(s => ({
        macroSkillId: s.macroSkillId,
        microSkillId: s.microSkillId || null,
        xpAmount: isNaN(s.xpAmount) ? 50 : s.xpAmount,
      }));

    const quest = {
      id: editQuest?.id || store.uid(),
      name: trimmedName,
      description: description.trim(),
      type: questType,
      status: editQuest?.status || 'active',
      isCustom: true,
      createdAt: editQuest?.createdAt || Date.now(),
      scheduledDate: editQuest?.scheduledDate || new Date().toDateString(),
      scheduledDays: scheduledDays.length ? scheduledDays : [0, 1, 2, 3, 4, 5, 6],
      targetSkills,
      timeWindow,
      hasTimeLimit: hasExpiry,
      timeLimitHours: expiryHours,
      expiresAt: hasExpiry ? (editQuest?.expiresAt || (Date.now() + expiryHours * 60 * 60 * 1000)) : null,
      isNegativeOnMiss: isNegative,
      isNegativeOnComplete,
      progressIndicator,
    };

    store.upsertQuest(quest);
    setSubmitting(false);
    onClose();
  }, [submitting, name, description, questType, skills, scheduledDays, timeWindow, hasExpiry, expiryHours, isNegative, isNegativeOnComplete, hasProgressIndicator, piType, piChecksCount, piTimerDuration, editQuest, onClose]);

  if (!isOpen) return null;

  const isEditing = !!editQuest;
  const tabs = [
    { id: 'basic',    label: 'Basic Info' },
    { id: 'skills',   label: 'Skills' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'advanced', label: 'Advanced' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            pointerEvents: 'all',
            background: 'rgba(8,8,10,0.97)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 18,
            boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
            width: '100%',
            maxWidth: 520,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideUp 0.25s cubic-bezier(0.175,0.885,0.32,1.275)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px 0',
            borderBottom: '1px solid var(--border)',
            paddingBottom: 16,
          }}>
            <h2 style={{
              margin: 0, fontSize: '0.9rem',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.12em',
              color: 'var(--chrome)',
              fontWeight: 600,
            }}>
              {isEditing ? 'EDIT QUEST' : 'CREATE QUEST'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-2)', fontSize: '1.2rem', lineHeight: 1,
                padding: 4, borderRadius: 6,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}
            >✕</button>
          </div>

          {/* Tab Navigation */}
          <div style={{
            display: 'flex', gap: 2, padding: '12px 24px 0',
            borderBottom: '1px solid var(--border)',
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.7rem', fontFamily: 'var(--font-display)',
                  letterSpacing: '0.08em',
                  color: activeTab === tab.id ? 'var(--text-1)' : 'var(--text-3)',
                  borderBottom: activeTab === tab.id
                    ? '2px solid var(--chrome)'
                    : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '20px 24px',
          }}>
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                fontSize: '0.8rem', color: '#ef4444',
              }}>
                {error}
              </div>
            )}

            {activeTab === 'basic' && (
              <TabBasicInfo
                name={name} setName={setName}
                description={description} setDescription={setDescription}
                questType={questType} setQuestType={setQuestType}
              />
            )}
            {activeTab === 'skills' && (
              <TabSkills skills={skills} setSkills={setSkills} macros={macros} />
            )}
            {activeTab === 'schedule' && (
              <TabSchedule
                timeWindow={timeWindow} setTimeWindow={setTimeWindow}
                hasExpiry={hasExpiry} setHasExpiry={setHasExpiry}
                expiryHours={expiryHours} setExpiryHours={setExpiryHours}
                scheduledDays={scheduledDays} setScheduledDays={setScheduledDays}
              />
            )}
            {activeTab === 'advanced' && (
              <TabAdvanced
                isNegative={isNegative} setIsNegative={setIsNegative}
                isNegativeOnComplete={isNegativeOnComplete} setIsNegativeOnComplete={setIsNegativeOnComplete}
                hasProgressIndicator={hasProgressIndicator} setHasProgressIndicator={setHasProgressIndicator}
                piType={piType} setPiType={setPiType}
                piChecksCount={piChecksCount} setPiChecksCount={setPiChecksCount}
                piTimerDuration={piTimerDuration} setPiTimerDuration={setPiTimerDuration}
              />
            )}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', gap: 10, justifyContent: 'flex-end',
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            background: 'rgba(0,0,0,0.4)',
          }}>
            <button
              type="button"
              onClick={onClose}
              style={cancelBtnStyle}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                ...submitBtnStyle,
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {isEditing ? 'Save Changes' : 'Create Quest'}
            </button>
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}

// ── Shared Styles ─────────────────────────────────────────────────────────────

const formGroupStyle = {
  display: 'flex', flexDirection: 'column', gap: 6,
};

const labelStyle = {
  fontSize: '0.75rem',
  fontFamily: 'var(--font-display)',
  letterSpacing: '0.06em',
  color: 'var(--text-2)',
  marginBottom: 2,
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-1)',
  fontSize: '0.875rem',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const selectStyle = {
  flex: 1,
  padding: '9px 12px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-1)',
  fontSize: '0.875rem',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  cursor: 'pointer',
};

const checkboxStyle = {
  width: 16, height: 16,
  accentColor: 'var(--chrome)',
  cursor: 'pointer',
  flexShrink: 0,
};

const checkRowStyle = {
  display: 'flex', alignItems: 'center', gap: 10,
};

const typeTabStyle = {
  padding: '7px 14px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-2)',
  cursor: 'pointer',
  fontSize: '0.78rem',
  fontFamily: 'var(--font-display)',
  letterSpacing: '0.04em',
  transition: 'all 0.15s',
};

const typeTabActiveStyle = {
  background: 'rgba(232,232,232,0.12)',
  color: 'var(--chrome)',
  borderColor: 'rgba(232,232,232,0.35)',
};

const addSkillBtnStyle = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px dashed var(--border)',
  background: 'transparent',
  color: 'var(--text-2)',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontFamily: 'var(--font-display)',
  letterSpacing: '0.04em',
  transition: 'all 0.15s',
  alignSelf: 'flex-start',
};

const removeRowBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-3)',
  cursor: 'pointer',
  fontSize: '0.9rem',
  padding: '2px 6px',
  borderRadius: 4,
  transition: 'color 0.15s',
  flexShrink: 0,
};

const cancelBtnStyle = {
  padding: '9px 20px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-2)',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontFamily: 'var(--font-display)',
  letterSpacing: '0.06em',
  transition: 'all 0.15s',
};

const submitBtnStyle = {
  padding: '9px 24px',
  borderRadius: 8,
  border: '1px solid rgba(232,232,232,0.4)',
  background: 'rgba(232,232,232,0.12)',
  color: 'var(--chrome)',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontFamily: 'var(--font-display)',
  letterSpacing: '0.08em',
  fontWeight: 600,
  transition: 'all 0.15s',
};
