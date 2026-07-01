## Consensus
All three Explorers agree on the following steps for Milestone 4 (Coach Migration):
1. **Target Path**: `App.jsx` expects `Coach` to be imported from `react-app/src/pages/Coach.jsx`, not `components/Coach.jsx`.
2. **Dependencies**: `react-quill` must be installed in the React app (`npm install react-quill`).
3. **AI Engine Port**: The legacy `js/ai-engine.js` must be ported to `react-app/src/lib/ai-engine.js` to handle API calls to Gemini.
4. **Timer System**: The timer system is not part of `store.js`; it uses `localStorage` directly (`lm_coach_timers`). A custom hook or effect must be created to manage timers and browser notifications.
5. **Component Modularity**: The `Coach.jsx` page should be broken down into sub-components (Sidebar, Timer Panel, Chat Message Cards, Quest Proposals, Chat Input).

## Resolved Conflicts
- No conflicts. All explorers independently identified the mismatch in file path (pages vs components), the missing `react-quill` dependency, and the missing `ai-engine.js` port.

## Dissenting Views
- None.

## Gaps
- None. The strategy covers UI skeleton, state, rich text, and AI logic.
