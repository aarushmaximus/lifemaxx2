// LIFEMAXX — Theme (dark/light + accent color)
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

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const iconDark = document.getElementById('icon-dark');
    const iconLight = document.getElementById('icon-light');
    if (iconDark) iconDark.style.display = theme === 'dark' ? '' : 'none';
    if (iconLight) iconLight.style.display = theme === 'light' ? '' : 'none';
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function init() {
    const settings = S.getSettings();
    applyTheme(settings.theme || 'dark');
    applyAccent(settings.accentColor || '#7c3aed');

  }

  return { init, applyAccent, applyTheme };
})();
