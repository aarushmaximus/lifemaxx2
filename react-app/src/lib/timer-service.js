import { store } from './store.js';

const TIMER_KEY = 'lm_coach_timers';

class TimerService {
  constructor() {
    this.timers = [];
    this.listeners = [];
    this.interval = null;
    this.load();
    this.start();
  }

  load() {
    try {
      this.timers = JSON.parse(localStorage.getItem(TIMER_KEY) || '[]');
    } catch {
      this.timers = [];
    }
  }

  save() {
    localStorage.setItem(TIMER_KEY, JSON.stringify(this.timers));
    this.emit();
  }

  subscribe(fn) {
    this.listeners.push(fn);
    fn(this.timers);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  emit() {
    for (let fn of this.listeners) fn(this.timers);
  }

  start() {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => {
      let changed = false;
      const now = Date.now();
      
      this.timers = this.timers.map(t => {
        if (!t.done && now >= t.endsAt) {
          changed = true;
          this.fireTimerNotification(t);
          return { ...t, done: true };
        }
        return t;
      });

      if (changed) this.save();

      // Check fixed daily timers
      const st = store.getSettings();
      if (st.fixedTimers && st.fixedTimers.length > 0) {
        let ftChanged = false;
        const todayStr = new Date().toDateString();
        st.fixedTimers = st.fixedTimers.map(ft => {
          if (!ft.enabled) return ft;
          if (ft.lastFired === todayStr) return ft;
          
          const [h, m] = ft.timeStr.split(':').map(Number);
          const d = new Date();
          if (d.getHours() > h || (d.getHours() === h && d.getMinutes() >= m)) {
            this.fireFixedTimerNotification(ft);
            ftChanged = true;
            return { ...ft, lastFired: todayStr };
          }
          return ft;
        });
        if (ftChanged) {
          store.saveSettings(st);
        }
      }
    }, 1000);
  }

  fireTimerNotification(timer) {
    const settings = store.getSettings();
    if (!settings.timerNotificationsEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const n = new Notification('⏱ Fletcher · Timer Done', {
        body: `"${timer.label}" just finished. Get up. Move.`,
        tag: 'lifemaxx-timer-' + timer.id,
        renotify: true,
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch(e) {}
  }

  fireFixedTimerNotification(ft) {
    const settings = store.getSettings();
    if (!settings.timerNotificationsEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const n = new Notification('⏰ Fletcher · Daily Reminder', {
        body: `It's time for: ${ft.label}`,
        tag: 'lifemaxx-ftimer-' + ft.id,
        renotify: true,
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch(e) {}
  }

  addTimer(label, durationMs) {
    if (isNaN(durationMs) || durationMs <= 0) return;
    const newTimer = { id: 'tmr_' + Date.now(), label, durationMs, startedAt: Date.now(), endsAt: Date.now() + durationMs, done: false };
    this.timers = [...this.timers, newTimer];
    this.save();
    
    const settings = store.getSettings();
    if (settings.timerNotificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  deleteTimer(id) {
    this.timers = this.timers.filter(t => t.id !== id);
    this.save();
  }
}

export const timerService = new TimerService();
