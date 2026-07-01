# Handoff Report: SkillHub.jsx Progress Bars & Micro Skill Modal

## 1. Observation
- `react-app/src/components/SkillHub.jsx` displays the macro skill's progress and a list of micro skills with their own progress bars (using inline styles `width: ${pct}%` and `transition-all`).
- Line 150 of `SkillHub.jsx` has a placeholder button: `<button>+ Add Micro Skill</button>` with no interactivity.
- The `store.js` exposes functions `upsertMicroSkill(macroId, micro)` and `deleteMicroSkill(macroId, microId)` to manage micro skills.
- The legacy `js/views/skill-hub.js` implemented an inline glassmorphic panel for habitual creation, but micro skills were previously on a separate page. In the React rewrite, micro skills are embedded directly into `SkillHub.jsx`.
- Glassmorphism in `SkillHub.jsx` is currently achieved using classes like `glass-panel`, `bg-black/20`, and `border-white/5`.

## 2. Logic Chain
- **React State for XP Bars**: 
  - The current progress bars rely on calculating the percentage synchronously during render (`F.progressPercent`). 
  - To fulfill "React state for XP bars" (typically implying entrance animations or buffered state updates), we should introduce a local `useState` for the width percentage (e.g., `animatedPct`) and use a `useEffect` with a slight timeout to set it to the actual percentage after mount. This ensures the CSS transition (`duration-500 ease-out`) triggers smoothly when the component loads.
- **Add/Manage Skill Modal**: 
  - Since the UI contains an "+ Add Micro Skill" button, the requested "add/manage skill modal" refers to managing Micro Skills.
  - We need a React modal component rendered conditionally based on `isModalOpen` state. 
  - We also need a state for `editingMicroSkill` (null if adding new, or a skill object if editing/managing).
  - The modal must follow the glassmorphism aesthetic: using an overlay with `backdrop-blur-sm bg-black/40` and a modal container with `glass-panel border border-white/10 p-6 rounded-2xl`.
  - On submit, it will call `store.upsertMicroSkill` and then `loadData()` (or rely on the existing `store.on('change', loadData)` listener).

## 3. Caveats
- Legacy `skill-hub.js` also had a "Create Habitual" inline panel. The React version has a "Create Habitual" button in the `OPTIONS` grid, currently commented as `// Modals interactivity handled in 2.2`. While this analysis focuses heavily on the "add/manage skill modal" (Micro Skills), the implementation strategy could be generalized to create a reusable glassmorphic modal wrapper for habituals and quests as well.
- Assuming the form only needs basic fields for a micro skill (e.g., `name`), as initial XP is generally 0.

## 4. Conclusion
**Implementation Strategy:**
1. **XP Progress Bars**: Create a reusable `<AnimatedProgressBar pct={...} />` component inside `SkillHub.jsx` that uses `useEffect` to transition its width from 0 to `pct` on mount.
2. **Modal State**: Add `[isMicroModalOpen, setIsMicroModalOpen] = useState(false)` and `[selectedMicro, setSelectedMicro] = useState(null)`.
3. **Modal UI**: Build a fixed-position glassmorphic overlay containing an input for the micro skill's name and Save/Delete buttons.
4. **Integration**: Bind the Save button to `store.upsertMicroSkill(macro.id, { id: selectedMicro?.id || store.uid(), name })` and the Delete button to `store.deleteMicroSkill(macro.id, selectedMicro.id)`.

## 5. Verification Method
- **To Verify**: 
  - Launch the React app.
  - Navigate to the Skill Hub for any macro skill.
  - Observe the XP bars animating from 0 to their respective percentages on load.
  - Click "+ Add Micro Skill", fill the glassmorphic form, and click Save. 
  - Verify the new micro skill appears in the list and persists upon reloading the page.
  - Click on an existing micro skill to verify the manage (edit/delete) functionality.
