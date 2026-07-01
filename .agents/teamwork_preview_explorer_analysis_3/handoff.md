# Observation
- The legacy `js/views/analysis.js` is an 877-line Vanilla JS module controlling the "Analysis & Chronicle" view.
- It comprises three primary tabs: `today`, `archive`, `progression`.
- State management heavily depends on the global `window.LM.store` object (e.g. `getDailyLog`, `getDailyLogs`, `getCellPresets`, `getMacros`, `getStatistics`, `getStatLogs`, `getWorkoutHistory`).
- The React App currently has a singleton `store` available at `lib/store.js` which exports the exact same data retrieval/update APIs used by the legacy codebase.
- **Crucial finding on AI Chat:** `analysis.js` contains roughly 200 lines of dead code (lines 585-761) pertaining to an AI Coach chat (`initChat`, `sendChatMessage`, `FLETCHER_SYSTEM_INSTRUCTION`). In the legacy `index.html`, the target container `#analysis-chat-history` is missing. A completely separate module (`coach.js`) now handles AI chat functionality globally.
- The `react-app/src/components` and `react-app/src/pages` directories are currently empty, implying we are building the component structure from scratch without established UI libraries (Tailwind utility classes are used directly).
- The SVG charts for 'Archive' (weekly stats) and 'Progression' (workout 1RM) are currently constructed dynamically via manual string interpolation in JS.

# Logic Chain
- Because the legacy file is massive (877 lines), porting it as a single monolithic React component would be unmaintainable. The React migration `Analysis.jsx` should act as a root container that manages the `activeTab` state and delegates rendering to three distinct functional sub-components (which can be colocated in the same file or separated if desired):
  1. `TodayTab`: Needs to render a 24-hour grid. It will maintain `activeCellIdx` in its local state. Modifying a cell will call `store.upsertDailyLog()`.
  2. `ArchiveTab`: Has complex sub-states: `mode` (`list`, `week_details`, `week_stats`), `activeWeekStart`, `expandedArchiveDate`, `archiveSortOrder`, and `collapsedWeeks`. This is best modeled with a `useReducer` or multiple `useState` hooks. 
  3. `ProgressionTab`: Maps the workout history into the Epley 1RM formula and passes the dataset to a `<WorkoutChart>` component.
- **Milestone 3.2 & 3.4 (SVG Graphs)**: The manual string concatenation of SVGs in legacy code (e.g. `` `<svg><polyline points="${points}" /></svg>` ``) translates directly and cleanly into declarative React JSX elements. Iterating over data points to generate `<circle>` elements is native to React.
- **State Updates**: Just as `App.jsx` listens to `store.on('change', ...)`, `Analysis.jsx` (or its subcomponents) must implement a `useEffect` that listens for `change` events on the store and triggers re-renders (via updating local state from the store getters).
- **Dead Code Elimination**: The AI Chat functionality in `analysis.js` must be strictly omitted from the React port to prevent duplication with `Coach.jsx`.

# Caveats
- Since the React `components/` folder is empty, I assume we are not abstracting things into reusable UI components (like `<Button />` or `<Card />`) for this milestone, and we will write Tailwind classes inline.
- The `CUTOFF_DATE` for archives is hardcoded to `2026-06-21` in legacy code. This logic should be ported to the React app, preferably as a constant.

# Conclusion
The migration strategy to `react-app/src/components/Analysis.jsx` is defined:
- **Architecture**: Create `Analysis.jsx` as the tab router. Implement `TodayTab`, `ArchiveTab`, and `ProgressionTab` as sub-components.
- **Data Hookup**: Use `import { store } from '../lib/store'` and subscribe to `store.on('change', handler)`.
- **Milestone 3.1 (Skeleton)**: Build the tab navigation and 24-hour `TodayTab` grid, wiring up cell status updates via `store.upsertDailyLog()`.
- **Milestone 3.2 (SVG Graphs)**: Port `renderStatChartsForWeek` to a `StatCharts` JSX component for the Archive tab.
- **Milestone 3.3 (Archive Drill-down)**: Implement `week_details` mode in `ArchiveTab`, handling state for `expandedArchiveDate` and inline statistic edits (`store.saveStatLogs()`).
- **Milestone 3.4 (Workout Charts)**: Implement `<ProgressionCharts />` parsing `workoutHistory` to calculate max estimated 1RM.
- **Omission**: Discard all AI Coach / Fletcher related functions from the port.

# Verification Method
- **Static Check**: Inspect `react-app/src/components/Analysis.jsx` for the absence of `FLETCHER_SYSTEM_INSTRUCTION` or chat UI logic.
- **Build/Run**: Run the Vite dev server (`npm run dev` in `react-app`).
- **Functional Testing**: Navigate to the Analysis tab. Click an hour block in "Today", assign a preset, and verify the UI updates immediately (confirming the store event listener works). Navigate to "Archive", expand a week, and confirm the SVG charts render correctly without errors.
