// LIFEMAXX — Theme (Unified Chrome Minimal + Accent Color)
window.LM.components.theme = (function () {
  const S = window.LM.store;

  function applyAccent(color) {
    document.documentElement.style.setProperty('--accent', color);
    // derive dimmed versions
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(color, 0.25));
    document.documentElement.style.setProperty('--accent-dim', hexToRgba(color, 0.1));
    const dot = document.getElementById('accent-dot');
    if (dot) dot.style.background = color;
  }

  function applyTheme(themeName) {
    // Legacy support: We no longer switch CSS variables based on theme name, 
    // as we now use a unified chrome-dark design system.
    document.documentElement.setAttribute('data-theme', 'chrome');
    
    // Set corresponding theme accents automatically if none is custom set
    const settings = S.getSettings();
    if (!settings.accentColor) {
      applyAccent('#E8E8E8'); // Default Chrome Metallic
    } else {
      applyAccent(settings.accentColor);
    }
  }

  function hexToRgba(hex, alpha) {
    // fallback if invalid hex
    if (!hex || hex.length < 7) return `rgba(232,232,232,${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function init() {
    const settings = S.getSettings();
    applyTheme('chrome');
    applyAccent(settings.accentColor || '#E8E8E8');
  }

  return { init, applyAccent, applyTheme };
})();
