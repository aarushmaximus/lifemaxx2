// LIFEMAXX — Theme (dark/light/neon/aero + accent color)
window.LM.components.theme = (function () {
  const S = window.LM.store;

  function applyAccent(color) {
    document.documentElement.style.setProperty('--accent', color);
    // derive dimmed versions
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(color, 0.35));
    document.documentElement.style.setProperty('--accent-dim', hexToRgba(color, 0.12));
    const dot = document.getElementById('accent-dot');
    if (dot) dot.style.background = color;
  }

  function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    
    // Maintain backward-compatibility for CSS selectors relying on data-aero-off
    if (themeName === 'aero') {
      document.documentElement.removeAttribute('data-aero-off');
    } else {
      document.documentElement.setAttribute('data-aero-off', 'true');
    }

    // Set corresponding theme accents automatically if none is custom set
    const settings = S.getSettings();
    if (!settings.accentColor) {
      let defaultAccent = '#7c3aed';
      if (themeName === 'aero') defaultAccent = '#0ea5e9';
      if (themeName === 'neon') defaultAccent = '#ff4a8d';
      applyAccent(defaultAccent);
    } else {
      applyAccent(settings.accentColor);
    }
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function init() {
    const settings = S.getSettings();
    // Default to 'aero' if no theme is saved yet
    const currentTheme = settings.theme || 'aero';
    applyTheme(currentTheme);
    applyAccent(settings.accentColor || (currentTheme === 'aero' ? '#0ea5e9' : currentTheme === 'neon' ? '#ff4a8d' : '#7c3aed'));
  }

  return { init, applyAccent, applyTheme };
})();
