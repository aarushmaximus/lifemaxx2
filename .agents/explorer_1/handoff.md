# Analysis & Implementation Plan: Skill Hub XP Bars and Micro Skill Modal

## 1. Observation
- `react-app/src/components/SkillHub.jsx` currently renders XP bars for the main macro skill and micro skills with hardcoded inline widths (e.g., `width: \`\${Math.min(100, Math.max(0, pct))}%\``). The CSS class `transition-all duration-500` is present on the elements, but because the widths are set synchronously on initial mount, the browser paints them immediately and the bars do not visually animate from 0.
- The `+ Add Micro Skill` button in `SkillHub.jsx` (line ~155) is visually present but currently lacks an `onClick` handler.
- The legacy codebase managed micro skills via `js/components/skill-modal.js` and `js/views/skill-detail.js`. The legacy modal used `prompt()` to get a new micro skill name and subsequently calculated the new micro skill baseline values using `const e = macro.exponent, t = macro.totalXPtoL100 * 0.4;` before calling `S.upsertMicroSkill`.
- The user prompt specifies migrating logic from `js/views/skill-hub.js`, but since the React version of `SkillHub.jsx` merges both the old hub and detail views, the micro skill logic to migrate actually stems from `skill-modal.js` via the `skill-detail.js` page context.
- The React version of Habitual creation logic is already successfully implemented inline within `SkillHub.jsx` as a collapsible panel (`showHabitualPanel`). 

## 2. Logic Chain
- **XP Bars Animation**: For the `transition-all` class to animate the progress bars, the component must mount with the `width` property set to `0%` and subsequently update to the calculated `pct` (and `mPct` for micro skills). This necessitates introducing a React state (like `barsMounted` or `animated`) that is set to `true` slightly after the component mounts via a `useEffect` hook.
- **Micro Skill Modal State**:
  - Instead of invoking native `prompt()` windows like the vanilla JS codebase did, a modern React modal or inline panel needs to be added directly within `SkillHub.jsx`.
  - The required state parameters are `showMicroModal` (boolean), `microName` (string), and `editingMicroId` (string | null, to support editing existing micro skills).
- **Migration of Logic**:
  - The `+ Add Micro Skill` button should trigger the display of this new modal state.
  - The logic inside `skill-modal.js`'s `addMicro` function must be adapted into a React save handler: when saving a new micro skill, the code must calculate `exponent` and `totalXPtoL100` dynamically based on the current macro skill data (`macro.exponent` and `macro.totalXPtoL100 * 0.4`).
  - To achieve full management capability, small edit and delete icon buttons need to be added to the rendered micro skill rows in the Tree Column, wiring the delete action to `store.deleteMicroSkill`.

## 3. Caveats
- The prompt explicitly states "migrating logic from `js/views/skill-hub.js`". The `skill-hub.js` file previously handled creating Habituals and navigating to Quests/Stats. The Habitual component is already written inline. We assume "add/manage skill modal" refers to the Micro Skills since it's the primary unimplemented skill management feature inside the Skill Hub and corresponds to the legacy `Skill Manager Modal`.
- Other modals like Quest Creation and Statistic Creation in `SkillHub.jsx` currently still delegate to vanilla JS (`window.LM.components.questModal.open`), which remains outside the scope of this particular task to maintain Milestone 2.2 boundaries.

## 4. Conclusion
**Recommended Implementation Strategy:**
1. **XP Bar State (Animation)**: 
   - Add `const [barsMounted, setBarsMounted] = useState(false);`.
   - Add a `useEffect` with a short timeout (e.g., `50ms`) setting `setBarsMounted(true)` on mount.
   - Update the inline width style of all `.xp-bar-fill` equivalents to: `width: barsMounted ? \`\${Math.min(100, Math.max(0, pct))}%\` : '0%'`.
2. **Micro Skill State variables**: 
   - Add `const [showMicroModal, setShowMicroModal] = useState(false);`
   - Add `const [microForm, setMicroForm] = useState({ id: null, name: '' });`
3. **Modal UI block**: 
   - Create a conditional render block (`showMicroModal && (...)`) at the top of the Tree Column or as an absolute overlay, containing a text input and Cancel/Save buttons.
4. **Save Handler**: 
   - Create a function that handles saving:
     ```javascript
     if (microForm.id) {
       // Find and update existing micro skill name
     } else {
       // Replicate legacy math:
       const e = macro.exponent;
       const t = macro.totalXPtoL100 * 0.4;
       store.upsertMicroSkill(macroId, {
         id: store.uid(), parentMacroId: macroId, name: microForm.name,
         currentXP: 0, currentLevel: 0, exponent: e, totalXPtoL100: t, base: t / Math.pow(100, e)
       });
     }
     ```
5. **Manage Actions**: 
   - Add a flex row with an Edit (pencil) and Delete (cross) button next to the micro skill name in the existing `.map()` iteration block. Edit opens the modal with the ID; Delete calls `store.deleteMicroSkill(macroId, ms.id)`.

## 5. Verification Method
- Ensure the project builds successfully with `npm run build`.
- Load the React app and navigate to a Skill Hub page (`#skill/<id>`).
- Observe the XP bars for both the Macro Skill and Micro Skills to confirm they visibly animate from 0% to their target values.
- Click "+ Add Micro Skill", verifying the modal/panel renders correctly.
- Enter a name, click Save, and verify the new micro skill appears instantly in the list with calculated base stats.
- Click "Edit" on the newly created micro skill, rename it, and verify the UI updates correctly.
- Click "Delete", confirming the micro skill is removed from the store and UI without triggering native JS `prompt` or `confirm` boxes unnecessarily (unless standard `window.confirm` is used for deletion).
