# Migration Synthesis: Milestone 3 (js/views/analysis.js -> React)

## Consensus Architecture
1. **Component Structure**: `Analysis.jsx` (target: `react-app/src/components/Analysis.jsx`) will act as the root tab container. It should conditionally render three subcomponents:
   - `AnalysisToday` (or `TodayTab`): 24-hour heat map grid and daily stats.
   - `AnalysisArchive` (or `ArchiveTab`): Interactive archive with collapsable weeks and week stats.
   - `AnalysisProgression` (or `ProgressionTab`): Epley 1RM workout progression charts.
2. **SVG Porting**: String-interpolated SVGs from the legacy code (weekly stats, workout charts) must be ported directly to declarative JSX using `<svg>`, `<polyline>`, and `<circle>`, preserving the coordinate math.
3. **Dead Code Elimination**: All AI Chat / Fletcher logic (`initChat`, `sendChatMessage`, etc.) in `analysis.js` is dead code (handled by `Coach.jsx`) and MUST be omitted.
4. **Integration**: `App.jsx` currently imports `Analysis` from `./pages/Analysis`. Create `react-app/src/pages/Analysis.jsx` to export the component from `react-app/src/components/Analysis.jsx`.

## Critical Store Updates
The legacy `store.js` requires two critical updates to support this migration:
- **Implement `off(event, fn)`**: Since `Analysis.jsx` will mount and unmount when switching tabs, we must add an `off` method to `store.js` to avoid memory leaks.
- **Export `saveStatLogs`**: Required for editing past stats in the Archive tab.

## Data Hooks
- Components should use `useEffect` to subscribe to `store.on('change', handler)` and clean up with `store.off('change', handler)`. Updates should trigger local React state changes to re-render.
