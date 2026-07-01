# Observation
1. In `react-app/src/components/SkillHub.jsx` line 36: `const activeChains = chains.filter(c => c.steps.some(s => !s.completedAt)).length;`. It directly accesses `.some()` on `c.steps` without checking if it exists.
2. In `react-app/src/components/SkillHub.jsx` line 95: `<div ... style={{ '--sk-accent': macro.accentColor }}>`. If `macro.accentColor` is null or undefined, the CSS variable will lack a value.
3. In `react-app/src/lib/store.js` line 40: `function emit(event, data) { listeners.filter(l => l.event === event).forEach(l => l.fn(data)); }`. It filters listeners into an array, and then iterates over them. If a callback function `fn` unregisters itself or another listener by calling `store.off()`, that listener is removed from the original `listeners` array, but since `emit` is iterating over the filtered copy, it will still execute the removed listener's callback.

# Logic Chain
1. **Bug 1 (Critical)**: When `store.getChains(mId)` returns chains without a `steps` array, `c.steps` is undefined. Calling `.some()` on undefined throws a `TypeError`, crashing the React component tree. The fix is to use optional chaining `c.steps?.some(...)` or explicitly check `c.steps && c.steps.some(...)`.
2. **Bug 2 (Visual)**: The glassmorphism UI relies on `--sk-accent` being a valid color. If `macro.accentColor` is falsely or undefined, the inline style will be invalid, cascading breakages to `var(--sk-accent)` usages across the component. Providing a default value like `style={{ '--sk-accent': macro.accentColor || '#7c3aed' }}` ensures the CSS variable always has a valid color.
3. **Bug 3 (Logic)**: In `store.js`, when a React component handles a store update, it might unmount and call `store.off()`. However, because `store.emit()` iterates through a previously evaluated array copy (`listeners.filter`), it doesn't check if the listener is still registered at the exact moment of execution. This triggers a React state update on an unmounted component, generating a warning and potential memory leaks or race conditions. The fix is to check if the listener still exists in the original `listeners` array inside the `.forEach` loop before executing it.

# Caveats
- Optional chaining syntax `?.` requires build tools to support it. Since it's a Vite + React setup, it is fully supported, but a traditional `&&` check is completely backward-compatible.
- The default accent color `#7c3aed` (purple) was chosen based on the instructions and common defaults, it should match the theme intent.

# Conclusion
The bugs in Milestone 2.1 implementation can be fixed as follows:
- **SkillHub.jsx (line 36):** Update to `const activeChains = chains.filter(c => c.steps && c.steps.some(s => !s.completedAt)).length;` or use optional chaining `c.steps?.some(...)`.
- **SkillHub.jsx (line 95):** Update the inline style to use a fallback color: `style={{ '--sk-accent': macro.accentColor || '#7c3aed' }}`.
- **store.js (line 40):** Update the `emit` function to verify listener presence before invoking:
  ```javascript
  function emit(event, data) { 
    const currentListeners = listeners.filter(l => l.event === event);
    currentListeners.forEach(l => {
      if (listeners.includes(l)) {
        l.fn(data);
      }
    });
  }
  ```

# Verification Method
1. Create a chain without a `steps` array in the store and ensure `SkillHub.jsx` loads without throwing a `TypeError`.
2. Clear or delete the `accentColor` attribute on a macro in `localStorage` and confirm the UI still renders the fallback color `#7c3aed` properly in `SkillHub`.
3. Mount and rapidly unmount a component that subscribes to the store, trigger an `emit`, and ensure React does not log a state update warning on the unmounted component. Tests running in a React testing environment checking for console warnings can enforce this.
