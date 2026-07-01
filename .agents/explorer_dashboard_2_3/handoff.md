# Handoff: Dashboard.jsx Iteration 2 Fix Strategy

## 1. Observation
- **CSS Issue**: `Dashboard.jsx` relies heavily on legacy CSS classes (`.quest-card`, `.dash-center`, `.habitual-card`, `.dash-carousel-viewport`, etc.) which are undefined in `index.css`. This leaves the component unstyled.
- **Routing Bug**: The "Start Workout" button sets `window.location.hash = '#workout/' + quest.id`. However, `App.jsx` manages routing via an internal `activeTab` state and has no listener for hash changes, causing the button to fail silently.
- **Drag-and-Drop Bypass**: In `QuestCard`, the `Complete` button unconditionally calls `store.completeQuest(quest.id)`. This instantly completes the quest and awards XP, bypassing the `isReadyToClaim` state and entirely skipping the wheel drag-and-drop interaction.
- **Infinite XP Exploit**: In `HabitualCard`, the `setStatus` function awards XP whenever called with `'yes'`. Because the "Yes" button's `disabled` prop evaluates to `false` when the status is already `'yes'` (`disabled={!isPending && !isYes}`), a user can click it repeatedly to gain infinite XP.

## 2. Logic Chain
- **CSS**: Since the project requires Tailwind CSS (per `SCOPE.md`), all custom CSS classes must be translated into inline Tailwind utility classes (e.g., `flex`, `bg-[#181820]`, `rounded-xl`, `border`, `text-gray-400`).
- **Routing**: Since `App.jsx` cannot be modified (per `Target` constraints), the `window.location.hash` approach must be replaced. A temporary fallback (like `alert('Workout module not ported yet')`) is necessary to prevent silent failures.
- **Drag-and-Drop**: The `Complete` button must conditionally trigger the drag-and-drop flow. It should check `settings.dragToRegister !== false`. If true, it must call `store.markQuestReady(quest.id)` to transition the quest to the draggable state. It should only call `store.completeQuest(quest.id)` if `dragToRegister` is disabled.
- **Exploit**: The `HabitualCard` needs a safeguard to prevent multiple XP awards. Adding a check like `if (habitual.todayStatus === status) return;` at the start of `setStatus` will close the exploit, or simply changing the button to `disabled={!isPending}` ensures it can only be clicked once.

## 3. Caveats
- I did not dictate the exact Tailwind classes for every element; the implementer will need to map them logically (e.g., using `snap-x mandatory` for the carousel, `flex-col` for layouts).
- The `Workout` module is completely missing from the React port, so the proposed `alert()` is a graceful degradation rather than a full feature restoration.

## 4. Conclusion
The worker must update `Dashboard.jsx` to:
1. Replace all legacy CSS class names with equivalent Tailwind CSS utility classes.
2. Change the "Start Workout" button's `onClick` handler to show an alert (e.g., `alert('Workout module not ported yet')`) instead of setting `window.location.hash`.
3. Update the `QuestCard` complete button to call `store.markQuestReady(quest.id)` if `settings.dragToRegister !== false`, falling back to `store.completeQuest(quest.id)` only if drag-to-register is disabled.
4. Add `if (habitual.todayStatus === status) return;` to the `HabitualCard`'s `setStatus` function to prevent the infinite XP exploit.

## 5. Verification Method
- **CSS**: Inspect the DOM in the browser to confirm Tailwind classes are applied and the UI resembles a dashboard.
- **Routing**: Click "Start Workout" on a gym quest and ensure an alert appears.
- **Drag-and-Drop**: Click "Complete" on a normal quest. It should change state to "Completed (Drag to Claim XP)". Drag it to the wheel to confirm XP is awarded.
- **Exploit**: Click "Yes" on a Habitual card. Verify the XP is awarded exactly once and subsequent clicks do nothing.
