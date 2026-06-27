// LIFEMAXX — Workout Executor
window.LM.views.workout = (function () {
  var S = window.LM.store;
  var F = window.LM.formulas;

  var questId = null;
  var restInterval = null;
  var restRemaining = 0;
  var restTotal = 0;
  var restEndTime = 0;

  var MUSCLES = [
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

  function getMuscle(id) { return MUSCLES.find(function(m){ return m.id === id; }) || { id: id, label: id, color: '#888' }; }

  function render(qId) {
    questId = qId;
    var quest = S.getQuest(questId);
    if (!quest) return '<div class="view-error">Workout not found.</div>';

    // Get the macro for styling (targetSkills[0].macroSkillId)
    var macroId = quest.targetSkills && quest.targetSkills.length > 0 ? quest.targetSkills[0].macroSkillId : null;
    var macro = macroId ? S.getMacro(macroId) : null;
    var accent = macro ? macro.accentColor : 'var(--accent)';

    return '<div class="widget-canvas-view workout-view" style="--sk-accent:' + accent + ';">' +
      '<div class="widget-canvas-header">' +
        '<button class="btn-back" onclick="LM.router.navigate(\'#dashboard\')">← Dashboard</button>' +
        '<div class="widget-canvas-title-row">' +
          '<div style="width:9px;height:9px;border-radius:50%;background:var(--sk-accent);box-shadow:0 0 10px var(--sk-accent);flex-shrink:0;"></div>' +
          '<span class="font-display" style="font-size:0.85rem;letter-spacing:0.12em;color:var(--sk-accent);">' + (macro ? macro.name : 'WORKOUT') + '</span>' +
          '<span class="font-display" style="font-size:0.65rem;letter-spacing:0.18em;color:var(--text-3);">/ EXECUTOR</span>' +
        '</div>' +
      '</div>' +
      '<div id="workout-body" class="workout-body">' + renderWorkout(quest) + '</div>' +
    '</div>';
  }

  function renderWorkout(quest) {
    var workout = quest.workout || { exercises: [] };
    var exercises = workout.exercises || [];

    var allDone = exercises.length > 0 && exercises.every(function(ex) {
      return (ex.completedSets || []).every(function(s){ return s === true; });
    });

    var exCards = exercises.map(function(ex, i) {
      return renderExerciseCard(ex, i);
    }).join('');

    var finishBtn = allDone
      ? '<button class="workout-finish-btn" onclick="LM.views.workout.finishWorkout()">' +
          '<span class="finish-icon">✦</span> FINISH WORKOUT &amp; CLAIM XP <span class="finish-icon">✦</span>' +
        '</button>'
      : '';

    return '<div class="workout-active">' +
      '<div class="workout-active-header">' +
        '<div class="workout-quest-title font-display" style="font-size:1.4rem;">' + quest.name + '</div>' +
        '<div class="workout-progress-label font-display">' + getProgressLabel(exercises) + '</div>' +
      '</div>' +

      // Rest timer
      '<div id="rest-timer-panel" class="rest-timer-panel" style="display:none;">' +
        '<div class="rest-timer-ring-wrap">' +
          '<svg class="rest-timer-svg" viewBox="0 0 120 120">' +
            '<circle class="rest-ring-bg" cx="60" cy="60" r="52" fill="none" stroke="var(--border)" stroke-width="4"/>' +
            '<circle id="rest-ring-fg" class="rest-ring-fg" cx="60" cy="60" r="52" fill="none" stroke="var(--sk-accent)" stroke-width="4" stroke-linecap="round" stroke-dasharray="326.73" stroke-dashoffset="0" transform="rotate(-90 60 60)"/>' +
          '</svg>' +
          '<div class="rest-timer-text">' +
            '<span id="rest-timer-time" class="font-display rest-time-digits">0:00</span>' +
            '<span class="rest-time-label">REST</span>' +
          '</div>' +
        '</div>' +
        '<button class="btn-ghost btn-sm" onclick="LM.views.workout.skipRest()">Skip</button>' +
      '</div>' +

      // Exercises
      '<div class="workout-exercises">' + exCards + '</div>' +
      finishBtn +
    '</div>';
  }

  function renderExerciseCard(ex, idx) {
    var m = getMuscle(ex.muscleGroup);
    var sets = ex.completedSets || [];
    var doneCount = sets.filter(function(s){ return s; }).length;
    var allSetsDone = sets.length > 0 && doneCount === sets.length;

    var lastLog = S.getLastWorkoutLog(ex.name);
    var lastLogHtml = lastLog 
      ? '<div style="font-size:0.75rem; color:var(--text-2); margin-top:4px; font-weight:500;">Last: ' + lastLog.sets.map(function(s){ return s.weight + 'x' + s.reps; }).join(', ') + '</div>'
      : '';

    if (!ex.loggedSets) {
      ex.loggedSets = [];
      for(var i=0; i<sets.length; i++) ex.loggedSets.push({ reps: '', weight: '' });
    }

    var setRows = sets.map(function(done, si) {
      var log = ex.loggedSets[si] || { reps: '', weight: '' };
      var cls = done ? 'wo-set-row-item done' : 'wo-set-row-item';
      var checkColor = done ? 'var(--sk-accent)' : 'var(--bg-3)';
      var checkIconColor = done ? '#000' : 'var(--text-2)';
      return '<div class="' + cls + '" style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">' +
        '<div style="width: 24px; text-align:center; color:var(--text-3); font-weight:bold; font-size:0.85rem;">' + (si+1) + '</div>' +
        '<input type="number" class="form-input" placeholder="Reps" value="' + log.reps + '" style="flex:1; padding:6px; text-align:center; height:36px; font-size:0.9rem;" onchange="LM.views.workout.updateSetLog(' + idx + ', ' + si + ', \'reps\', this.value)" ' + (done?'disabled':'') + '>' +
        '<input type="number" class="form-input" placeholder="Lbs/Kg" value="' + log.weight + '" style="flex:1; padding:6px; text-align:center; height:36px; font-size:0.9rem;" onchange="LM.views.workout.updateSetLog(' + idx + ', ' + si + ', \'weight\', this.value)" ' + (done?'disabled':'') + '>' +
        '<button style="padding:0; width:40px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:8px; border:none; background:' + checkColor + '; color:' + checkIconColor + '; cursor:pointer; transition:0.2s;" onclick="LM.views.workout.toggleSet(' + idx + ', ' + si + ')">' +
          '<span class="material-symbols-outlined" style="font-size:1.2rem;">' + (done ? 'check_circle' : 'check') + '</span>' +
        '</button>' +
      '</div>';
    }).join('');

    var cardClass = 'wo-exercise-card' + (allSetsDone ? ' wo-exercise-done' : '');

    return '<div class="' + cardClass + '">' +
      '<div class="wo-ex-header">' +
        '<div class="wo-ex-info">' +
          '<span class="wo-ex-name">' + ex.name + '</span>' +
          '<span class="wo-muscle-badge" style="background:' + m.color + '22;color:' + m.color + ';border-color:' + m.color + '44;">' + m.label + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="wo-ex-meta" style="flex-direction:column; align-items:flex-start; gap:2px;">' +
        '<div style="display:flex; gap:8px;">' +
          '<span class="wo-meta-tag">' + sets.length + ' × ' + (ex.repRange || '?') + '</span>' +
          '<span class="wo-meta-tag">Rest: ' + formatRestTime(ex.restSeconds || 60) + '</span>' +
        '</div>' +
        lastLogHtml + 
      '</div>' +
      '<div class="wo-set-list" style="margin-top:16px;">' + setRows + '</div>' +
    '</div>';
  }

  function getProgressLabel(exercises) {
    if (exercises.length === 0) return '';
    var total = 0, done = 0;
    exercises.forEach(function(ex) {
      var s = ex.completedSets || [];
      total += s.length;
      done += s.filter(function(v){ return v; }).length;
    });
    if (total === 0) return '';
    return done + '/' + total + ' sets';
  }

  function formatRestTime(sec) {
    if (sec < 60) return sec + 's';
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return s > 0 ? m + 'm ' + s + 's' : m + 'min';
  }

  function toggleSet(exIdx, setIdx) {
    var quest = S.getQuest(questId);
    if (!quest || !quest.workout) return;
    var ex = quest.workout.exercises[exIdx];
    if (!ex) return;

    var firstUnchecked = ex.completedSets.indexOf(false);
    if (firstUnchecked === -1) return; 
    if (setIdx !== firstUnchecked) {
      if (setIdx === firstUnchecked - 1 && ex.completedSets[setIdx]) {
        ex.completedSets[setIdx] = false;
        S.upsertQuest(quest);
        refresh();
        return;
      }
      return; 
    }

    ex.completedSets[setIdx] = true;
    S.upsertQuest(quest);

    var nextUnchecked = ex.completedSets.indexOf(false);
    var needsRest = nextUnchecked !== -1;
    var restSec = ex.restSeconds || 60;

    var allDone = quest.workout.exercises.every(function(e) {
      return (e.completedSets || []).every(function(s){ return s === true; });
    });

    refresh();

    if (needsRest) {
      startRestTimer(restSec);
    }

    if (allDone) {
      LM.components.notifications.show('All exercises complete! Claim your XP.', 'success');
    }
  }

  function finishWorkout() {
    if (!questId) return;
    var quest = S.getQuest(questId);
    if (!quest || !quest.workout) return;

    // Log the workout history!
    quest.workout.exercises.forEach(function(ex) {
      var completedLogs = [];
      ex.completedSets.forEach(function(done, i) {
        if (done && ex.loggedSets && ex.loggedSets[i]) {
          completedLogs.push({
            reps: Number(ex.loggedSets[i].reps) || 0,
            weight: Number(ex.loggedSets[i].weight) || 0
          });
        }
      });
      if (completedLogs.length > 0) {
        S.addWorkoutLog(ex.name, completedLogs);
      }
    });

    var result = S.completeQuest(questId);
    if (result) {
      LM.components.notifications.show('Workout complete! +' + F.formatXP(result.adjustedTargets.reduce(function(s,t){ return s + t.xpAmount; }, 0)) + ' XP', 'xp');
      stopRestTimer();
      LM.router.navigate('#dashboard');
    }
  }

  function updateSetLog(exIdx, setIdx, field, value) {
    var quest = S.getQuest(questId);
    if (!quest || !quest.workout) return;
    var ex = quest.workout.exercises[exIdx];
    if (!ex) return;
    if (!ex.loggedSets) {
      ex.loggedSets = [];
      for(var i=0; i<ex.completedSets.length; i++) ex.loggedSets.push({ reps: '', weight: '' });
    }
    ex.loggedSets[setIdx][field] = value;
    S.upsertQuest(quest);
  }

  // ══════════════════════════════════════
  //  REST TIMER
  // ══════════════════════════════════════
  function startRestTimer(seconds) {
    stopRestTimer();
    restTotal = seconds;
    restEndTime = Date.now() + (seconds * 1000);
    restRemaining = seconds;

    var panel = document.getElementById('rest-timer-panel');
    if (panel) panel.style.display = 'flex';

    updateTimerDisplay();
    restInterval = setInterval(function() {
      var now = Date.now();
      restRemaining = Math.ceil((restEndTime - now) / 1000);
      if (restRemaining <= 0) {
        stopRestTimer();
        LM.components.notifications.show('Rest over — next set!', 'info');
        // Vibrate if supported
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        return;
      }
      updateTimerDisplay();
    }, 250);
  }

  function updateTimerDisplay() {
    var timeEl = document.getElementById('rest-timer-time');
    var ringEl = document.getElementById('rest-ring-fg');
    if (!timeEl || !ringEl) return;

    var display = Math.max(0, restRemaining);
    var min = Math.floor(display / 60);
    var sec = display % 60;
    timeEl.textContent = min + ':' + (sec < 10 ? '0' : '') + sec;

    var circ = 326.73;
    var progress = restTotal > 0 ? Math.max(0, restRemaining) / restTotal : 0;
    ringEl.setAttribute('stroke-dashoffset', circ * (1 - progress));
  }

  function stopRestTimer() {
    if (restInterval) { clearInterval(restInterval); restInterval = null; }
    restRemaining = 0;
    restEndTime = 0;
    var panel = document.getElementById('rest-timer-panel');
    if (panel) panel.style.display = 'none';
  }

  function skipRest() {
    stopRestTimer();
  }

  function refresh() {
    var quest = S.getQuest(questId);
    var body = document.getElementById('workout-body');
    if (body && quest) body.innerHTML = renderWorkout(quest);
  }

  function init(qId) {
    questId = qId;
    stopRestTimer();
  }

  return {
    render: render,
    init: init,
    toggleSet: toggleSet,
    updateSetLog: updateSetLog,
    finishWorkout: finishWorkout,
    skipRest: skipRest
  };
})();
