# Synthesis Report: Dashboard Migration

## Consensus
- **Component Creation**: Create `react-app/src/components/Dashboard.jsx`.
- **App.jsx Fix**: Update `react-app/src/App.jsx` to import `Dashboard` from `./components/Dashboard` instead of `./pages/Dashboard`.
- **JSX Conversion**: Convert legacy `js/views/dashboard.js` HTML string concatenations to React JSX, retaining the CSS class structure (which maps to Tailwind via `index.css`).
- **State Management**: Use `useEffect` to listen to `store.on('change', ...)` and sync component state with data from `store.js` (quests, macros, habituals, etc.). Import formulas from `formulas.js`.
- **Drag-and-Drop (Milestone 1.3)**: Implement React synthetic events. Add `draggable={true}` and `onDragStart` to quest cards. Add `onDragOver` and `onDrop` to the wheel drop zone to trigger `store.completeQuest(id)`.
- **Swipable Logging (Milestone 1.3)**: Implement React `onScroll` on the carousel container to update active dot navigation states.

## Resolved Conflicts
- **Wheel Porting vs Placeholder**: Explorer 3 suggested a placeholder for the Wheel, but Explorers 1 and 2 noted that the drag-and-drop functionality depends on the Wheel drop zone. **Resolution**: The Worker MUST port the wheel SVG logic from `js/components/wheel.js` into React (e.g., as a local `<Wheel />` component within `Dashboard.jsx`) so that drag-and-drop can be fully implemented.
- **Store Memory Leak**: Explorer 2 identified that `store.js` lacks an `off()` method, causing duplicate listeners in React strict mode. **Resolution**: The Worker MUST patch `react-app/src/lib/store.js` to implement an `off(event, callback)` method and use it in the `useEffect` cleanup function in `Dashboard.jsx`.
- **Component Location**: `SCOPE.md` specifies `components/Dashboard.jsx` but `App.jsx` looks in `pages/`. **Resolution**: Align with `SCOPE.md` by placing it in `components/Dashboard.jsx` and fix `App.jsx` to point to it.

## Dissenting Views
None remaining.

## Gaps
- Legacy global objects like `LM.components.notifications` and `LM.router` are not yet ported. The Worker should use simple placeholders (like `console.log` or generic `alert`s) when these are encountered.

## Worker Instructions
1. Create `react-app/src/components/Dashboard.jsx`.
2. Fix the import path in `react-app/src/App.jsx`.
3. Patch `react-app/src/lib/store.js` to add an `off` method for removing event listeners.
4. Implement the Dashboard layout, including state subscription (`useEffect`) and proper cleanup.
5. Port the Wheel SVG and implement the drag-and-drop logic (`onDragStart`, `onDrop`).
6. Ensure the carousel supports swipable logging via `onScroll`.
7. Build and run tests or `npm run dev` in `react-app` to verify no errors.
8. Deliver handoff report and message completion.
