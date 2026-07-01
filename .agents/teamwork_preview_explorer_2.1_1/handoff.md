# Handoff Report: Skill Hub Migration (Milestone 2.1)

## Observation
- `js/views/skill-hub.js` is a vanilla JS view rendering a dashboard for a specific Macro Skill (`macroId`).
- Data access is handled via `window.LM.store`, using methods like `getMacro(macroId)`, `getHabituals()`, `getStatistics()`, and `getChains(macroId)`.
- It relies on dynamic inline styles (e.g., `macro.accentColor`) to colorize the view and badges.
- It contains a hidden "Create Habitual" form that is toggled via direct DOM manipulation (`style.display='none' / 'block'`).
- The UI renders lists of active habituals and statistics, and a grid of 6 navigation buttons (Create Quest, Create Habitual, Create Statistic, Chain Quests, Microskills, Widgets). Some options contain notification badges.
- Actions like opening modals rely on global objects: `LM.components.questModal.open()` and `LM.components.statModal.open()`.
- Routing uses `LM.router.navigate()`.
- `react-app/src/lib/store.js` implements a custom event emitter (`on` and `emit`), but lacks an `off` or `removeListener` method.
- `react-app/src/index.css` defines CSS variables (e.g., `--bg-surface`, `--border`) and a utility class `.glass-panel` for the glassmorphism aesthetic.

## Logic Chain
1. **Component Structure**: `SkillHub.jsx` should be a functional React component. The `macroId` will be retrieved from route parameters (e.g., via `useParams()` from `react-router-dom`). The component should be modularized internally into `SkillHeader`, `XPProgressBar`, `CreateHabitualPanel`, `ActiveHabituals`, `ActiveStatistics`, and `OptionsGrid` for maintainability.
2. **State Management**: Data fetched from `store.js` needs to be mapped to local React state (`useState`). A `useEffect` hook must be used to listen for the `'change'` event from `store.js` to re-fetch and re-render the view when the data updates.
3. **Store Fix Requirement**: Because React components mount and unmount over their lifecycle, leaving event listeners attached in `useEffect` will cause a memory leak. `react-app/src/lib/store.js` must be updated to include an `off(event, fn)` method which can be called in the `useEffect` cleanup function.
4. **Interactivity**: The vanilla DOM toggle for the "Create Habitual" panel should be replaced with a boolean React state (`isHabitualPanelOpen`) that conditionally renders the form.
5. **Styling & Glassmorphism**: The legacy CSS should be replaced by Tailwind classes and the existing `.glass-panel` utility defined in `index.css`. Variables like `--text-3` or `--bg-surface` can be utilized directly in Tailwind arbitrary properties (e.g., `bg-[var(--bg-surface)]`) or via direct CSS usage. Dynamic styling relying on data (e.g., `macro.accentColor`) must be preserved using React's inline `style` prop (e.g., `style={{ '--sk-accent': macro.accentColor, color: macro.accentColor }}`).
6. **Navigation & Modals**: `LM.router.navigate` should be substituted with React Router's `useNavigate`. The missing global modal functionality (`LM.components.statModal`) necessitates either implementing modal state locally in `SkillHub.jsx` or creating a React context-based modal manager later.

## Caveats
- Modals (`QuestModal`, `StatModal`) are out of scope for this specific UI structure step, but they are referenced in the vanilla JS click handlers. Their implementations will need to be provided or mocked for full functionality.
- I assume `react-router-dom` is the routing library in use since it is the standard for Vite/React applications.

## Conclusion
To migrate `SkillHub.js` effectively:
1. **Update `store.js`**: Add `function off(event, fn) { listeners = listeners.filter(l => !(l.event === event && l.fn === fn)); }` and ensure it is exported.
2. **Setup Component State**: Create `SkillHub.jsx` using `useState` and `useEffect` to bind to `store.js`. Ensure you return a cleanup function in `useEffect` that calls `store.off('change', updateData)`.
3. **Structure UI Components**: Map the Vanilla string templates into React fragments: a header, an XP bar, a conditional habitual creation form, active lists, and an options grid mapped from an array.
4. **Style Implementation**: Use Tailwind utility classes alongside `.glass-panel` for layout and aesthetic matching. Apply `macro.accentColor` via the `style` prop for dynamic coloring.
5. **Update Navigation**: Replace legacy router calls with `useNavigate()`.

## Verification Method
- Execute the local dev server (`npm run dev` in `react-app`) and navigate to the Skill Hub component.
- Confirm that `SkillHub.jsx` renders without errors and accurately displays a dummy `macroId` from `store.js`.
- Test the "change" event by manually triggering an update in `store.js` (e.g., adding a habitual) and verify the React component automatically re-renders.
- Verify memory leak prevention by checking that `store.listeners` length decreases when navigating away from the `SkillHub` component.
