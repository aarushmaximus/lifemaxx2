## 1. Observation
- In `c:\Users\ajays\.gemini\antigravity\scratch\lifemaxxantigrav\react-app\src\components\Dashboard.jsx` (lines 203-207), the `QuestCard` component renders the complete button logic:
  ```jsx
  ) : (settings.dragToRegister !== false && quest.isReadyToClaim) ? (
    <button className="btn-complete" style={{background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-3)', cursor: 'grab', pointerEvents: 'none'}}>✓ Completed (Drag to Claim XP)</button>
  ) : (
    <button className="btn-complete" onClick={() => store.completeQuest(quest.id)}>✓ Complete</button>
  )}
  ```
- The `Wheel` component's `handleDrop` correctly requires `quest.isReadyToClaim` to be true when `dragToRegister` is enabled (line 16).
- However, `Dashboard.jsx` never calls `store.markQuestReady(questId)` anywhere in the file.
- `store.completeQuest` (in `store.js` line 301) completely resolves the quest immediately, awarding XP and removing it from the active quest list.

## 2. Logic Chain
- The intended drag-and-drop flow (when `dragToRegister` is true) dictates that the user first clicks the quest's complete button to mark it "ready" (setting `isReadyToClaim = true`), which then enables the quest to be dragged to the wheel to claim XP.
- Because the `QuestCard`'s primary complete button unconditionally calls `store.completeQuest(quest.id)` instead of `store.markQuestReady(quest.id)`, the quest immediately finishes.
- Consequently, the quest never enters the `isReadyToClaim = true` state.
- Therefore, the "✓ Completed (Drag to Claim XP)" UI state is unreachable, completely bypassing and breaking the drag-and-drop feature intended for Milestone 1.3.

## 3. Caveats
- "Swipable logging" (via the quest type wheel/carousel) appears properly migrated using standard CSS scroll snapping and scroll listeners.
- Did not extensively test edge-case integrations with `habituals` or `chains` drag-and-drop since they don't utilize drag-and-drop by design.
- The `confirmPartialXP` logic present in the original `js/views/dashboard.js` wrapper is completely missing from the React implementation, though this may fall under a different milestone feature set.

## 4. Conclusion
**CRITICAL BUG DETECTED:** The drag-and-drop flow is completely bypassed because the `QuestCard` unconditionally calls `store.completeQuest()` instead of respecting `settings.dragToRegister` to call `store.markQuestReady()`. The worker needs to update the button's `onClick` handler to check the setting and call the appropriate store method, matching the legacy wrapper logic.

## 5. Verification Method
1. Inspect `Dashboard.jsx` around line 206 to verify the absence of `store.markQuestReady(quest.id)`.
2. To test functionally, run the app, ensure `dragToRegister` is true (default), and click "✓ Complete" on an active quest. The quest will instantly vanish and award XP rather than transitioning to the "Drag to Claim XP" state.
3. The correct logic should mirror the original: `onClick={() => (settings.dragToRegister !== false) ? store.markQuestReady(quest.id) : store.completeQuest(quest.id)}`.
