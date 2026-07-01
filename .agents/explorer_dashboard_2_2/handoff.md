# Handoff Report: Dashboard Fix Strategy

## 1. Observation
- **Tailwind Styling**: Reviewers noted that `react-app/src/components/Dashboard.jsx` uses legacy CSS classes (e.g., `dashboard-grid`, `dash-center`, `quest-card`, `habitual-card`) which were not migrated. `react-app/src/index.css` contains only Tailwind imports and a few custom variables, leaving the dashboard unstyled.
- **Routing Bug**: In `Dashboard.jsx` (line 202), the "Start Workout" button sets `window.location.hash = '#workout/' + quest.id`. However, the React application (`App.jsx`, line 10) controls routing via a local `activeTab` state and ignores the window hash.
- **Drag-and-Drop Bug**: In `Dashboard.jsx` (lines 205-207), the "Complete" button's `onClick` handler unconditionally calls `store.completeQuest(quest.id)`. This instantly completes the quest and awards XP, preventing the quest from ever entering the `isReadyToClaim` state required for the drag-to-register wheel.
- **XP Exploit**: In `Dashboard.jsx` (lines 249 and 256), the `HabitualCard` action buttons have `disabled={!isPending && !isYes}` and `disabled={!isPending && !isNo}`. When a user clicks 'Yes', `isYes` becomes true, causing the disabled condition to evaluate to `false`. The button remains active and clickable, allowing the user to repeatedly invoke `setStatus('yes')` and gain infinite XP.

## 2. Logic Chain
- **Tailwind**: Since legacy CSS is absent from the React build, structural elements and cards must be styled using Tailwind utility classes and the custom CSS variables mapped in `index.css` (e.g., using `flex`, `grid`, `bg-[#181820]` or `bg-[var(--bg-raised)]`, `p-4`, `rounded-xl`).
- **Routing**: `App.jsx` manages the active view. `Dashboard` must receive `setActiveTab` as a prop (`<Dashboard setActiveTab={setActiveTab} />`) and the "Start Workout" button must invoke `setActiveTab('workout')` (and optionally pass the quest ID if a global workout state manager is implemented).
- **Drag-and-Drop**: The drag-to-register flow requires a two-step completion. The "Complete" button must check `settings.dragToRegister`. If true, it should call `store.markQuestReady(quest.id)` to enable dragging. If false, it should call `store.completeQuest(quest.id)` directly.
- **XP Exploit**: A habitual task can only be answered once per day. The `disabled` property for both 'Yes' and 'No' buttons must simply evaluate to `!isPending`. Once a task is answered, it is no longer pending, and the buttons should strictly lock to prevent further XP awards.

## 3. Caveats
- Visual discrepancies may occur when manually translating legacy CSS to Tailwind classes, but functional layouts (grid, flex) and colors are the primary concern.
- The `Workout` view does not currently exist in `App.jsx`. Routing to `'workout'` will render an empty main area. This is expected behavior for this milestone, as the goal is to integrate with React's routing state, not to build the Workout view.
- We rely on `store.markQuestReady()` functioning correctly in `store.js` as it is responsible for toggling the draggable state.

## 4. Conclusion
The Worker agent must implement the following fixes in `Dashboard.jsx` and `App.jsx`:
1. **Styling**: Replace legacy class names with Tailwind utilities. For example, `.quest-card` becomes `glass-panel p-4 rounded-xl flex flex-col gap-2 relative overflow-hidden`, `.dashboard-grid` becomes a standard CSS Grid or Flex container.
2. **Routing**: Modify `App.jsx` to pass `setActiveTab` to `<Dashboard />`. Modify the "Start Workout" button in `QuestCard` to trigger `setActiveTab('workout')`.
3. **Drag-and-Drop**: Update the `QuestCard` complete button logic to: `onClick={() => settings.dragToRegister !== false ? store.markQuestReady(quest.id) : store.completeQuest(quest.id)}`.
4. **XP Exploit**: Update the `HabitualCard` buttons to use `disabled={!isPending}`.

## 5. Verification Method
- **Styling**: Run the React app. The dashboard should have proper layouts, backgrounds, and padding applied via Tailwind classes.
- **Routing**: Click "Start Workout" on a gym quest. Verify that `App.jsx` changes `activeTab` to `'workout'`.
- **Drag-and-Drop**: Click "Complete" on a normal quest with drag-to-register enabled. Verify the button changes to "✓ Completed (Drag to Claim XP)" and the quest becomes draggable, instead of disappearing instantly.
- **XP Exploit**: Click "Yes" on a Habitual card. Verify both buttons immediately become disabled and cannot be clicked again. Monitor the XP bar to ensure XP is only awarded once.
