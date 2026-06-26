// LIFEMAXX — Skill Widgets (Menu & Planners)
window.LM.views.skillWidgets = (function () {
  var S = window.LM.store;
  var F = window.LM.formulas;

  var macroId = null;
  var activeWidget = null; // null = menu, 'planner' = Weekly Split Planner
  var selectedDay = new Date().getDay(); // 0 = Sun, 1 = Mon...
  var tempSplit = null; 
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

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

    if (!tempSplit) {
      tempSplit = JSON.parse(JSON.stringify(S.getWeeklySplit()));
    }

    var headerTitle = activeWidget === 'planner' ? 'WEEKLY SPLIT' : 'WIDGETS';
    var backAction = activeWidget === 'planner' 
      ? 'LM.views.skillWidgets.openMenu()' 
      : 'LM.router.navigate(\'#skill-hub/' + macroId + '\')';

    return '<div class="widget-canvas-view workout-view" style="--sk-accent:' + macro.accentColor + ';">' +
      '<div class="widget-canvas-header">' +
        '<button class="btn-back" onclick="' + backAction + '">← Back</button>' +
        '<div class="widget-canvas-title-row">' +
          '<div style="width:9px;height:9px;border-radius:50%;background:' + macro.accentColor + ';box-shadow:0 0 10px ' + macro.accentColor + ';flex-shrink:0;"></div>' +
          '<span class="font-display" style="font-size:0.85rem;letter-spacing:0.12em;color:' + macro.accentColor + ';">' + macro.name + '</span>' +
          '<span class="font-display" style="font-size:0.65rem;letter-spacing:0.18em;color:var(--text-3);">/ ' + headerTitle + '</span>' +
        '</div>' +
      '</div>' +
      '<div id="widget-body" class="workout-body">' + 
        (activeWidget === 'planner' ? renderPlanner() : renderMenu(macro)) + 
      '</div>' +
    '</div>';
  }

  function renderMenu(macro) {
    var plannerCard = '';
    if (isPhysique(macro)) {
      plannerCard = '<div class="skill-hub-option" style="margin-bottom:12px;background:var(--bg-surface);border:1px solid var(--sk-accent);" onclick="LM.views.skillWidgets.openPlanner()">' +
        '<div class="hub-opt-icon" style="color:var(--sk-accent);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>' +
        '<div class="hub-opt-text">' +
          '<div class="hub-opt-title" style="color:#fff;">Workout Split Planner</div>' +
          '<div class="hub-opt-desc">Configure your weekly training schedule</div>' +
        '</div>' +
        '<div class="hub-opt-arrow">›</div>' +
      '</div>';
    }

    return '<div class="widget-menu-list" style="padding-top:10px;">' +
      plannerCard +
      '<div style="text-align:center;padding:40px 20px;color:var(--text-3);font-size:0.85rem;opacity:0.5;">More widgets coming soon.</div>' +
    '</div>';
  }

  function renderPlanner() {
    var dayTabs = DAYS_SHORT.map(function(d, i) {
      var activeCls = selectedDay === i ? 'active' : '';
      var config = tempSplit[i];
      var hasWorkout = config.isActive && config.exercises.length > 0;
      var dotColor = hasWorkout ? 'var(--sk-accent)' : 'transparent';
      return '<div class="planner-day-tab ' + activeCls + '" onclick="LM.views.skillWidgets.selectDay(' + i + ')">' +
        '<span style="font-weight:600;font-size:0.85rem;">' + d + '</span>' +
        '<div style="width:4px;height:4px;border-radius:50%;background:' + dotColor + ';margin-top:4px;"></div>' +
      '</div>';
    }).join('');

    var config = tempSplit[selectedDay];
    var configHtml = '';
    
    if (!config.isActive) {
      configHtml = '<div class="widget-canvas-empty" style="margin-top:40px;background:var(--bg-surface);border-radius:16px;border:1px dashed rgba(255,255,255,0.1);padding:40px 20px;">' +
        '<p class="font-display" style="font-size:1.2rem;letter-spacing:0.1em;color:var(--text-2);margin-bottom:8px;">REST DAY</p>' +
        '<p style="color:var(--text-3);font-size:0.9rem;margin-bottom:24px;">No workout scheduled for ' + DAYS[selectedDay] + 's.</p>' +
        '<button class="btn btn-primary" style="padding:12px 24px;" onclick="LM.views.skillWidgets.toggleDayActive(true)">Set as Workout Day</button>' +
      '</div>';
    } else {
      var exercisesHtml = '';
      if (config.exercises.length === 0) {
        exercisesHtml = '<div style="text-align:center;padding:30px;color:var(--text-3);font-size:0.9rem;background:var(--bg-surface);border-radius:12px;border:1px dashed var(--border);margin-bottom:20px;">No exercises added yet.</div>';
      } else {
        exercisesHtml = config.exercises.map(function(ex, idx) {
          var m = getMuscle(ex.muscleGroup);
          return '<div class="planner-exercise-card" style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-surface);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:12px;">' +
            '<div>' +
              '<div style="font-weight:600;font-size:1.05rem;color:#fff;margin-bottom:4px;">' + ex.name + '</div>' +
              '<div style="display:flex;gap:8px;font-size:0.75rem;color:var(--text-3);align-items:center;">' +
                '<span style="color:' + m.color + ';background:' + m.color + '22;padding:2px 6px;border-radius:4px;">' + m.label + '</span>' +
                '<span>•</span>' +
                '<span>' + ex.sets + ' sets × ' + (ex.repRange || '?') + '</span>' +
                '<span>•</span>' +
                '<span>Rest: ' + (ex.restSeconds || 60) + 's</span>' +
              '</div>' +
            '</div>' +
            '<button class="btn-icon danger" style="opacity:0.6;background:rgba(255,0,0,0.1);" onclick="LM.views.skillWidgets.removeExercise(' + idx + ')" title="Delete">✕</button>' +
          '</div>';
        }).join('');
      }

      var addFormHtml = '';
      if (isAddingExercise) {
        addFormHtml = '<div class="planner-add-modal" style="position:fixed;bottom:0;left:0;right:0;background:var(--bg-elevated);border-top:1px solid var(--sk-accent);padding:24px 20px 40px;border-radius:24px 24px 0 0;z-index:100;box-shadow:0 -10px 40px rgba(0,0,0,0.5);">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
            '<h3 class="font-display" style="font-size:1.1rem;letter-spacing:0.05em;color:var(--sk-accent);">ADD EXERCISE</h3>' +
            '<button class="btn-icon" style="background:var(--bg-surface);" onclick="LM.views.skillWidgets.toggleAddForm(false)">✕</button>' +
          '</div>' +
          '<div class="form-group" style="margin-bottom:16px;">' +
            '<label style="font-size:0.8rem;color:var(--text-3);margin-bottom:6px;display:block;">Exercise Name</label>' +
            '<input id="wo-ex-name" class="form-input" style="font-size:1rem;padding:12px;" placeholder="e.g. Barbell Curl" />' +
          '</div>' +
          '<div class="form-group" style="margin-bottom:20px;">' +
            '<label style="font-size:0.8rem;color:var(--text-3);margin-bottom:6px;display:block;">Target Muscle</label>' +
            '<div class="wo-muscle-pills" style="display:flex;flex-wrap:wrap;gap:8px;">' +
              MUSCLES.map(function(m) {
                return '<button type="button" class="wo-muscle-pill" data-muscle="' + m.id + '" ' +
                  'style="--pill-color:' + m.color + ';padding:6px 12px;border-radius:20px;font-size:0.8rem;" ' +
                  'onclick="LM.views.skillWidgets.toggleMuscle(this)">' + m.label + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:12px;margin-bottom:24px;">' +
            '<div class="form-group" style="flex:1;">' +
              '<label style="font-size:0.8rem;color:var(--text-3);margin-bottom:6px;display:block;">Sets</label>' +
              '<input id="wo-ex-sets" class="form-input" type="number" min="1" max="20" value="3" style="font-size:1rem;padding:12px;text-align:center;" />' +
            '</div>' +
            '<div class="form-group" style="flex:1.5;">' +
              '<label style="font-size:0.8rem;color:var(--text-3);margin-bottom:6px;display:block;">Reps</label>' +
              '<input id="wo-ex-reps" class="form-input" placeholder="8-12" style="font-size:1rem;padding:12px;text-align:center;" />' +
            '</div>' +
            '<div class="form-group" style="flex:1.5;">' +
              '<label style="font-size:0.8rem;color:var(--text-3);margin-bottom:6px;display:block;">Rest</label>' +
              '<select id="wo-ex-rest" class="form-input" style="font-size:1rem;padding:12px;">' +
                '<option value="30">30s</option>' +
                '<option value="60" selected>60s</option>' +
                '<option value="90">90s</option>' +
                '<option value="120">2min</option>' +
                '<option value="180">3min</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<button class="btn btn-primary" style="width:100%;padding:14px;font-size:1.05rem;" onclick="LM.views.skillWidgets.addExercise()">Save Exercise</button>' +
        '</div>' + 
        '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:99;" onclick="LM.views.skillWidgets.toggleAddForm(false)"></div>';
      }

      configHtml = '<div style="margin-top:20px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding:16px;background:var(--bg-surface);border-radius:12px;border:1px solid rgba(255,255,255,0.05);">' +
          '<div style="flex:1;margin-right:16px;">' +
            '<label style="font-size:0.75rem;color:var(--text-3);text-transform:uppercase;letter-spacing:0.1em;">Workout Name</label>' +
            '<input type="text" value="' + (config.name || '') + '" placeholder="e.g. Push Day" onchange="LM.views.skillWidgets.updateDayName(this.value)" style="background:transparent;border:none;color:#fff;font-size:1.1rem;font-weight:600;width:100%;margin-top:4px;outline:none;">' +
          '</div>' +
          '<div style="width:1px;height:40px;background:var(--border);margin-right:16px;"></div>' +
          '<div style="flex:0.5;">' +
            '<label style="font-size:0.75rem;color:var(--text-3);text-transform:uppercase;letter-spacing:0.1em;">XP</label>' +
            '<input type="number" value="' + (config.xpReward || 500) + '" onchange="LM.views.skillWidgets.updateDayXP(this.value)" style="background:transparent;border:none;color:var(--sk-accent);font-size:1.1rem;font-weight:600;width:100%;margin-top:4px;outline:none;">' +
          '</div>' +
        '</div>' +

        '<div style="display:flex;justify-content:space-between;align-items:center;margin:24px 0 12px;">' +
          '<h3 class="font-display" style="font-size:0.9rem;color:var(--text-2);letter-spacing:0.1em;">EXERCISES</h3>' +
          '<button class="btn-ghost btn-sm" style="color:var(--danger);font-size:0.75rem;" onclick="LM.views.skillWidgets.toggleDayActive(false)">Make Rest Day</button>' +
        '</div>' +
        
        exercisesHtml +
        '<button class="workout-add-btn" onclick="LM.views.skillWidgets.toggleAddForm(true)" style="width:100%;margin-top:8px;padding:14px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.15);border-radius:12px;color:var(--text-2);font-size:0.95rem;font-weight:500;">' +
          '+ Add Exercise' +
        '</button>' +
        addFormHtml +
      '</div>';
    }

    return '<div class="workout-selector" style="padding-bottom:100px;">' +
      '<div style="display:flex; overflow-x:auto; gap:12px; padding:4px 0 16px; border-bottom:1px solid rgba(255,255,255,0.05); -webkit-overflow-scrolling:touch; margin:0 -20px; padding-left:20px; padding-right:20px;">' +
        dayTabs +
      '</div>' +
      '<h2 style="font-size:1.4rem;font-weight:700;margin-top:20px;">' + DAYS[selectedDay] + '</h2>' +
      configHtml +
      '<div style="position:fixed;bottom:0;left:0;right:0;padding:16px 20px 24px;background:var(--bg-base);border-top:1px solid rgba(255,255,255,0.05);z-index:20;background:linear-gradient(to top, var(--bg-base) 80%, transparent);">' +
        '<button class="btn btn-primary" style="width:100%;max-width:700px;margin:0 auto;display:block;padding:16px;font-size:1.1rem;box-shadow:0 4px 20px rgba(0,0,0,0.5);" onclick="LM.views.skillWidgets.saveSplit()">Save Weekly Split</button>' +
      '</div>' +
    '</div>';
  }

  function openMenu() {
    activeWidget = null;
    refresh();
  }

  function openPlanner() {
    activeWidget = 'planner';
    refresh();
  }

  function selectDay(idx) {
    selectedDay = idx;
    isAddingExercise = false;
    refresh();
  }

  function toggleDayActive(isActive) {
    tempSplit[selectedDay].isActive = isActive;
    if (isActive) {
      // Default name
      tempSplit[selectedDay].name = DAYS[selectedDay] + ' Workout';
    }
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
    if (show) {
      setTimeout(function() {
        var inp = document.getElementById('wo-ex-name');
        if (inp) inp.focus();
      }, 100);
    }
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
    el.style.background = 'var(--pill-color)';
    el.style.color = '#000';
  }

  function saveSplit() {
    S.upsertWeeklySplit(tempSplit);
    LM.components.notifications.show('Weekly Split Saved!', 'success');
    
    // Force a re-check to see if a workout needs to be generated immediately today
    // We pass 'true' to force creation if it doesn't exist yet today.
    S.checkWeeklyWorkoutGen(true); 
    
    // Go back to menu
    openMenu();
  }

  function refresh() {
    var body = document.getElementById('widget-body');
    if (body) body.innerHTML = activeWidget === 'planner' ? renderPlanner() : renderMenu(S.getMacro(macroId));
    
    // Apply styling to tabs after render
    document.querySelectorAll('.planner-day-tab').forEach(function(el) {
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.padding = '12px 16px';
      el.style.borderRadius = '16px';
      el.style.background = el.classList.contains('active') ? 'rgba(255,255,255,0.1)' : 'transparent';
      el.style.color = el.classList.contains('active') ? '#fff' : 'var(--text-3)';
      el.style.cursor = 'pointer';
      el.style.minWidth = '60px';
    });
  }

  function init(mId) {
    macroId = mId;
    selectedDay = new Date().getDay();
    tempSplit = JSON.parse(JSON.stringify(S.getWeeklySplit()));
    isAddingExercise = false;
    activeWidget = null;
  }

  return {
    render: render,
    init: init,
    openMenu: openMenu,
    openPlanner: openPlanner,
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
