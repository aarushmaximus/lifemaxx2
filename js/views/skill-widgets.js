// LIFEMAXX — Skill Widgets (Menu & Planners)
window.LM.views.skillWidgets = (function () {
  var S = window.LM.store;
  var F = window.LM.formulas;

  var macroId = null;
  var activeWidget = null; // null = menu, 'planner' = Weekly Split Planner, 'archive' = Workout Archive
  var selectedDay = new Date().getDay(); // 0 = Sun, 1 = Mon...
  var tempSplit = null; 
  var isAddingExercise = false;

  var archiveActiveFilter = 'all';
  var archiveSelectedEx = null;
  var _chartConfigs = [];
  var _activeCharts = [];

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

    var headerTitle = 'WIDGETS';
    if (activeWidget === 'planner') headerTitle = 'WEEKLY SPLIT';
    if (activeWidget === 'archive') headerTitle = 'ARCHIVE';

    var backAction = activeWidget 
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
        (activeWidget === 'planner' ? renderPlanner() : (activeWidget === 'archive' ? renderArchive() : renderMenu(macro))) + 
      '</div>' +
    '</div>';
  }

  function renderMenu(macro) {
    var plannerCard = '';
    var archiveCard = '';
    if (isPhysique(macro)) {
      plannerCard = '<div class="skill-hub-option" style="margin-bottom:12px;background:var(--bg-surface);border:1px solid var(--sk-accent);" onclick="LM.views.skillWidgets.openPlanner()">' +
        '<div class="hub-opt-icon" style="color:var(--sk-accent);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>' +
        '<div class="hub-opt-text">' +
          '<div class="hub-opt-title" style="color:#fff;">Workout Split Planner</div>' +
          '<div class="hub-opt-desc">Configure your weekly training schedule</div>' +
        '</div>' +
        '<div class="hub-opt-arrow">›</div>' +
      '</div>';
      
      archiveCard = '<div class="skill-hub-option" style="margin-bottom:12px;background:var(--bg-surface);border:1px solid var(--sk-accent);" onclick="LM.views.skillWidgets.openArchive()">' +
        '<div class="hub-opt-icon" style="color:var(--sk-accent);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><path d="M4 6h16M4 12h16M4 18h7"></path></svg></div>' +
        '<div class="hub-opt-text">' +
          '<div class="hub-opt-title" style="color:#fff;">Workout Archive</div>' +
          '<div class="hub-opt-desc">Exercise database and form tracking</div>' +
        '</div>' +
        '<div class="hub-opt-arrow">›</div>' +
      '</div>';
    }

    return '<div class="widget-menu-list" style="padding-top:10px;">' +
      plannerCard + archiveCard +
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
        '<span style="font-weight:600;font-size:0.8rem;">' + d + '</span>' +
        '<div style="width:4px;height:4px;border-radius:50%;background:' + dotColor + ';margin-top:3px;"></div>' +
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

    return '<div class="workout-selector" style="padding-bottom:100px;overflow-x:hidden;">' +
      '<div style="display:flex; flex-wrap:wrap; justify-content:space-around; gap:4px; padding:4px 0 16px; border-bottom:1px solid rgba(255,255,255,0.05);">' +
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

  // --- ARCHIVE LOGIC ---
  function openArchive() {
    activeWidget = 'archive';
    archiveActiveFilter = 'all';
    archiveSelectedEx = null;
    refresh();
  }
  function setArchiveFilter(f) {
    archiveActiveFilter = f;
    refresh();
  }
  function openArchiveDetail(name) {
    archiveSelectedEx = name;
    refresh();
    setTimeout(initArchiveCharts, 50);
  }

  function getArchiveExercises() {
    var exercises = {}; 
    var history = S.getWorkoutHistory();
    history.forEach(function(h) {
      if (!exercises[h.exerciseName]) exercises[h.exerciseName] = { name: h.exerciseName, history: [] };
      exercises[h.exerciseName].history.push(h);
    });
    
    var split = S.getWeeklySplit();
    split.forEach(function(day) {
      if(day.exercises) {
        day.exercises.forEach(function(e) {
          if (!exercises[e.name]) exercises[e.name] = { name: e.name, history: [] };
          if(!exercises[e.name].splitMeta) {
            exercises[e.name].splitMeta = e; 
          }
        });
      }
    });

    Object.keys(exercises).forEach(function(k) {
      var ex = exercises[k];
      var meta = S.getExerciseMeta(k);
      ex.meta = meta || { name: k, muscleGroup: ex.splitMeta ? ex.splitMeta.muscleGroup : 'unknown', formNotes: '', videoUrl: '' };
      ex.history.sort(function(a,b) { return b.date - a.date; }); // newest first
      ex.lastDone = ex.history.length > 0 ? ex.history[0] : null;
    });

    return Object.values(exercises);
  }

  function saveExerciseForm(name) {
    var group = document.getElementById('ex-meta-group').value;
    var notes = document.getElementById('ex-meta-notes').value;
    var url = document.getElementById('ex-meta-url').value;
    S.upsertExerciseMeta({ name: name, muscleGroup: group, formNotes: notes, videoUrl: url });
    LM.components.notifications.show('Exercise Details Saved', 'success');
    refresh();
  }

  function initArchiveCharts() {
    if (typeof Chart === 'undefined') return;
    _activeCharts.forEach(function(c) { c.destroy(); });
    _activeCharts = [];
    _chartConfigs.forEach(function(conf) {
      var el = document.getElementById(conf.id);
      if (el) _activeCharts.push(new Chart(el, conf.config));
    });
  }

  function extractYouTubeID(url) {
    if (!url) return null;
    var match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  }

  function renderArchive() {
    _chartConfigs = [];
    if (archiveSelectedEx) {
      return renderArchiveDetail(archiveSelectedEx);
    }
    // LIST VIEW
    var exercises = getArchiveExercises();
    
    var groupsInUse = new Set();
    exercises.forEach(function(e) { groupsInUse.add(e.meta.muscleGroup); });
    
    var pillsHtml = '<div style="display:flex;gap:8px;overflow-x:auto;padding:4px 0 16px;border-bottom:1px solid rgba(255,255,255,0.05);">' +
      '<button class="wo-muscle-pill ' + (archiveActiveFilter === 'all' ? 'active' : '') + '" style="--pill-color:#fff;padding:6px 16px;border-radius:20px;font-size:0.8rem;white-space:nowrap;background:'+(archiveActiveFilter === 'all' ? '#fff' : 'rgba(255,255,255,0.05)')+';color:'+(archiveActiveFilter === 'all' ? '#000' : '#fff')+';" onclick="LM.views.skillWidgets.setArchiveFilter(\'all\')">All</button>';
    
    MUSCLES.forEach(function(m) {
      if (groupsInUse.has(m.id)) {
        var active = archiveActiveFilter === m.id;
        pillsHtml += '<button class="wo-muscle-pill ' + (active ? 'active' : '') + '" style="--pill-color:'+m.color+';padding:6px 16px;border-radius:20px;font-size:0.8rem;white-space:nowrap;background:'+(active ? m.color : 'rgba(255,255,255,0.05)')+';color:'+(active ? '#000' : m.color)+';" onclick="LM.views.skillWidgets.setArchiveFilter(\''+m.id+'\')">' + m.label + '</button>';
      }
    });
    
    if (groupsInUse.has('unknown')) {
      var unkActive = archiveActiveFilter === 'unknown';
      pillsHtml += '<button class="wo-muscle-pill ' + (unkActive ? 'active' : '') + '" style="--pill-color:#888;padding:6px 16px;border-radius:20px;font-size:0.8rem;white-space:nowrap;background:'+(unkActive ? '#888' : 'rgba(255,255,255,0.05)')+';color:'+(unkActive ? '#000' : '#888')+';" onclick="LM.views.skillWidgets.setArchiveFilter(\'unknown\')">Unknown</button>';
    }
    pillsHtml += '</div>';

    var filtered = exercises.filter(function(e) {
      return archiveActiveFilter === 'all' || e.meta.muscleGroup === archiveActiveFilter;
    });

    filtered.sort(function(a,b) { return a.name.localeCompare(b.name); });

    var listHtml = '<div style="margin-top:20px;display:flex;flex-direction:column;gap:12px;padding-bottom:120px;">';
    if (filtered.length === 0) {
      listHtml += '<div style="text-align:center;padding:40px 20px;color:var(--text-3);font-size:0.9rem;">No exercises found for this filter.</div>';
    } else {
      filtered.forEach(function(ex) {
        var m = getMuscle(ex.meta.muscleGroup);
        var lastStr = ex.lastDone ? 'Last: ' + new Date(ex.lastDone.date).toLocaleDateString() : 'Never performed';
        listHtml += '<div class="skill-hub-option" style="background:var(--bg-surface);border:1px solid rgba(255,255,255,0.05);" onclick="LM.views.skillWidgets.openArchiveDetail(\''+ex.name.replace(/'/g,"\\'")+'\')">' +
          '<div style="flex:1;">' +
            '<div style="font-weight:600;font-size:1.05rem;color:#fff;margin-bottom:4px;">' + ex.name + '</div>' +
            '<div style="display:flex;gap:8px;font-size:0.75rem;color:var(--text-3);align-items:center;">' +
              '<span style="color:' + m.color + ';background:' + m.color + '22;padding:2px 6px;border-radius:4px;">' + m.label + '</span>' +
              '<span>•</span>' +
              '<span>' + lastStr + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="hub-opt-arrow">›</div>' +
        '</div>';
      });
    }
    listHtml += '</div>';

    return '<div>' + pillsHtml + listHtml + '</div>';
  }

  function renderArchiveDetail(name) {
    var exercises = getArchiveExercises();
    var ex = exercises.find(function(e) { return e.name === name; });
    if (!ex) return '<div class="p-10 text-center">Exercise not found</div>';
    
    var m = getMuscle(ex.meta.muscleGroup);
    
    var scoreHTML = '';
    if (ex.lastDone && ex.lastDone.sets && ex.lastDone.sets.length > 0) {
      var bestSet = ex.lastDone.sets.reduce(function(best, s) {
        var sScore = s.weight * (1 + s.reps/30);
        var bScore = best.weight * (1 + best.reps/30);
        return sScore > bScore ? s : best;
      }, { weight: 0, reps: 0 });

      var repRangeStr = ex.splitMeta ? ex.splitMeta.repRange : '8-12';
      var parts = repRangeStr.split('-');
      var maxReps = parts.length > 1 ? parseInt(parts[1]) : 12;
      
      var targetWeight = bestSet.weight;
      var targetReps = bestSet.reps + 1;
      var logicStr = 'Add 1 Rep';
      
      if (bestSet.reps >= maxReps) {
        targetWeight = bestSet.weight + 2.5;
        targetReps = parts.length > 1 ? parseInt(parts[0]) : 8;
        logicStr = 'Increase Weight';
      }

      scoreHTML = '<div style="background:var(--bg-surface);border:1px solid ' + m.color + '44;border-radius:12px;padding:16px;margin-bottom:24px;">' +
        '<div style="font-size:0.75rem;color:'+m.color+';text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;font-weight:600;">🎯 SCORE TO BEAT (Last: ' + bestSet.weight + 'kg x ' + bestSet.reps + ')</div>' +
        '<div style="font-size:1.4rem;font-weight:bold;color:#fff;">' + targetWeight + 'kg <span style="color:var(--text-3);font-weight:500;font-size:1.1rem;">× ' + targetReps + ' reps</span></div>' +
        '<div style="font-size:0.85rem;color:var(--text-3);margin-top:4px;">Goal: ' + logicStr + ' (Target Range: ' + repRangeStr + ')</div>' +
      '</div>';
    } else {
      scoreHTML = '<div style="background:var(--bg-surface);border:1px dashed var(--border);border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;color:var(--text-3);font-size:0.9rem;">No workout history to calculate Score to Beat.</div>';
    }

    var videoHtml = '';
    if (ex.meta.videoUrl) {
      var ytId = extractYouTubeID(ex.meta.videoUrl);
      if (ytId) {
        videoHtml = '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin-bottom:20px;border:1px solid var(--border);">' +
          '<iframe src="https://www.youtube.com/embed/' + ytId + '" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allowfullscreen></iframe>' +
        '</div>';
      } else {
        videoHtml = '<div style="margin-bottom:20px;"><a href="'+ex.meta.videoUrl+'" target="_blank" style="color:var(--primary);text-decoration:underline;">🔗 View Form Video</a></div>';
      }
    }

    var chartHtml = '';
    if (ex.history.length > 0) {
      var canvasId = 'chart-archive-' + Date.now();
      
      var chartData = ex.history.map(function(h) {
        var maxW = h.sets.reduce(function(mx, s){ return s.weight > mx ? s.weight : mx; }, 0);
        return { date: h.date, y: maxW };
      });
      chartData.sort(function(a,b) { return a.date - b.date; });

      chartHtml = '<div class="w-full bg-surface-container rounded-2xl p-4 shadow-sm border border-surface-container-highest mb-6" style="background:var(--bg-surface);">' +
        '<div class="flex justify-between items-end mb-4">' +
          '<span class="font-bold text-sm text-on-surface" style="color:#fff;">Max Weight Progression</span>' +
          '<span class="text-xs text-on-surface-variant font-mono">Max: '+Math.max(...chartData.map(function(d){return d.y}))+'kg</span>' +
        '</div>' +
        '<div class="w-full h-48 relative" style="height:150px;">' +
          '<canvas id="' + canvasId + '"></canvas>' +
        '</div>' +
      '</div>';

      _chartConfigs.push({
        id: canvasId,
        config: {
          type: 'line',
          data: {
            labels: chartData.map(function(d) { return new Date(d.date).toLocaleDateString(undefined, {month:'short', day:'numeric'}); }),
            datasets: [{
              label: 'Max Weight',
              data: chartData.map(function(d) { return d.y; }),
              borderColor: m.color,
              borderWidth: 3,
              pointBackgroundColor: '#0f172a',
              pointBorderColor: m.color,
              pointRadius: 4,
              fill: true,
              backgroundColor: m.color + '22',
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { display: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, border: { display: false }, ticks: { color: '#94a3b8' } },
              x: { display: true, grid: { display: false }, border: { display: false }, ticks: { color: '#94a3b8' } }
            },
            layout: { padding: 5 }
          }
        }
      });
    }

    var groupSelectOpts = '<option value="unknown">Unknown</option>' + MUSCLES.map(function(mus) {
      return '<option value="'+mus.id+'" '+(mus.id === ex.meta.muscleGroup ? 'selected' : '')+'>'+mus.label+'</option>';
    }).join('');

    return '<div style="padding-bottom:120px;">' +
      '<button class="btn-ghost" style="margin-bottom:16px;color:var(--text-2);padding:0;" onclick="LM.views.skillWidgets.openArchive()">← Back to List</button>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
        '<h2 style="font-size:1.6rem;font-weight:700;line-height:1.2;">' + ex.name + '</h2>' +
        '<span style="color:' + m.color + ';background:' + m.color + '22;padding:4px 10px;border-radius:6px;font-size:0.8rem;font-weight:600;">' + m.label + '</span>' +
      '</div>' +
      scoreHTML +
      chartHtml +
      '<h3 class="font-display" style="font-size:1.1rem;color:var(--text-2);letter-spacing:0.05em;margin-bottom:16px;">FORM & NOTES</h3>' +
      videoHtml +
      '<div class="form-group" style="margin-bottom:16px;">' +
        '<label style="font-size:0.8rem;color:var(--text-3);margin-bottom:6px;display:block;">Muscle Group</label>' +
        '<select id="ex-meta-group" class="form-input" style="font-size:1rem;padding:12px;background:var(--bg-elevated);border:1px solid rgba(255,255,255,0.1);">' + groupSelectOpts + '</select>' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:16px;">' +
        '<label style="font-size:0.8rem;color:var(--text-3);margin-bottom:6px;display:block;">Video Link (YouTube)</label>' +
        '<input id="ex-meta-url" type="text" class="form-input" value="'+(ex.meta.videoUrl || '')+'" placeholder="Paste YouTube link" style="font-size:1rem;padding:12px;background:var(--bg-elevated);border:1px solid rgba(255,255,255,0.1);" />' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:24px;">' +
        '<label style="font-size:0.8rem;color:var(--text-3);margin-bottom:6px;display:block;">Form Notes</label>' +
        '<textarea id="ex-meta-notes" class="form-input" rows="4" placeholder="Cues, setups, reminders..." style="font-size:1rem;padding:12px;background:var(--bg-elevated);border:1px solid rgba(255,255,255,0.1);resize:none;">' + (ex.meta.formNotes || '') + '</textarea>' +
      '</div>' +
      '<button class="btn btn-primary" style="width:100%;padding:14px;font-size:1.05rem;" onclick="LM.views.skillWidgets.saveExerciseForm(\''+ex.name.replace(/'/g,"\\'")+'\')">Save Details</button>' +
    '</div>';
  }

  function refresh() {
    var body = document.getElementById('widget-body');
    if (body) {
      if (activeWidget === 'planner') body.innerHTML = renderPlanner();
      else if (activeWidget === 'archive') body.innerHTML = renderArchive();
      else body.innerHTML = renderMenu(S.getMacro(macroId));
    }
    
    // Apply styling to tabs after render
    document.querySelectorAll('.planner-day-tab').forEach(function(el) {
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.padding = '8px 10px';
      el.style.borderRadius = '12px';
      el.style.background = el.classList.contains('active') ? 'rgba(255,255,255,0.1)' : 'transparent';
      el.style.color = el.classList.contains('active') ? '#fff' : 'var(--text-3)';
      el.style.cursor = 'pointer';
      el.style.flex = '1';
      el.style.maxWidth = '52px';
    });
  }

  function init(mId) {
    macroId = mId;
    selectedDay = new Date().getDay();
    tempSplit = JSON.parse(JSON.stringify(S.getWeeklySplit()));
    isAddingExercise = false;
    activeWidget = null;
    archiveSelectedEx = null;
  }

  return {
    render: render,
    init: init,
    openMenu: openMenu,
    openPlanner: openPlanner,
    openArchive: openArchive,
    openArchiveDetail: openArchiveDetail,
    setArchiveFilter: setArchiveFilter,
    saveExerciseForm: saveExerciseForm,
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
