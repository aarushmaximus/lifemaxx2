## Synthesized Implementation Strategy: Milestone 2.2

### 1. Animated Progress Bars
- In `SkillHub.jsx`, create a reusable `<AnimatedProgressBar pct={...} color={...} />` component.
- Use `useState(0)` for the initial width.
- Use `useEffect` with a `setTimeout` (e.g., 50ms) to set the width to `pct` on mount.
- This allows existing glassmorphism CSS transitions (`transition-all duration-500 ease-out`) to animate gracefully.

### 2. Micro Skill Modal State & UI
- Add local React state to `SkillHub.jsx`: `[isModalOpen, setIsModalOpen] = useState(false)` and `[selectedMicro, setSelectedMicro] = useState(null)`.
- When the `+ Add Micro Skill` button is clicked, open the modal with `selectedMicro` as null.
- Create a conditionally rendered modal component:
  - Overlay: `fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center`.
  - Container: `glass-panel p-6 rounded-2xl border border-white/10`.
  - Form: Input for the micro skill `name`, plus Save and Cancel buttons.

### 3. Manage Actions & Store Integration
- Add "Edit" and "Delete" actions to each rendered micro skill in the list (e.g., appear on hover using `group-hover`).
- Edit action sets `selectedMicro` and opens the modal.
- Delete action triggers `store.deleteMicroSkill(macro.id, micro.id)`.
- Modal Save action triggers `store.upsertMicroSkill(macro.id, { id: selectedMicro?.id || store.uid(), name, xp: selectedMicro?.xp || 0 })`.
- Ensure changes sync properly via the existing `store.on('change', ...)` event listener in `SkillHub.jsx`.

**MANDATORY INTEGRITY WARNING**
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
