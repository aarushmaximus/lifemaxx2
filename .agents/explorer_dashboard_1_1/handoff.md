# Handoff Report: Dashboard Component Migration

## 1. Observation
- The target component `c:\Users\ajays\.gemini\antigravity\scratch\lifemaxxantigrav\react-app\src\components\Dashboard.jsx` does not exist yet.
- `c:\Users\ajays\.gemini\antigravity\scratch\lifemaxxantigrav\react-app\src\App.jsx` imports the dashboard from `./pages/Dashboard` on line 4, but `react-app/src/pages/` is empty.
- The legacy logic in `js/views/dashboard.js` uses vanilla JS template strings, DOM manipulation (`document.getElementById`), and relies heavily on a global object (`window.LM`).
- State access and manipulation are performed via `react-app/src/lib/store.js`, which exports a single `store` object with functions like `getQuests()`, `getMacros()`, and event listening (`store.on('change', callback)`). Formula functions are correctly placed in `react-app/src/lib/formulas.js` and can be imported.
- The SVG wheel layout logic is located in `js/components/wheel.js`, heavily utilizing vanilla DOM manipulations (e.g., updating `stroke-dashoffset` for XP). There is currently no `Wheel.jsx` React component in the `react-app`.

## 2. Logic Chain
1. **Component Creation (Milestone 1.1)**: We must create `react-app/src/components/Dashboard.jsx`. Since `App.jsx` attempts to import from `pages/Dashboard`, the implementer should also correct the import path in `App.jsx` to `./components/Dashboard`, or create an export wrapper in `pages/`. The JSX must replace the vanilla JS HTML strings found in `dashboard.js` (`render`, `renderQuestCards`, etc.).
2. **State Integration (Milestone 1.2)**: `Dashboard.jsx` needs to read initial state from `store` (macros, settings, quests, habituals, chains, stats). A React `useEffect` should subscribe to `store.on('change', ...)` to keep component state in sync when XP or quests are updated.
3. **Interactions (Milestone 1.3)**: 
   - **Drag-and-Drop**: Legacy `.quest-card` uses `ondragstart="LM.views.dashboard.onDragStart"`. This must be converted to React `onDragStart`. The wheel drop zone in `wheel.js` uses `dragover` and `drop` event listeners. These become `onDragOver` and `onDrop` in JSX.
   - **Swipable Logging**: The legacy system uses fluid CSS scroll-snap carousels (`dash-carousel-viewport` class with an `onscroll` event mapped to a function updating dot navigation state). This should be translated using React `onScroll` handlers and state variables for the active carousel index.
4. **Wheel Migration**: Because `window.LM.components.wheel` doesn't exist in React, the implementer will need to port the SVG generation from `wheel.js` (`renderHTML` and `renderMiniHTML`) into JSX, either directly in `Dashboard.jsx` or as a new `Wheel.jsx` file.

## 3. Caveats
- Global systems like `window.LM.components.notifications` and `LM.router` are not yet ported to React. The implementer should replace these with `console.log` or basic placeholder alerts for now.
- `wheel.js` handles animation and state logic internally using DOM queries (`document.getElementById('wheel-ring')`). In React, this needs to be refactored to rely on state values (like `progressPercent`) applied dynamically to inline styles (`style={{ strokeDashoffset: ... }}`).

## 4. Conclusion
To complete Milestone 1, the implementer needs to:
1. Create `react-app/src/components/Dashboard.jsx` and update `App.jsx`'s import.
2. Port the SVG wheel and HTML layout from `js/views/dashboard.js` and `js/components/wheel.js` to JSX.
3. Hook up data reading and writing via `import { store } from '../lib/store'` and `import { formulas } from '../lib/formulas'`.
4. Implement React synthetic events (`onDragStart`, `onDrop`, `onScroll`) to replace the legacy DOM event bindings for drag-and-drop completion and swipeable stats.

## 5. Verification Method
1. Run `npm run dev` in the `react-app/` folder.
2. Visit the local preview URL. The Dashboard should render without runtime errors.
3. Try dragging an active quest onto the wheel drop zone. The quest should be marked as completed (and disappear or change state), and the wheel's XP fill should update.
4. Swipe horizontally in the quest carousel or stats area to ensure the swipable interface handles navigation smoothly.
