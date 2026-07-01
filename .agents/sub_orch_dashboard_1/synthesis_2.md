# Synthesis Report: Iteration 2 Fix Strategy

## Consensus
All Explorers agree on the root causes and the required fixes for the bugs identified in Iteration 1.

## Worker Instructions
You must apply the following 4 fixes to `react-app/src/components/Dashboard.jsx` and `react-app/src/App.jsx`:

1. **Styling Fix**: 
   - Replace legacy CSS classes (e.g., `dashboard-grid`, `dash-center`, `quest-card`, `habitual-card`) in `Dashboard.jsx` with native Tailwind CSS utility classes (e.g., `flex`, `grid`, `bg-[#181820]`, `p-4`, `rounded-xl`). The component must render with proper layouts, spacing, and styling without relying on missing legacy stylesheets.

2. **Routing Fix**:
   - `App.jsx` manages routing via the `activeTab` state. Modify `App.jsx` to pass `setActiveTab` as a prop to `<Dashboard setActiveTab={setActiveTab} />`.
   - In `Dashboard.jsx` (specifically the `QuestCard` component), change the "Start Workout" button's onClick handler to call `setActiveTab('workout')` instead of modifying `window.location.hash`.

3. **Drag-and-Drop Bug Fix**:
   - In the `QuestCard` component, the "Complete" button currently bypasses the drag-to-register flow. Modify its `onClick` handler to check `settings.dragToRegister`:
     ```jsx
     onClick={() => {
       if (settings.dragToRegister !== false) {
         store.markQuestReady(quest.id);
       } else {
         store.completeQuest(quest.id);
       }
     }}
     ```

4. **Infinite XP Exploit Fix**:
   - In the `HabitualCard` component, the boolean logic for disabling buttons allows infinite clicks. Change the `disabled` property for both the "Yes" and "No" buttons to simply `disabled={!isPending}`. This ensures they lock immediately after the user makes a choice.

## Verification
- Run `npm run build` or `npm run dev` in `react-app` to verify no compilation errors.
- Ensure the Dashboard has proper Tailwind styling.
- Ensure the "Complete" button allows a quest to enter the draggable state rather than instantly awarding XP.
- Ensure Habitual buttons disable permanently after one click.
- Deliver handoff report and message completion.
