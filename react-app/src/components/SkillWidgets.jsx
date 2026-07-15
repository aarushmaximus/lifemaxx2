import React, { useState, useEffect } from 'react';
import { store } from '../lib/store';
import { formulas as F } from '../lib/formulas';

const MUSCLES = [
  { id: 'back',       label: 'Back',       color: '#4ade80' },
  { id: 'rear-delt',  label: 'Rear Delt',  color: '#f472b6' },
  { id: 'side-delt',  label: 'Side Delt',  color: '#fb923c' },
  { id: 'bicep',      label: 'Bicep',      color: '#60a5fa' },
  { id: 'tricep',     label: 'Tricep',     color: '#a78bfa' },
  { id: 'brachialis', label: 'Brachialis', color: '#fbbf24' },
  { id: 'chest',      label: 'Chest',      color: '#ef4444' },
  { id: 'legs',       label: 'Legs',       color: '#8b5cf6' },
  { id: 'core',       label: 'Core',       color: '#3b82f6' }
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMuscle(id) {
  return MUSCLES.find(m => m.id === id) || { id, label: id, color: '#888' };
}

export default function SkillWidgets({ macro, onClose }) {
  const [activeWidget, setActiveWidget] = useState(null); // null, 'planner', 'archive'
  
  // Planner State
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [tempSplit, setTempSplit] = useState(null);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState(3);
  const [newExReps, setNewExReps] = useState('8-12');
  const [newExRest, setNewExRest] = useState(60);
  const [newExMuscle, setNewExMuscle] = useState('back');

  // Archive State
  const [archiveFilter, setArchiveFilter] = useState('all');
  const [selectedArchiveEx, setSelectedArchiveEx] = useState(null);
  const [exFormMuscle, setExFormMuscle] = useState('unknown');
  const [exFormUrl, setExFormUrl] = useState('');
  const [exFormNotes, setExFormNotes] = useState('');
  
  const [archiveExercises, setArchiveExercises] = useState([]);

  useEffect(() => {
    // Initial load for Planner
    setTempSplit(JSON.parse(JSON.stringify(store.getWeeklySplit())));
    loadArchiveExercises();
  }, []);

  function loadArchiveExercises() {
    const exercises = {}; 
    const history = store.getWorkoutHistory() || [];
    history.forEach(h => {
      if (!exercises[h.exerciseName]) exercises[h.exerciseName] = { name: h.exerciseName, history: [] };
      exercises[h.exerciseName].history.push(h);
    });
    
    const split = store.getWeeklySplit() || [];
    split.forEach(day => {
      if(day.exercises) {
        day.exercises.forEach(e => {
          if (!exercises[e.name]) exercises[e.name] = { name: e.name, history: [] };
          if(!exercises[e.name].splitMeta) {
            exercises[e.name].splitMeta = e; 
          }
        });
      }
    });

    Object.keys(exercises).forEach(k => {
      const ex = exercises[k];
      const meta = store.getExerciseMeta(k) || {};
      ex.meta = { 
        name: k, 
        muscleGroup: meta.muscleGroup || (ex.splitMeta ? ex.splitMeta.muscleGroup : 'unknown'), 
        formNotes: meta.formNotes || '', 
        videoUrl: meta.videoUrl || '' 
      };
      ex.history.sort((a,b) => b.date - a.date);
      ex.lastDone = ex.history.length > 0 ? ex.history[0] : null;
    });

    setArchiveExercises(Object.values(exercises));
  }

  // ==== PLANNER ====
  function saveSplit() {
    store.upsertWeeklySplit(tempSplit);
    // LM.components.notifications.show('Weekly Split Saved!', 'success');
    if (store.checkWeeklyWorkoutGen) {
      store.checkWeeklyWorkoutGen(true);
    }
    setActiveWidget(null);
  }

  function toggleDayActive(isActive) {
    const newSplit = [...tempSplit];
    newSplit[selectedDay].isActive = isActive;
    if (isActive) {
      newSplit[selectedDay].name = DAYS[selectedDay] + ' Workout';
    }
    setTempSplit(newSplit);
    setIsAddingExercise(false);
  }

  function addExercise() {
    if (!newExName.trim()) return;
    const newSplit = [...tempSplit];
    newSplit[selectedDay].exercises.push({
      id: store.uid(),
      name: newExName.trim(),
      muscleGroup: newExMuscle,
      sets: parseInt(newExSets) || 3,
      repRange: newExReps.trim() || '8-12',
      restSeconds: parseInt(newExRest) || 60
    });
    setTempSplit(newSplit);
    setIsAddingExercise(false);
    setNewExName('');
  }

  function removeExercise(idx) {
    const newSplit = [...tempSplit];
    newSplit[selectedDay].exercises.splice(idx, 1);
    setTempSplit(newSplit);
  }

  function renderPlanner() {
    if (!tempSplit) return null;
    const config = tempSplit[selectedDay];

    return (
      <div className="pb-24 overflow-x-hidden relative h-full">
        <div className="flex flex-wrap justify-around gap-1 pb-4 border-b border-white/5">
          {DAYS_SHORT.map((d, i) => {
            const isActive = selectedDay === i;
            const hasWorkout = tempSplit[i].isActive && tempSplit[i].exercises.length > 0;
            return (
              <button 
                key={i}
                onClick={() => { setSelectedDay(i); setIsAddingExercise(false); }}
                className={`flex-1 max-w-[52px] flex flex-col items-center justify-center py-2 px-2.5 rounded-xl cursor-pointer ${isActive ? 'bg-white/10 text-white' : 'bg-transparent text-gray-500'}`}
              >
                <span className="font-semibold text-xs">{d}</span>
                <div className="w-1 h-1 rounded-full mt-1" style={{ background: hasWorkout ? 'var(--sk-accent)' : 'transparent' }}></div>
              </button>
            );
          })}
        </div>

        <h2 className="text-2xl font-bold mt-5 text-white">{DAYS[selectedDay]}</h2>

        {!config.isActive ? (
          <div className="mt-10 bg-white/5 rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <p className="font-display text-lg tracking-widest text-gray-300 mb-2">REST DAY</p>
            <p className="text-gray-500 text-sm mb-6">No workout scheduled for {DAYS[selectedDay]}s.</p>
            <button className="px-6 py-3 rounded-lg text-black font-bold text-sm" style={{ background: 'var(--sk-accent)' }} onClick={() => toggleDayActive(true)}>
              Set as Workout Day
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <div className="flex justify-between items-center mb-5 p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex-1 mr-4">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest block">Workout Name</label>
                <input 
                  type="text" 
                  value={config.name || ''} 
                  placeholder="e.g. Push Day"
                  onChange={(e) => {
                    const newSplit = [...tempSplit];
                    newSplit[selectedDay].name = e.target.value;
                    setTempSplit(newSplit);
                  }}
                  className="bg-transparent border-none text-white text-lg font-semibold w-full mt-1 outline-none"
                />
              </div>
              <div className="w-px h-10 bg-white/10 mr-4"></div>
              <div className="flex-[0.5]">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest block">XP</label>
                <input 
                  type="number" 
                  value={config.xpReward || 500}
                  onChange={(e) => {
                    const newSplit = [...tempSplit];
                    newSplit[selectedDay].xpReward = parseInt(e.target.value) || 0;
                    setTempSplit(newSplit);
                  }}
                  className="bg-transparent border-none text-lg font-semibold w-full mt-1 outline-none"
                  style={{ color: 'var(--sk-accent)' }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center my-6">
              <h3 className="font-display text-sm text-gray-300 tracking-widest">EXERCISES</h3>
              <button className="text-xs text-red-400 hover:text-red-300 transition-colors" onClick={() => toggleDayActive(false)}>Make Rest Day</button>
            </div>

            {config.exercises.length === 0 ? (
              <div className="text-center p-8 text-gray-500 text-sm bg-white/5 rounded-xl border border-dashed border-white/10 mb-5">
                No exercises added yet.
              </div>
            ) : (
              config.exercises.map((ex, idx) => {
                const m = getMuscle(ex.muscleGroup);
                return (
                  <div key={idx} className="flex justify-between items-center bg-white/5 border border-white/5 rounded-xl p-4 mb-3">
                    <div>
                      <div className="font-semibold text-[1.05rem] text-white mb-1">{ex.name}</div>
                      <div className="flex gap-2 text-xs text-gray-500 items-center">
                        <span style={{ color: m.color, background: `${m.color}22` }} className="px-1.5 py-0.5 rounded">{m.label}</span>
                        <span>•</span>
                        <span>{ex.sets} sets × {ex.repRange || '?'}</span>
                        <span>•</span>
                        <span>Rest: {ex.restSeconds || 60}s</span>
                      </div>
                    </div>
                    <button className="text-red-400 p-2 bg-red-500/10 rounded-lg opacity-60 hover:opacity-100 transition-opacity" onClick={() => removeExercise(idx)}>✕</button>
                  </div>
                );
              })
            )}

            <button 
              onClick={() => setIsAddingExercise(true)}
              className="w-full mt-2 py-3.5 bg-white/5 border border-dashed border-white/10 rounded-xl text-gray-300 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              + Add Exercise
            </button>

            {isAddingExercise && (
              <>
                <div className="fixed bottom-0 left-0 right-0 bg-[#111113] border-t border-[var(--sk-accent)] px-5 pt-6 pb-10 rounded-t-3xl z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="font-display text-lg tracking-wider" style={{ color: 'var(--sk-accent)' }}>ADD EXERCISE</h3>
                    <button className="bg-white/5 p-2 rounded-lg text-white hover:bg-white/10" onClick={() => setIsAddingExercise(false)}>✕</button>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 mb-1.5 block">Exercise Name</label>
                    <input autoFocus type="text" value={newExName} onChange={e=>setNewExName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--sk-accent)] outline-none" placeholder="e.g. Barbell Curl" />
                  </div>
                  <div className="mb-5">
                    <label className="text-xs text-gray-400 mb-1.5 block">Target Muscle</label>
                    <div className="flex flex-wrap gap-2">
                      {MUSCLES.map(m => (
                        <button key={m.id} type="button" onClick={() => setNewExMuscle(m.id)} style={{ background: newExMuscle===m.id ? m.color : 'rgba(255,255,255,0.05)', color: newExMuscle===m.id ? '#000' : m.color }} className="px-3 py-1.5 rounded-full text-xs transition-colors">
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 mb-6">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 mb-1.5 block">Sets</label>
                      <input type="number" min="1" max="20" value={newExSets} onChange={e=>setNewExSets(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-center focus:border-[var(--sk-accent)] outline-none" />
                    </div>
                    <div className="flex-[1.5]">
                      <label className="text-xs text-gray-400 mb-1.5 block">Reps</label>
                      <input type="text" value={newExReps} onChange={e=>setNewExReps(e.target.value)} placeholder="8-12" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-center focus:border-[var(--sk-accent)] outline-none" />
                    </div>
                    <div className="flex-[1.5]">
                      <label className="text-xs text-gray-400 mb-1.5 block">Rest</label>
                      <select value={newExRest} onChange={e=>setNewExRest(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--sk-accent)] outline-none">
                        <option value="30">30s</option>
                        <option value="60">60s</option>
                        <option value="90">90s</option>
                        <option value="120">2min</option>
                        <option value="180">3min</option>
                      </select>
                    </div>
                  </div>
                  <button className="w-full py-3.5 rounded-xl font-bold text-black bg-[var(--sk-accent)] hover:opacity-90 transition-opacity" onClick={addExercise}>Save Exercise</button>
                </div>
                <div className="fixed inset-0 bg-black/60 z-[99]" onClick={() => setIsAddingExercise(false)}></div>
              </>
            )}
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-[#111113] via-[#111113] to-transparent z-20 flex justify-center pointer-events-none">
          <button className="w-full max-w-[700px] py-4 rounded-xl font-bold text-black text-[1.1rem] shadow-xl pointer-events-auto transition-opacity" style={{ background: 'var(--sk-accent)' }} onClick={saveSplit}>
            Save Weekly Split
          </button>
        </div>
      </div>
    );
  }

  // ==== ARCHIVE ====
  function saveExerciseForm(name) {
    store.upsertExerciseMeta({ name, muscleGroup: exFormMuscle, formNotes: exFormNotes, videoUrl: exFormUrl });
    loadArchiveExercises();
    // LM.components.notifications.show('Exercise Details Saved', 'success');
  }

  function extractYouTubeID(url) {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  }

  function renderArchiveDetail() {
    const ex = archiveExercises.find(e => e.name === selectedArchiveEx);
    if (!ex) return <div className="p-10 text-center text-white">Exercise not found</div>;

    const m = getMuscle(ex.meta.muscleGroup);

    let scoreHTML = null;
    if (ex.lastDone && ex.lastDone.sets && ex.lastDone.sets.length > 0) {
      const bestSet = ex.lastDone.sets.reduce((best, s) => {
        const sScore = s.weight * (1 + s.reps/30);
        const bScore = best.weight * (1 + best.reps/30);
        return sScore > bScore ? s : best;
      }, { weight: 0, reps: 0 });

      const repRangeStr = ex.splitMeta ? ex.splitMeta.repRange : '8-12';
      const parts = repRangeStr.split('-');
      const maxReps = parts.length > 1 ? parseInt(parts[1]) : 12;
      
      let targetWeight = bestSet.weight;
      let targetReps = bestSet.reps + 1;
      let logicStr = 'Add 1 Rep';
      
      if (bestSet.reps >= maxReps) {
        targetWeight = bestSet.weight + 2.5;
        targetReps = parts.length > 1 ? parseInt(parts[0]) : 8;
        logicStr = 'Increase Weight';
      }

      scoreHTML = (
        <div className="bg-white/5 border rounded-xl p-4 mb-6" style={{ borderColor: `${m.color}44` }}>
          <div className="text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: m.color }}>
            🎯 SCORE TO BEAT (Last: {bestSet.weight}kg x {bestSet.reps})
          </div>
          <div className="text-2xl font-bold text-white">
            {targetWeight}kg <span className="text-gray-400 font-medium text-lg">× {targetReps} reps</span>
          </div>
          <div className="text-sm text-gray-400 mt-1">Goal: {logicStr} (Target Range: {repRangeStr})</div>
        </div>
      );
    } else {
      scoreHTML = (
        <div className="bg-white/5 border border-dashed border-white/10 rounded-xl p-4 mb-6 text-center text-gray-400 text-sm">
          No workout history to calculate Score to Beat.
        </div>
      );
    }

    let videoHtml = null;
    if (ex.meta.videoUrl) {
      const ytId = extractYouTubeID(ex.meta.videoUrl);
      if (ytId) {
        videoHtml = (
          <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-xl mb-5 border border-white/10">
            <iframe src={`https://www.youtube.com/embed/${ytId}`} className="absolute top-0 left-0 w-full h-full" frameBorder="0" allowFullScreen></iframe>
          </div>
        );
      } else {
        videoHtml = <div className="mb-5"><a href={ex.meta.videoUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline">🔗 View Form Video</a></div>;
      }
    }

    let chartHtml = null;
    if (ex.history.length > 0) {
      const chartData = ex.history.map(h => {
        const maxW = h.sets.reduce((mx, s) => s.weight > mx ? s.weight : mx, 0);
        return { date: h.date, y: maxW };
      });
      chartData.sort((a,b) => a.date - b.date);
      const maxVal = Math.max(...chartData.map(d => d.y), 1);
      
      const width = 300;
      const height = 100;
      
      let pathD = "";
      if (chartData.length > 1) {
        chartData.forEach((d, i) => {
          const x = (i / (chartData.length - 1)) * width;
          const y = height - (d.y / maxVal) * height;
          if (i === 0) pathD += `M ${x} ${y}`;
          else pathD += ` L ${x} ${y}`;
        });
      }

      chartHtml = (
        <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
          <div className="flex justify-between items-end mb-4">
            <span className="font-bold text-sm text-white">Max Weight Progression</span>
            <span className="text-xs text-gray-400 font-mono">Max: {Math.max(...chartData.map(d=>d.y))}kg</span>
          </div>
          {chartData.length > 1 ? (
            <div className="w-full h-[150px] relative">
              <svg viewBox={`0 -10 ${width} ${height+20}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <path d={pathD} fill="none" stroke={m.color} strokeWidth="3" />
                {chartData.map((d, i) => {
                  const x = (i / (chartData.length - 1)) * width;
                  const y = height - (d.y / maxVal) * height;
                  return <circle key={i} cx={x} cy={y} r="4" fill="#0f172a" stroke={m.color} strokeWidth="2" />;
                })}
              </svg>
            </div>
          ) : (
            <div className="text-center text-gray-500 text-sm">Need at least 2 workouts for chart</div>
          )}
        </div>
      );
    }

    return (
      <div className="pb-24">
        <button className="text-gray-400 mb-4 hover:text-white" onClick={() => setSelectedArchiveEx(null)}>← Back to List</button>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white leading-tight">{ex.name}</h2>
          <span style={{ color: m.color, background: `${m.color}22` }} className="px-2.5 py-1 rounded-md text-xs font-semibold">{m.label}</span>
        </div>
        {scoreHTML}
        {chartHtml}
        
        <h3 className="font-display text-lg text-gray-300 tracking-wider mb-4 mt-6">FORM & NOTES</h3>
        {videoHtml}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1.5 block">Muscle Group</label>
          <select value={exFormMuscle} onChange={e=>setExFormMuscle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--sk-accent)] outline-none">
            <option value="unknown">Unknown</option>
            {MUSCLES.map(mus => <option key={mus.id} value={mus.id}>{mus.label}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1.5 block">Video Link (YouTube)</label>
          <input type="text" value={exFormUrl} onChange={e=>setExFormUrl(e.target.value)} placeholder="Paste YouTube link" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--sk-accent)] outline-none" />
        </div>
        <div className="mb-6">
          <label className="text-xs text-gray-400 mb-1.5 block">Form Notes</label>
          <textarea rows="4" value={exFormNotes} onChange={e=>setExFormNotes(e.target.value)} placeholder="Cues, setups, reminders..." className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--sk-accent)] outline-none resize-none"></textarea>
        </div>
        <button className="w-full py-3.5 rounded-xl font-bold text-black transition-opacity hover:opacity-90" style={{ background: 'var(--sk-accent)' }} onClick={() => saveExerciseForm(ex.name)}>
          Save Details
        </button>
      </div>
    );
  }

  function renderArchive() {
    if (selectedArchiveEx) return renderArchiveDetail();

    const groupsInUse = new Set();
    archiveExercises.forEach(e => groupsInUse.add(e.meta.muscleGroup));

    const filtered = archiveExercises.filter(e => archiveFilter === 'all' || e.meta.muscleGroup === archiveFilter);
    filtered.sort((a,b) => a.name.localeCompare(b.name));

    return (
      <div className="h-full flex flex-col">
        <div className="flex gap-2 overflow-x-auto pb-4 border-b border-white/5 shrink-0">
          <button 
            onClick={() => setArchiveFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${archiveFilter === 'all' ? 'bg-white text-black' : 'bg-white/5 text-white'}`}
          >
            All
          </button>
          {MUSCLES.map(m => {
            if (groupsInUse.has(m.id)) {
              const active = archiveFilter === m.id;
              return (
                <button 
                  key={m.id}
                  onClick={() => setArchiveFilter(m.id)}
                  className="px-4 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors"
                  style={{ background: active ? m.color : 'rgba(255,255,255,0.05)', color: active ? '#000' : m.color }}
                >
                  {m.label}
                </button>
              );
            }
            return null;
          })}
          {groupsInUse.has('unknown') && (
            <button 
              onClick={() => setArchiveFilter('unknown')}
              className="px-4 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors"
              style={{ background: archiveFilter === 'unknown' ? '#888' : 'rgba(255,255,255,0.05)', color: archiveFilter === 'unknown' ? '#000' : '#888' }}
            >
              Unknown
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 pb-24 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center p-10 text-gray-500 text-sm">No exercises found for this filter.</div>
          ) : (
            filtered.map(ex => {
              const m = getMuscle(ex.meta.muscleGroup);
              const lastStr = ex.lastDone ? `Last: ${new Date(ex.lastDone.date).toLocaleDateString()}` : 'Never performed';
              return (
                <div 
                  key={ex.name} 
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => {
                    setSelectedArchiveEx(ex.name);
                    setExFormMuscle(ex.meta.muscleGroup);
                    setExFormUrl(ex.meta.videoUrl || '');
                    setExFormNotes(ex.meta.formNotes || '');
                  }}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-[1.05rem] text-white mb-1">{ex.name}</div>
                    <div className="flex gap-2 text-xs text-gray-500 items-center">
                      <span style={{ color: m.color, background: `${m.color}22` }} className="px-1.5 py-0.5 rounded">{m.label}</span>
                      <span>•</span>
                      <span>{lastStr}</span>
                    </div>
                  </div>
                  <div className="text-gray-500 text-xl">›</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ==== MAIN MENU ====
  function renderMenu() {
    return (
      <div className="pt-2">
        <div className="mb-3 bg-white/5 border rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors flex items-center" style={{ borderColor: 'var(--sk-accent)' }} onClick={() => setActiveWidget('planner')}>
          <div className="mr-4" style={{ color: 'var(--sk-accent)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="26" height="26">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-white">Workout Split Planner</div>
            <div className="text-sm text-gray-400">Configure your weekly training schedule</div>
          </div>
          <div className="text-gray-500 text-2xl">›</div>
        </div>

        <div className="mb-3 bg-white/5 border rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors flex items-center" style={{ borderColor: 'var(--sk-accent)' }} onClick={() => setActiveWidget('archive')}>
          <div className="mr-4" style={{ color: 'var(--sk-accent)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="26" height="26">
              <path d="M4 6h16M4 12h16M4 18h7"></path>
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-white">Workout Archive</div>
            <div className="text-sm text-gray-400">Exercise database and form tracking</div>
          </div>
          <div className="text-gray-500 text-2xl">›</div>
        </div>

        <div className="text-center p-10 text-gray-500 text-sm opacity-50">
          More widgets coming soon.
        </div>
      </div>
    );
  }

  if (!macro) return null;
  const headerTitle = activeWidget === 'planner' ? 'WEEKLY SPLIT' : (activeWidget === 'archive' ? 'ARCHIVE' : 'WIDGETS');

  return (
    <div className="fixed inset-0 z-[200] bg-[#111113] flex flex-col" style={{ '--sk-accent': macro.accentColor }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0 bg-[#111113]">
        <button 
          className="text-gray-400 hover:text-white px-2 py-1"
          onClick={() => {
            if (activeWidget) setActiveWidget(null);
            else onClose();
          }}
        >
          ← Back
        </button>
        <div className="flex items-center gap-2 pr-4">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--sk-accent)', boxShadow: '0 0 10px var(--sk-accent)' }}></div>
          <span className="font-display text-[0.85rem] tracking-[0.12em]" style={{ color: 'var(--sk-accent)' }}>{macro.name}</span>
          <span className="font-display text-[0.65rem] tracking-[0.18em] text-gray-500">/ {headerTitle}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-[800px] w-full mx-auto relative">
        {activeWidget === 'planner' ? renderPlanner() : (activeWidget === 'archive' ? renderArchive() : renderMenu())}
      </div>
    </div>
  );
}
