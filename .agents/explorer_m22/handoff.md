# Observation

1. **XP Bars**: In `react-app/src/components/SkillHub.jsx`, progress percentages (`pct` and `mPct`) are computed synchronously during render and applied directly as inline styles (`width: ${pct}%`). Despite the presence of `transition-all duration-500 ease-out` classes, the bars do not animate from 0 on initial mount because they render instantly at their final width.
2. **Add Micro Skill**: `SkillHub.jsx` contains a `+ Add Micro Skill` button (Line 150) without a click handler. The vanilla JS logic for adding micro skills resides in `js/components/skill-modal.js` (Lines 139-149), which uses a `prompt()` for the name, calculates scaled values (`totalXPtoL100 * 0.4`), and invokes `store.upsertMicroSkill(macroId, micro)`.
3. **Action Buttons / Modals Interactivity**: In `SkillHub.jsx`, the action buttons loop (`OPTIONS.map`) has an empty `onClick` handler with the comment `// Modals interactivity handled in 2.2`. 
4. **Vanilla Habitual Logic**: `js/views/skill-hub.js` (Lines 67-91, 172-194) managed Habitual creation via an inline hidden panel (`#habitual-create-panel`) toggled by the "Create Habitual" button. The vanilla app also used global components for Quests and Statistics (e.g. `LM.components.questModal.open()`) and a router for navigation (`LM.router.navigate()`).

# Logic Chain

1. **Animate XP Bars on Mount**: 
   - To utilize the existing CSS transitions, we need React local state (e.g., `const [animatedPct, setAnimatedPct] = useState(0)`).
   - A `useEffect` hook should trigger after the component mounts to update the state from `0` to the computed `pct`. The delay triggers the CSS transition. The same strategy applies to Micro Skills (they can be mapped in state or handled via a dedicated sub-component).

2. **Add Micro Skill Form**: 
   - To eliminate the `prompt()` from `skill-modal.js`, `SkillHub.jsx` should manage a local state for the form (e.g., `const [showMicroForm, setShowMicroForm] = useState(false)` and `const [microName, setMicroName] = useState('')`).
   - Clicking `+ Add Micro Skill` toggles this form.
   - On save, replicate the logic from `skill-modal.js`:
     ```javascript
     const e = macro.exponent;
     const t = macro.totalXPtoL100 * 0.4;
     store.upsertMicroSkill(macroId, {
       id: store.uid(), parentMacroId: macroId, name: microName.trim(),
       currentXP: 0, currentLevel: 0, exponent: e, totalXPtoL100: t, base: t / Math.pow(100, e)
     });
     ```

3. **Habitual Creation Panel**: 
   - Replace the vanilla `#habitual-create-panel` with conditionally rendered React JSX above the "Active Habituals" section.
   - Manage form state (`showHabitualForm`, `habitualName`, `xpGain`, `xpLoss`).
   - The "Create Habitual" action button toggles `showHabitualForm`.
   - The save handler validates input and calls `store.upsertHabitual()`, mimicking lines 172-194 of `js/views/skill-hub.js`.

4. **Action Buttons Dispatching**: 
   - Update the `OPTIONS` `onClick` handler to switch on `opt.id`:
     - `create-habitual`: Toggles the habitual form state.
     - `create-quest` / `create-statistic`: Should call context/global modal toggles (assuming a `ModalContext` or similar exists in the React app).
     - `chain-quests`: Should use React Router (`useNavigate()`) to navigate to `/skill-chains/${macroId}`.

# Caveats

- **Global Modals (`create-quest`, `create-statistic`)**: This analysis assumes global modal components will be implemented separately (or exist) using a context provider (e.g., `openQuestModal()`). If they do not exist yet, they are outside the scope of `SkillHub.jsx` itself, but the triggers must be wired up.
- **Micro Skill XP Bar States**: For optimal performance and ease of animation, the Micro Skill items might be better off refactored into a separate `<MicroSkillCard />` component so each manages its own animation state on mount, rather than managing an array of percentages in the parent.
- **Router Implementation**: Assumes the usage of React Router (`useNavigate`) for the `chain-quests` navigation logic.

# Conclusion

To fix progress bar animations and implement modal interactivity in `SkillHub.jsx` without mutating the vanilla JS files:
1. Wrap the `pct` values in `useState` and apply them post-mount via `useEffect`.
2. Introduce inline React forms (with local `useState` bindings) to replace both the vanilla `prompt()` for adding Micro Skills and the hidden `div` panel for creating Habituals. 
3. Wire the action buttons to trigger these local form states, trigger external global modals, or navigate using React Router.

# Verification Method

1. Inspect `react-app/src/components/SkillHub.jsx` to ensure `useState` and `useEffect` have been implemented for XP bar animations and form states.
2. Build and launch the React app. Navigate to a skill and observe the XP bars; they should visibly animate from empty to their calculated width upon page load.
3. Click the `+ Add Micro Skill` and `Create Habitual` buttons. Ensure their respective React forms appear in the UI.
4. Submit both forms and verify that the UI updates immediately and the `localStorage` entries for `lm_macros` (for the micro skill) and `lm_habituals` are correctly updated.
