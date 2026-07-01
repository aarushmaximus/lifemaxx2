import React, { useState, useEffect } from 'react';
import { store } from '../lib/store';

// Helper
function format12Hour(hour) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h} ${ampm}`;
}

function getTodayStr() {
  return new Date().toDateString();
}

function AnalysisToday() {
  const [activeCellIdx, setActiveCellIdx] = useState(null);
  const [log, setLog] = useState(() => store.getDailyLog(getTodayStr()));
  const [presets, setPresets] = useState(() => store.getCellPresets());
  const [macros, setMacros] = useState(() => store.getMacros());
  const [stats, setStats] = useState(() => store.getStatistics());
  const [statLogs, setStatLogs] = useState(() => store.getStatLogs());

  useEffect(() => {
    const handler = () => {
      setLog(store.getDailyLog(getTodayStr()));
      setPresets(store.getCellPresets());
      setMacros(store.getMacros());
      setStats(store.getStatistics());
      setStatLogs(store.getStatLogs());
    };
    store.on('change', handler);
    return () => store.off('change', handler);
  }, []);

  const currentHour = new Date().getHours();
  
  const selectCell = (idx) => {
    if (idx > currentHour) return;
    setActiveCellIdx(prev => prev === idx ? null : idx);
  };

  const setCellStatus = (presetId) => {
    if (activeCellIdx === null) return;
    const newLog = { ...log };
    newLog.cells[activeCellIdx].status = presetId;
    store.upsertDailyLog(newLog);
  };

  const setCustomStatus = (e) => {
    e.preventDefault();
    if (activeCellIdx === null) return;
    const input = e.target.elements.customStatus;
    if (!input || !input.value.trim()) return;
    const newLog = { ...log };
    newLog.cells[activeCellIdx].status = input.value.trim();
    store.upsertDailyLog(newLog);
  };

  const updateCellNote = (e) => {
    if (activeCellIdx === null) return;
    const newLog = { ...log };
    newLog.cells[activeCellIdx].note = e.target.value;
    store.upsertDailyLog(newLog);
  };

  const setCellMacro = (e) => {
    if (activeCellIdx === null) return;
    const newLog = { ...log };
    newLog.cells[activeCellIdx].macroId = e.target.value;
    store.upsertDailyLog(newLog);
  };
  
  // Render Grid
  const cells = [];
  for (let i = 0; i < 24; i++) {
    const cell = log.cells[i] || { status: null };
    const isLocked = i > currentHour;
    const isLogged = !!cell.status;
    const isUnlockedNotLogged = !isLocked && !isLogged;
    const isSelected = activeCellIdx === i;
    
    let preset = presets.find(p => p.id === cell.status);
    let bgColor = preset ? preset.color : (isLogged ? '#1D3557' : 'transparent');
    
    let borderClass = 'border-surface-container';
    let content = <span className="text-[10px] text-on-surface-variant/30">{format12Hour(i)}</span>;
    let inlineStyle = { backgroundColor: bgColor };
    
    if (isLocked) {
      borderClass = 'border-surface-container-highest opacity-50';
      content = <span className="material-symbols-outlined text-sm text-on-surface-variant/30">lock</span>;
    } else if (isLogged) {
      borderClass = 'border-[#2A9D8F] border opacity-90';
      let customIcon = <span className="material-symbols-outlined text-sm text-white">fiber_manual_record</span>;
      if (cell.macroId) {
        const macro = macros.find(m => m.id === cell.macroId);
        if (macro) customIcon = <span className="material-symbols-outlined text-sm" style={{color: macro.accentColor}}>adjust</span>;
      }
      content = preset ? <span className="material-symbols-outlined text-sm text-white">{preset.icon}</span> : customIcon;
    } else if (isUnlockedNotLogged) {
      borderClass = 'border-[#E9C46A] border';
      content = <span className="material-symbols-outlined text-sm text-[#E9C46A]">priority_high</span>;
    }

    if (cell.macroId) {
      const macro = macros.find(m => m.id === cell.macroId);
      if (macro) {
        borderClass += ' border-2';
        inlineStyle.borderColor = macro.accentColor;
      }
    }

    if (isSelected) {
      borderClass = 'border-primary border-2 shadow-[0_0_10px_rgba(255,255,255,0.3)] scale-110 z-10 transition-transform';
      inlineStyle = { backgroundColor: bgColor }; // reset to just background and tailwind borders
    }

    cells.push(
      <div key={i} onClick={() => selectCell(i)}
           className={`aspect-square rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 ${borderClass}`}
           style={inlineStyle}>
        {content}
      </div>
    );
  }

  // Render Stats
  const statsList = stats.length ? stats.map(s => {
    const todayStr = getTodayStr();
    const sLogs = statLogs.filter(l => l.statId === s.id && l.dateStr === todayStr);
    sLogs.sort((a,b) => b.timestamp - a.timestamp);
    const val = sLogs.length ? sLogs[0].value : 0;
    return (
      <div key={s.id} className="flex justify-between items-center mb-3 last:mb-0">
        <span className="text-sm text-on-surface-variant">{s.name}</span>
        <span className="font-bold text-primary">{val} / {s.goalValue} <span className="text-xs text-on-surface-variant font-normal">{s.unit || ''}</span></span>
      </div>
    );
  }) : <p className="text-xs text-on-surface-variant">No statistics active. Create one in the Skills Hub.</p>;

  let activeCellPanel = null;
  if (activeCellIdx !== null) {
    const cell = log.cells[activeCellIdx] || { status: null };
    const isCustom = cell.status && !presets.find(p => p.id === cell.status);
    activeCellPanel = (
      <div className="bg-surface-container-highest rounded-2xl p-5 shadow-lg mb-8 animate-fade-in origin-top">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline-sm text-on-surface">{format12Hour(activeCellIdx)} - {format12Hour(activeCellIdx+1)}</h3>
          <button onClick={() => selectCell(null)} className="text-on-surface-variant hover:text-white"><span className="material-symbols-outlined">close</span></button>
        </div>
        
        {isCustom && <p className="text-sm font-bold text-primary mb-3">Logged: <span className="text-white">{cell.status}</span></p>}
        
        <p className="text-xs text-on-surface-variant mb-2">Select Activity Status:</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map(p => (
            <button key={p.id} onClick={() => setCellStatus(p.id)}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold text-white transition-transform hover:scale-105 border ${cell.status === p.id ? 'border-white ring-2 ring-white/20' : 'border-transparent'}`}
                    style={{backgroundColor: p.color}}>
              <span className="material-symbols-outlined text-sm">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>
        
        <form onSubmit={setCustomStatus} className="flex gap-2 mb-4">
           <input key={activeCellIdx} name="customStatus" type="text" placeholder="Or type custom status..." 
                  defaultValue={isCustom && cell.status ? cell.status : ""}
                  className="flex-1 bg-surface-container border border-surface-container-highest rounded-lg px-3 py-1.5 text-sm text-on-surface focus:border-primary outline-none" />
           <button type="submit" className="bg-surface-container border border-surface-container-highest rounded-lg px-3 py-1.5 text-sm hover:border-primary transition-colors">
             <span className="material-symbols-outlined text-sm text-primary">check</span>
           </button>
        </form>

        <p className="text-xs text-on-surface-variant mb-2 mt-4">Tag Macro Skill (Optional):</p>
        <select onChange={setCellMacro} value={cell.macroId || ""} className="w-full bg-surface-container border border-surface-container-highest rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary outline-none mb-4">
          <option value="">-- No Skill Tag --</option>
          {macros.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <textarea onChange={updateCellNote} value={cell.note || ''} placeholder="Add a note for this hour..." className="w-full bg-surface-container border border-surface-container-highest rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary outline-none resize-none h-20" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-6 gap-2 w-full max-w-sm mx-auto mb-6">
        {cells}
      </div>
      {activeCellPanel}
      <div className="bg-surface-container rounded-2xl p-5 mb-8">
        <h3 className="font-label-lg text-on-surface mb-4">Daily Statistic Metrics</h3>
        {statsList}
      </div>
    </div>
  );
}

