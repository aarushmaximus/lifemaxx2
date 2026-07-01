# Milestone 2.2: Progress Bars & Modals

## 1. Observation
- **SkillHub.jsx `OPTIONS` actions**: Currently, the action buttons in `SkillHub.jsx` have empty `onClick` handlers: `// Modals interactivity handled in 2.2`. 
- **Legacy Interactions**: In `js/views/skill-hub.js`, creating a habitual opened an inline panel (`#habitual-create-panel`), while "Create Quest" and "Create Statistic" opened global modals via `window.LM.components`.
- **Habituals & Statistics Management**: The legacy UI provided a delete button `✕` for habituals and edit `✎` / delete `✕` buttons for statistics. These are missing in the React `SkillHub.jsx`.
- **XP Bars**: The XP bars for both Macro and Micro skills use inline styles `style={{ width: \`${pct}%\` }}`. Although `transition-all duration-500` is present, the bars render immediately at their target width on mount, meaning no animation is shown.

## 2. Logic Chain
1. **XP Bars Animation via State**: To ensure the CSS transition triggers, the bars must render initially at `0%` width and then update. We will introduce `const [mounted, setMounted] = useState(false)` and `useEffect(() => setMounted(true), [])`. The width style will be `width: mounted ? \`${pct}%\` : '0%'`.
2. **Add/Manage Modal (Habitual)**: Instead of the legacy inline panel, we will create a React modal for adding a Habitual. 
   - Add state: `const [showHabModal, setShowHabModal] = useState(false)`.
   - Add form state: `habName`, `habGain`, `habLoss`.
   - Render a modal overlay (`fixed inset-0 z-50 bg-black/60 flex items-center justify-center`) when `showHabModal` is true.
   - On save, call `store.upsertHabitual(...)` with today's date formatted to IST (replicating legacy behavior), then close the modal.
3. **Action Button Routing**: In the `OPTIONS.map`, the `onClick` must dispatch actions based on `opt.id`:
   - `create-habitual`: `setShowHabModal(true)`
   - `create-quest`: `window.LM?.components?.questModal?.open(null, false)` (fallback to legacy global modal)
   - `create-statistic`: `window.LM?.components?.statModal?.open(null)` (fallback)
   - `chain-quests`: `window.location.hash = \`#skill-chains/${macro.id}\``
4. **Manage Actions (Delete/Edit)**: 
   - Add a delete button to mapped habituals calling `store.deleteHabitual(h.id)`.
   - Add edit/delete buttons to mapped statistics calling `window.LM?.components?.statModal?.open(s.id)` and `store.deleteStatistic(s.id)`.

## 3. Caveats
- The React app does not yet have native context-based global modals for Quests or Statistics, so we rely on the legacy `window.LM.components` fallbacks. 
- Using `window.location.hash` for navigation bypasses any React Router, but if the app is currently using hash-based routing it should work temporarily.

## 4. Conclusion
We must implement a localized React modal for creating Habituals, add management buttons (edit/delete) for habituals and statistics, and add a `mounted` state hook to animate XP bar widths upon component initialization.

## 5. Verification Method
- Ensure the project builds successfully.
- Load the UI and observe the XP bars animating from 0% to their respective values.
- Click "Create Habitual" and verify the React modal opens. Submit the form and verify the habitual is added to the list.
- Click the delete button on a habitual and ensure it is removed.
