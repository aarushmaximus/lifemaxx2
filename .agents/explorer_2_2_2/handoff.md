# Milestone 2.2 Explorer Handoff

## Observation
1. **Target File**: `c:\Users\ajays\.gemini\antigravity\scratch\lifemaxxantigrav\react-app\src\components\SkillHub.jsx`.
2. **Current XP Bar Implementation**: At line 35 and 125, the percentage is calculated synchronously (`const pct = F.progressPercent(...)`), and rendered directly to the style attribute (`style={{ width: \`${pct}%\` }}`). The CSS classes include `transition-all duration-500 ease-out`, but without a state change from `0` to `pct` on mount, the bar will not animate on initial load.
3. **Current Modal State**: 
   - Line 150: The `+ Add Micro Skill` button lacks an `onClick` handler.
   - Line 193: The `OPTIONS` array maps out 4 buttons (Create Quest, Create Habitual, Create Statistic, Chain Quests).
   - Line 207: The `onClick` handler for these buttons simply contains a comment: `// Modals interactivity handled in 2.2`.
4. **Missing Components**: There is no existing `Modal` component in `react-app/src/components/`. 
5. **Legacy Reference**: In `js/views/skill-hub.js`, Habituals were created using an inline togglable panel (`#habitual-create-panel`), whereas Quests and Statistics invoked global modal singletons (`LM.components.questModal.open()`).

## Logic Chain
1. **React State for XP Bars**: To make the `transition-all` work on mount, we must introduce local state (e.g., `const [animatedXP, setAnimatedXP] = useState({})`). A `useEffect` should run on mount (and when `macro` or `microSkills` change) to update the state from `0` to the actual calculated percentages, triggering the CSS transition.
2. **Add/Manage Modal Architecture**: Since no generic modal component exists, we should introduce a local state `const [activeModal, setActiveModal] = useState(null)` inside `SkillHub.jsx`. The value can be `'micro'`, `'habitual'`, `'quest'`, or `'statistic'`. 
3. **Modal UI**: When `activeModal` is truthy, render a fixed full-screen overlay (`fixed inset-0 bg-black/60 backdrop-blur-sm z-50`) containing a glass-panel form.
4. **Form Submissions**:
   - **Habitual Form**: Needs inputs for `Name`, `XP Gain`, `XP Loss`. On save, use `store.upsertHabitual` providing a generated `id` (`store.uid()`) and calculating `lastResetDate` based on IST (as seen in the legacy code).
   - **Micro Skill Form**: Needs input for `Name`. On save, use `store.upsertMicroSkill(macroId, { id: store.uid(), name, currentXP: 0, currentLevel: 0 })`.
   - **Quest / Statistic Forms**: Can be implemented as basic forms matching the legacy fields or left as "Coming Soon" if they are scoped to a different milestone. (Given the prompt, implementing the basic creation inputs is recommended).

## Caveats
- Global modals (like the legacy `questModal`) haven't been implemented in React yet. Implementing inline forms in `SkillHub.jsx` for all 4 options might bloat the component. Consider extracting the Modal forms into separate local components within the same file (e.g., `HabitualModal`, `MicroSkillModal`) to keep `SkillHub` clean.
- The `lastResetDate` for Habituals relies on IST time offset logic in the legacy code; ensure this logic is ported over correctly in React.

## Conclusion
The implementation requires adding local React state to handle the XP bar entrance animation and the visibility of management modals. A centralized `activeModal` state string can drive which form to display in a fixed overlay. The forms should collect necessary data and dispatch directly to `store` methods like `store.upsertHabitual` and `store.upsertMicroSkill`.

## Verification Method
1. Open the React app and navigate to a Skill Hub.
2. Verify that XP bars animate from 0 to their current values upon page load.
3. Click `+ Add Micro Skill` and verify a modal appears, allows input, and successfully adds the micro skill to the list.
4. Click `Create Habitual`, verify the modal allows creating a new habitual, and that it appears in the Active Habituals list upon save.
5. Check `localStorage` to confirm the new items are persisted correctly.