function WeekStatCharts({ weekDates, stats, statLogs }) {
  if (stats.length === 0) return null;
  const statSeries = {};
  stats.forEach(s => { statSeries[s.id] = { name: s.name, unit: s.unit, goal: s.goalValue, data: [] }; });

  weekDates.forEach((date, i) => {
    const logsForDate = statLogs.filter(l => l.dateStr === date);
    Object.keys(statSeries).forEach(statId => {
      const sLogs = logsForDate.filter(l => l.statId === statId);
      const val = sLogs.reduce((acc, l) => acc + l.value, 0);
      statSeries[statId].data.push({ x: i, y: val, date });
    });
  });

  const w = 320;
  const h = 80;

  return (
    <div className="mb-6">
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x custom-scrollbar">
        {Object.values(statSeries).map((series, idx) => {
          const goalNum = Number(series.goal) || 1;
          const maxValY = Math.max(...series.data.map(d => d.y), goalNum * 1.2, 1);
          const points = series.data.map((d, i) => {
            const px = (i / Math.max(1, series.data.length - 1)) * w;
            const py = h - ((d.y / maxValY) * h);
            return `${px},${py}`;
          }).join(' ');

          const goalY = h - ((goalNum / maxValY) * h);

          return (
            <div key={idx} className="min-w-[280px] bg-surface-container rounded-2xl p-4 shadow-sm border border-surface-container-highest snap-start">
              <div className="flex justify-between items-end mb-4">
                <span className="font-bold text-sm text-on-surface">{series.name}</span>
                <span className="text-xs text-on-surface-variant font-mono">Goal: {series.goal} {series.unit || ''}</span>
              </div>
              <svg viewBox={`0 -10 ${w} ${h+20}`} className="w-full h-24 overflow-visible">
                <line x1="0" y1={goalY} x2={w} y2={goalY} stroke="var(--border)" strokeWidth="2" strokeDasharray="4" />
                <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {series.data.map((d, i) => {
                  const px = (i / Math.max(1, series.data.length - 1)) * w;
                  const py = h - ((d.y / maxValY) * h);
                  return (
                    <circle key={i} cx={px} cy={py} r="4" fill="var(--bg-base)" stroke="var(--primary)" strokeWidth="2">
                      <title>{new Date(d.date).toLocaleDateString(undefined, {weekday:'short'})}: {d.y}</title>
                    </circle>
                  );
                })}
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalysisArchive() {
  const [archiveMode, setArchiveMode] = useState('list');
  const [activeWeekStart, setActiveWeekStart] = useState(null);
  const [expandedArchiveDate, setExpandedArchiveDate] = useState(null);
  const [archiveSortOrder, setArchiveSortOrder] = useState('desc');
  const [collapsedWeeks, setCollapsedWeeks] = useState(new Set());
  
  const [logs, setLogs] = useState(() => store.getDailyLogs());
  const [statLogs, setStatLogs] = useState(() => store.getStatLogs());
  const [stats, setStats] = useState(() => store.getStatistics());
  const [macros, setMacros] = useState(() => store.getMacros());
  const [presets, setPresets] = useState(() => store.getCellPresets());

  useEffect(() => {
    const handler = () => {
      setLogs(store.getDailyLogs());
      setStatLogs(store.getStatLogs());
      setStats(store.getStatistics());
      setMacros(store.getMacros());
      setPresets(store.getCellPresets());
    };
    store.on('change', handler);
    return () => store.off('change', handler);
  }, []);

  const toggleArchiveSort = () => setArchiveSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  const toggleWeekCollapse = (ws) => {
    setCollapsedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(ws)) next.delete(ws);
      else next.add(ws);
      return next;
    });
  };
  const openWeekDetails = (ws, dateToExpand = null) => {
    setArchiveMode('week_details');
    setActiveWeekStart(ws);
    setExpandedArchiveDate(dateToExpand);
  };
  const openWeekStats = (ws) => {
    setArchiveMode('week_stats');
    setActiveWeekStart(ws);
  };
  const backToArchiveList = () => {
    setArchiveMode('list');
    setActiveWeekStart(null);
    setExpandedArchiveDate(null);
  };
  const toggleArchiveDayExpand = (date) => {
    setExpandedArchiveDate(prev => prev === date ? null : date);
  };

  const editPastStat = (statId, dateStr, inputId) => {
    const el = document.getElementById(inputId);
    if (!el || el.value === '') return;
    const val = Number(el.value);
    
    let allLogs = store.getStatLogs();
    let existingLogsForDay = allLogs.filter(l => l.statId === statId && l.dateStr === dateStr);
    
    if (existingLogsForDay.length > 0) {
      existingLogsForDay[0].value = val;
      allLogs = allLogs.filter(l => l.id === existingLogsForDay[0].id || !(l.statId === statId && l.dateStr === dateStr));
    } else {
      allLogs.push({
        id: store.uid(),
        statId: statId,
        value: val,
        dateStr: dateStr,
        timestamp: new Date(dateStr).getTime() + 43200000
      });
    }
    store.saveStatLogs(allLogs);
    if (window.LM && window.LM.components && window.LM.components.notifications) {
       window.LM.components.notifications.show('Statistic saved for ' + dateStr, 'success');
    }
  };

  const getWeekStart = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d.toDateString();
  };

  const CUTOFF_DATE = new Date('2026-06-21').getTime();
  
  let dates = Object.keys(logs).filter(d => new Date(d).getTime() >= CUTOFF_DATE);
  dates.sort((a,b) => new Date(b) - new Date(a));
  
  let statLogsFiltered = statLogs.filter(sl => new Date(sl.dateStr).getTime() >= CUTOFF_DATE);
  
  if (dates.length === 0 && statLogsFiltered.length === 0) {
    return <div className="p-10 text-center text-on-surface-variant text-sm mt-10">No archives found after June 21, 2026.</div>;
  }

  const weeks = {};
  const allDatesToGroup = new Set([...dates, ...statLogsFiltered.map(sl => sl.dateStr)]);
  
  allDatesToGroup.forEach(date => {
    const ws = getWeekStart(date);
    if (!weeks[ws]) weeks[ws] = new Set();
    weeks[ws].add(date);
  });

  let sortedWeeks = Object.keys(weeks);
  sortedWeeks.sort((a,b) => {
    const diff = new Date(b) - new Date(a);
    return archiveSortOrder === 'desc' ? diff : -diff;
  });

  if (archiveMode === 'list') {
    return (
      <div className="p-6 space-y-5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headline-sm text-primary">Archive Calendar</h2>
          <button onClick={toggleArchiveSort} className="flex items-center gap-1 text-xs font-bold text-on-surface-variant bg-surface-container-highest px-3 py-1.5 rounded-full hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-sm">sort</span>
            {archiveSortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </button>
        </div>
        
        {sortedWeeks.map(weekStart => {
          const weekDates = [];
          const wsDate = new Date(weekStart);
          for (let i = 0; i < 7; i++) {
            const d = new Date(wsDate);
            d.setDate(wsDate.getDate() + i);
            weekDates.push(d.toDateString());
          }
          
          const weDate = new Date(weekDates[6]);
          const weekLabel = `${wsDate.toLocaleDateString('en-US', {month:'short', day:'numeric'})} - ${weDate.toLocaleDateString('en-US', {month:'short', day:'numeric'})}`;
          
          let trackedHours = 0;
          let daysWithData = 0;
          weeks[weekStart].forEach(date => {
            if (logs[date]) {
              const cells = logs[date].cells || Array(24).fill({ status: null });
              trackedHours += cells.filter(c => c.status).length;
              daysWithData++;
            }
          });

          const isCollapsed = collapsedWeeks.has(weekStart);

          return (
            <div key={weekStart} className="bg-surface-container rounded-2xl p-5 border border-surface-container-highest chrome-accent shadow-lg mb-6 transition-all duration-300">
              <div className="flex justify-between items-start mb-4 cursor-pointer group" onClick={() => toggleWeekCollapse(weekStart)}>
                <div>
                  <h3 className={`font-headline-sm text-on-surface ${!isCollapsed ? 'mb-1' : ''} group-hover:text-primary transition-colors`}>Week of {weekLabel}</h3>
                  {!isCollapsed && <p className="text-xs text-on-surface-variant">{daysWithData} Days Tracked • {trackedHours} Total Hours</p>}
                </div>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors bg-surface-container-highest rounded-full p-1">{isCollapsed ? 'expand_more' : 'expand_less'}</span>
              </div>
              
              <div className={`flex justify-between items-center gap-2 ${!isCollapsed ? 'mb-6' : ''} w-full max-w-[320px]`}>
                {weekDates.map(dateStr => {
                  const isFuture = new Date(dateStr) > new Date() || new Date(dateStr).getTime() < CUTOFF_DATE;
                  const log = logs[dateStr];
                  let fillClass = 'bg-surface-container-highest border border-surface-container-highest opacity-50 text-on-surface-variant';
                  
                  if (log) {
                    const cells = log.cells || Array(24).fill({ status: null });
                    const c = cells.filter(x => x.status).length;
                    if (c > 12) fillClass = 'bg-primary border-primary shadow-[0_0_8px_var(--primary)] text-black';
                    else if (c > 0) fillClass = 'bg-primary/50 border-primary/50 text-white';
                  }
                  
                  const dayLabel = new Date(dateStr).toLocaleDateString(undefined, {weekday:'narrow'});
                  const dateNum = new Date(dateStr).getDate();
                  
                  return (
                    <div key={dateStr} className="flex flex-col items-center gap-1">
                      {!isCollapsed && <span className="text-[0.6rem] text-on-surface-variant font-bold">{dayLabel}</span>}
                      <button onClick={() => !isFuture && openWeekDetails(weekStart, dateStr)} 
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[0.65rem] ${fillClass} transition-transform hover:scale-110 ${!isFuture ? 'cursor-pointer' : 'opacity-20 cursor-default'}`}
                              title={new Date(dateStr).toLocaleDateString()}>{dateNum}</button>
                    </div>
                  );
                })}
              </div>

              {!isCollapsed && (
                <div className="flex gap-2">
                  <button onClick={() => openWeekDetails(weekStart)} className="flex-1 bg-surface-container-highest hover:bg-white/10 text-on-surface text-xs font-bold py-2 rounded-xl transition-colors">Info & Details <span className="text-[10px] ml-1 opacity-50">{'>'}</span></button>
                  <button onClick={() => openWeekStats(weekStart)} className="flex-1 bg-surface-container-highest hover:bg-white/10 text-on-surface text-xs font-bold py-2 rounded-xl transition-colors">Statistics Review <span className="text-[10px] ml-1 opacity-50">{'>'}</span></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  } else if (archiveMode === 'week_stats') {
    const wsDate = new Date(activeWeekStart);
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(wsDate);
      d.setDate(wsDate.getDate() + i);
      weekDates.push(d.toDateString());
    }

    return (
      <div className="p-6">
        <button onClick={backToArchiveList} className="flex items-center gap-1 text-on-surface-variant hover:text-white text-xs font-bold mb-6 transition-colors">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Calendar
        </button>
        <h2 className="font-headline-sm text-primary mb-6">Week Statistics</h2>
        <WeekStatCharts weekDates={weekDates} stats={stats} statLogs={statLogs} />
      </div>
    );
  } else {
    const wsDate = new Date(activeWeekStart);
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(wsDate);
      d.setDate(wsDate.getDate() + i);
      weekDates.push(d.toDateString());
    }

    return (
      <div className="p-6">
        <button onClick={backToArchiveList} className="flex items-center gap-1 text-on-surface-variant hover:text-white text-xs font-bold mb-6 transition-colors">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Calendar
        </button>
        <h2 className="font-headline-sm text-primary mb-6">Week Log Explorer</h2>
        <div className="space-y-4">
          {weekDates.map(dateStr => {
            if (new Date(dateStr).getTime() < CUTOFF_DATE) return null;
            const log = logs[dateStr];
            const isExpanded = expandedArchiveDate === dateStr;
            const dayName = new Date(dateStr).toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'});
            
            let cCount = 0;
            if (log) cCount = (log.cells || []).filter(c=>c.status).length;

            return (
              <div key={dateStr} className="bg-surface-container border border-surface-container-highest rounded-2xl overflow-hidden transition-all duration-300">
                <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-surface-container-highest/50 transition-colors" onClick={() => toggleArchiveDayExpand(dateStr)}>
                  <span className="font-bold text-sm text-on-surface">{dayName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-on-surface-variant bg-surface-container-highest px-2 py-1 rounded-md">{cCount} hrs</span>
                    <span className="material-symbols-outlined text-on-surface-variant">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-surface-container-highest/50">
                    {stats.length > 0 && (
                      <div className="mb-4 pt-4 border-b border-surface-container-highest/50 pb-4">
                        <p className="text-xs text-on-surface-variant mb-2 font-bold uppercase">Logged Statistics for {dayName}</p>
                        <div className="flex flex-col gap-2">
                          {stats.map(stat => {
                            const todaysLogs = statLogs.filter(l => l.statId === stat.id && l.dateStr === dateStr);
                            const val = todaysLogs.reduce((acc, l) => acc + l.value, 0);
                            const inputId = `edit-stat-${stat.id}-${dateStr.replace(/ /g,'-')}`;
                            return (
                              <div key={stat.id} className="flex items-center gap-2 bg-surface-container-highest/30 p-2 rounded-lg">
                                <span className="text-xs text-on-surface flex-1">{stat.name}</span>
                                <input id={inputId} type="number" defaultValue={val} className="form-input" style={{width:'70px', height:'28px', fontSize:'0.75rem', padding:'4px'}} placeholder="0" />
                                <span className="text-xs text-on-surface-variant font-mono">/ {stat.goalValue} {stat.unit||''}</span>
                                <button onClick={() => editPastStat(stat.id, dateStr, inputId)} className="btn btn-primary btn-sm" style={{padding:'2px 10px', fontSize:'0.7rem', height:'28px', minWidth:'unset'}}>SAVE</button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(!log || cCount === 0) ? (
                      <div className="text-center text-xs text-on-surface-variant py-4">No hourly data logged for this day.</div>
                    ) : (
                      <>
                        <p className="text-xs text-on-surface-variant mb-2 font-bold uppercase">Time Tracking</p>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                          {Array.from({length: 24}).map((_, i) => {
                            const cell = log.cells[i];
                            if (!cell || !cell.status) return null;
                            let preset = presets.find(p => p.id === cell.status);
                            let bgColor = preset ? preset.color : '#1D3557';
                            let icon = preset ? <span className="material-symbols-outlined text-sm text-white">{preset.icon}</span> : <span className="text-[10px] text-white">★</span>;
                            
                            if (cell.macroId) {
                              const macro = macros.find(m => m.id === cell.macroId);
                              if (macro) {
                                 icon = <span className="material-symbols-outlined text-sm" style={{color: macro.accentColor}}>adjust</span>;
                              }
                            }

                            return (
                              <div key={i} className="flex flex-col items-center gap-1 group relative">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 shadow-sm" style={{backgroundColor: bgColor}}>
                                  {icon}
                                </div>
                                <span className="text-[9px] text-on-surface-variant">{format12Hour(i)}</span>
                                {cell.note && (
                                  <div className="absolute bottom-full mb-1 w-32 bg-surface-container-highest text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl border border-surface-container">
                                    {cell.note}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

function AnalysisProgression() {
  const [history, setHistory] = useState(() => store.getWorkoutHistory());

  useEffect(() => {
    const handler = () => {
      setHistory(store.getWorkoutHistory());
    };
    store.on('change', handler);
    return () => store.off('change', handler);
  }, []);

  if (history.length === 0) {
    return <div className="p-10 text-center text-on-surface-variant text-sm mt-10">No workout history logged yet. Complete a workout with weights to see progressive overload!</div>;
  }

  const seriesData = {};
  history.forEach(log => {
    const max1RM = log.sets.reduce((max, s) => {
      const est1RM = s.weight * (1 + s.reps / 30);
      return est1RM > max ? est1RM : max;
    }, 0);
    
    if (max1RM > 0) {
      if (!seriesData[log.exerciseName]) seriesData[log.exerciseName] = [];
      seriesData[log.exerciseName].push({ date: log.date, y: Math.round(max1RM) });
    }
  });

  const exNames = Object.keys(seriesData);
  if (exNames.length === 0) {
    return <div className="p-10 text-center text-on-surface-variant text-sm mt-10">No weight/reps data found.</div>;
  }

  return (
    <div className="mb-6">
      <h2 className="font-headline-sm text-primary mb-2">Workout Progressive Overload</h2>
      <p className="text-xs text-on-surface-variant mb-6">Graphs show your Estimated 1 Rep Max over time using the Epley formula.</p>
      <div className="flex flex-col gap-6">
        {exNames.map(exName => {
          const data = seriesData[exName];
          data.sort((a,b) => a.date - b.date);
          const w = 320;
          const h = 100;
          const maxValY = Math.max(...data.map(d => d.y), 1) * 1.1;

          const points = data.map((d, i) => {
            const px = (i / Math.max(1, data.length - 1)) * w;
            const py = h - ((d.y / maxValY) * h);
            return `${px},${py}`;
          }).join(' ');

          return (
            <div key={exName} className="w-full bg-surface-container rounded-2xl p-4 shadow-sm border border-surface-container-highest">
              <div className="flex justify-between items-end mb-4">
                <span className="font-bold text-sm text-on-surface">{exName}</span>
                <span className="text-xs text-on-surface-variant font-mono">Max e1RM: {Math.max(...data.map(d=>d.y))}</span>
              </div>
              <svg viewBox={`0 -10 ${w} ${h+20}`} className="w-full h-32 overflow-visible">
                <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {data.map((d, i) => {
                  const px = (i / Math.max(1, data.length - 1)) * w;
                  const py = h - ((d.y / maxValY) * h);
                  return (
                    <circle key={i} cx={px} cy={py} r="4" fill="var(--bg-base)" stroke="var(--primary)" strokeWidth="2">
                      <title>{new Date(d.date).toLocaleDateString()}: {d.y}</title>
                    </circle>
                  );
                })}
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Analysis() {
  const [activeTab, setActiveTab] = useState('today');

  return (
    <div style={{ padding: '100px 16px 120px', maxWidth: '900px', margin: '0 auto' }}>
      <header className="flex items-center justify-between mb-6">
        <h2 className="font-label-lg text-on-surface">Analysis & Chronicle</h2>
        <div className="flex gap-2 bg-surface-container p-1 rounded-xl">
          <button onClick={() => setActiveTab('today')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'today' ? 'bg-primary text-black shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Today</button>
          <button onClick={() => setActiveTab('archive')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'archive' ? 'bg-primary text-black shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Archive</button>
          <button onClick={() => setActiveTab('progression')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'progression' ? 'bg-primary text-black shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Progression</button>
        </div>
      </header>

      <div>
        {activeTab === 'today' && <AnalysisToday />}
        {activeTab === 'archive' && <AnalysisArchive />}
        {activeTab === 'progression' && <AnalysisProgression />}
      </div>
    </div>
  );
}
