# Handoff Report: Dashboard Migration

## Observation
- **Target File**: `c:\Users\ajays\.gemini\antigravity\scratch\lifemaxxantigrav\react-app\src\components\Dashboard.jsx` (Currently does not exist).
- **Legacy Source**: `c:\Users\ajays\.gemini\antigravity\scratch\lifemaxxantigrav\js\views\dashboard.js` uses complex template literal strings to render DOM.
- **Store**: `react-app/src/lib/store.js` exports a `store` object with an event emitter interface (`store.on('change', cb)`) and accessors (e.g., `getMacros()`, `getQuests()`).
- **Dependencies**: The legacy dashboard relies heavily on `window.LM.formulas` (now available in `react-app/src/lib/formulas.js`) and `window.LM.components.wheel` (which has no React equivalent yet).
- **App.jsx**: `react-app/src/App.jsx` imports `Dashboard` from `./pages/Dashboard`, but the scope specifies creating it in `react-app/src/components/Dashboard.jsx`. 

## Logic Chain
1. The `dashboard.js` render function produces a multi-panel layout consisting of:
   - Wheel / History Split Layout (`dash-carousel-wrap`)
   - Macro Progress Panel (`dash-macros-panel`)
   - Statistics Row (`dash-macros-panel` containing stats)
   - Quest Type Selector (`quest-area-header`)
   - Quest / Habitual / Chain Carousel (`quest-list-carousel`)
2. Since `Dashboard.jsx` must be built from scratch, the migration should break the monolithic render function into smaller React sub-components or inline JSX blocks.
3. The legacy `wheel.js` has not been migrated yet. We must provide a placeholder (e.g., `<div className="wheel-placeholder">Wheel Area</div>`) in `Dashboard.jsx` to prevent blocking the UI layout.
4. For State (Milestone 1.2), the component should leverage `useEffect` to subscribe to `store.on('change', ...)` and synchronize React state with `store` data.
5. `App.jsx` currently imports `Dashboard` from `pages/Dashboard`. If we create it in `components/Dashboard.jsx` as scoped, we must update the import path in `App.jsx` so the application runs correctly.

## Caveats
- The legacy `wheel.js` integration is complex (SVG dynamic generation). A placeholder must be used for now until the wheel component is explicitly migrated.
- The drag-and-drop logic relies on HTML5 native drag events (`ondragstart`, `ondragend`) and interactions with a dropzone (which seems to be the wheel in the legacy app). The worker will need to adapt this for React.
- The `App.jsx` import path mismatch between `components/Dashboard.jsx` and `pages/Dashboard.jsx`. I recommend placing it in `components/Dashboard.jsx` per scope and updating `App.jsx`.

## Conclusion
The worker should build `react-app/src/components/Dashboard.jsx` as a functional React component. 
- **Milestone 1.1**: Translate the HTML strings from `js/views/dashboard.js` into JSX. Use placeholders for the `Wheel` component.
- **Milestone 1.2**: Initialize state via `store` getter methods (e.g., `store.getMacros()`, `store.getQuests()`) and subscribe to the `change` event in a `useEffect`.
- **Milestone 1.3**: Implement click handlers to interact with `store` (e.g., `store.completeQuest`, `store.awardXP`, `store.upsertHabitual`).

## Verification Method
- **Verify File Creation**: Ensure `react-app/src/components/Dashboard.jsx` is created.
- **Verify App.jsx**: Check that `react-app/src/App.jsx` properly imports `Dashboard` from the correct new location (`./components/Dashboard`).
- **Verify Reactivity**: Adding or modifying a quest in `store.js` should automatically trigger a re-render in the Dashboard through the `store.on('change')` listener.
- **Run project**: Run `npm run dev` in the `react-app` folder and confirm the dashboard renders without runtime crashes.
