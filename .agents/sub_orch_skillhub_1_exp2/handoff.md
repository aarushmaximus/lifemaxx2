# Milestone 2.2: Progress Bars & Modals — Implementation Strategy

## 1. Observation
- **XP Bars**: In `react-app/src/components/SkillHub.jsx`, the macro XP bar (line 106) and micro-skills XP bars (line 140) use inline styles `style={{ width: \`${pct}%\` }}`. The width is calculated synchronously on render. The CSS includes `transition-all duration-500`, but since the width is present on the initial DOM mount, no transition animation occurs.
- **Create Habitual**: In legacy `js/views/skill-hub.js` (lines 68-91), creating a habitual was handled by an inline panel (`#habitual-create-panel`) that was toggled via JavaScript. It took `name`, `xpGain`, and `xpLoss`, and called `store.upsertHabitual` on save.
- **Manage Habituals/Statistics**: The legacy view included delete buttons for active habituals (`deleteHabitual(id)`) and active statistics (`store.deleteStatistic(id)`). The React version (lines 164-187) renders these lists but lacks the delete actions.
- **Options Buttons**: In `SkillHub.jsx` (line 203), the "Create Habitual" button (and others) have empty `onClick` handlers with the comment `// Modals interactivity handled in 2.2`.

## 2. Logic Chain
1. **XP Bars State**: To trigger the CSS transitions on load, the initial render must have `width: '0%'`. Immediately after mount, the width should update to the actual percentage. This can be achieved by adding a `const [mounted, setMounted] = useState(false)` state, setting it to `true` inside a `useEffect(..., [])`, and updating the inline styles to `width: mounted ? \`${pct}%\` : '0%'`.
2. **Modal State**: We need state to manage the visibility of the "Create Habitual" form: `const [showHabitualModal, setShowHabitualModal] = useState(false)`. We also need states for its inputs: `habitualFormName`, `habitualFormXPGain`, `habitualFormXPLoss`.
3. **Modal Rendering**: When `showHabitualModal` is true, we should render a fixed overlay (using Tailwind `fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center`) containing the form panel, effectively replacing the legacy inline panel with a proper React modal.
4. **Modal Action**: The "Create Habitual" button in the `OPTIONS` array must be mapped to an `onClick` that triggers `setShowHabitualModal(true)`. 
5. **Save Logic**: The save button in the modal will call `store.upsertHabitual(...)` using `store.uid()`, the current `macro.id`, and today's date logic (replicating legacy lines 179-191), then close the modal and reset form states.
6. **Management Buttons**: Add a "✕" delete button to the items mapped in `habituals.map` and `statistics.map` in `SkillHub.jsx`. These will trigger `store.deleteHabitual(id)` and `store.deleteStatistic(id)` respectively.

## 3. Caveats
- Global modals ("Create Quest", "Create Statistic") from legacy are assumed to still rely on global handlers (e.g. `window.LM.components.questModal.open()`) until they are fully migrated to React. This plan focuses on migrating the Habitual panel and management specific to the Skill Hub view.
- The `isMounted` state will trigger an extra render cycle on mount, which is standard for CSS transition tricks in React.

## 4. Conclusion
The implementation of Milestone 2.2 for `SkillHub.jsx` requires introducing a `mounted` state to animate the XP bars on load, creating a modal overlay for the "Create Habitual" form managed by local React state, and wiring up the missing delete actions for habituals and statistics directly to the legacy `store`.

## 5. Verification Method
- Ensure the `npm run build` or Vite dev server succeeds after modifying `react-app/src/components/SkillHub.jsx`.
- Visually verify that XP bars start at 0 and smoothly animate to their target value on page load.
- Click "Create Habitual" to verify the modal opens. Create a new habitual and verify it appears in the Active Habituals list.
- Click the delete button on an active habitual to ensure it disappears (store deletion triggers standard `change` event, re-rendering the component).
