// LIFEMAXX — Weekly Split Planner
window.LM.views.skillWidgets = (function () {
  var S = window.LM.store;
  var F = window.LM.formulas;

  var macroId = null;
  var selectedDay = new Date().getDay(); // 0 = Sun, 1 = Mon...
  var tempSplit = null; // Used to hold edits before saving
  var isAddingExercise = false;

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

  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function getMuscle(id) { return MUSCLES.find(function(m){ return m.id === id; }) || { id: id, label: id, color: '#888' }; }

  var PHYSIQUE_NAMES = ['physique', 'corpus', 'forge', 'brawn', 'titan'];
  function isPhysique(macro) {
    if (!macro) return false;
    if (PHYSIQUE_NAMES.indexOf(macro.name.toLowerCase()) !== -1) return true;
    if (macro.accentColor === '#ef4444') return true;
    return false;
  }

  function render(mId) {
    macroId = mId;
    var macro = S.getMacro(macroId);
    if (!macro) return '<div class="view-error">Skill not found.</div>';

    if (!isPhysique(macro)) {
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
            '<p class="font-display widget-canvas-empty-label">WIDGETS COMING SOON</p>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    if (!tempSplit) {
      tempSplit = JSON.parse(JSON.stringify(S.getWeeklySplit()));
    }

    return '<div class="widget-canvas-view workout-view" style="--sk-accent:' + macro.accentColor + ';">' +
      '<div class="widget-canvas-header">' +
        '<button class="btn-back" onclick="LM.router.navigate(\'#skill-hub/' + macroId + '\')">← Back</button>' +
        '<div class="widget-canvas-title-row">' +
          '<div style="width:9px;height:9px;border-radius:50%;background:' + macro.accentColor + ';box-shadow:0 0 10px ' + macro.accentColor + ';flex-shrink:0;"></div>' +
          '<span class="font-display" style="font-size:0.85rem;letter-spacing:0.12em;color:' + macro.accentColor + ';">' + macro.name + '</span>' +
          '<span class="font-display" style="font-size:0.65rem;letter-spacing:0.18em;color:var(--text-3);">/ WEEKLY SPLIT</span>' +
        '</div>' +
      '</div>' +
      '<div id="workout-body" class="workout-body">' + renderPlanner() + '</div>' +
    '</div>';
  }

  function renderPlanner() {
    var dayTabs = DAYS.map(function(d, i) {
      var activeCls = selectedDay === i ? 'active' : '';
      var config = tempSplit[i];
      var hasWorkout = config.isActive && config.exercises.length > 0;
      var indicator = hasWorkout ? '<div style="width:4px;height:4px;border-radius:50%;background:var(--sk-accent);margin:2px auto 0;"></div>' : '<div style="width:4px;height:4px;margin:2px auto 0;"></div>';
      return '<button class="tpl-day-btn ' + activeCls + '" style="flex:1;padding:8px 0;font-size:0.8rem;" onclick="LM.views.skillWidgets.selectDay(' + i + ')">' + d + indicator + '</button>';
    }).join('');

    var config = tempSplit[selectedDay];
    
    // Day Config Form
    var configHtml = '';
    
    if (!config.isActive) {
      configHtml = '<div class="widget-canvas-empty" style="margin-top:20px;">' +
        '<p class="font-display widget-canvas-empty-label">REST DAY</p>' +
        '<p class="widget-canvas-empty-sub">No workout scheduled for ' + DAYS[selectedDay] + 's.</p>' +
        '<button class="btn btn-primary" style="margin-top:16px;" onclick="LM.views.skillWidgets.toggleDayActive(true)">Set as Workout Day</button>' +
      '</div>';
    } else {
      var exercisesHtml = '';
      if (config.exercises.length === 0) {
        exercisesHtml = '<div style="text-align:center;padding:20px;color:var(--text-3);font-size:0.85rem;background:rgba(255,255,255,0.02);border-radius:8px;border:1px dashed var(--border);margin-bottom:16px;">No exercises added yet.</div>';
      } else {
        exercisesHtml = config.exercises.map(function(ex, idx) {
          var m = getMuscle(ex.muscleGroup);
          return '<div class="wo-exercise-card" style="margin-bottom:12px;">' +
            '<div class="wo-ex-header">' +
              '<div class="wo-ex-info">' +
                '<span class="wo-ex-name">' + ex.name + '</span>' +
                '<span class="wo-muscle-badge" style="background:' + m.color + '22;color:' + m.color + ';border-color:' + m.color + '44;">' + m.label + '</span>' +
              '</div>' +
              '<button class="btn-icon danger" onclick="LM.views.skillWidgets.removeExercise(' + idx + ')" title="Delete">✕</button>' +
            '</div>' +
            '<div class="wo-ex-meta">' +
              '<span class="wo-meta-tag">' + ex.sets + ' sets × ' + (ex.repRange || '?') + '</span>' +
              '<span class="wo-meta-tag">Rest: ' + (ex.restSeconds || 60) + 's</span>' +
            '</div>' +
          '</div>';
        }).join('');
      }

      var addFormHtml = '';
      if (isAddingExercise) {
        addFormHtml = '<div class="wo-add-form" style="margin-bottom:16px;border:1px solid var(--sk-accent);">' +
          '<div class="wo-add-header">' +
            '<span class="font-display" style="font-size:0.82rem;letter-spacing:0.08em;color:var(--sk-accent);">ADD EXERCISE</span>' +
            '<button class="btn-icon" onclick="LM.views.skillWidgets.toggleAddForm(false)">✕</button>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Exercise Name</label>' +
            '<input id="wo-ex-name" class="form-input" placeholder="e.g. Barbell Curl" />' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Muscle Group</label>' +
            '<div class="wo-muscle-pills">' +
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
          '<button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="LM.views.skillWidgets.addExercise()">Save Exercise</button>' +
        '</div>';
      } else {
        addFormHtml = '<button class="workout-add-btn" onclick="LM.views.skillWidgets.toggleAddForm(true)" style="width:100%;margin-bottom:16px;">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16" style="margin-right:4px;"><path d="M12 5v14M5 12h14"/></svg>' +
          ' Add Exercise' +
        '</button>';
      }

      configHtml = '<div style="margin-top:16px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
          '<h3 class="font-display" style="font-size:1rem;color:var(--text-1);">WORKOUT CONFIG</h3>' +
          '<button class="btn-ghost btn-sm" style="color:var(--danger);font-size:0.7rem;" onclick="LM.views.skillWidgets.toggleDayActive(false)">Make Rest Day</button>' +
        '</div>' +
        
        '<div class="form-group">' +
          '<label>Workout Name</label>' +
          '<input class="form-input" type="text" value="' + (config.name || '') + '" placeholder="e.g. Push Day" onchange="LM.views.skillWidgets.updateDayName(this.value)">' +
        '</div>' +

        '<div class="form-group" style="margin-bottom:24px;">' +
          '<label>XP Reward (Upon Completion)</label>' +
          '<input class="form-input" type="number" value="' + (config.xpReward || 500) + '" onchange="LM.views.skillWidgets.updateDayXP(this.value)">' +
        '</div>' +

        '<div style="border-top:1px solid var(--border);margin:24px 0;"></div>' +
        
        '<h3 class="font-display" style="font-size:0.85rem;color:var(--text-2);margin-bottom:12px;letter-spacing:0.08em;">EXERCISES</h3>' +
        
        exercisesHtml +
        addFormHtml +
      '</div>';
    }

    return '<div class="workout-selector" style="padding-bottom:80px;">' +
      '<div style="display:flex; gap:4px; margin-bottom:16px; background:var(--bg-surface); padding:4px; border-radius:12px; border:1px solid var(--border); overflow-x:auto;">' +
        dayTabs +
      '</div>' +
      configHtml +
      '<div style="position:fixed;bottom:70px;left:0;right:0;padding:12px 16px;background:var(--bg-base);border-top:1px solid var(--border);z-index:20;">' +
        '<button class="btn btn-primary" style="width:100%;max-width:700px;margin:0 auto;display:block;" onclick="LM.views.skillWidgets.saveSplit()">Save Weekly Split</button>' +
      '</div>' +
    '</div>';
  }

  function selectDay(idx) {
    selectedDay = idx;
    isAddingExercise = false;
    refresh();
  }

  function toggleDayActive(isActive) {
    tempSplit[selectedDay].isActive = isActive;
    isAddingExercise = false;
    refresh();
  }

  function updateDayName(val) {
    tempSplit[selectedDay].name = val.trim();
  }

  function updateDayXP(val) {
    var xp = parseInt(val) || 500;
    tempSplit[selectedDay].xpReward = xp;
  }

  function toggleAddForm(show) {
    isAddingExercise = show;
    refresh();
  }

  function addExercise() {
    var nameEl = document.getElementById('wo-ex-name');
    var setsEl = document.getElementById('wo-ex-sets');
    var repsEl = document.getElementById('wo-ex-reps');
    var restEl = document.getElementById('wo-ex-rest');
    
    if (!nameEl || !nameEl.value.trim()) {
      LM.components.notifications.show('Enter an exercise name', 'warning');
      return;
    }
    
    var numSets = parseInt(setsEl.value) || 3;
    if (numSets < 1) numSets = 1;
    if (numSets > 20) numSets = 20;

    var selectedPill = document.querySelector('.wo-muscle-pill.active');
    var muscleGroup = selectedPill ? selectedPill.dataset.muscle : 'back';

    var exercise = {
      id: S.uid(),
      name: nameEl.value.trim(),
      muscleGroup: muscleGroup,
      sets: numSets,
      repRange: repsEl.value.trim() || '8-12',
      restSeconds: parseInt(restEl.value) || 60
    };

    tempSplit[selectedDay].exercises.push(exercise);
    isAddingExercise = false;
    refresh();
  }

  function removeExercise(idx) {
    tempSplit[selectedDay].exercises.splice(idx, 1);
    refresh();
  }

  function toggleMuscle(el) {
    var pills = document.querySelectorAll('.wo-muscle-pill');
    pills.forEach(function(p){ p.classList.remove('active'); });
    el.classList.add('active');
  }

  function saveSplit() {
    S.upsertWeeklySplit(tempSplit);
    LM.components.notifications.show('Weekly Split Saved!', 'success');
    // Force a re-check to see if a workout needs to be generated immediately today
    S.checkResets(); 
  }

  function refresh() {
    var body = document.getElementById('workout-body');
    if (body) body.innerHTML = renderPlanner();
  }

  function init(mId) {
    macroId = mId;
    selectedDay = new Date().getDay();
    tempSplit = JSON.parse(JSON.stringify(S.getWeeklySplit()));
    isAddingExercise = false;
  }

  return {
    render: render,
    init: init,
    selectDay: selectDay,
    toggleDayActive: toggleDayActive,
    updateDayName: updateDayName,
    updateDayXP: updateDayXP,
    toggleAddForm: toggleAddForm,
    addExercise: addExercise,
    removeExercise: removeExercise,
    toggleMuscle: toggleMuscle,
    saveSplit: saveSplit
  };
})();
