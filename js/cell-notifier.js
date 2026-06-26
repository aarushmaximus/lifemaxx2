// LIFEMAXX — Fletcher's Hourly Cell Notifications
// Fires a browser push notification at the top of every hour
// asking the user to log their cell. Zero AI calls - all local.
window.LM.cellNotifier = (function () {
  const S = window.LM.store;

  // Fletcher's message pool - cynical but motivating
  const MESSAGES = [
    "Hey. Another hour just slipped by. You logging it or pretending it didn't happen?",
    "Top of the hour. What were you actually doing? Log it.",
    "Hour's up. Fletcher's watching. Fill in your cell.",
    "Time check. Don't lie to the grid — it remembers everything.",
    "One more hour down. Are you building something or just existing? Log it.",
    "The hour changed. Your cell didn't log itself. That's on you.",
    "Hey — I don't ask twice. What did you do this past hour?",
    "Clock hit the hour. The grid is waiting. Don't ghost it.",
    "Another hour in the books. Document it before your brain decides it didn't count.",
    "The hour just ended. I know you felt it. Now log it.",
    "Time's moving whether you track it or not. Log the hour.",
    "Hourly check. I'm not going to pretend that time just disappeared — are you?",
  ];

  let _intervalId = null;
  let _permissionGranted = false;

  function getRandomMessage() {
    return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  }

  function getHourLabel(hour) {
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h}:00 ${suffix}`;
  }

  async function requestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      _permissionGranted = true;
      return true;
    }
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    _permissionGranted = result === 'granted';
    return _permissionGranted;
  }

  function fireNotification() {
    const settings = S.getSettings();
    if (!settings.cellNotificationsEnabled) return;
    if (!_permissionGranted && Notification.permission !== 'granted') return;

    const now = new Date();
    const hour = now.getHours();
    const hourLabel = getHourLabel(hour);

    // Check if this hour's cell is already logged
    const todayStr = now.toDateString();
    const log = S.getDailyLog(todayStr);
    const cells = log.cells || Array(24).fill(null);
    const prevHour = (hour - 1 + 24) % 24; // the hour that just ended
    const prevCell = cells[prevHour];
    const alreadyLogged = prevCell && prevCell.status;

    if (alreadyLogged) return; // Don't nag if they already logged it

    const body = getRandomMessage();

    try {
      const n = new Notification('Fletcher · LifeMaxx', {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'lifemaxx-cell-hourly', // replace previous, don't stack
        renotify: true,
        silent: false,
      });

      n.onclick = () => {
        window.focus();
        if (window.LM?.router) {
          window.LM.router.navigate('#analysis');
        }
        n.close();
      };
    } catch (err) {
      console.warn('Cell notification failed:', err);
    }
  }

  function getMsUntilNextHour() {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 5, 0); // :00:05 — 5s buffer
    return nextHour - now;
  }

  function scheduleNextHour() {
    const msUntil = getMsUntilNextHour();
    setTimeout(() => {
      fireNotification();
      // Now set up a true hourly interval from this point
      _intervalId = setInterval(fireNotification, 60 * 60 * 1000);
    }, msUntil);
  }

  async function init() {
    const settings = S.getSettings();
    if (!settings.cellNotificationsEnabled) return;

    const granted = await requestPermission();
    if (!granted) {
      // Silently disable if user denied browser permission
      const st = S.getSettings();
      st.cellNotificationsEnabled = false;
      S.saveSettings(st);
      return;
    }

    scheduleNextHour();

    // Listen for the app waking up / becoming visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // App just woke up, check if we missed the hour
        fireNotification();
        // Reset the schedule since the previous setTimeout might be corrupted
        if (_intervalId) clearInterval(_intervalId);
        scheduleNextHour();
      }
    });
  }

  function enable() {
    requestPermission().then(granted => {
      if (granted) scheduleNextHour();
    });
  }

  function disable() {
    if (_intervalId) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
  }

  return { init, enable, disable, requestPermission };
})();
