import React, { useState, useEffect, useRef } from 'react';
import { store } from '../lib/store';
import { formulas as F } from '../lib/formulas';

const CIRC = 2 * Math.PI * 110;

const Wheel = ({ currentSkillId, setCurrentSkillId, macros, overall, settings }) => {
  const handleDrop = (e) => {
    e.preventDefault();
    const questId = e.dataTransfer.getData('questId');
    if (!questId) return;

    const quest = store.getQuest(questId);
    if (!quest) return;

    if (settings.dragToRegister !== false && !quest.isReadyToClaim) {
      alert('You must mark the quest complete first!');
      return;
    }

    if (currentSkillId !== 'overall') {
      const tSkills = quest.targetSkills || [];
      const matches = tSkills.some(t => t.macroSkillId === currentSkillId);
      if (!matches) {
        alert('Quest does not match this skill');
        return;
      }
    }

    store.completeQuest(questId);
  };

  const data = (() => {
    if (currentSkillId === 'overall') {
      return { name: 'Overall', color: 'var(--accent)', xp: overall.currentXP || 0, skill: overall, level: overall.currentLevel || 0 };
    }
    const m = macros.find(m => m.id === currentSkillId);
    if (!m) return { name: 'Unknown', color: 'var(--accent)', xp: 0, skill: {}, level: 0 };
    return { name: m.name, color: m.accentColor, xp: m.currentXP || 0, skill: m, level: m.currentLevel || 0 };
  })();

  const pct = F.progressPercent(data.xp, data.skill);
  const offset = CIRC - (CIRC * pct / 100);
  const into = F.xpIntoCurrentLevel(data.xp, data.skill);
  const req = F.xpRequiredForNextLevel(data.xp, data.skill);
  
  const chromeOn = settings.chromeAccentsEnabled !== false;
  const strokeColor = chromeOn ? 'url(#wheel-chrome-gradient)' : data.color;

  return (
    <div id="wheel-container">
      <select 
        id="wheel-skill-select" 
        className="wheel-select" 
        value={currentSkillId} 
        onChange={e => {
          const val = e.target.value;
          setCurrentSkillId(val);
          const s = store.getSettings();
          s.wheelSkillId = val;
          store.saveSettings(s);
        }}
      >
        <option value="overall">Overall</option>
        {macros.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      <div 
        id="wheel-drop-zone" 
        className="wheel-drop-zone"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <svg id="wheel-svg" viewBox="0 0 260 260" width="100%" style={{maxWidth: '240px', display: 'block', margin: '0 auto'}}>
          <defs>
            <filter id="glow-filter">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
            <linearGradient id="wheel-chrome-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#404040" />
              <stop offset="20%" stopColor="#b8b8b8" />
              <stop offset="40%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#707070" />
              <stop offset="80%" stopColor="#e0e0e0" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
          </defs>
          <circle cx="130" cy="130" r="110" fill="none" stroke="var(--bg-raised)" strokeWidth="14"/>
          {Array.from({length: 20}).map((_, i) => {
            const angle = (i / 20) * 2 * Math.PI - Math.PI/2;
            const x1 = 130 + 117 * Math.cos(angle), y1 = 130 + 117 * Math.sin(angle);
            const x2 = 130 + 122 * Math.cos(angle), y2 = 130 + 122 * Math.sin(angle);
            return <line key={i} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} stroke="var(--border)" strokeWidth="1"/>;
          })}
          
          <clipPath id="circle-clip">
            <circle cx="130" cy="130" r="110"/>
          </clipPath>
          
          {settings.fillingIndicatorEnabled !== false && (
            <g clipPath="url(#circle-clip)">
              <g id="wheel-liquid-fill" style={{ transform: `translateY(${130 - (pct / 100) * 260}px)`, transition: 'transform 1.2s var(--spring-soft)' }}>
                <path className="liquid-wave-2" fill={strokeColor} d="M -520 130 Q -455 145 -390 130 T -260 130 T -130 130 T 0 130 T 130 130 T 260 130 T 390 130 T 520 130 L 520 390 L -520 390 Z" />
                <path className="liquid-wave" fill={strokeColor} d="M -520 130 Q -455 110 -390 130 T -260 130 T -130 130 T 0 130 T 130 130 T 260 130 T 390 130 T 520 130 L 520 390 L -520 390 Z" />
              </g>
            </g>
          )}

          <circle cx="130" cy="130" r="110" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="14" />
          <circle id="wheel-ring" cx="130" cy="130" r="110"
            fill="none" stroke={strokeColor} strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={CIRC.toFixed(2)}
            strokeDashoffset={offset.toFixed(2)}
            transform="rotate(-90 130 130)"
            filter="url(#glow-filter)"
            style={{ transition: 'stroke-dashoffset 1.2s var(--spring-soft), stroke 0.4s ease' }}/>
            
          <text id="wheel-level-text" x="130" y="118" textAnchor="middle"
            fontFamily="var(--font-display)" fontSize="44" fontWeight="300"
            fill="var(--text-1)">{data.level}</text>
          <text id="wheel-skill-name" x="130" y="148" textAnchor="middle"
            fontFamily="var(--font-display)" fontSize="10" fontWeight="400"
            fill="var(--text-2)" letterSpacing="2">{data.name.toUpperCase()}</text>
          <text id="wheel-xp-text" x="130" y="168" textAnchor="middle"
            fontFamily="var(--font-display)" fontSize="9"
            fill="var(--text-3)">{F.formatXP(into)} / {F.formatXP(req)} XP</text>
        </svg>
      </div>
    </div>
  );
};

