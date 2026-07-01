# Observation

- `SkillHub.jsx` uses static percentages for XP progress bars (e.g., `style={{ width: \`${pct}%\` }}`). This prevents CSS transitions (like `duration-500 ease-out`) from animating on mount.
- `SkillHub.jsx` has a `+ Add Micro Skill` button that currently has no `onClick` handler.
- The legacy `js/components/skill-modal.js` handled adding, renaming, and deleting macro and micro skills in a `.modal` with a `.modal-overlay`. It relied on standard form inputs inside a structured modal body.
- `react-app/src/lib/store.js` exports a singleton `store` with methods `upsertMicroSkill(macroId, micro)`, `deleteMicroSkill(macroId, microId)`, and `uid()`.
- `SkillHub.jsx` correctly binds to `store.on('change', ...)` to keep local component state synchronized with the data layer.

# Logic Chain

1. **React State for XP Progress Bars:** To achieve the smooth grow animation on mount that glassmorphism UI often features, the progress bar width must start at `0%` during the initial render and then update to the actual percentage shortly after. This requires a dedicated component or a `useEffect` hook to set the target width dynamically.
2. **Add/Manage Skill Modal:** 
   - A modal component (or inline modal state) must be introduced into `SkillHub.jsx` to replace the missing functionality of `skill-modal.js`.
   - The modal should match the app's glassmorphism style (using classes like `glass-panel`, `backdrop-blur-sm`, and `fixed inset-0 bg-black/60`).
   - The UI needs to allow the user to input a name to create a new micro skill, triggering `store.upsertMicroSkill`.
   - To fully meet the "manage" requirement, existing micro skills listed in `SkillHub.jsx` (or within the modal) should have "Rename" and "Delete" actions hooked up to `store.upsertMicroSkill` and `store.deleteMicroSkill`.
3. **Store Integration:** Thanks to the existing `store.on('change')` setup, invoking store mutators within the modal will seamlessly update the UI in `SkillHub.jsx` without needing to pass down explicit state updater callbacks.

# Caveats

- The legacy modal (`skill-modal.js`) managed both Macro and Micro skills globally. The request specifies "in SkillHub.jsx", which scopes the modal strictly to the active Macro skill (handling its specific Micro skills).
- We assume `formulas.js` or `store.js` correctly recalculate `base` XP scaling when a new micro skill is created (the legacy code computed `totalXPtoL100` and `exponent` based on the parent macro).

# Conclusion

1. **Progress Bar Animation:** Create a reusable `<ProgressBar percent={...} color={...} />` component inside `SkillHub.jsx` that uses `useState(0)` and a `useEffect` with a `setTimeout` to animate the width to the target percentage on mount.
2. **Micro Skill Modal:** Implement an `isMicroModalOpen` state in `SkillHub.jsx`. When the `+ Add Micro Skill` button is clicked, render a full-screen glassmorphic overlay containing an input field and Save/Cancel buttons.
3. **Manage Actions:** Add "Edit" and "Delete" icon buttons to each rendered micro skill in the list (appearing on hover using Tailwind's `group` and `group-hover`). Hook these directly to `store.upsertMicroSkill` and `store.deleteMicroSkill`.

# Verification Method

- Run the React app (`npm run dev` in `react-app` directory).
- Navigate to the Skills tab to view `SkillHub.jsx`.
- Verify that both the main Macro XP bar and the Micro skill XP bars start at 0% and animate gracefully to their correct positions on load.
- Click `+ Add Micro Skill`, fill out the name, and click save. Verify that the new micro skill appears immediately.
- Hover over an existing micro skill to reveal Edit/Delete buttons, test both, and confirm changes persist via `store.js`.
