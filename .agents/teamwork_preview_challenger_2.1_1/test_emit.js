const store = (() => {
  const listeners = [];
  function on(event, fn) { listeners.push({ event, fn }); }
  function off(event, fn) { 
    for (let i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i].event === event && listeners[i].fn === fn) {
        listeners.splice(i, 1);
      }
    }
  }
  function emit(event, data) { 
    listeners.filter(l => l.event === event).forEach(l => l.fn(data)); 
  }
  
  return { on, off, emit, listeners };
})();

let log = [];

function componentA() {
  log.push("componentA listener fired");
  // Component A unmounts Component B
  store.off('change', componentB);
  log.push("Component B unmounted (listener removed)");
}

function componentB() {
  log.push("componentB listener fired (THIS SHOULD NOT HAPPEN IF UNMOUNTED)");
}

store.on('change', componentA);
store.on('change', componentB);

store.emit('change', null);

console.log(log);
