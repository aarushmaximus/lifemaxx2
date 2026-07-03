import React, { useState, useEffect } from 'react';
import { store } from '../lib/store';
import { formulas as F } from '../lib/formulas';

export default function Quests({ setActiveTab }) {
  const [activeTabLocal, setActiveTabLocal] = useState('log');
  const [filters, setFilters] = useState({ skill: 'all', status: 'active' });
  const [macros, setMacros] = useState([]);
  const [quests, setQuests] = useState([]);
  const [xpLog, setXpLog] = useState([]);

  useEffect(() => {
    const handleStoreChange = () => {
      setMacros(store.getMacros());
      setQuests(store.getQuests());
      setXpLog(store.getXPLog('all'));
    };
    handleStoreChange();
    store.on('change', handleStoreChange);
    return () => store.off('change', handleStoreChange);
  }, []);

  const filteredQuests = quests.filter(q => {
    const tSkills = q.targetSkills || [];
    if (filters.skill !== 'all' && !tSkills.some(t => t.macroSkillId === filters.skill)) return false;
    if (filters.status !== 'all' && q.status !== filters.status) return false;
    return true;
  });

  const renderLogTab = () => (
    <>
      <div className="quest-log-filters" style={{marginBottom: '16px'}}>
        <div className="filter-row" style={{display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap'}}>
          <select 
            className="form-input" 
            style={{width: '160px', background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-1)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer'}}
            value={filters.skill}
            onChange={e => setFilters({...filters, skill: e.target.value})}
          >
            <option value="all">All Skills</option>
            {macros.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="filter-chips" style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
            {['active', 'completed', 'missed', 'deleted', 'all'].map(s => (
              <button 
                key={s} 
                className={`chip ${filters.status === s ? 'chip-active' : ''}`} 
                style={{cursor: 'pointer'}}
                onClick={() => setFilters({...filters, status: s})}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="quest-log-list" id="quest-log-list">
        {filteredQuests.length === 0 ? (
          <div className="empty-state"><p>No quests match these filters.</p></div>
        ) : filteredQuests.map(q => {
          const tSkills = q.targetSkills || [];
          const isMissed = q.status === 'missed';
          const isCompleted = q.status === 'completed';
          const isDeleted = q.status === 'deleted';
          
          const withinWindow = F.isWithinTimeWindow(q.timeWindow);
          const isLocked = q.status === 'active' && !withinWindow;

          let timeStr = null;
          if (q.expiresAt && q.status === 'active') {
            const leftMs = q.expiresAt - Date.now();
            if (leftMs > 0) {
              timeStr = <span className="quest-countdown-timer" data-expires-at={q.expiresAt} style={{fontSize: '0.65rem', color: 'var(--accent)'}}>Counting down...</span>;
            } else {
              timeStr = <span className="time-left" style={{fontSize: '0.65rem', color: 'var(--danger)'}}>Expired</span>;
            }
          } else if (q.expiresAt) {
            timeStr = <span className="time-left" style={{fontSize: '0.65rem', color: 'var(--text-3)'}}>Duration: {q.timeLimitHours || 24}h</span>;
          }

          let windowBadge = q.timeWindow 
            ? <span className="quest-type-badge" style={{background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border)'}}>{q.timeWindow.start} - {q.timeWindow.end}</span>
            : <span className="quest-type-badge" style={{background: 'var(--bg-raised)', color: 'var(--text-3)', border: '1px solid var(--border)'}}>Anytime</span>;

          let statusBadge = null;
          if (isMissed) statusBadge = <span className="quest-type-badge" style={{background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)'}}>MISSED</span>;
          else if (isCompleted) statusBadge = <span className="quest-type-badge" style={{background: 'rgba(16,185,129,0.15)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)'}}>COMPLETED</span>;
          else if (isDeleted) statusBadge = <span className="quest-type-badge" style={{background: 'rgba(120,120,120,0.15)', color: 'var(--text-3)', border: '1px solid rgba(120,120,120,0.3)'}}>DELETED</span>;
          else if (isLocked) statusBadge = <span className="quest-type-badge" style={{background: 'rgba(120,120,140,0.15)', color: 'var(--text-3)', border: '1px solid var(--border)'}}>LOCKED</span>;

          let cardClass = '';
          if (isMissed) cardClass = 'quest-card-missed';
          else if (isCompleted) cardClass = 'quest-card-completed';
          else if (isDeleted) cardClass = 'quest-card-deleted-status';
          else if (isLocked) cardClass = 'quest-card-disabled';

          return (
            <div key={q.id} className={`quest-log-row ${cardClass}`} style={{marginBottom: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', transition: 'border-color 0.2s'}}>
              <div className="quest-log-main" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', cursor: 'pointer'}}>
                <div className="quest-log-left" style={{display: 'flex', alignItems: 'center', gap: '12px', flex: 1}}>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start'}}>
                    <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                      {windowBadge}
                      {statusBadge}
                    </div>
                    <div className="quest-log-info" style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                      <span className="quest-log-name" style={{fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 500, textDecoration: isMissed ? 'line-through' : 'none', opacity: isMissed ? 0.6 : (isCompleted ? 0.8 : 1)}}>{q.name}</span>
                      <div className="quest-log-meta" style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px'}}>
                        {tSkills.map((t, idx) => {
                          const m = macros.find(x => x.id === t.macroSkillId);
                          return m ? <span key={idx} className="skill-tag" style={{color: m.accentColor, borderColor: `${m.accentColor}33`}}>{m.name} +{t.xpAmount}xp</span> : null;
                        })}
                        {timeStr}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="quest-log-right" style={{display: 'flex', alignItems: 'center', gap: '8px'}} onClick={e => e.stopPropagation()}>
                  {(!isLocked && !isMissed && !isCompleted && !isDeleted && q.type !== 'statistic') && (
                    <button className="btn btn-primary btn-sm" style={{padding: '6px 12px', borderRadius: '6px'}} onClick={() => store.completeQuest(q.id)}>✓</button>
                  )}
                  <button className="btn-icon danger" style={{padding: '6px', fontSize: '0.78rem'}} onClick={() => store.deleteQuest(q.id)} title={(isCompleted || isDeleted || isMissed) ? 'Delete Permanently' : 'Delete'}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const renderTimelineTab = () => {
    if (!xpLog || !xpLog.length) return <div className="empty-state"><p>No XP events recorded yet. Complete some quests!</p></div>;
    const sortedLog = [...xpLog].sort((a, b) => b.timestamp - a.timestamp);

    return (
      <div className="timeline-container" style={{display: 'flex', flexDirection: 'column', marginTop: '10px'}}>
        {sortedLog.map((entry, idx) => {
          const macro = macros.find(m => m.id === entry.macroId);
          const skillName = macro ? macro.name : 'Unknown Skill';
          const skillColor = macro ? macro.accentColor : 'var(--accent)';
          const date = new Date(entry.timestamp);
          const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          const isNegative = entry.delta < 0;
          const deltaClass = isNegative ? 'timeline-delta-neg' : 'timeline-delta-pos';
          const deltaSign = isNegative ? '' : '+';
          const hasQuest = entry.questId && store.getQuest(entry.questId);

          return (
            <div key={idx} className="timeline-row" style={{borderLeft: `3px solid ${skillColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', marginBottom: '8px', border: '1px solid var(--border)'}}>
              <div className="timeline-time-col" style={{display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '80px'}}>
                <span className="timeline-date" style={{fontSize: '0.72rem', color: 'var(--text-3)'}}>{dateStr}</span>
                <span className="timeline-time" style={{fontSize: '0.68rem', color: 'var(--text-3)', opacity: 0.7}}>{timeStr}</span>
              </div>
              <div className="timeline-content-col" style={{flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '3px'}}>
                <span className="timeline-skill" style={{color: skillColor, fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.08em', fontFamily: 'var(--font-display)'}}>{skillName.toUpperCase()}</span>
                <div className="timeline-reason" style={{fontSize: '0.82rem'}}>
                  {hasQuest ? <span style={{color: 'var(--text-1)', fontWeight: 500, textDecoration: 'underline'}}>{entry.reason || 'Quest Completed'}</span> : <span style={{color: 'var(--text-2)'}}>{entry.reason || 'XP Adjusted'}</span>}
                </div>
              </div>
              <div className="timeline-xp-col" style={{minWidth: '80px', textAlign: 'right'}}>
                <span className={`timeline-delta ${deltaClass}`} style={{fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.88rem', color: isNegative ? 'var(--danger)' : 'var(--success)'}}>{deltaSign}{entry.delta} XP</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStatsTab = () => (
    <div id="analytics-container" style={{background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', minHeight: '300px'}}>
      <div style={{textAlign: 'center', padding: '40px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)'}}>
        Stats & Trends UI ported soon...
      </div>
    </div>
  );

  return (
    <div className="view-container quest-log-view h-full overflow-y-auto pb-[90px]">
      <div className="view-header" style={{marginBottom: '24px'}}>
        <h1 className="font-display">QUEST ARCHIVE</h1>
        <button className="btn btn-primary" onClick={() => alert('Quest Modal pending React port')}>+ New Quest</button>
      </div>

      <div className="view-navigation-tabs" style={{display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px'}}>
        <button className={`nav-tab-btn ${activeTabLocal === 'log' ? 'active-tab' : ''}`} onClick={() => setActiveTabLocal('log')}>Quest Log</button>
        <button className={`nav-tab-btn ${activeTabLocal === 'timeline' ? 'active-tab' : ''}`} onClick={() => setActiveTabLocal('timeline')}>XP Timeline</button>
        <button className={`nav-tab-btn ${activeTabLocal === 'stats' ? 'active-tab' : ''}`} onClick={() => setActiveTabLocal('stats')}>Stats & Trends</button>
      </div>

      {activeTabLocal === 'log' && renderLogTab()}
      {activeTabLocal === 'timeline' && renderTimelineTab()}
      {activeTabLocal === 'stats' && renderStatsTab()}
    </div>
  );
}
