// LIFEMAXX — SVG Circular Wheel with Drag-Drop
window.LM.components.wheel = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;
  const N = window.LM.components.notifications;
  const CIRC = 2 * Math.PI * 110; // r=110 => ~691

  let currentSkillId = 'overall';

  function getSkillData(id) {
    if (id === 'overall') {
      const o = S.getOverall();
      return { name: 'Overall', color: 'var(--accent)', xp: o.currentXP || 0, skill: o, level: o.currentLevel || 0 };
    }
    const m = S.getMacro(id);
    if (!m) return null;
    return { name: m.name, color: m.accentColor, xp: m.currentXP || 0, skill: m, level: m.currentLevel || 0 };
  }

  function renderHTML() {
    const macros = S.getMacros();
    const settings = S.getSettings();
    currentSkillId = settings.wheelSkillId || 'overall';

    const options = [
      `<option value="overall" ${currentSkillId === 'overall' ? 'selected' : ''}>Overall</option>`,
      ...macros.map(m => `<option value="${m.id}" ${currentSkillId === m.id ? 'selected' : ''}>${m.name}</option>`)
    ].join('');

    return `
      <div id="wheel-container">
        <select id="wheel-skill-select" class="wheel-select">${options}</select>
        <div id="wheel-drop-zone" class="wheel-drop-zone">
          <svg id="wheel-svg" viewBox="0 0 260 260" width="100%" style="max-width:240px;display:block;margin:0 auto;">
            <defs>
              <filter id="glow-filter">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
              </filter>
              <linearGradient id="wheel-chrome-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#404040" />
                <stop offset="20%" stop-color="#b8b8b8" />
                <stop offset="40%" stop-color="#ffffff" />
                <stop offset="60%" stop-color="#707070" />
                <stop offset="80%" stop-color="#e0e0e0" />
                <stop offset="100%" stop-color="#ffffff" />
              </linearGradient>
            </defs>
            <!-- Track ring -->
            <circle cx="130" cy="130" r="110" fill="none" stroke="var(--bg-raised)" stroke-width="14"/>
            <!-- Tick marks -->
            ${Array.from({length: 20}, (_, i) => {
              const angle = (i / 20) * 2 * Math.PI - Math.PI/2;
              const x1 = 130 + 117 * Math.cos(angle), y1 = 130 + 117 * Math.sin(angle);
              const x2 = 130 + 122 * Math.cos(angle), y2 = 130 + 122 * Math.sin(angle);
              return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`;
            }).join('')}
            <!-- Liquid Fill -->
            <clipPath id="circle-clip">
              <circle cx="130" cy="130" r="110"/>
            </clipPath>
            <g clip-path="url(#circle-clip)">
              <g id="wheel-liquid-fill" style="transform: translateY(130px); transition: transform 1.2s var(--spring-soft);">
                <!-- Reverse wave (back) -->
                <path class="liquid-wave-2" d="M -520 130 Q -455 145 -390 130 T -260 130 T -130 130 T 0 130 T 130 130 T 260 130 T 390 130 T 520 130 L 520 390 L -520 390 Z" />
                <!-- Forward wave (front) -->
                <path class="liquid-wave" d="M -520 130 Q -455 110 -390 130 T -260 130 T -130 130 T 0 130 T 130 130 T 260 130 T 390 130 T 520 130 L 520 390 L -520 390 Z" />
              </g>
            </g>
            <!-- Progress ring -->
            <circle cx="130" cy="130" r="110" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="14" />
            <circle id="wheel-ring" cx="130" cy="130" r="110"
              fill="none" stroke="var(--accent)" stroke-width="14"
              stroke-linecap="round"
              stroke-dasharray="${CIRC.toFixed(2)}"
              stroke-dashoffset="${CIRC.toFixed(2)}"
              transform="rotate(-90 130 130)"
              filter="url(#glow-filter)"
              style="transition: stroke-dashoffset 1.2s var(--spring-soft), stroke 0.4s ease;"/>
            <!-- Center elements -->
            <text id="wheel-level-text" x="130" y="118" text-anchor="middle"
              font-family="var(--font-display)" font-size="44" font-weight="300"
              fill="var(--text-1)">0</text>
            <text id="wheel-skill-name" x="130" y="148" text-anchor="middle"
              font-family="var(--font-display)" font-size="10" font-weight="400"
              fill="var(--text-2)" letter-spacing="2">OVERALL</text>
            <text id="wheel-xp-text" x="130" y="168" text-anchor="middle"
              font-family="var(--font-display)" font-size="9"
              fill="var(--text-3)"></text>
          </svg>
          <div class="wheel-drop-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M12 16V8m0 8l-3-3m3 3l3-3"/><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
            <span>Drop quest to complete</span>
          </div>
        </div>
      </div>`;
  }

  function update(xpDelta) {
    const data = getSkillData(currentSkillId);
    if (!data) return;

    const ring = document.getElementById('wheel-ring');
    const levelText = document.getElementById('wheel-level-text');
    const skillName = document.getElementById('wheel-skill-name');
    const xpText = document.getElementById('wheel-xp-text');
    if (!ring) return;

    const pct = F.progressPercent(data.xp, data.skill);
    const offset = CIRC - (CIRC * pct / 100);

    ring.style.stroke = data.color;
    ring.style.strokeDashoffset = offset.toFixed(2);
    
    const liquid = document.getElementById('wheel-liquid-fill');
    if (liquid) {
      const yOffset = 130 - (pct / 100) * 260;
      liquid.style.transform = `translateY(${yOffset}px)`;
      document.querySelectorAll('.liquid-wave, .liquid-wave-2').forEach(el => el.style.fill = data.color);
    }

    if (levelText) levelText.textContent = data.level;
    if (skillName) skillName.textContent = data.name.toUpperCase();
    if (xpText) {
      const into = F.xpIntoCurrentLevel(data.xp, data.skill);
      const req = F.xpRequiredForNextLevel(data.xp, data.skill);
      xpText.textContent = `${F.formatXP(into)} / ${F.formatXP(req)} XP`;
    }

    // Flash animation if XP delta
    if (xpDelta > 0) {
      ring.classList.add('wheel-flash');
      setTimeout(() => ring.classList.remove('wheel-flash'), 600);

      // Float-up XP label
      const dropZone = document.getElementById('wheel-drop-zone');
      if (dropZone) {
        const floater = document.createElement('div');
        floater.className = 'floating-xp';
        floater.textContent = `+${Math.round(xpDelta)} XP`;
        floater.style.color = data.color;
        dropZone.appendChild(floater);
        setTimeout(() => floater.remove(), 1500);
      }
    }
  }

  function init() {
    // Initial update after render
    setTimeout(() => update(0), 50);

    // Skill selector
    const sel = document.getElementById('wheel-skill-select');
    if (sel) {
      sel.addEventListener('change', (e) => {
        currentSkillId = e.target.value;
        const s = S.getSettings();
        s.wheelSkillId = currentSkillId;
        S.saveSettings(s);
        update(0);
      });
    }

    // Drop zone
    const dz = document.getElementById('wheel-drop-zone');
    if (!dz) return;

    dz.addEventListener('dragover', (e) => {
      e.preventDefault();
      dz.classList.add('drag-active');
    });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-active'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('drag-active');
      const questId = e.dataTransfer.getData('questId');
      if (!questId) return;
      handleDrop(questId);
    });
  }

  function handleDrop(questId) {
    const quest = S.getQuest(questId);
    if (!quest) return;

    const dz = document.getElementById('wheel-drop-zone');

    const s = S.getSettings();
    if (s.dragToRegister !== false && !quest.isReadyToClaim) {
      dz && dz.classList.add('drag-rejected');
      setTimeout(() => dz && dz.classList.remove('drag-rejected'), 700);
      N.show('You must mark the quest complete first!', 'warning');
      return;
    }

    // Validate skill match (if not "overall", quest must target current skill)
    if (currentSkillId !== 'overall') {
      const tSkills = quest.targetSkills || [];
      const matches = tSkills.some(t => t.macroSkillId === currentSkillId);
      if (!matches) {
        dz && dz.classList.add('drag-rejected');
        setTimeout(() => dz && dz.classList.remove('drag-rejected'), 700);
        N.show('Quest does not match this skill', 'warning');
        return;
      }
    }

    const result = S.completeQuest(questId);
    if (!result) {
      N.show('Quest already completed today', 'info');
      return;
    }

    // Calc total XP for this skill
    let delta = 0;
    result.adjustedTargets.forEach(t => {
      if (currentSkillId === 'overall' || t.macroSkillId === currentSkillId) delta += t.xpAmount;
    });

    // Check boss
    if (quest.type === 'boss') {
      showBossComplete(quest, result.adjustedTargets);
    } else {
      update(delta);
      const overallDelta = result.adjustedTargets.reduce((s, t) => s + t.xpAmount, 0);
      const o = S.getOverall();
      const prevOverall = F.currentLevel((o.currentXP || 0) - overallDelta, o);
      if (o.currentLevel > prevOverall) N.levelUp('OVERALL', o.currentLevel, 'var(--accent)');

      result.adjustedTargets.forEach(t => {
        const m = S.getMacro(t.macroSkillId);
        if (m) {
          N.xpGain(m.name, t.xpAmount, m.accentColor);
          const prevLevel = F.currentLevel((m.currentXP || 0) - t.xpAmount, m);
          if (m.currentLevel > prevLevel) N.levelUp(m.name, m.currentLevel, m.accentColor);
        }
      });
      if (result.xpMultiplier >= 2) N.streakMilestone(quest.name, quest.streak);
    }

    S.emit('change');
  }

  function showBossComplete(quest, targets) {
    const overlay = document.getElementById('boss-overlay');
    const nameEl = document.getElementById('boss-quest-name');
    const xpEl = document.getElementById('boss-xp-list');
    const particles = document.getElementById('boss-particles');

    if (!overlay) return;
    if (nameEl) nameEl.textContent = quest.name;
    if (xpEl) {
      xpEl.innerHTML = targets.map(t => {
        const m = S.getMacro(t.macroSkillId);
        return `<div class="boss-xp-row" style="color:${m?.accentColor||'var(--accent)'}">+${t.xpAmount} XP → ${m?.name||'Unknown'}</div>`;
      }).join('');
    }

    if (particles) {
      particles.innerHTML = '';
      for (let i = 0; i < 80; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const tx = (Math.random() - 0.5) * 400;
        const ty = (Math.random() - 0.5) * 400 - 100;
        p.style.cssText = `
          left: 50%; top: 50%;
          --tx: ${tx}px; --ty: ${ty}px;
          width:${4+Math.random()*8}px;height:${4+Math.random()*8}px;
          background:${['var(--accent)','#f59e0b','#10b981','#ec4899','#fff'][Math.floor(Math.random()*5)]};
          animation-delay:${Math.random()*0.3}s;animation-duration:${0.8+Math.random()*1}s;
        `;
        particles.appendChild(p);
      }
    }

    // Play cinematic sound
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, type, time, dur, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
        gain.gain.setValueAtTime(0, ctx.currentTime + time);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + time + dur * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + dur);
      };
      
      // Majestic chord
      playTone(261.63, 'sine', 0, 1.5, 0.3); // C4
      playTone(329.63, 'sine', 0.1, 1.5, 0.3); // E4
      playTone(392.00, 'sine', 0.2, 1.5, 0.3); // G4
      playTone(523.25, 'triangle', 0.4, 2.0, 0.4); // C5
    } catch(e) { console.log('Audio not supported', e); }

    overlay.classList.add('active');
    update(targets.reduce((s, t) => s + t.xpAmount, 0));
  }

  return { renderHTML, init, update, handleDrop, currentSkillId: () => currentSkillId };
})();
