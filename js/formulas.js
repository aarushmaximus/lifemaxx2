// LIFEMAXX — XP & Leveling Formulas
window.LM.formulas = (function () {

  function computeBase(skill) {
    return skill.totalXPtoL100 / Math.pow(100, skill.exponent);
  }

  function xpToReachLevel(level, skill) {
    if (level <= 0) return 0;
    const base = skill.base || computeBase(skill);
    return base * Math.pow(level, skill.exponent);
  }

  function levelCost(level, skill) {
    return xpToReachLevel(level + 1, skill) - xpToReachLevel(level, skill);
  }

  function currentLevel(xp, skill) {
    if (!xp || xp <= 0) return 0;
    const base = skill.base || computeBase(skill);
    return Math.floor(Math.pow(xp / base, 1 / skill.exponent));
  }

  function xpIntoCurrentLevel(xp, skill) {
    const lvl = currentLevel(xp, skill);
    return xp - xpToReachLevel(lvl, skill);
  }

  function xpRequiredForNextLevel(xp, skill) {
    const lvl = currentLevel(xp, skill);
    if (lvl >= 100) return levelCost(99, skill);
    return levelCost(lvl, skill);
  }

  function progressPercent(xp, skill) {
    const into = xpIntoCurrentLevel(xp, skill);
    const required = xpRequiredForNextLevel(xp, skill);
    if (!required) return 0;
    return Math.min(100, (into / required) * 100);
  }

  function formatXP(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return Math.round(n).toString();
  }

  function isWithinTimeWindow(timeWindow) {
    if (!timeWindow || !timeWindow.start || !timeWindow.end) return true;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = timeWindow.start.split(':').map(Number);
    const [endH, endM] = timeWindow.end.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Overnight window (e.g. 22:00 to 04:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  return { computeBase, xpToReachLevel, levelCost, currentLevel, xpIntoCurrentLevel, xpRequiredForNextLevel, progressPercent, formatXP, isWithinTimeWindow };
})();