const QuestCard = ({ quest, macros, settings, setActiveTab }) => {
  const isMissed = quest.status === 'missed';
  const withinWindow = F.isWithinTimeWindow(quest.timeWindow);
  const isLocked = quest.status === 'active' && !withinWindow;

  let timeStr = '';
  if (quest.expiresAt && quest.status === 'active') {
    const leftMs = quest.expiresAt - Date.now();
    if (leftMs > 0) {
      timeStr = <span className="text-[0.65rem] text-[var(--accent)]">Counting down...</span>;
    } else {
      timeStr = <span className="text-[0.65rem] text-[var(--danger)]">Expired</span>;
    }
  }

  let windowBadge = quest.timeWindow 
    ? <span className="px-2 py-1 rounded text-[0.65rem] font-bold tracking-wider" style={{background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border)'}}>{quest.timeWindow.start} - {quest.timeWindow.end}</span>
    : <span className="px-2 py-1 rounded text-[0.65rem] font-bold tracking-wider" style={{background: 'var(--bg-raised)', color: 'var(--text-3)', border: '1px solid var(--border)'}}>Anytime</span>;

  let statusBadge = '';
  if (isMissed) {
    statusBadge = <span className="px-2 py-1 rounded text-[0.65rem] font-bold tracking-wider" style={{background: 'rgba(255,45,120,0.15)', color: 'var(--danger)', border: '1px solid rgba(255,45,120,0.3)'}}>MISSED</span>;
  } else if (isLocked) {
    statusBadge = <span className="px-2 py-1 rounded text-[0.65rem] font-bold tracking-wider" style={{background: 'rgba(120,120,140,0.15)', color: 'var(--text-3)', border: '1px solid var(--border)'}}>LOCKED 🔒</span>;
  }

  let cardClass = (isMissed || isLocked) ? 'opacity-60 grayscale' : '';
  const canDrag = !isLocked && !isMissed;

  return (
    <div 
      className={`glass-panel-accent rounded-xl p-4 flex flex-col gap-3 relative transition-all ${cardClass}`} 
    >
      <div className="flex justify-between items-center text-xs">
        <div className="flex gap-2 items-center">
          {windowBadge}
          {statusBadge}
          {timeStr}
        </div>
        <div className="flex gap-2">
          <button className="text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer" onClick={() => store.deleteQuest(quest.id)} title="Delete">✕</button>
        </div>
      </div>
      <h3 className="text-base font-semibold m-0 text-white" style={{textDecoration: isMissed ? 'line-through' : 'none', opacity: isMissed ? 0.6 : 1}}>{quest.name}</h3>
      {quest.description && <p className="text-sm text-gray-400 m-0" style={{opacity: isMissed ? 0.5 : 1}}>{quest.description}</p>}
      
      <div className="flex flex-wrap gap-2">
        {(quest.targetSkills || []).map((t, idx) => {
          const m = macros.find(x => x.id === t.macroSkillId);
          if (!m) return null;
          return <span key={idx} className="px-2 py-1 rounded-full text-xs border bg-[#00000033]" style={{color: m.accentColor, borderColor: `${m.accentColor}33`}}>{m.name} +{t.xpAmount}xp</span>;
        })}
      </div>
      
      <div className="mt-2 flex">
        {isMissed ? (
          <button className="w-full py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors" style={{background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.2)', color: 'var(--text-3)', cursor: 'not-allowed'}} disabled>Missed (Click ✕ to delete)</button>
        ) : isLocked ? (
          <button className="w-full py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors" style={{background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'not-allowed'}} disabled>Locked (Available {quest.timeWindow.start} - {quest.timeWindow.end})</button>
        ) : quest.isWorkoutQuest ? (
          <button className="w-full py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors" onClick={() => setActiveTab('workout')} style={{background: 'var(--accent)', color: '#000', border: 'none', fontWeight: 700, letterSpacing: '0.08em'}}>⚡ START WORKOUT</button>
        ) : (
          <button className="w-full py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors bg-[#ffffff0a] border border-[#ffffff10] hover:bg-[#ffffff1a] text-white cursor-pointer" onClick={() => {
            store.completeQuest(quest.id);
          }}>✓ Complete</button>
        )}
      </div>
    </div>
  );
};

const HabitualCard = ({ habitual, macros }) => {
  const macro = macros.find(m => m.id === habitual.macroId);
  const accentColor = macro ? macro.accentColor : '#8FAF2A';
  const macroName = macro ? macro.name : 'Unknown Skill';
  const isYes = habitual.todayStatus === 'yes';
  const isNo = habitual.todayStatus === 'no';
  const isPending = !isYes && !isNo;

  const setStatus = (status) => {
    habitual.todayStatus = status;
    store.upsertHabitual(habitual);
    if (status === 'yes') {
      store.awardXP([{ macroSkillId: habitual.macroId, xpAmount: habitual.xpGain }], false, `Habitual: ${habitual.name}`);
    } else if (status === 'no' && habitual.xpLoss) {
      store.awardXP([{ macroSkillId: habitual.macroId, xpAmount: -habitual.xpLoss }], false, `Habitual Missed: ${habitual.name}`);
    }
  };

  const cardStyle = isYes ? {borderColor: '#8FAF2A', boxShadow: '0 0 15px #8FAF2A22'} : isNo ? {borderColor: '#ef4444', boxShadow: '0 0 15px rgba(255,0,0,0.1)'} : {};

  return (
    <div className="bg-[#181820] border border-[#ffffff10] rounded-xl p-4 flex flex-col gap-3 relative transition-all" style={cardStyle}>
      <div className="flex justify-between items-center text-xs">
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <div className="w-2 h-2 rounded-full" style={{background: '#8FAF2A', boxShadow: '0 0 6px #8FAF2A44'}}></div>
          <span className="text-[0.65rem] font-bold tracking-wider" style={{color: '#8FAF2A'}}>HABITUAL</span>
        </div>
        <span className="px-2 py-1 rounded border text-[0.65rem] font-bold uppercase" style={{color: accentColor, borderColor: `${accentColor}44`}}>{macroName}</span>
      </div>
      <h3 className="text-base font-semibold m-0 text-white">{habitual.name}</h3>
      <div className="flex justify-between text-xs font-medium">
        <span className="px-2 py-1 rounded bg-[#8FAF2A22] text-[#8FAF2A]">+{habitual.xpGain} XP if done</span>
        <span className="px-2 py-1 rounded bg-[rgba(255,45,120,0.15)] text-[#ff2d78]">-{habitual.xpLoss} XP if missed</span>
      </div>
      <div className={`flex gap-2 mt-2 ${isPending ? '' : 'opacity-50 pointer-events-none'}`}>
        <button 
          className="flex-1 py-3 rounded-lg flex justify-center items-center transition-colors border border-[#ffffff10] bg-[#202028] hover:bg-[#8FAF2A] hover:text-black cursor-pointer disabled:cursor-not-allowed"
          style={isYes ? {background: '#8FAF2A', color: 'black'} : {}}
          onClick={() => setStatus('yes')}
          disabled={!isPending}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22"><path d="M20 6L9 17l-5-5"/></svg>
        </button>
        <button 
          className="flex-1 py-3 rounded-lg flex justify-center items-center transition-colors border border-[#ffffff10] bg-[#202028] hover:bg-red-500 hover:text-black cursor-pointer disabled:cursor-not-allowed" 
          style={isNo ? {background: '#ef4444', color: 'black'} : {}}
          onClick={() => setStatus('no')}
          disabled={!isPending}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      {!isPending && (
        <p className="text-xs text-center mt-2 text-gray-400 m-0">
          {isYes ? `✓ Marked done · +${habitual.xpGain} XP earned` : `✕ Marked missed · -${habitual.xpLoss} XP deducted`}
        </p>
      )}
    </div>
  );
};

const ChainCard = ({ chain, macros }) => {
  const macro = macros.find(m => m.id === chain.macroId);
  const accent = macro ? macro.accentColor : 'var(--accent)';
  const macroName = macro ? macro.name : 'Unknown';
  const total = chain.steps.length;
  const doneCount = chain.steps.filter(s => s.completedAt).length;
  const actIdx = chain.steps.findIndex(s => !s.completedAt);
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 100;
  const activeStep = actIdx >= 0 ? chain.steps[actIdx] : null;

  return (
    <div className="bg-[#181820] border rounded-xl p-4 flex flex-col gap-3 relative transition-all" style={{borderColor: `${accent}22`}}>
      <div className="flex justify-between items-center text-xs">
        <div className="flex gap-2">
          <span className="px-2 py-1 rounded text-[0.65rem] font-bold tracking-wider" style={{background: 'rgba(255,214,0,0.1)', color: '#FFD600', border: '1px solid rgba(255,214,0,0.3)'}}>CHAIN</span>
          <span className="px-2 py-1 rounded text-[0.65rem] font-bold tracking-wider uppercase" style={{color: accent, borderColor: `${accent}33`, border: '1px solid currentColor'}}>{macroName}</span>
        </div>
        <div className="flex gap-2">
          <span style={{fontSize: '0.7rem', color: 'var(--text-3)'}}>{pct}% done</span>
        </div>
      </div>
      <h3 className="text-base font-semibold m-0 text-white">{chain.name}</h3>
      <div style={{margin: '4px 0 8px', display: 'flex', gap: '4px', alignItems: 'center'}}>
        {chain.steps.map((s, i) => (
          <div key={i} style={{flex: 1, height: '4px', borderRadius: '100px', background: s.completedAt ? accent : 'rgba(255,255,255,0.08)'}}></div>
        ))}
      </div>
      {activeStep ? (
        <div className="mt-2 flex flex-col">
          <div style={{fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '6px'}}>Step {actIdx+1}/{total}: {activeStep.name} · +{activeStep.xpAmount || 0}XP</div>
          <button className="w-full py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors bg-[#ffffff0a] border border-[#ffffff10] hover:bg-[#ffffff1a] text-white cursor-pointer" onClick={() => store.completeChainStep(chain.id, activeStep.id)}>✓ Complete Step</button>
        </div>
      ) : (
        <div style={{fontSize: '0.75rem', color: 'var(--success)', padding: '8px 0'}}>🏆 Chain Complete!</div>
      )}
    </div>
  );
};

export default function Dashboard({ setActiveTab }) {
  const [macros, setMacros] = useState([]);
  const [quests, setQuests] = useState([]);
  const [settings, setSettings] = useState({});
  const [overall, setOverall] = useState({});
  const [habituals, setHabituals] = useState([]);
  const [chains, setChains] = useState([]);

  const [currentSkillId, setCurrentSkillId] = useState('overall');
  const [activeQuestType, setActiveQuestType] = useState('quests');
  
  const carouselRef = useRef(null);
  const questCarouselRef = useRef(null);

  useEffect(() => {
    const handleStoreChange = () => {
      setMacros(store.getMacros());
      setQuests(store.getQuests());
      setSettings(store.getSettings());
      setOverall(store.getOverall());
      setHabituals(store.getHabituals());
      setChains(store.getAllChains());
      
      const s = store.getSettings();
      setCurrentSkillId(s.wheelSkillId || 'overall');
    };
    
    // Initial fetch
    handleStoreChange();
    
    store.on('change', handleStoreChange);
    return () => store.off('change', handleStoreChange);
  }, []);

  const visibleQuests = quests.filter(q => {
    if (q.hiddenFromDashboard) return false;
    if (q.status === 'completed' && !q.isReadyToClaim) return false;
    if (q.status === 'deleted') return false;
    const isLocked = q.status === 'active' && !F.isWithinTimeWindow(q.timeWindow);
    if (isLocked || q.status === 'missed') return false;
    return true;
  });

  const activeChains = chains.filter(c => c.steps.some(s => !s.completedAt));

  const updateQuestCarouselNav = (e) => {
    const el = e.target;
    if (!el) return;
    const panelWidth = el.clientWidth;
    const scrollLeft = el.scrollLeft;
    const index = Math.round(scrollLeft / panelWidth);
    
    if (index === 0) setActiveQuestType('quests');
    else if (index === 1) setActiveQuestType('habituals');
    else if (index === 2) setActiveQuestType('chains');
  };

  const QUEST_TYPES = [
    { id: 'quests',    label: 'QUESTS',    dot: '#00E5FF', rotDeg: 0   },
    { id: 'habituals', label: 'HABITUALS', dot: '#8FAF2A', rotDeg: 120 },
    { id: 'chains',    label: 'CHAINS',    dot: '#FFD600', rotDeg: 240 },
  ];
  
  const activeTypeInfo = QUEST_TYPES.find(t => t.id === activeQuestType) || QUEST_TYPES[0];

  return (
    <div className="flex h-full w-full justify-center p-4 md:p-8 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col gap-8 pb-20">
        
        <div className="w-full relative">
          <div className="flex overflow-x-auto snap-x snap-mandatory" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}} ref={carouselRef}>
            <div className="w-full shrink-0 snap-center">
              <div className="flex flex-col items-center py-4">
                <p className="font-['Geist',sans-serif] text-[0.68rem] tracking-[0.18em] text-gray-400 uppercase mb-3">SELECT SKILL · DRAG QUEST TO COMPLETE</p>
                <Wheel currentSkillId={currentSkillId} setCurrentSkillId={setCurrentSkillId} macros={macros} overall={overall} settings={settings} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-hidden">
          <div className="flex justify-between items-center mb-2" id="quest-area-header-container">
            <div id="quest-swipe-zone" className="flex items-center relative cursor-pointer w-full justify-start">
              <span className="w-2 h-2 rounded-full mr-3" style={{background: activeTypeInfo.dot, boxShadow: `0 0 10px ${activeTypeInfo.dot}`}}></span>
              <span className="text-sm font-medium tracking-wide m-0">{activeTypeInfo.label}</span>
              
              <div className="flex items-center gap-1.5 ml-3">
                {QUEST_TYPES.map((t, idx) => (
                  <div key={idx} className="w-[5px] h-[5px] rounded-full transition-all duration-200" style={{background: 'var(--text-1)', opacity: t.id === activeQuestType ? '1' : '0.2', transform: `scale(${t.id === activeQuestType ? '1.2' : '1'})`}}></div>
                ))}
              </div>

              <select 
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                value={activeQuestType}
                onChange={e => {
                  setActiveQuestType(e.target.value);
                  const idx = QUEST_TYPES.findIndex(t => t.id === e.target.value);
                  if (questCarouselRef.current) {
                    questCarouselRef.current.scrollTo({ left: questCarouselRef.current.clientWidth * idx, behavior: 'smooth' });
                  }
                }}
              >
                {QUEST_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}} id="quest-list-carousel" ref={questCarouselRef} onScroll={updateQuestCarouselNav}>
            {/* 0: Quests */}
            <div className="w-full shrink-0 snap-center pr-2">
              <div className="grid grid-cols-1 gap-4">
                {visibleQuests.length > 0 ? visibleQuests.map(q => <QuestCard key={q.id} quest={q} macros={macros} settings={settings} setActiveTab={setActiveTab} />) : <div className="text-center p-8 text-gray-500 text-sm"><p>No active quests. Let's get to work!</p></div>}
              </div>
            </div>

            {/* 1: Habituals */}
            <div className="w-full shrink-0 snap-center pr-2">
              <div className="grid grid-cols-1 gap-4">
                {habituals.length > 0 ? habituals.map(h => <HabitualCard key={h.id} habitual={h} macros={macros} />) : <div className="text-center p-8 text-gray-500 text-sm"><p>No habituals yet. Create one from a Skill's hub page.</p></div>}
              </div>
            </div>

            {/* 2: Chains */}
            <div className="w-full shrink-0 snap-center pr-2">
              <div className="grid grid-cols-1 gap-4">
                {activeChains.length > 0 ? activeChains.map(c => <ChainCard key={c.id} chain={c} macros={macros} />) : <div className="text-center p-8 text-gray-500 text-sm"><p>No active chain quests. Create one from a Skill's hub page.</p></div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
