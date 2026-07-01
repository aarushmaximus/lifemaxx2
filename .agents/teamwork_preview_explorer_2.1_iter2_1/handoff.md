# Handoff Report: Milestone 2.1 Bug Fix Strategy

## 1. Observation
- In `react-app/src/components/SkillHub.jsx`, at line 36: `const activeChains = chains.filter(c => c.steps.some(s => !s.completedAt)).length;`. There is no check if `c.steps` is defined before calling `.some()`.
- In `react-app/src/components/SkillHub.jsx`, at line 95: `<div className="..." style={{ '--sk-accent': macro.accentColor }}>`. If `macro.accentColor` is falsy or undefined, the CSS variable `--sk-accent` is not properly set, which breaks UI elements relying on `var(--sk-accent)` (e.g. line 99: `shadow-[0_0_14px_var(--sk-accent)]`).
- In `react-app/src/lib/store.js`, at line 40: `function emit(event, data) { listeners.filter(l => l.event === event).forEach(l => l.fn(data)); }`. The `.filter()` creates a new array snapshot of listeners, then `.forEach()` executes them. If a React component unmounts during this iteration (calling `store.off`), its listener is removed from the original `listeners` array, but it still executes because it remains in the filtered snapshot.

## 2. Logic Chain
- **Bug 1 (Crash):** If a chain object in `chains` lacks a `steps` array, `c.steps` evaluates to undefined. Calling `undefined.some()` throws a `TypeError`. Adding optional chaining (`c.steps?.some(...)`) or a logical OR fallback (`(c.steps || []).some(...)`) will prevent the crash.
- **Bug 2 (Visual):** The styling depends on the `--sk-accent` CSS variable being populated. Injecting a fallback color value at the declaration level (`macro.accentColor || '#7c3aed'`) guarantees that `--sk-accent` is always a valid color, thus preventing the UI glassmorphism elements from losing their color properties or breaking Tailwind arbitrary classes.
- **Bug 3 (Logic):** During `store.emit`, iterating over a shallow copy of listeners without verifying their continued presence in the main `listeners` array leads to stale callbacks firing. Adding a verification check (`if (listeners.includes(l))`) inside the loop ensures that only currently registered listeners receive the event.

## 3. Caveats
- The fallback color `#7c3aed` is chosen based on the default accent color found in `store.js` settings.
- It is assumed that Babel/build tools support optional chaining `?.` in the React environment. If not, `(c.steps || [])` should be used instead.
- The `listeners.includes(l)` check is an `O(N)` operation for each triggered event in `store.emit`, which could theoretically impact performance if the number of listeners is massive. However, for a standard React application data layer, `N` will be very small, making the performance impact negligible.

## 4. Conclusion
Apply the following precise fix strategy without changing the application's overall architecture:
1. **SkillHub.jsx (Line 36):** Update to `const activeChains = chains.filter(c => c.steps?.some(s => !s.completedAt)).length;`
2. **SkillHub.jsx (Line 95):** Update the style prop to `style={{ '--sk-accent': macro.accentColor || '#7c3aed' }}`.
3. **store.js (Line 40):** Refactor the `emit` function to:
   ```javascript
   function emit(event, data) {
     const snapshot = listeners.filter(l => l.event === event);
     snapshot.forEach(l => {
       if (listeners.includes(l)) l.fn(data);
     });
   }
   ```

## 5. Verification Method
- **Bug 1:** Inject a mock chain without `steps` into the store and verify the SkillHub page loads without throwing a `TypeError`.
- **Bug 2:** Mock a `macro` with `accentColor: undefined` and inspect the DOM element to ensure `--sk-accent: #7c3aed` is rendered as the inline style.
- **Bug 3:** Write a test script or use React to conditionally mount/unmount two components listening to the `change` event. Trigger `store.emit('change')` that unmounts the second component from the first listener, and verify the second listener's callback is not invoked.
