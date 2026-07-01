# Handoff Report: Milestone 3 - Analysis Component Migration

## 1. Observation
- **Component Scope**: Legacy `js/views/analysis.js` (877 lines) renders three primary sub-views using raw string concatenation: 
  1. `Today` (24-hour log grid & daily stats)
  2. `Archive` (grouped weekly history, heatmaps, and past editing)
  3. `Progression` (SVG-based workout 1RM progression charts)
- **AI Chat Artifacts**: The file contains `initChat()` and `renderChatHistory()` logic referencing `#coach-input-text` and `#analysis-chat-history`. However, these DOM nodes are not rendered by `analysis.js` and have been relocated to `coach.js`.
- **Memory Leak Risk**: `react-app/src/lib/store.js` implements a custom event emitter (`on(event, fn)`) but entirely lacks an `off()` method to remove listeners. 
- **Missing Exports**: `store.js` does NOT export `saveStatLogs`, which is actively required by `analysis.js`'s `editPastStat` function to save past statistic modifications.
- **SVG Generation**: Visualizations use raw SVG `<polyline>` and `<circle>` tags, dynamically calculating X/Y pixel coordinates via simple math operations based on data extremums.

## 2. Logic Chain
1. **Component Architecture**: Because `Analysis` contains three dense and functionally distinct views, `Analysis.jsx` should serve strictly as a Tab layout wrapper. It must delegate rendering to three sub-components (e.g., `TodayTab`, `ArchiveTab`, `ProgressionTab`) to prevent an unmaintainable monolithic file.
2. **SVG Porting**: Because React requires declarative rendering, the string-based polyline logic (calculating `px` and `py` iteratively) must be mapped directly inside JSX `<svg>` tags using the exact same coordinate math (e.g., `(i / Math.max(1, data.length - 1)) * w`).
3. **State & Subscriptions**: Because React components mount and unmount repeatedly (e.g., tab switching in `App.jsx`), attaching `store.on('change', ...)` inside `useEffect` without an `off()` cleanup will rapidly leak memory. `lib/store.js` must be patched to implement and export an `off` function.
4. **Fixing Store Mutations**: Because the `Archive` tab requires editing historical stats (`editPastStat`), the implementer must add and export `saveStatLogs(list)` or an `upsertStatLog` method in `lib/store.js`.
5. **Pruning Dead Code**: Because the AI Chat UI is officially handled by the `Coach` view, we should intentionally omit all Fletcher/AI chat initialization and rendering code from the new `Analysis.jsx` components.

## 3. Caveats
- **Store Modification Assumption**: This plan assumes `react-app/src/lib/store.js` can be modified. If it strictly cannot, the implementer must create a singleton subscription manager hook (e.g. tracking if the listener was already bound) to prevent the `store.on` memory leak.
- **Stable React Keys**: The legacy codebase dynamically creates structural HTML without stable keys. The implementer must ensure iterators in React use stable identifiers (e.g., `dateStr`, `stat.id`, or generated UUIDs from the store) to avoid unnecessary re-renders.
- **Target Path Clarification**: `SCOPE.md` specifies `src/components/Analysis.jsx` as the target, but `App.jsx` currently imports `Analysis` from `./pages/Analysis`. The implementer should write to `components/Analysis.jsx` and either update `App.jsx` or re-export via `pages/Analysis.jsx`.

## 4. Conclusion
To achieve Milestone 3, the implementer should structure `react-app/src/components/Analysis.jsx` as a parent tab manager, breaking the UI into `TodayTab`, `ArchiveTab`, and `ProgressionTab` sub-components. Prior to porting the logic, the implementer must patch `react-app/src/lib/store.js` to include an `off(event, fn)` method for clean `useEffect` unmounting, and export `saveStatLogs(list)`. All string-based DOM and SVG manipulation must be converted into standard JSX state-driven renders, strictly omitting the orphaned AI Chat logic.

## 5. Verification Method
- **Build**: Run `npm run build` inside `react-app` to ensure JSX syntax and imports are valid.
- **Inspect**: Open `react-app/src/lib/store.js` and verify `off` and `saveStatLogs` are implemented and exported in the return block.
- **Test (Memory)**: Launch the app, navigate between the `Analysis` and `Dashboard` tabs 10+ times, and verify via DevTools that duplicate event listeners are not piling up in the store.
- **Test (Features)**: Open the Analysis view and verify that SVG lines render correctly in the Progression tab and that past stat editing persists in the Archive tab.
