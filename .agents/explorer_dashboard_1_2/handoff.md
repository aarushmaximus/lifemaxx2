# Handoff Report: Dashboard Migration Strategy

## Observation
- `SCOPE.md` specifies migrating `js/views/dashboard.js` to `react-app/src/components/Dashboard.jsx`.
- However, `react-app/src/App.jsx` (lines 4 and 28) imports `Dashboard` from `./pages/Dashboard`, not `./components/Dashboard`. Currently, neither `components/Dashboard.jsx` nor `pages/Dashboard.jsx` exist.
- `react-app/src/lib/store.js` implements a singleton store containing data getters (e.g., `getQuests()`, `getMacros()`, `getOverall()`) and actions (e.g., `completeQuest(id)`, `deleteQuest(id)`).
- `store.js` (lines 32-33) uses an event emitter (`on`, `emit`) to broadcast changes (`store.emit('change')`), but it lacks an `off` method to unsubscribe listeners.
- The legacy `js/views/dashboard.js` dynamically renders string templates (e.g., `renderQuestCards()`, `renderHabitualCards()`) mapped to specific CSS classes.
- The legacy `js/components/wheel.js` contains a complex SVG implementation with HTML5 Drag-and-Drop bindings (`dragover`, `drop`).
- The project CSS is configured with Tailwind (`react-app/src/index.css` maps LifeMaxx color variables, e.g., `--bg-base`, `--accent`).

## Logic Chain
1. **Component Location:** Since `App.jsx` looks for the dashboard at `./pages/Dashboard`, creating the component there (or updating the import in `App.jsx` to `./components/Dashboard`) is necessary to avoid compilation errors.
2. **State Subscription:** The dashboard must display reactive data. We must use `useEffect` to listen to `store.on('change', handler)`. Because `store.js` lacks an `off` function, the event listener will persist after unmount. Since `Dashboard` is a top-level page, this memory leak is minimal, but we should be aware of it or patch `store.js`.
3. **JSX Conversion:** The string-based renders in `dashboard.js` (`renderQuestCards`, etc.) translate directly to React `.map()` loops returning JSX. We can rely on existing CSS classes mapped to Tailwind utilities in `index.css`.
4. **Drag & Drop:** To satisfy the "Implement drag-and-drop and swipable logging" milestone, the `QuestCard` needs `draggable={true}` and an `onDragStart` handler. The main `Wheel` (which we port from `wheel.js` to a JSX element) needs `onDragOver` and `onDrop` to trigger `store.completeQuest(id)`.
5. **Component Modularity:** Given the large size of `dashboard.js` and `wheel.js`, migrating everything into a single `Dashboard.jsx` is feasible for Milestone 1 but should be split into smaller functional components within the file (e.g., `<Wheel />`, `<QuestCard />`, `<HabitualCard />`) to maintain readability.

## Caveats
- The legacy `wheel.js` has complex liquid SVG animations (`liquid-wave`, `liquid-wave-2`) and layout calculations. The initial React port might need to simplify this or directly port the SVG elements.
- The store's lack of an `off` method means multiple unmounts/remounts of `Dashboard.jsx` (e.g., during React StrictMode in development) will stack `change` listeners, potentially causing duplicate renders or performance issues.
- `SCOPE.md` specifies `components/Dashboard.jsx` but `App.jsx` expects `pages/Dashboard.jsx`. The implementer must decide whether to align with `App.jsx` or correct the import.

## Conclusion
**Recommended Fix Strategy:**
1. **Create the file:** Create `react-app/src/pages/Dashboard.jsx` (and update `SCOPE.md` mentally) to align with `App.jsx`.
2. **State Setup:** Use a `useEffect` hook to bind local state (`quests`, `macros`, `habituals`, `overall`, `chains`, `settings`) to `store.getX()` and subscribe via `store.on('change', ...)`.
3. **Port Layout:** Translate the HTML string templates from `js/views/dashboard.js` into modular React components (e.g., `QuestCard`, `QuestWheelType`) using JSX. Apply Tailwind and mapped CSS classes from `index.css`.
4. **Port Wheel & Drag-and-Drop:** Translate the SVG layout from `js/components/wheel.js` into a `<Wheel />` component within the file. Attach HTML5 `onDrop` events to the wheel and `onDragStart` events to the quest cards to call `store.completeQuest(questId)`.
5. **Patch Store (Optional but Recommended):** Modify `store.js` to return an unsubscribe function or implement an `off` method to prevent listener stacking in React's strict mode.

## Verification Method
1. Create `react-app/src/pages/Dashboard.jsx` based on the strategy.
2. Run the Vite development server (e.g., `npm run dev` or `uv run dev` if using bun/npm/yarn).
3. Open the browser to verify the dashboard renders without console errors.
4. Drag a quest card and drop it onto the wheel to ensure `store.completeQuest` is triggered and the UI updates reactively.
5. Invalidate the conclusion if `store.on` crashes due to strict mode stacking, in which case `store.js` MUST be patched with an `off()` mechanism.
