# Milestone 2.2: Progress Bars & Modals — Investigation & Plan

## Observation
1. **Progress Bars**: `SkillHub.jsx` renders XP bars with inline styles mapping directly to `pct` and `mPct`. While the CSS classes include `transition-all duration-500 ease-out`, the widths are set immediately on initial render, preventing the animation from triggering.
2. **Options Buttons**: The option buttons (like "Create Habitual", "Create Statistic") have empty `onClick` handlers containing the comment `// Modals interactivity handled in 2.2`.
3. **List Management**: The "ACTIVE HABITUALS" and "ACTIVE STATISTICS" sections render the data correctly from `store` but lack the action buttons (`✕` to delete, `✎` to edit) present in the legacy `skill-hub.js`.
4. **Missing Options**: The legacy `OPTIONS` array includes `microskills` and `widgets`, which are missing in the React counterpart.
5. **Add/Manage Forms**: In `skill-hub.js`, creating a habitual was done via an inline `#habitual-create-panel` which collected `NAME`, `XP GAIN`, and `XP LOSS`. It used `store.upsertHabitual(...)` and `store.uid()`.

## Logic Chain
1. **XP Bar Animation**: To trigger the CSS transitions, we need a React state `[mounted, setMounted] = useState(false)`. A `useEffect` with a short timeout (e.g., 50ms) will flip `mounted` to `true`. The inline style for widths will then evaluate conditionally: `width: mounted ? `${pct}%` : '0%'`.
2. **Modal Implementation**: The "add/manage modal" requirement can be fulfilled by introducing a `[activeModal, setActiveModal] = useState(null)` state. When the "Create Habitual" option is clicked, `setActiveModal('habitual')` is triggered, rendering a fixed full-screen overlay (using Tailwind's `fixed inset-0 z-50 bg-black/80` etc.) containing the habitual creation form.
3. **Form State & Store Wiring**: Inside the modal, controlled inputs (`name`, `xpGain`, `xpLoss`) will manage form state. The save handler will mirror the legacy `getISTDateString()` logic and call `store.upsertHabitual(...)`, then close the modal.
4. **List Management Actions**: We must add `✕` buttons to the habituals list items that invoke `window.confirm` and then `store.deleteHabitual(h.id)`. The same applies to statistics (`store.deleteStatistic(s.id)`).
5. **Legacy Global Modals**: Legacy code called `window.LM.components.statModal.open(null)` and `questModal.open()`. Since these might not exist in React yet, we should either implement simplified React modal versions for them within `SkillHub.jsx` or mock them until their specific milestones.

## Caveats
- Global modals (like `questModal`) are not explicitly mentioned in the milestone scope other than "add/manage modal", which likely focuses on the `SkillHub` specific modals (Habituals). We will prioritize the Habitual modal.
- We assume `store` will automatically emit changes and trigger the existing `loadData` `useEffect` in `SkillHub.jsx` to re-render the lists. The current `useEffect` already listens to `store.on('change', loadData)`, so this will work seamlessly.
- We should also restore the missing `microskills` and `widgets` options to match feature parity with the legacy view, though they just trigger router navigation.

## Conclusion
**Implementation Strategy:**
1. **State:** Add `const [mounted, setMounted] = useState(false)` and `useEffect` to toggle it for XP bar animations. Add `const [modalType, setModalType] = useState(null)` to manage modal visibility.
2. **XP Bars:** Update the inline style `width` for both macro and micro skill bars to check `mounted`.
3. **Action Buttons:** Inject Delete (`✕`) and Edit (`✎`) buttons into the `habituals` and `statistics` list rendering, wiring them to `store.deleteHabitual` and `store.deleteStatistic`.
4. **Modal Component:** Build an overlay modal in `SkillHub.jsx` that renders when `modalType === 'habitual'`. It must include inputs for name, xpGain, and xpLoss, and a save button that constructs the habitual object (with IST timestamp) and calls `store.upsertHabitual()`.
5. **Options Array:** Add the missing `microskills` and `widgets` objects to the `OPTIONS` array with appropriate icons and descriptions.

## Verification Method
1. Build the React app (`npm run dev`).
2. Navigate to the Skill Hub view and verify that the XP bars visually animate from `0%` to their correct values upon loading.
3. Click the "Create Habitual" button. Ensure the overlay modal opens.
4. Submit the form and verify that the new Habitual appears in the Active Habituals list.
5. Click the `✕` delete button on the newly created habitual, accept the confirmation prompt, and verify it is removed from the list.
