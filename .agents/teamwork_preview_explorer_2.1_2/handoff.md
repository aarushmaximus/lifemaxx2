# Skill Hub Migration Analysis

## 1. Observation
- **Legacy View Structure**: `js/views/skill-hub.js` (lines 44-149) builds an HTML string using vanilla DOM elements and an `OPTIONS` array. It fetches data via `window.LM.store.getMacro(macroId)`, `getChains`, `getHabituals`, and `getStatistics`. 
- **Legacy Styling**: The HTML uses classes like `.skill-hub-view`, `.skill-hub-header`, and `.skill-hub-option`. It relies on an inline CSS variable `style="--sk-accent:${macro.accentColor};"` to dynamically color the UI.
- **CSS Availability**: `css/main.css` (lines 392-429) defines the glassmorphism styles for these classes (e.g., `background: rgba(255,255,255,0.03); backdrop-filter`). However, `react-app/src/index.css` does not import `main.css`, meaning these classes are not natively available in the React app.
- **Store API**: `react-app/src/lib/store.js` exports a `store` object with getters (e.g., `getMacro(id)`, `getHabituals()`) and an event emitter (`store.on('change', fn)`). `getMacro(id)` returns the macro object which includes the `microSkills` array representing the micro skill tree.

## 2. Logic Chain
1. **React Component State**: To connect to the data layer, `SkillHub.jsx` must accept a `macroId` prop. It should use `useState` to hold the `macro` (which contains the `microSkills` tree), `habituals`, `chains`, and `statistics`. A `useEffect` hook will populate this state on mount and subscribe to updates via `store.on('change', callback)`.
2. **Glassmorphism via Tailwind**: Since the legacy `.skill-hub-*` CSS classes are missing in the React workspace, we must recreate the exact visual appearance using standard Tailwind utility classes referencing variables in `index.css`.
3. **Dynamic Accents**: The legacy inline `--sk-accent` variable approach is sound. `SkillHub.jsx` should wrap its root div in `<div style={{ '--sk-accent': macro.accentColor }}>`. The child components (like the option cards) can then use Tailwind arbitrary values like `hover:border-[color:var(--sk-accent)]` to apply the dynamic color on hover.
4. **Tree Navigation**: The legacy code manually manipulates `LM.router.navigate`. For React, `SkillHub.jsx` should accept an `onNavigate(path)` prop to delegate routing to the parent (or React Router), ensuring the tree traversal (e.g., to `#skill/${macroId}` for micro skills) remains decoupled.

## 3. Caveats
- `store.on` supports adding listeners but does not appear to have an `off` or `removeListener` equivalent in `store.js`. We must be careful about memory leaks in React `useEffect` cleanups. We may need to add an `off` method to `store.js` or handle the listener globally.
- Milestone 2.2 handles the "Progress Bars & Modals", so the habitual creation form should merely be stubbed or omitted in 2.1.

## 4. Conclusion
**Implementation Strategy for `react-app/src/components/SkillHub.jsx`:**
- **Props**: Accept `macroId` and `onNavigate`.
- **Data Hook**: Use `useEffect` to fetch data from `store` (import `store` from `../lib/store.js`) and listen for changes.
- **Structure**:
  - Recreate the `OPTIONS` array (Quest, Habitual, Statistic, Chain Quests, Microskills, Widgets).
  - Wrap the component in `<div className="max-w-[600px] mx-auto" style={{ '--sk-accent': macro.accentColor }}>`.
- **Tailwind Mapping**:
  - Header: `flex items-center justify-between p-5 pb-3 gap-3`
  - Option Cards: `flex items-center gap-4 bg-white/5 border border-[var(--border)] rounded-xl p-4 cursor-pointer transition-all hover:bg-white/10 hover:shadow-lg hover:border-[color:var(--sk-accent)]`
- **Micro Skills Tree**: The `microskills` option click should trigger `onNavigate('microskills', macroId)`. The sub-skills data is structurally accessible via `macro.microSkills`.

## 5. Verification Method
- **Inspection**: Ensure `react-app/src/components/SkillHub.jsx` contains the Tailwind mappings and uses `store.getMacro`.
- **Testing**: Run the Vite dev server `cd react-app && npm run dev` and mount the component with a valid `macroId` to verify data loads and glassmorphism styling renders correctly.
