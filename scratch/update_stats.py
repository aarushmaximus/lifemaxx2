import re

with open('js/views/stats.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_content = """window.LM.views.stats = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;

  function getTimeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'JUST NOW';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}M AGO`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}H AGO`;
    const d = Math.floor(h / 24);
    return `${d}D AGO`;
  }

  function renderRadarChart(macros) {
    if (macros.length === 0) return '';
    const cx = 200;
    const cy = 200;
    const R = 150; // Max radius to match Stitch SVG
    const n = macros.length;

    const maxLevel = Math.max(10, ...macros.map(m => m.currentLevel || 0));

    // Player Data Polygon
    const playerPoints = [];
    const circles = [];
    
    for (let i = 0; i < n; i++) {
      const level = macros[i].currentLevel || 0;
      const ratio = Math.max(0.15, level / maxLevel);
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      const x = cx + R * ratio * Math.cos(angle);
      const y = cy + R * ratio * Math.sin(angle);
      
      playerPoints.push(`${x},${y}`);
      circles.push(`<circle class="drop-shadow-[0_0_5px_#00e5ff]" cx="${x}" cy="${y}" fill="#00e5ff" r="5"></circle>`);
    }

    return `
      <polygon class="radar-path" fill="rgba(255, 45, 120, 0.15)" points="${playerPoints.join(' ')}" stroke="#ff2d78" stroke-width="3"></polygon>
      ${circles.join('')}
    `;
  }

  function render() {
    const macros = S.getMacros();
    const overall = S.getOverall();
    const xpLog = S.getXPLog().slice(-20).reverse(); // last 20 entries
    
    // For the stats boxes, we map macros to short strings
    // We only take the first 5 macros to fit the Stitch UI boxes, or just map them dynamically.
    const displayMacros = macros.slice(0, 5);

    // Calculate dynamic radar labels
    const n = macros.length;
    const cx = 200, cy = 200, R = 150;
    let labelsHTML = '';
    
    for (let i = 0; i < n; i++) {
        const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
        const x = cx + (R + 30) * Math.cos(angle);
        const y = cy + (R + 15) * Math.sin(angle);
        const name = macros[i].name.substring(0, 8).toUpperCase();
        labelsHTML += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="12" class="font-label-sm text-primary drop-shadow-[0_0_3px_#00e5ff]">${name}</text>`;
    }

    return `
      <!-- Global Visual Overlays -->
      <div class="fixed inset-0 wireframe-grid z-0 pointer-events-none opacity-40"></div>
      <div class="fixed inset-0 scanline-overlay z-50 opacity-20 pointer-events-none"></div>
      
      <div class="relative z-20 pt-24 pb-32 px-4 md:px-12 max-w-7xl mx-auto page-enter">
        <!-- Hero Section: Lifetime XP -->
        <div class="relative mb-12 flex flex-col items-center justify-center pt-16 pb-12 overflow-visible">
          <div class="absolute inset-0 flex items-center justify-center -z-10 opacity-60">
            <div class="w-80 h-80 synth-sun rounded-full"></div>
          </div>
          <p class="font-label-sm text-secondary uppercase tracking-[0.5em] mb-2 drop-shadow-[0_0_5px_rgba(255,45,120,0.5)]">LIFETIME EXPERIENCE</p>
          <h2 class="font-display-xl text-primary text-[80px] md:text-[120px] drop-shadow-[0_0_25px_rgba(0,229,255,0.7)] select-none italic">${(overall.currentXP / 1000).toFixed(1)}K</h2>
          <div class="w-64 h-1 bg-gradient-to-r from-transparent via-secondary to-transparent mt-4 opacity-70"></div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Radar Chart Section -->
          <section class="lg:col-span-7 bg-surface-container/40 backdrop-blur-xl border-l-4 border-primary p-8 relative overflow-hidden shadow-[0_0_40px_rgba(0,229,255,0.1)] group">
            <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span class="material-symbols-outlined text-9xl text-primary">analytics</span>
            </div>
            <h3 class="font-headline-md text-primary mb-8 flex items-center gap-2 drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">
              <span class="material-symbols-outlined">radar</span> ATTRIBUTE SPREAD
            </h3>
            
            <div class="relative w-full aspect-square max-w-md mx-auto">
              <svg class="w-full h-full transform -rotate-18 overflow-visible" viewbox="-20 -20 440 440">
                <!-- Grid Lines -->
                <circle cx="200" cy="200" fill="none" r="150" stroke="rgba(0, 229, 255, 0.15)" stroke-width="1"></circle>
                <circle cx="200" cy="200" fill="none" r="100" stroke="rgba(0, 229, 255, 0.15)" stroke-width="1"></circle>
                <circle cx="200" cy="200" fill="none" r="50" stroke="rgba(0, 229, 255, 0.15)" stroke-width="1"></circle>
                
                <!-- Axes -->
                ${macros.map((m, i) => {
                  const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
                  const x = 200 + 150 * Math.cos(angle);
                  const y = 200 + 150 * Math.sin(angle);
                  return `<line stroke="rgba(0, 229, 255, 0.3)" stroke-dasharray="4" x1="200" x2="${x}" y1="200" y2="${y}"></line>`;
                }).join('')}
                
                ${renderRadarChart(macros)}
                ${labelsHTML}
              </svg>
            </div>
            
            <div class="mt-12 grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
              ${displayMacros.map(m => `
                <div class="p-2 border border-primary/20 bg-primary/5 rounded-sm">
                  <div class="text-[10px] text-primary/70 font-label-sm">${m.name.substring(0,3).toUpperCase()}</div>
                  <div class="text-primary font-bold">${m.currentLevel || 0}</div>
                </div>
              `).join('')}
            </div>
          </section>

          <!-- XP Action Log Section -->
          <section class="lg:col-span-5 flex flex-col h-[600px] mt-12 lg:mt-0">
            <div class="bg-surface-container/40 backdrop-blur-xl border-l-4 border-secondary p-8 h-full flex flex-col shadow-[0_0_40px_rgba(255,45,120,0.1)]">
              <h3 class="font-headline-md text-secondary mb-6 flex items-center gap-2 drop-shadow-[0_0_8px_rgba(255,45,120,0.5)]">
                <span class="material-symbols-outlined">history</span> XP ACTION LOG
              </h3>
              
              <div class="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                ${xpLog.length > 0 ? xpLog.map(l => {
                  const macro = macros.find(m => m.id === l.macroId);
                  const name = macro ? macro.name : 'System';
                  const isPositive = l.delta >= 0;
                  const colorClass = isPositive ? 'text-secondary' : 'text-danger';
                  return `
                    <div class="group p-4 bg-secondary/5 border border-secondary/20 hover:bg-secondary/15 transition-all cursor-pointer glitch-hover">
                      <div class="flex justify-between items-start">
                        <div>
                          <h4 class="font-bold text-on-surface text-sm uppercase tracking-wider truncate max-w-[200px]">${l.reason || 'Data Injected'}</h4>
                          <p class="text-xs text-on-surface-variant mt-1">${name} Module</p>
                        </div>
                        <span class="font-headline-md ${colorClass}">${isPositive ? '+' : ''}${l.delta} XP</span>
                      </div>
                      <div class="mt-2 text-[10px] text-secondary/50 font-label-sm">${getTimeAgo(l.timestamp)}</div>
                    </div>
                  `;
                }).join('') : `<div class="text-center font-mono text-sm text-on-surface-variant py-8">NO ACTIVITY DETECTED</div>`}
              </div>
              
              <button class="w-full mt-6 py-3 bg-secondary/10 border-2 border-secondary text-secondary font-headline-md uppercase tracking-widest hover:bg-secondary hover:text-white transition-all active:scale-95 shadow-[0_0_15px_rgba(255,45,120,0.3)]" onclick="window.LM.store.exportData()">
                DOWNLOAD FULL AUDIT
              </button>
            </div>
          </section>
        </div>
        
        <!-- 3D Perspective Landscape Floor -->
        <div class="mt-20 w-full h-48 relative perspective-floor">
          <div class="perspective-grid absolute top-0 left-0"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-surface pointer-events-none"></div>
        </div>
      </div>
    `;
  }

  function init() {}

  return { render, init };
})();"""

with open('js/views/stats.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updated stats.js")
