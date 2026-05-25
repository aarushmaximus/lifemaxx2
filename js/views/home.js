// LIFEMAXX — Home Splash Overlay
window.LM.views.home = (function () {
  const S = window.LM.store;
  const DEFAULT_GREETINGS = ['welcome, aarush', 'locking in time aarush??', 'salutations batman'];

  function getGreeting() {
    const g = S.getSettings().greetings || DEFAULT_GREETINGS;
    return g[Math.floor(Math.random() * g.length)];
  }

  function show() {
    const overlay = document.getElementById('home-overlay');
    if (!overlay) return;
    overlay.innerHTML = `
      <div class="home-bg-blur"></div>
      <div class="home-bg-sharp" id="home-bg-sharp"></div>
      <div class="home-vignette"></div>
      <div class="home-content">
        <div class="home-eyebrow">— LIFEMAXX —</div>
        <div class="home-card">
          <h1 class="home-greeting">${getGreeting()}</h1>
        </div>
        <div class="home-cta">${'ontouchstart' in window ? 'tap anywhere to begin' : 'click anywhere to begin'}</div>
      </div>`;
    overlay.style.display = 'block';
    requestAnimationFrame(() => overlay.classList.add('home-visible'));
    initInteractions(overlay);
  }

  function hide(cb) {
    const overlay = document.getElementById('home-overlay');
    if (!overlay) return cb && cb();
    overlay.classList.remove('home-visible');
    setTimeout(() => { overlay.style.display = 'none'; cb && cb(); }, 650);
  }

  function initInteractions(overlay) {
    const sharp = document.getElementById('home-bg-sharp');
    let expandTimer;

    // Set initial center position
    sharp.style.setProperty('--mx', '50%');
    sharp.style.setProperty('--my', '50%');
    sharp.style.setProperty('--radius', '0px');
    setTimeout(() => sharp.style.setProperty('--radius', '80px'), 200);

    overlay.addEventListener('mousemove', (e) => {
      clearTimeout(expandTimer);
      sharp.style.setProperty('--mx', e.clientX + 'px');
      sharp.style.setProperty('--my', e.clientY + 'px');
      sharp.style.setProperty('--radius', '120px');
      expandTimer = setTimeout(() => sharp.style.setProperty('--radius', '210px'), 700);
    });

    overlay.addEventListener('mouseleave', () => sharp.style.setProperty('--radius', '60px'));

    overlay.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      sharp.style.setProperty('--mx', t.clientX + 'px');
      sharp.style.setProperty('--my', t.clientY + 'px');
      sharp.style.setProperty('--radius', '120px');
    }, { passive: true });

    overlay.addEventListener('click', enter);
    function onKey(e) {
      if (['Enter', ' '].includes(e.key)) { document.removeEventListener('keydown', onKey); enter(); }
    }
    document.addEventListener('keydown', onKey);

    function enter() {
      overlay.removeEventListener('click', enter);
      hide(() => { window.location.hash = '#dashboard'; });
    }
  }

  return { show, hide, DEFAULT_GREETINGS };
})();
