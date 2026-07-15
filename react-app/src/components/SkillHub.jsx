import React, { useState, useEffect } from 'react';
import { store } from '../lib/store';
import { formulas as F } from '../lib/formulas';
import SkillModal from './SkillModal';
import StatModal from './StatModal';
import SkillWidgets from './SkillWidgets';

export default function SkillHub({ macroId }) {
  const [macro, setMacro] = useState(null);
  const [habituals, setHabituals] = useState([]);
  const [chains, setChains] = useState([]);
  const [statistics, setStatistics] = useState([]);
  const [mounted, setMounted] = useState(false);

  // Habitual modal states
  const [showHabModal, setShowHabModal] = useState(false);
  const [habName, setHabName] = useState('');
  const [habGain, setHabGain] = useState(10);
  const [habLoss, setHabLoss] = useState(10);

  // Skill & Stat Modal states
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  
  const [statModalOpen, setStatModalOpen] = useState(false);
  const [statModalMode, setStatModalMode] = useState('create');
  const [editStatId, setEditStatId] = useState(null);

  const [showWidgets, setShowWidgets] = useState(false);

  useEffect(() => {
    function loadData() {
      // If macroId isn't provided, just grab the first one for now or handle empty state
      const mId = macroId || (store.getMacros()[0] ? store.getMacros()[0].id : null);
      if (!mId) return;

      const m = store.getMacro(mId);
      setMacro(m);
      if (m) {
        setHabituals(store.getHabituals().filter(h => h.macroId === mId));
        setChains(store.getChains(mId));
        setStatistics(store.getStatistics().filter(s => s.targetSkill && s.targetSkill.macroSkillId === mId));
      }
    }

    loadData();
    store.on('change', loadData);
    return () => store.off('change', loadData);
  }, [macroId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSaveHabitual = () => {
    if (!habName.trim()) return;
    const now = new Date();
    const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
    const istDate = new Date(istMs).toISOString().slice(0, 10);
    
    const newHabitual = {
      id: store.uid(),
      macroId: macro.id,
      name: habName,
      xpGain: parseInt(habGain) || 0,
      xpLoss: parseInt(habLoss) || 0,
      createdAt: Date.now(),
      todayStatus: null,
      lastResetDate: istDate
    };
    
    store.upsertHabitual(newHabitual);
    setShowHabModal(false);
    setHabName('');
    setHabGain(10);
    setHabLoss(10);
  };

  if (!macro) {
    return <div className="p-8 text-center text-red-500">Skill not found.</div>;
  }

  const pct = F.progressPercent(macro.currentXP || 0, macro);
  const activeChains = chains.filter(c => c.steps?.some(s => !s.completedAt)).length;

  const OPTIONS = [
    {
      id: 'create-quest',
      title: 'Create Quest',
      desc: 'Add a new quest for this skill',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="26" height="26">
          <circle cx="12" cy="12" r="9"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
      )
    },
    {
      id: 'create-habitual',
      title: 'Create Habitual',
      desc: 'Daily XP habit with gain/loss tracking',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="26" height="26">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 7v5l3 3"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
      )
    },
    {
      id: 'create-statistic',
      title: 'Create Statistic',
      desc: 'Track metrics like calories or study hours',
      icon: <span className="material-symbols-outlined" style={{fontSize: '26px'}}>add_chart</span>
    },
    {
      id: 'chain-quests',
      title: 'Chain Quests',
      desc: 'Multi-step ordered quest sequences',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="26" height="26">
          <circle cx="5" cy="12" r="2.5"/>
          <circle cx="12" cy="12" r="2.5"/>
          <circle cx="19" cy="12" r="2.5"/>
          <line x1="7.5" y1="12" x2="9.5" y2="12"/>
          <line x1="14.5" y1="12" x2="16.5" y2="12"/>
        </svg>
      )
    }
  ];

  function getTier(level) {
    if (level >= 80) return 'LEGEND';
    if (level >= 60) return 'MASTER';
    if (level >= 40) return 'EXPERT';
    if (level >= 20) return 'ADEPT';
    if (level >= 10) return 'APPRENTICE';
    return 'NOVICE';
  }

  const PHYSIQUE_NAMES = ['physique', 'corpus', 'forge', 'brawn', 'titan'];
  const isPhysique = macro && (PHYSIQUE_NAMES.includes(macro.name.toLowerCase()) || macro.accentColor === '#ef4444');

  if (isPhysique) {
    OPTIONS.unshift({
      id: 'open-widgets',
      title: 'Skill Widgets',
      desc: 'Workout Planner & Archive',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="26" height="26">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8" style={{ '--sk-accent': macro?.accentColor || '#7c3aed' }}>
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-4 h-4 rounded-full shadow-[0_0_14px_var(--sk-accent)]" style={{ background: 'var(--sk-accent)' }}></div>
          <h1 className="text-3xl font-display uppercase tracking-widest text-white">{macro.name}</h1>
          <span className="text-xl font-display" style={{ color: 'var(--sk-accent)' }}>Lv{macro.currentLevel || 0}</span>
        </div>
        
        {/* XP Bar */}
        <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden border border-white/10 relative">
          <div className="h-full transition-all duration-500 ease-out absolute top-0 left-0" style={{ width: mounted ? `${pct}%` : '0%', background: 'var(--sk-accent)' }}></div>
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{F.formatXP(F.xpIntoCurrentLevel(macro.currentXP || 0, macro))} / {F.formatXP(F.xpRequiredForNextLevel(macro.currentXP || 0, macro))} XP to next level</span>
          <span>Total: {F.formatXP(macro.currentXP || 0)} XP</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Tree Column */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl flex flex-col space-y-4">
            <h2 className="text-xl font-display text-white tracking-widest">MICRO SKILLS</h2>
            <div className="space-y-4">
              {(!macro.microSkills || macro.microSkills.length === 0) ? (
                <div className="text-gray-500 text-sm">No micro skills yet.</div>
              ) : (
                macro.microSkills.map(ms => {
                  const mPct = F.progressPercent(ms.currentXP || 0, ms);
                  const mInto = F.xpIntoCurrentLevel(ms.currentXP || 0, ms);
                  const mReq = F.xpRequiredForNextLevel(ms.currentXP || 0, ms);
                  const tier = getTier(ms.currentLevel || 0);

                  return (
                    <div key={ms.id} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-white font-medium">{ms.name}</div>
                          <div className="text-[10px] font-display tracking-widest" style={{ color: 'var(--sk-accent)' }}>{tier}</div>
                        </div>
                        <div className="text-sm text-gray-400">Lvl {ms.currentLevel || 0}</div>
                      </div>
                      <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden relative">
                        <div className="h-full opacity-80 transition-all duration-500 ease-out absolute top-0 left-0" style={{ width: mounted ? `${mPct}%` : '0%', background: 'var(--sk-accent)' }}></div>
                      </div>
                      <div className="text-right text-[10px] text-gray-500">
                        {F.formatXP(mInto)} / {F.formatXP(mReq)} XP
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <button 
              onClick={() => setSkillModalOpen(true)}
              className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-colors"
            >
              + Add Micro Skill / Edit Macro
            </button>
          </div>
        </div>

        {/* Hub Column */}
        <div className="space-y-6">
          {/* Active Habituals & Statistics */}
          {(habituals.length > 0 || statistics.length > 0) && (
            <div className="glass-panel p-6 rounded-2xl flex flex-col space-y-6">
              {habituals.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-display text-gray-400 tracking-widest">ACTIVE HABITUALS</h3>
                  {habituals.map(h => (
                    <div key={h.id} className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                      <div>
                        <div className="text-sm text-white font-medium">{h.name}</div>
                        <div className="text-xs text-gray-400">+{h.xpGain} / -{h.xpLoss} XP</div>
                      </div>
                      <button 
                        onClick={() => {
                          if (window.confirm('Delete this habitual?')) store.deleteHabitual(h.id);
                        }}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                        title="Delete Habitual"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {statistics.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-display text-gray-400 tracking-widest">ACTIVE STATISTICS</h3>
                  {statistics.map(s => (
                    <div key={s.id} className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-white/5">
                      <div>
                        <div className="text-sm text-white font-medium">{s.name}</div>
                        <div className="text-xs text-gray-400">Goal: {s.goalValue} {s.unit}</div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditStatId(s.id);
                            setStatModalMode('edit');
                            setStatModalOpen(true);
                          }}
                          className="text-gray-500 hover:text-white transition-colors p-1 text-xs"
                          title="Edit Statistic"
                        >
                          EDIT
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm('Delete this statistic?')) store.deleteStatistic(s.id);
                          }}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1"
                          title="Delete Statistic"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {OPTIONS.map(opt => {
              let badge = null;
              if (opt.id === 'chain-quests' && activeChains > 0) {
                badge = <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-black" style={{ background: 'var(--sk-accent)' }}>{activeChains}</span>;
              }
              if (opt.id === 'create-habitual' && habituals.length > 0) {
                badge = <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-black" style={{ background: '#8FAF2A' }}>{habituals.length}</span>;
              }

              return (
                <button 
                  key={opt.id} 
                  className="flex flex-col items-start p-4 glass-panel rounded-xl hover:bg-white/10 transition-colors text-left border border-white/5"
                  onClick={() => {
                    switch(opt.id) {
                      case 'create-habitual':
                        setShowHabModal(true);
                        break;
                      case 'create-quest':
                        window.openQuestModal && window.openQuestModal(null);
                        break;
                      case 'create-statistic':
                        setEditStatId(null);
                        setStatModalMode('create');
                        setStatModalOpen(true);
                        break;
                      case 'chain-quests':
                        window.location.hash = `#skill-chains/${macro.id}`;
                        break;
                      case 'open-widgets':
                        setShowWidgets(true);
                        break;
                      default:
                        break;
                    }
                  }}
                >
                  <div className="mb-2" style={{ color: opt.id === 'create-habitual' ? '#8FAF2A' : 'var(--sk-accent)' }}>
                    {opt.icon}
                  </div>
                  <div className="font-medium text-white flex items-center">
                    {opt.title}
                    {badge}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Habitual Modal */}
      {showHabModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-white/10 rounded-2xl w-full max-w-md p-6 flex flex-col space-y-4 shadow-2xl">
            <h2 className="text-xl font-display text-white">CREATE HABITUAL</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-display tracking-wider text-gray-400 mb-1">NAME</label>
                <input 
                  type="text"
                  value={habName}
                  onChange={(e) => setHabName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--sk-accent)]"
                  placeholder="e.g. Read 10 Pages"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-display tracking-wider text-gray-400 mb-1">XP GAIN</label>
                  <input 
                    type="number"
                    value={habGain}
                    onChange={(e) => setHabGain(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--sk-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-display tracking-wider text-gray-400 mb-1">XP LOSS</label>
                  <input 
                    type="number"
                    value={habLoss}
                    onChange={(e) => setHabLoss(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--sk-accent)]"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button 
                onClick={() => setShowHabModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveHabitual}
                className="px-4 py-2 rounded-lg text-sm font-bold text-black transition-colors"
                style={{ background: 'var(--sk-accent)' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* React Modals */}
      <SkillModal 
        isOpen={skillModalOpen} 
        onClose={() => setSkillModalOpen(false)} 
        macroId={macro.id} 
      />
      <StatModal 
        isOpen={statModalOpen} 
        onClose={() => setStatModalOpen(false)} 
        statId={editStatId} 
        mode={statModalMode} 
      />
      {showWidgets && <SkillWidgets macro={macro} onClose={() => setShowWidgets(false)} />}
    </div>
  );
}
