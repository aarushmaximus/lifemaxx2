// LIFEMAXX — Fixed Timer Notifier
// Fires browser push notifications at specific daily times set via /ftimer
window.LM.fixedTimerNotifier = (function () {
  const S = window.LM.store;
  let _intervalId = null;
  let _lastFiredDay = {}; // Map of timerId -> date string to prevent duplicate fires on the same day

  function requestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    return Notification.permission === 'granted';
  }

  function checkTimers() {
    const settings = S.getSettings();
    if (!settings.fixedTimers || settings.fixedTimers.length === 0) return;
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const todayStr = now.toDateString();

    settings.fixedTimers.forEach(timer => {
      if (!timer.enabled) return;

      const [thStr, tmStr] = timer.timeStr.split(':');
      const th = parseInt(thStr, 10);
      const tm = parseInt(tmStr, 10);

      // If we are currently at or past the minute, and we haven't fired today
      if (currentH > th || (currentH === th && currentM >= tm)) {
        if (_lastFiredDay[timer.id] !== todayStr) {
          fireNotification(timer);
          _lastFiredDay[timer.id] = todayStr;
        }
      }
    });
  }

  function fireNotification(timer) {
    try {
      const n = new Notification('Daily Reminder · Fletcher', {
        body: timer.label,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'lifemaxx-ftimer-' + timer.id, 
        renotify: true,
        silent: false,
      });

      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (err) {
      console.warn('Fixed timer notification failed:', err);
    }
  }

  function startLoop() {
    if (_intervalId) clearInterval(_intervalId);
    // Check every 30 seconds
    _intervalId = setInterval(checkTimers, 30000);
    // Check immediately on start
    checkTimers();
  }

  function init() {
    // Need to initialize the _lastFiredDay properly if we are starting up past a time
    // But we don't want to fire immediately if they just opened the app hours later, 
    // unless they specifically want to be nagged about missed ones. 
    // Let's assume we do want to fire if they missed it, up to them.
    requestPermission();
    startLoop();

    // Re-check on visibility change to catch missed ones while suspended (e.g. iOS PWA)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkTimers();
      }
    });
  }

  return { init, checkTimers };
})();
