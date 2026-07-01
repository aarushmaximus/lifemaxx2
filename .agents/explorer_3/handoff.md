# Handoff: Milestone 4 - Coach Migration Analysis

## 1. Observation
- Legacy `coach.js` manages chat state, commands (`/timer`, `/quest`), and timer logic.
- React `store.js` already contains chat management methods (`getCoachChats`, `upsertCoachChat`, etc.), but does not include timer storage (timers are kept in `lm_coach_timers` via direct `localStorage`).
- AI capabilities are powered by `js/lib/ai-engine.js` which is currently missing from the React `src/lib/` directory.
- `package.json` does not include `react-quill` or `quill`.

## 2. Logic Chain
- Because timers are independent of `store.js` in legacy, the React version must recreate this localStorage syncing logic (e.g. via a custom hook).
- Because `ai-engine.js` is missing, it must be ported before AI responses can function in `Coach.jsx`.
- Because Milestone 4.2 requires Quill, we must recommend installing `react-quill` and wrapping the chat input to handle HTML.
- The UI requires distinct sub-components (Sidebar, Timer Panel, Chat Message Cards) to cleanly manage the complex layouts (especially the interactive Quest/Chain proposal cards).

## 3. Caveats
- I did not write the actual React components as I am restricted to read-only investigation.
- It is assumed that the UI designer/implementer will match the exact Tailwind classes for the 'metallic' user bubbles and dark coach bubbles.

## 4. Conclusion
The implementation of `Coach.jsx` should be split into a container page and modular sub-components for the sidebar, timer, and chat bubbles. Porting `ai-engine.js` and installing `react-quill` are immediate prerequisites for full functionality.

## 5. Verification Method
- Ensure `react-quill` is installed.
- Verify `react-app/src/lib/ai-engine.js` exists and handles API calls.
- Run `npm run dev` and navigate to the Coach tab to test the UI layout and state toggling.
