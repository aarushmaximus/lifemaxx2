import React, { useState, useEffect, useRef } from 'react';
import { store } from '../lib/store';
import { formulas as F } from '../lib/formulas';
import { MetalButton } from './ui/liquid-glass-button';

const CIRC = 2 * Math.PI * 110;

// Re-usable Mini Wheel component for the Split Layout
const MiniWheel = ({ skillId, wheelIndex, macros, overall, settings }) => {
  const getSkillData = (id) => {
    if (id === 'overall') {
      return { name: 'Overall', color: 'var(--accent)', xp: overall.currentXP || 0, skill: overall, level: overall.currentLevel || 0 };
    }
    const m = macros.find(m => m.id === id);
    if (!m) return { name: 'Unknown', color: 'var(--accent)', xp: 0, skill: {}, level: 0 };
    return { name: m.name, color: m.accentColor, xp: m.currentXP || 0, skill: m, level: m.currentLevel || 0 };
  };

  const data = getSkillData(skillId);
  const pct = F.progressPercent(data.xp, data.skill);
  const offset = CIRC - (CIRC * pct / 100);
  const into = F.xpIntoCurrentLevel(data.xp, data.skill);
  const req = F.xpRequiredForNextLevel(data.xp, data.skill);
  
  const isOverall = skillId === 'overall';
  const maxWidth = isOverall ? '220px' : '140px';
  
  const chromeOn = settings.chromeAccentsEnabled !== false;
  const ringColor = chromeOn ? 'url(#wheel-chrome-gradient)' : data.color;
  const fillDisplay = settings.fillingIndicatorEnabled !== false ? '' : 'none';
  
  return (
    <div className={`mini-wheel-wrap ${isOverall ? 'mini-wheel-overall' : ''}`} id={`mini-wheel-${wheelIndex}`}>
      <svg viewBox="0 0 260 260" width="100%" style={{maxWidth: maxWidth, display: 'block', margin: '0 auto'}}>
        <defs>
          <filter id={`mini-glow-${wheelIndex}`}>
            <feGaussianBlur stdDeviation="2" result="blur"/>
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
        <circle cx="130" cy="130" r="110" fill="none" stroke="var(--bg-raised)" strokeWidth="12"/>
        {Array.from({length: 16}).map((_, i) => {
          const angle = (i / 16) * 2 * Math.PI - Math.PI/2;
          const x1 = 130 + 117 * Math.cos(angle), y1 = 130 + 117 * Math.sin(angle);
          const x2 = 130 + 121 * Math.cos(angle), y2 = 130 + 121 * Math.sin(angle);
          return <line key={i} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} stroke="var(--border)" strokeWidth="1"/>;
        })}
        <clipPath id={`mini-clip-${wheelIndex}`}>
          <circle cx="130" cy="130" r="110"/>
        </clipPath>
        <g clipPath={`url(#mini-clip-${wheelIndex})`} style={{display: fillDisplay}}>
          <g style={{transform: `translateY(${130 - (pct / 100) * 260}px)`, transition: 'transform 1.2s var(--spring-soft)'}}>
            <path className="liquid-wave-2" fill={ringColor} d="M -520 130 Q -455 145 -390 130 T -260 130 T -130 130 T 0 130 T 130 130 T 260 130 T 390 130 T 520 130 L 520 390 L -520 390 Z" />
            <path className="liquid-wave" fill={ringColor} d="M -520 130 Q -455 110 -390 130 T -260 130 T -130 130 T 0 130 T 130 130 T 260 130 T 390 130 T 520 130 L 520 390 L -520 390 Z" />
          </g>
        </g>
        <circle cx="130" cy="130" r="110" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12" />
        <circle cx="130" cy="130" r="110"
          fill="none" stroke={ringColor} strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={CIRC.toFixed(2)}
          strokeDashoffset={offset.toFixed(2)}
          transform="rotate(-90 130 130)"
          filter={`url(#mini-glow-${wheelIndex})`}
          style={{transition: 'stroke-dashoffset 1.2s var(--spring-soft), stroke 0.4s ease'}}/>
        
        <text x="130" y="118" textAnchor="middle" fontFamily="var(--font-display)" fontSize="38" fontWeight="300" fill="var(--text-1)">{data.level}</text>
        <text x="130" y="148" textAnchor="middle" fontFamily="var(--font-display)" fontSize="9" fontWeight="400" fill="var(--text-2)" letterSpacing="2">{data.name.toUpperCase()}</text>
        {!isOverall && <rect x="80" y="141" width="8" height="8" rx="1.5" fill={data.color} />}
        <text x="130" y="166" textAnchor="middle" fontFamily="var(--font-display)" fontSize="8" fill="var(--text-3)">{F.formatXP(into)} / {F.formatXP(req)} XP</text>
      </svg>
    </div>
  );
};

