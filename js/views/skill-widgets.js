// LIFEMAXX — Workout Helper Widget
window.LM.views.skillWidgets = (function () {
  var S = window.LM.store;
  var F = window.LM.formulas;

  var macroId = null;
  var selectedQuestId = null;
  var restInterval = null;
  var restRemaining = 0;
  var restTotal = 0;

  var MUSCLES = [
    { id: 'back',       label: 'Back',       color: '#4ade80' },
    { id: 'rear-delt',  label: 'Rear Delt',  color: '#f472b6' },
    { id: 'side-delt',  label: 'Side Delt',  color: '#fb923c' },
    { id: 'bicep',      label: 'Bicep',      color: '#60a5fa' },
    { id: 'tricep',     label: 'Tricep',     color: '#a78bfa' },
    { id: 'brachialis', label: 'Brachialis', color: '#fbbf24' },
    { id: 'lats',       label: 'Lats',       color: '#2dd4bf' }
  ];

  function getMuscle(id) { return MUSCLES.find(function(m){ return m.id === id; }) || { id: id, label: id, color: '#888' }; }

  function getActiveQuests() {
    return S.getQuests().filter(function(q) {
      return q.status === 'active' && !q.isReadyToClaim &&
        (q.targetSkills || []).some(function(t){ return t.macroSkillId === macroId; });
    });
  }

  function isPhysique(macro) {
    return macro && macro.name.toLowerCase() === 'physique';
  }

  // ══════════════════════════════════════
  //  RENDER — Main Entry
  // ══════════════════════════════════════
  function render(mId) {
    macroId = mId;
    var macro = S.getMacro(macroId);
    if (!macro) return '<div class="view-error">Skill not found.</div>';

    if (!isPhysique(macro)) {
      return renderPlaceholder(macro);
    }

    return '<div class="widget-canvas-view workout-view" style="--sk-accent:' + macro.accentColor + ';">' +
      '<div class="widget-canvas-header">' +
        '<button class="btn-back" onclick="LM.router.navigate(\'#skill-hub/' + macroId + '\')">← Back</button>' +
        '<div class="widget-canvas-title-row">' +
          '<div style="width:9px;height:9px;border-radius:50%;background:' + macro.accentColor + ';box-shadow:0 0 10px ' + macro.accentColor + ';flex-shrink:0;"></div>' +
          '<span class="font-display" style="font-size:0.85rem;letter-spacing:0.12em;color:' + macro.accentColor + ';">' + macro.name + '</span>' +
          '<span class="font-display" style="font-size:0.65rem;letter-spacing:0.18em;color:var(--text-3);">/ WORKOUT HELPER</span>' +
        '</div>' +
      '</div>' +
      '<div id="workout-body" class="workout-body">' + renderBody(macro) + '</div>' +
    '</div>';
  }

  function renderPlaceholder(macro) {
    return '<div class="widget-canvas-view" style="--sk-accent:' + macro.accentColor + ';">' +
      '<div class="widget-canvas-header">' +
        '<button class="btn-back" onclick="LM.router.navigate(\'#skill-hub/' + macroId + '\')">← Back</button>' +
        '<div class="widget-canvas-title-row">' +
          '<div style="width:9px;height:9px;border-radius:50%;background:' + macro.accentColor + ';box-shadow:0 0 10px ' + macro.accentColor + ';flex-shrink:0;"></div>' +
          '<span class="font-display" style="font-size:0.85rem;letter-spacing:0.12em;color:' + macro.accentColor + ';">' + macro.name + '</span>' +
          '<span class="font-display" style="font-size:0.65rem;letter-spacing:0.18em;color:var(--text-3);">/ WIDGETS</span>' +
        '</div>' +
      '</div>' +
      '<div class="widget-canvas-body">' +
        '<div class="widget-canvas-empty">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="' + macro.accentColor + '" stroke-width="0.8" width="72" height="72" style="opacity:0.25;">' +
            '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>' +
            '<rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>' +
          '</svg>' +
          '<p class="font-display widget-canvas-empty-label">WIDGETS COMING SOON</p>' +
          '<p class="widget-canvas-empty-sub">Custom tracking widgets for ' + macro.name + ' will live here.</p>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ══════════════════════════════════════
  //  BODY — Quest Select or Workout
  // ══════════════════════════════════════
  function renderBody(macro) {
    var quests = getActiveQuests();
    if (quests.length === 0) {
      return '<div class="widget-canvas-body">' +
        '<div class="widget-canvas-empty">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="' + macro.accentColor + '" stroke-width="1" width="64" height="64" style="opacity:0.3;">' +
            '<path d="M6 4v16M18 4v16M6 12h12M3 7h6M15 7h6M3 17h6M15 17h6"/>' +
          '</svg>' +
          '<p class="font-display widget-canvas-empty-label">NO ACTIVE QUESTS</p>' +
          '<p class="widget-canvas-empty-sub">Create a quest targeting ' + macro.name + ' first, then come back to plan your workout.</p>' +
        '</div>' +
      '</div>';
    }
    if (!selectedQuestId) return renderQuestSelector(quests, macro);
    var quest = S.getQuest(selectedQuestId);
    if (!quest || quest.status !== 'active') { selectedQuestId = null; return renderBody(macro); }
    return renderWorkout(quest, macro);
  }

  // ══════════════════════════════════════
  //  QUEST SELECTOR
  // ══════════════════════════════════════
  function renderQuestSelector(quests, macro) {
    var cards = quests.map(function(q) {
      var totalXP = (q.targetSkills || []).reduce(function(s, t){ return s + t.xpAmount; }, 0);
      var workout = q.workout || { exercises: [] };
      var exCount = workout.exercises ? workout.exercises.length : 0;
      var resumeBadge = exCount > 0
        ? '<span class="wq-resume">' + exCount + ' exercise' + (exCount > 1 ? 's' : '') + ' saved</span>'
        : '';
      return '<button class="workout-quest-card" onclick="LM.views.skillWidgets.selectQuest(\'' + q.id + '\')">' +
        '<div class="wq-left">' +
          '<div class="wq-name">' + q.name + '</div>' +
          '<div class="wq-xp">' + F.formatXP(totalXP) + ' XP on completion</div>' +
        '</div>' +
        '<div class="wq-right">' +
          resumeBadge +
          '<span class="wq-arrow">›</span>' +
        '</div>' +
      '</button>';
    }).join('');

    return '<div class="workout-selector">' +
      '<div class="workout-selector-icon">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="var(--sk-accent)" stroke-width="1.2" width="56" height="56" style="opacity:0.5;">' +
          '<path d="M6 4v16M18 4v16M6 12h12M3 7h6M15 7h6M3 17h6M15 17h6"/>' +
        '</svg>' +
      '</div>' +
      '<h2 class="font-display workout-selector-title">SELECT A QUEST</h2>' +
      '<p class="workout-selector-sub">Choose a quest to build your workout routine</p>' +
      '<div class="workout-quest-list">' + cards + '</div>' +
    '</div>';
  }

  // ══════════════════════════════════════
  //  WORKOUT — Exercise list + add form
  // ══════════════════════════════════════
  function renderWorkout(quest, macro) {
    var workout = quest.workout || { exercises: [] };
    var exercises = workout.exercises || [];

    var allDone = exercises.length > 0 && exercises.every(function(ex) {
      return (ex.completedSets || []).every(function(s){ return s === true; });
    });

    var exCards = exercises.map(function(ex, i) {
      return renderExerciseCard(ex, i, macro);
    }).join('');

    var finishBtn = allDone
      ? '<button class="workout-finish-btn" onclick="LM.views.skillWidgets.finishWorkout()">' +
          '<span class="finish-icon">✦</span> FINISH WORKOUT &amp; CLAIM XP <span class="finish-icon">✦</span>' +
        '</button>'
      : '';

    return '<div class="workout-active">' +
      '<div class="workout-active-header">' +
        '<button class="btn-back workout-back-btn" onclick="LM.views.skillWidgets.deselectQuest()">← Quests</button>' +
        '<div class="workout-quest-title font-display">' + quest.name + '</div>' +
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
        '<button class="btn-ghost btn-sm" onclick="LM.views.skillWidgets.skipRest()">Skip</button>' +
      '</div>' +

      // Exercises
      '<div class="workout-exercises">' + exCards + '</div>' +

      // Add exercise form
      '<div id="wo-add-form" class="wo-add-form" style="display:none;">' +
        '<div class="wo-add-header">' +
          '<span class="font-display" style="font-size:0.82rem;letter-spacing:0.08em;">NEW EXERCISE</span>' +
          '<button class="btn-icon" onclick="LM.views.skillWidgets.hideAddForm()">✕</button>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Exercise Name</label>' +
          '<input id="wo-ex-name" class="form-input" placeholder="e.g. Barbell Curl" />' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Muscle Group</label>' +
          '<div id="wo-muscle-pills" class="wo-muscle-pills">' +
            MUSCLES.map(function(m) {
              return '<button type="button" class="wo-muscle-pill" data-muscle="' + m.id + '" ' +
                'style="--pill-color:' + m.color + ';" ' +
                'onclick="LM.views.skillWidgets.toggleMuscle(this)">' + m.label + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="form-row" style="gap:10px;">' +
          '<div class="form-group" style="flex:1;">' +
            '<label>Sets</label>' +
            '<input id="wo-ex-sets" class="form-input" type="number" min="1" max="20" value="3" />' +
          '</div>' +
          '<div class="form-group" style="flex:1;">' +
            '<label>Rep Range</label>' +
            '<input id="wo-ex-reps" class="form-input" placeholder="e.g. 8-12" />' +
          '</div>' +
          '<div class="form-group" style="flex:1;">' +
            '<label>Rest (sec)</label>' +
            '<select id="wo-ex-rest" class="form-input">' +
              '<option value="30">30s</option>' +
              '<option value="60" selected>60s</option>' +
              '<option value="90">90s</option>' +
              '<option value="120">2min</option>' +
              '<option value="180">3min</option>' +
              '<option value="240">4min</option>' +
              '<option value="300">5min</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="LM.views.skillWidgets.addExercise()">Add Exercise</button>' +
      '</div>' +

      // Add button
      '<button class="workout-add-btn" id="wo-add-btn" onclick="LM.views.skillWidgets.showAddForm()">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M12 5v14M5 12h14"/></svg>' +
        ' Add Exercise' +
      '</button>' +

      finishBtn +
    '</div>';
  }

  // ── Single exercise card ──
  function renderExerciseCard(ex, idx, macro) {
    var m = getMuscle(ex.muscleGroup);
    var sets = ex.completedSets || [];
    var doneCount = sets.filter(function(s){ return s; }).length;
    var allSetsDone = sets.length > 0 && doneCount === sets.length;

    var setBubbles = sets.map(function(done, si) {
      var cls = done ? 'wo-set-bubble wo-set-done' : 'wo-set-bubble';
      return '<button class="' + cls + '" onclick="LM.views.skillWidgets.toggleSet(' + idx + ',' + si + ')">' +
        (done ? '✓' : (si + 1)) +
      '</button>';
    }).join('');

    var cardClass = 'wo-exercise-card' + (allSetsDone ? ' wo-exercise-done' : '');

    return '<div class="' + cardClass + '">' +
      '<div class="wo-ex-header">' +
        '<div class="wo-ex-info">' +
          '<span class="wo-ex-name">' + ex.name + '</span>' +
          '<span class="wo-muscle-badge" style="background:' + m.color + '22;color:' + m.color + ';border-color:' + m.color + '44;">' + m.label + '</span>' +
        '</div>' +
        '<button class="btn-icon danger" onclick="LM.views.skillWidgets.removeExercise(' + idx + ')" title="Delete">✕</button>' +
      '</div>' +
      '<div class="wo-ex-meta">' +
        '<span class="wo-meta-tag">' + sets.length + ' × ' + (ex.repRange || '?') + '</span>' +
        '<span class="wo-meta-tag">Rest: ' + formatRestTime(ex.restSeconds || 60) + '</span>' +
        '<span class="wo-meta-tag">' + doneCount + '/' + sets.length + ' sets</span>' +
      '</div>' +
      '<div class="wo-set-row">' + setBubbles + '</div>' +
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

  // ══════════════════════════════════════
  //  ACTIONS
  // ══════════════════════════════════════
  function selectQuest(qId) {
    selectedQuestId = qId;
    refresh();
  }

  function deselectQuest() {
    selectedQuestId = null;
    stopRestTimer();
    refresh();
  }

  function showAddFormFn() {
    var form = document.getElementById('wo-add-form');
    var btn = document.getElementById('wo-add-btn');
    if (form) form.style.display = 'block';
    if (btn) btn.style.display = 'none';
  }

  function hideAddFormFn() {
    var form = document.getElementById('wo-add-form');
    var btn = document.getElementById('wo-add-btn');
    if (form) form.style.display = 'none';
    if (btn) btn.style.display = '';
  }

  function addExercise() {
    var nameEl = document.getElementById('wo-ex-name');
    var setsEl = document.getElementById('wo-ex-sets');
    var repsEl = document.getElementById('wo-ex-reps');
    var restEl = document.getElementById('wo-ex-rest');
    if (!nameEl || !nameEl.value.trim()) {
      LM.components.notifications.toast('Enter an exercise name', 'warning');
      return;
    }
    var numSets = parseInt(setsEl.value) || 3;
    if (numSets < 1) numSets = 1;
    if (numSets > 20) numSets = 20;

    // Get selected muscle
    var selectedPill = document.querySelector('.wo-muscle-pill.active');
    var muscleGroup = selectedPill ? selectedPill.dataset.muscle : 'back';

    var exercise = {
      id: S.uid(),
      name: nameEl.value.trim(),
      muscleGroup: muscleGroup,
      sets: numSets,
      repRange: repsEl.value.trim() || '8-12',
      restSeconds: parseInt(restEl.value) || 60,
      completedSets: []
    };
    for (var i = 0; i < numSets; i++) exercise.completedSets.push(false);

    // Save to quest
    var quest = S.getQuest(selectedQuestId);
    if (!quest) return;
    if (!quest.workout) quest.workout = { exercises: [] };
    quest.workout.exercises.push(exercise);
    S.upsertQuest(quest);
    refresh();
  }

  function removeExercise(idx) {
    var quest = S.getQuest(selectedQuestId);
    if (!quest || !quest.workout) return;
    quest.workout.exercises.splice(idx, 1);
    S.upsertQuest(quest);
    refresh();
  }

  function toggleMuscle(el) {
    // Single select — deactivate all, activate clicked
    var pills = document.querySelectorAll('.wo-muscle-pill');
    pills.forEach(function(p){ p.classList.remove('active'); });
    el.classList.add('active');
  }

  function toggleSet(exIdx, setIdx) {
    var quest = S.getQuest(selectedQuestId);
    if (!quest || !quest.workout) return;
    var ex = quest.workout.exercises[exIdx];
    if (!ex) return;

    // Only allow checking the NEXT unchecked set in order
    var firstUnchecked = ex.completedSets.indexOf(false);
    if (firstUnchecked === -1) return; // all done
    if (setIdx !== firstUnchecked) {
      // Allow unchecking the last checked set
      if (setIdx === firstUnchecked - 1 && ex.completedSets[setIdx]) {
        ex.completedSets[setIdx] = false;
        S.upsertQuest(quest);
        refresh();
        return;
      }
      return; // can't skip sets
    }

    ex.completedSets[setIdx] = true;
    S.upsertQuest(quest);

    // Check if this was NOT the last set → start rest timer
    var nextUnchecked = ex.completedSets.indexOf(false);
    if (nextUnchecked !== -1) {
      startRestTimer(ex.restSeconds || 60);
    }

    // Check if ALL exercises are fully done
    var allDone = quest.workout.exercises.every(function(e) {
      return (e.completedSets || []).every(function(s){ return s === true; });
    });

    refresh();

    if (allDone) {
      LM.components.notifications.toast('All exercises complete! Claim your XP.', 'success');
    }
  }

  function finishWorkout() {
    if (!selectedQuestId) return;
    var result = S.completeQuest(selectedQuestId);
    if (result) {
      LM.components.notifications.toast('Workout complete! +' + F.formatXP(result.adjustedTargets.reduce(function(s,t){ return s + t.xpAmount; }, 0)) + ' XP', 'xp');
      // Trigger boss overlay
      var overlay = document.getElementById('boss-overlay');
      var nameEl = document.getElementById('boss-quest-name');
      var xpList = document.getElementById('boss-xp-list');
      if (overlay && nameEl) {
        nameEl.textContent = result.quest.name;
        if (xpList) {
          var macros = S.getMacros();
          xpList.innerHTML = result.adjustedTargets.map(function(t) {
            var m = macros.find(function(x){ return x.id === t.macroSkillId; });
            return '<div class="boss-xp-row" style="color:' + (m ? m.accentColor : 'var(--accent)') + ';">+' + t.xpAmount + ' XP → ' + (m ? m.name : '???') + '</div>';
          }).join('');
        }
        overlay.classList.add('active');
        LM.components.wheel.spawnParticles();
      }
      selectedQuestId = null;
      stopRestTimer();
      // Re-render after a delay (boss overlay is on screen)
      setTimeout(function() { LM.router.render(); }, 300);
    }
  }

  // ══════════════════════════════════════
  //  REST TIMER
  // ══════════════════════════════════════
  function startRestTimer(seconds) {
    stopRestTimer();
    restTotal = seconds;
    restRemaining = seconds;

    var panel = document.getElementById('rest-timer-panel');
    if (panel) panel.style.display = 'flex';

    updateTimerDisplay();
    restInterval = setInterval(function() {
      restRemaining--;
      if (restRemaining <= 0) {
        stopRestTimer();
        LM.components.notifications.toast('Rest over — next set!', 'info');
        return;
      }
      updateTimerDisplay();
    }, 1000);
  }

  function updateTimerDisplay() {
    var timeEl = document.getElementById('rest-timer-time');
    var ringEl = document.getElementById('rest-ring-fg');
    if (!timeEl || !ringEl) return;

    var min = Math.floor(restRemaining / 60);
    var sec = restRemaining % 60;
    timeEl.textContent = min + ':' + (sec < 10 ? '0' : '') + sec;

    // SVG circle: circumference = 2 * PI * 52 ≈ 326.73
    var circ = 326.73;
    var progress = restTotal > 0 ? restRemaining / restTotal : 0;
    ringEl.setAttribute('stroke-dashoffset', circ * (1 - progress));
  }

  function stopRestTimer() {
    if (restInterval) { clearInterval(restInterval); restInterval = null; }
    restRemaining = 0;
    var panel = document.getElementById('rest-timer-panel');
    if (panel) panel.style.display = 'none';
  }

  function skipRest() {
    stopRestTimer();
  }

  // ── Refresh helper ──
  function refresh() {
    var macro = S.getMacro(macroId);
    var body = document.getElementById('workout-body');
    if (body && macro) body.innerHTML = renderBody(macro);
  }

  // ── Init ──
  function init(mId) {
    macroId = mId;
    selectedQuestId = null;
    stopRestTimer();
  }

  return {
    render: render,
    init: init,
    selectQuest: selectQuest,
    deselectQuest: deselectQuest,
    showAddForm: showAddFormFn,
    hideAddForm: hideAddFormFn,
    addExercise: addExercise,
    removeExercise: removeExercise,
    toggleMuscle: toggleMuscle,
    toggleSet: toggleSet,
    finishWorkout: finishWorkout,
    skipRest: skipRest
  };
})();