const Wheel = ({ currentSkillId, setCurrentSkillId, macros, overall, settings }) => {
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

  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const questId = e.dataTransfer.getData('questId');
    if (!questId) return;
    const quest = store.getQuest(questId);
    if (!quest || quest.status !== 'active') return;
    const s = store.getSettings();
    if (s.dragToRegister !== false) {
      store.markQuestReady(questId);
    } else {
      store.completeQuest(questId);
    }
  };

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
        className={`wheel-drop-zone ${isDragOver ? 'drag-active' : ''}`} 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
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
  const isReadyToClaim = quest.isReadyToClaim;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const [timeDisplay, setTimeDisplay] = React.useState('');

  React.useEffect(() => {
    if (!quest.expiresAt || quest.status !== 'active') return;
    const update = () => {
      const leftMs = quest.expiresAt - Date.now();
      if (leftMs <= 0) { setTimeDisplay('Expired'); return; }
      const h = Math.floor(leftMs / 3600000);
      const m = Math.floor((leftMs % 3600000) / 60000);
      const s = Math.floor((leftMs % 60000) / 1000);
      setTimeDisplay(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [quest.expiresAt, quest.status]);

  let windowBadge = quest.timeWindow 
    ? <span className="quest-type-badge" style={{background:'var(--accent-dim)', color:'var(--accent)', border:'1px solid var(--border)'}}>{quest.timeWindow.start} - {quest.timeWindow.end}</span>
    : <span className="quest-type-badge" style={{background:'var(--bg-raised)', color:'var(--text-3)', border:'1px solid var(--border)'}}>Anytime</span>;

  let statusBadge = null;
  if (isMissed) {
    statusBadge = <span className="quest-type-badge" style={{background:'rgba(255,45,120,0.15)', color:'var(--danger)', border:'1px solid rgba(255,45,120,0.3)'}}>MISSED</span>;
  } else if (isLocked) {
    statusBadge = <span className="quest-type-badge" style={{background:'rgba(120,120,140,0.15)', color:'var(--text-3)', border:'1px solid var(--border)'}}>LOCKED 🔒</span>;
  }

  const cardClass = (isMissed || isLocked) ? 'quest-card-deleted-status' : '';
  const canDrag = !isLocked && !isMissed && settings.dragToRegister !== false;

  const handleDragStart = (e) => {
    if (!canDrag) return;
    e.dataTransfer.setData('questId', quest.id);
    e.currentTarget.classList.add('card-dragging');
  };
  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('card-dragging');
  };

  return (
    <div 
      className={`quest-card ${cardClass}`} 
      draggable={canDrag ? 'true' : 'false'}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="quest-card-header">
        {windowBadge}
        {statusBadge}
        {timeDisplay && quest.expiresAt && quest.status === 'active' && (
          <span style={{fontSize:'0.65rem', color: timeDisplay === 'Expired' ? 'var(--danger)' : 'var(--accent)'}}>{timeDisplay}</span>
        )}
        <div className="quest-card-actions">
          <button className="btn-icon danger" onClick={() => store.deleteQuest(quest.id)} title="Delete">✕</button>
        </div>
      </div>
      <h3 className="quest-card-name" style={{textDecoration: isMissed ? 'line-through' : 'none', opacity: isMissed ? 0.6 : 1}}>{quest.name}</h3>
      {quest.description && <p className="quest-card-desc" style={{opacity: isMissed ? 0.5 : 1}}>{quest.description}</p>}
      
      <div className="quest-skill-tags">
        {(quest.targetSkills || []).map((t, idx) => {
          const m = macros.find(x => x.id === t.macroSkillId);
          if (!m) return null;
          return <span key={idx} className="skill-tag" style={{color: m.accentColor, borderColor: `${m.accentColor}33`}}>{m.name} +{t.xpAmount}xp</span>;
        })}
      </div>
      
      <div className="quest-card-footer mt-2">
        {isMissed ? (
          <button className="btn-complete" style={{background: 'rgba(255,45,120,0.08)', border: '1px solid rgba(255,45,120,0.2)', color: 'var(--text-3)', cursor: 'not-allowed'}} disabled>Missed (Click ✕ to delete)</button>
        ) : isLocked ? (
          <button className="btn-complete" style={{background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'not-allowed'}} disabled>Locked (Available {quest.timeWindow?.start} - {quest.timeWindow?.end})</button>
        ) : quest.isWorkoutQuest ? (
          <MetalButton variant="gold" onClick={() => setActiveTab && setActiveTab('workout')} style={{ width: '100%' }}>⚡ START WORKOUT</MetalButton>
        ) : isReadyToClaim ? (
          isTouch ? (
            <MetalButton variant="primary" onClick={() => store.completeQuest(quest.id)} style={{ width: '100%' }}>✓ Claim XP</MetalButton>
          ) : (
            <button className="btn-complete" style={{background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-3)', cursor: 'grab', pointerEvents: 'none'}}>✓ Completed (Drag to Claim XP)</button>
          )
        ) : (
          <MetalButton variant="primary" onClick={() => store.completeQuest(quest.id)} style={{ width: '100%' }}>✓ Complete</MetalButton>
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

  return (
    <div className={`habitual-card ${isYes ? 'habitual-done' : isNo ? 'habitual-failed' : ''}`}>
      <div className="habitual-card-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <div className="habitual-dot" style={{background: '#8FAF2A', boxShadow: '0 0 6px #8FAF2A44'}}></div>
          <span className="habitual-tag">HABITUAL</span>
        </div>
        <span className="habitual-skill-tag" style={{color: accentColor, borderColor: `${accentColor}44`}}>{macroName}</span>
      </div>
      <h3 className="habitual-name">{habitual.name}</h3>
      <div className="habitual-xp-row">
        <span className="habitual-xp-pill gain">+{habitual.xpGain} XP if done</span>
        <span className="habitual-xp-pill loss">-{habitual.xpLoss} XP if missed</span>
      </div>
      <div className={`habitual-actions ${isPending ? '' : 'habitual-answered'}`}>
        <button 
          className={`habitual-btn yes ${isYes ? 'active' : ''}`}
          onClick={() => setStatus('yes')}
          disabled={!isPending && !isYes}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22"><path d="M20 6L9 17l-5-5"/></svg>
        </button>
        <button 
          className={`habitual-btn no ${isNo ? 'active' : ''}`}
          onClick={() => setStatus('no')}
          disabled={!isPending && !isNo}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      {!isPending && (
        <p className="habitual-status-msg">
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
    <div className="quest-card chain-dash-card" style={{borderColor: `${accent}22`}}>
      <div className="quest-card-header">
        <span className="quest-type-badge" style={{background: 'rgba(255,214,0,0.1)', color: '#FFD600', border: '1px solid rgba(255,214,0,0.3)'}}>CHAIN</span>
        <span className="quest-type-badge" style={{color: accent, borderColor: `${accent}33`}}>{macroName}</span>
        <div className="quest-card-actions">
          <span style={{fontSize: '0.7rem', color: 'var(--text-3)'}}>{pct}% done</span>
        </div>
      </div>
      <h3 className="quest-card-name">{chain.name}</h3>
      <div style={{margin: '4px 0 8px', display: 'flex', gap: '4px', alignItems: 'center'}}>
        {chain.steps.map((s, i) => (
          <div key={i} style={{flex: 1, height: '4px', borderRadius: '100px', background: s.completedAt ? accent : 'rgba(255,255,255,0.08)'}}></div>
        ))}
      </div>
      {activeStep ? (
        <div className="quest-card-footer">
          <div style={{fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '6px'}}>Step {actIdx+1}/{total}: {activeStep.name} · +{activeStep.xpAmount || 0}XP</div>
          <button className="btn-complete" onClick={() => store.completeChainStep(chain.id, activeStep.id)}>✓ Complete Step</button>
        </div>
      ) : (
        <div style={{fontSize: '0.75rem', color: 'var(--success)', padding: '8px 0'}}>🏆 Chain Complete!</div>
      )}
    </div>
  );
};

const MacroBarsPanel = ({ macros, overall }) => {
  const overallBarPct = F.progressPercent(overall.currentXP || 0, overall);
  const overallInto = F.xpIntoCurrentLevel(overall.currentXP || 0, overall);
  const overallReq = F.xpRequiredForNextLevel(overall.currentXP || 0, overall);

  return (
    <div className="dash-macros-panel">
      <div style={{marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
         <span style={{fontFamily:'var(--font-display)',fontSize:'0.75rem',color:'var(--text-2)',letterSpacing:'0.1em'}}>MACRO SKILL PROGRESS</span>
      </div>
      <div className="dash-macros-list">
        <div className="macro-bar-row overall-bar-row" style={{marginBottom:'18px',borderBottom:'1px solid var(--border)',paddingBottom:'12px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px',alignItems:'center'}}>
            <span style={{fontFamily:'var(--font-display)',fontSize:'0.85rem',color:'var(--text-1)',fontWeight:'bold',display:'flex',alignItems:'center',gap:'8px'}}>
               <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--chrome,#E8E8E8)',boxShadow:'0 0 8px var(--chrome,#E8E8E8)'}}></div>
               OVERALL <span className="chrome-metallic-text" style={{fontWeight:'bold'}}>LV{overall.currentLevel || 0}</span>
             </span>
            <span style={{fontSize:'0.75rem',color:'var(--text-2)',fontWeight:500}}>{F.formatXP(overallInto)}/{F.formatXP(overallReq)}</span>
          </div>
          <div style={{width:'100%',height:'8px',background:'rgba(255,255,255,0.05)',borderRadius:'100px',overflow:'hidden'}}>
            <div className="xp-bar-fill-chrome" style={{width:`${overallBarPct}%`,height:'100%'}}></div>
          </div>
        </div>
        {macros.map(m => {
          const pct = F.progressPercent(m.currentXP || 0, m);
          const into = F.xpIntoCurrentLevel(m.currentXP || 0, m);
          const req = F.xpRequiredForNextLevel(m.currentXP || 0, m);
          return (
            <div key={m.id} className="macro-bar-row" style={{marginBottom:'12px',cursor:'pointer'}} onClick={() => window.location.hash = `#skill-hub/${m.id}`}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px',alignItems:'center'}}>
                <span style={{fontFamily:'var(--font-display)',fontSize:'0.75rem',color:'var(--text-1)',display:'flex',alignItems:'center',gap:'6px'}}>
                   <div style={{width:'6px',height:'6px',borderRadius:'50%',background:m.accentColor}}></div>
                   {m.name} <span style={{color:m.accentColor}}>LV{m.currentLevel || 0}</span>
                </span>
                <span style={{fontSize:'0.65rem',color:'var(--text-3)'}}>{F.formatXP(into)}/{F.formatXP(req)}</span>
              </div>
              <div style={{width:'100%',height:'4px',background:'var(--bg-raised)',borderRadius:'100px',overflow:'hidden'}}>
                <div className="xp-bar-fill-chrome" style={{width:`${pct}%`,height:'100%'}}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatsPanel = ({ stats }) => {
  if (!stats || stats.length === 0) return null;
  return (
    <div className="dash-macros-panel" style={{height:'100%', display:'flex', flexDirection:'column', background:'var(--bg-surface)', padding:'16px', borderRadius:'16px', border:'1px solid var(--border)'}}>
      <div style={{marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
         <span style={{fontFamily:'var(--font-display)',fontSize:'0.75rem',color:'var(--text-2)',letterSpacing:'0.1em'}}>DAILY STATISTICS</span>
      </div>
      <div style={{display:'grid', gridTemplateRows: 'repeat(3, max-content)', gridAutoFlow: 'column', gridAutoColumns: '100%', overflowX:'auto', overflowY:'hidden', scrollSnapType: 'x mandatory', gap: '8px', flex:1, paddingBottom:'4px', alignContent: 'start'}} className="custom-scrollbar hide-scrollbar">
        {stats.map(s => {
          const todayStr = new Date().toDateString();
          const logs = store.getStatLogs().filter(l => l.statId === s.id && l.dateStr === todayStr);
          const todayTotal = logs.reduce((sum, log) => sum + log.value, 0);
          const left = s.goalValue - todayTotal;
          const currentXP = F.calculateStatisticXP(todayTotal, s.goalValue, s.maxXP, s.penaltyRange, s.negativeXP);
          const isGood = currentXP >= 0;
          return (
            <div key={s.id} className="quest-card" style={{flexDirection:'row', borderColor:'var(--border)', marginBottom:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding: '10px 12px', scrollSnapAlign: 'start', width: '100%', boxSizing: 'border-box'}}>
              <div style={{display:'flex', flexDirection:'column', gap:'4px', flex:1}}>
                <h3 className="quest-card-name" style={{margin:0, fontSize:'0.95rem'}}>{s.name}</h3>
                <div className="stat-controls" style={{display:'flex', alignItems:'center', gap:'6px'}}>
                  <input type="number" id={`stat-val-top-${s.id}`} className="form-input" placeholder="Amt" style={{width:'65px', padding:'4px 8px', fontSize:'0.85rem', height:'28px'}} onClick={e => e.stopPropagation()} />
                  <button className="btn btn-primary btn-sm" onClick={(e) => {
                    e.stopPropagation();
                    const el = document.getElementById(`stat-val-top-${s.id}`);
                    if(el && el.value) { store.logStatistic(s.id, Number(el.value)); el.value=''; }
                  }} style={{padding:'2px 10px', fontSize:'0.75rem', height:'28px', minWidth:'unset'}}>LOG</button>
                  {isGood ? <span className="material-symbols-outlined" style={{color:'var(--success)', fontSize:'1.1rem', marginLeft:'4px'}}>check_circle</span> : <span className="material-symbols-outlined" style={{color:'var(--danger)', fontSize:'1.1rem', marginLeft:'4px'}}>error</span>}
                </div>
              </div>
              <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'2px', minWidth: '100px'}}>
                <div style={{fontSize:'2rem', fontWeight:'normal', color:'var(--text-1)', fontFamily:'inherit', lineHeight:1, whiteSpace:'nowrap', marginBottom:'2px'}}>
                  {todayTotal}<span style={{fontSize:'1rem', color:'var(--text-3)', fontWeight:'normal'}}>/{s.goalValue}</span>
                </div>
                {left >= 0 ? (
                  <span style={{fontSize:'0.65rem', color:'var(--success)', fontWeight:'bold', marginLeft:'auto', textTransform:'uppercase'}}>+{left} {s.unit || ''} left</span>
                ) : (
                  <span style={{fontSize:'0.65rem', color:'var(--danger)', fontWeight:'bold', marginLeft:'auto', textTransform:'uppercase'}}>{Math.abs(left)} {s.unit || ''} over</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState([]);

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
      setHistory(store.getHistory().slice().reverse());
      setStats(store.getStatistics() || []);
      
      const s = store.getSettings();
      setCurrentSkillId(s.wheelSkillId || 'overall');
    };
    
    handleStoreChange();
    
    store.on('change', handleStoreChange);
    return () => store.off('change', handleStoreChange);
  }, []);

  // Timer tick for countdowns
  useEffect(() => {
    store.checkTimers();
    const interval = setInterval(() => store.checkTimers(), 10000);
    return () => clearInterval(interval);
  }, []);

  const visibleQuests = quests.filter(q => {
    if (q.hiddenFromDashboard) return false;
    if (q.status === 'completed' && !q.isReadyToClaim) return false;
    if (q.status === 'deleted') return false;
    return true; // show active (locked or not), missed — with appropriate badges
  });

  const activeEffects = store.getActiveStatusEffects ? store.getActiveStatusEffects() : [];
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
    { id: 'quests',    label: 'QUESTS',    dot: '#00E5FF' },
    { id: 'habituals', label: 'HABITUALS', dot: '#8FAF2A' },
    { id: 'chains',    label: 'CHAINS',    dot: '#FFD600' },
  ];
  
  const activeTypeInfo = QUEST_TYPES.find(t => t.id === activeQuestType) || QUEST_TYPES[0];

  const historyBarEnabled = settings.historyBarEnabled === true;
  
  const renderHistoryFeed = () => {
    if (history.length === 0) {
      return (
        <div className="history-empty">
          <span className="material-symbols-outlined" style={{fontSize: '28px', color: 'var(--text-3)', opacity: 0.4}}>history</span>
          <p>No activity yet. Create and complete quests to see your history here.</p>
        </div>
      );
    }
    
    return history.map((entry, idx) => {
      const date = new Date(entry.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

      let icon = '📋';
      let accentClass = '';
      switch (entry.type) {
        case 'quest_created':  icon = '✦'; accentClass = 'history-accent'; break;
        case 'quest_completed': icon = '✓'; accentClass = 'history-success'; break;
        case 'quest_missed':   icon = '✕'; accentClass = 'history-danger'; break;
        case 'quest_deleted':  icon = '🗑'; accentClass = 'history-muted'; break;
        case 'xp_gain':        icon = '⬡'; accentClass = 'history-accent'; break;
        case 'level_up':       icon = '⬆'; accentClass = 'history-success'; break;
        default:               icon = 'ℹ'; accentClass = 'history-muted'; break;
      }
      
      return (
        <div key={idx} className={`history-entry ${accentClass}`}>
          <span className="history-icon">{icon}</span>
          <div className="history-body">
            <span className="history-msg">{entry.message}</span>
            {entry.details?.skills && <span className="history-detail">{entry.details.skills}</span>}
            {entry.details?.xp && <span className="history-detail">+{entry.details.xp} XP</span>}
          </div>
          <div className="history-time">
            <span>{timeStr}</span>
            <span>{dateStr}</span>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="dashboard-grid h-full overflow-y-auto">
      <div className="dash-center pb-20">
        
        {/* Status Effects Banner */}
        {activeEffects.length > 0 && (
          <div style={{display:'flex', gap:'8px', padding:'8px 16px', flexWrap:'wrap'}}>
            {activeEffects.map(effect => (
              <div key={effect.id} style={{
                display:'flex', alignItems:'center', gap:'6px',
                background: effect.type === 'buff' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${effect.type === 'buff' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                borderRadius:'8px', padding:'4px 10px', fontSize:'0.72rem'
              }}>
                <span>{effect.type === 'buff' ? '⬆' : '⬇'}</span>
                <span style={{color: effect.type === 'buff' ? '#10b981' : '#ef4444', fontWeight:600}}>{effect.name}</span>
                <span style={{color:'var(--text-3)'}}>x{effect.multiplier?.toFixed(1)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Layout Conditional: History Bar (Split Layout) vs Default Large Wheel */}
        <div className="dash-carousel-wrap">
          <div className="dash-carousel-viewport" id="dash-carousel" onScroll={() => {
            const el = document.getElementById('dash-carousel');
            const dots = document.getElementById('dash-nav-dots');
            if (!el || !dots) return;
            const index = Math.round(el.scrollLeft / el.clientWidth);
            Array.from(dots.children).forEach((d, i) => {
              if (i === index) d.classList.add('active');
              else d.classList.remove('active');
            });
          }}>
            <div className="dash-carousel-panel">
              {historyBarEnabled ? (
                <div className="dash-split-layout">
                  <div className="dash-split-wheels">
                    <div className="mini-wheel-container">
                      <p className="mini-wheel-label">OVERALL</p>
                      <MiniWheel skillId="overall" wheelIndex={0} macros={macros} overall={overall} settings={settings} />
                    </div>
                    <div className="mini-wheel-container">
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px'}}>
                        <select 
                          id="mini-wheel-skill-select" 
                          className="mini-wheel-select"
                          value={currentSkillId === 'overall' ? (macros[0]?.id || 'overall') : currentSkillId}
                          onChange={(e) => {
                            setCurrentSkillId(e.target.value);
                            const s = store.getSettings();
                            s.wheelSkillId = e.target.value;
                            store.saveSettings(s);
                          }}
                        >
                          {macros.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                      <MiniWheel skillId={currentSkillId === 'overall' ? (macros[0]?.id || 'overall') : currentSkillId} wheelIndex={1} macros={macros} overall={overall} settings={settings} />
                    </div>
                  </div>
                  <div className="history-bar" id="history-bar">
                    <div className="history-bar-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <span className="material-symbols-outlined" style={{fontSize: '16px', opacity: 0.6}}>history</span>
                        <span>ACTIVITY FEED</span>
                      </div>
                      <button onClick={() => store.clearHistory()} style={{background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer'}} title="Clear History">
                        <span className="material-symbols-outlined" style={{fontSize: '16px'}}>delete</span>
                      </button>
                    </div>
                    <div className="history-bar-entries" id="history-bar-entries">
                      {renderHistoryFeed()}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0 16px 0'}}>
                  <p style={{fontFamily: 'var(--font-display)', fontSize: '0.68rem', letterSpacing: '0.18em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '12px'}}>SELECT SKILL · DRAG QUEST TO COMPLETE</p>
                  <Wheel currentSkillId={currentSkillId} setCurrentSkillId={setCurrentSkillId} macros={macros} overall={overall} settings={settings} />
                </div>
              )}
            </div>
            
            <div className="dash-carousel-panel" style={{paddingLeft: '16px'}}>
              <MacroBarsPanel macros={macros} overall={overall} />
            </div>

            {settings.statsInCarousel !== false && stats.length > 0 && (
              <div className="dash-carousel-panel" style={{paddingLeft: '16px'}}>
                <StatsPanel stats={stats} />
              </div>
            )}
          </div>
          
          <div className="carousel-nav-dots" id="dash-nav-dots">
            <div className="nav-dot active" onClick={() => document.getElementById('dash-carousel').scrollTo({left:0, behavior:'smooth'})}></div>
            <div className="nav-dot" onClick={() => document.getElementById('dash-carousel').scrollTo({left: document.getElementById('dash-carousel').clientWidth, behavior:'smooth'})}></div>
            {settings.statsInCarousel !== false && stats.length > 0 && (
              <div className="nav-dot" onClick={() => document.getElementById('dash-carousel').scrollTo({left: 9999, behavior:'smooth'})}></div>
            )}
          </div>
        </div>

        <div className="quest-area-wrap" style={{overflow: 'hidden'}}>
          <div className="quest-area-header" id="quest-area-header-container">
            <div id="quest-swipe-zone" style={{display: 'flex', alignItems: 'center', position: 'relative', cursor: 'pointer', width: '100%', justifyContent: 'flex-start'}}>
              <span className="quest-type-dot-label" style={{background: activeTypeInfo.dot, boxShadow: `0 0 10px ${activeTypeInfo.dot}`, width: '8px', height: '8px', borderRadius: '50%', marginRight: '10px'}}></span>
              <span className="quest-type-name" style={{fontSize: '0.9rem', margin: '0'}}>{activeTypeInfo.label}</span>
              
              <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px'}}>
                {QUEST_TYPES.map((t, idx) => (
                  <div key={idx} style={{width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-1)', opacity: t.id === activeQuestType ? '1' : '0.2', transform: `scale(${t.id === activeQuestType ? '1.2' : '1'})`, transition: '0.2s'}}></div>
                ))}
              </div>

              <select 
                style={{position: 'absolute', inset: '0', opacity: '0', cursor: 'pointer', width: '100%', height: '100%'}}
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
          
          <div className="dash-carousel-viewport" id="quest-list-carousel" ref={questCarouselRef} onScroll={updateQuestCarouselNav}>
            {/* 0: Quests */}
            <div className="dash-carousel-panel" style={{minWidth: '100%', paddingRight: '8px'}}>
              <div className="quest-grid" id="quest-grid">
                {visibleQuests.length > 0 ? visibleQuests.map(q => <QuestCard key={q.id} quest={q} macros={macros} settings={settings} setActiveTab={setActiveTab} />) : <div className="empty-state"><p>No active quests. Let's get to work!</p></div>}
              </div>
            </div>

            {/* 1: Habituals */}
            <div className="dash-carousel-panel" style={{minWidth: '100%', paddingRight: '8px'}}>
              <div className="quest-grid">
                {habituals.length > 0 ? habituals.map(h => <HabitualCard key={h.id} habitual={h} macros={macros} />) : <div className="empty-state"><p>No habituals yet. Create one from a Skill's hub page.</p></div>}
              </div>
            </div>

            {/* 2: Chains */}
            <div className="dash-carousel-panel" style={{minWidth: '100%', paddingRight: '8px'}}>
              <div className="quest-grid">
                {activeChains.length > 0 ? activeChains.map(c => <ChainCard key={c.id} chain={c} macros={macros} />) : <div className="empty-state"><p>No active chain quests. Create one from a Skill's hub page.</p></div>}
              </div>
            </div>
          </div>
        </div>

        {settings.statsInCarousel === false && stats.length > 0 && (
          <div className="dash-statistics-wrap" style={{marginTop:'24px', paddingBottom: '24px'}}>
            <h2 style={{fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px', color: 'var(--text-3)'}}>
              DAILY STATISTICS
            </h2>
            <div className="quest-grid" style={{display:'flex', flexDirection:'column', gap:'8px'}}>
              {stats.map(s => {
                const todayStr = new Date().toDateString();
                const logs = store.getStatLogs().filter(l => l.statId === s.id && l.dateStr === todayStr);
                const todayTotal = logs.reduce((sum, log) => sum + log.value, 0);
                const left = s.goalValue - todayTotal;
                const currentXP = F.calculateStatisticXP(todayTotal, s.goalValue, s.maxXP, s.penaltyRange, s.negativeXP);
                const isGood = currentXP >= 0;
                return (
                  <div key={s.id} className="quest-card" style={{flexDirection:'row', borderColor:'var(--border)', marginBottom:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding: '10px 12px', width: '100%', boxSizing: 'border-box'}}>
                    <div style={{display:'flex', flexDirection:'column', gap:'4px', flex:1}}>
                      <h3 className="quest-card-name" style={{margin:0, fontSize:'0.95rem'}}>{s.name}</h3>
                      <div className="stat-controls" style={{display:'flex', alignItems:'center', gap:'6px'}}>
                        <input type="number" id={`stat-val-bottom-${s.id}`} className="form-input" placeholder="Amt" style={{width:'65px', padding:'4px 8px', fontSize:'0.85rem', height:'28px'}} onClick={e => e.stopPropagation()} />
                        <button className="btn btn-primary btn-sm" onClick={(e) => {
                          e.stopPropagation();
                          const el = document.getElementById(`stat-val-bottom-${s.id}`);
                          if(el && el.value) { store.logStatistic(s.id, Number(el.value)); el.value=''; }
                        }} style={{padding:'2px 10px', fontSize:'0.75rem', height:'28px', minWidth:'unset'}}>LOG</button>
                        {isGood ? <span className="material-symbols-outlined" style={{color:'var(--success)', fontSize:'1.1rem', marginLeft:'4px'}}>check_circle</span> : <span className="material-symbols-outlined" style={{color:'var(--danger)', fontSize:'1.1rem', marginLeft:'4px'}}>error</span>}
                      </div>
                    </div>
                    <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'2px', minWidth: '100px'}}>
                      <div style={{fontSize:'2rem', fontWeight:'normal', color:'var(--text-1)', fontFamily:'inherit', lineHeight:1, whiteSpace:'nowrap', marginBottom:'2px'}}>
                        {todayTotal}<span style={{fontSize:'1rem', color:'var(--text-3)', fontWeight:'normal'}}>/{s.goalValue}</span>
                      </div>
                      {left >= 0 ? (
                        <span style={{fontSize:'0.65rem', color:'var(--success)', fontWeight:'bold', marginLeft:'auto', textTransform:'uppercase'}}>+{left} {s.unit || ''} left</span>
                      ) : (
                        <span style={{fontSize:'0.65rem', color:'var(--danger)', fontWeight:'bold', marginLeft:'auto', textTransform:'uppercase'}}>{Math.abs(left)} {s.unit || ''} over</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
