# Observation
- The target file `c:\Users\ajays\.gemini\antigravity\scratch\lifemaxxantigrav\react-app\src\components\SkillHub.jsx` renders a React component for the Skill Hub.
- The Progress bars for Macros and Micro skills are currently bound to state using `F.progressPercent()` and update when `store.on('change')` triggers a re-render. They use inline styling `style={{ width: \`\${pct}%\` }}` alongside CSS `transition-all` which fulfills the requirement for "React state for XP bars".
- The legacy view `c:\Users\ajays\.gemini\antigravity\scratch\lifemaxxantigrav\js\views\skill-hub.js` contains a `#habitual-create-panel` for creating Habituals, and "✕" buttons on active Habituals and Statistics for deletion.
- In `SkillHub.jsx`, clicking "Create Habitual" is a no-op with a comment `// Modals interactivity handled in 2.2`. 
- The Habitual list and Statistics list in `SkillHub.jsx` are missing delete buttons.
- `store.js` exposes `uid`, `upsertHabitual`, `deleteHabitual`, and `deleteStatistic`. It manually calculates IST dates for `lastResetDate` during habitual creation in the legacy codebase.

# Logic Chain
1. To satisfy the "add/manage modal" requirement, we need a React implementation of the Habitual creation overlay in `SkillHub.jsx`.
2. This requires local state hooks (`useState`) for `showHabitualModal`, `habitualName`, `habitualXPGain`, and `habitualXPLoss`.
3. The save function must compute the IST timestamp accurately (`const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);`) and call `store.upsertHabitual()`, similar to the legacy implementation.
4. For management, we need to add a "delete" action button ("✕") inside each mapped Habitual and Statistic row in `SkillHub.jsx`, triggering `window.confirm()` and calling `store.deleteHabitual(id)` or `store.deleteStatistic(id)`.
5. Since the XP bar logic is already integrated smoothly via state (`pct`) and CSS transitions, it requires no direct modification, though it fully utilizes React's reactivity.

# Caveats
- "Create Quest" and "Create Statistic" buttons are still stubbed because their respective comprehensive modals (`QuestModal`, `StatModal`) do not exist yet in the React architecture. The scope only explicitly specifies the Habitual add/manage modal as part of this Hub view migration.
- `window.alert` or `window.confirm` is recommended for validations and delete prompts since a React `notifications` component does not yet appear globally accessible like the legacy `window.LM.components.notifications`.

# Conclusion
Implement the "Create Habitual" modal using local state in `SkillHub.jsx`. Add a `handleSaveHabitual` function that saves the new habitual to the `store` with IST timestamps. Render a fixed overlay modal conditionally when `showHabitualModal` is true. Additionally, insert delete buttons mapped to `store.deleteHabitual` and `store.deleteStatistic` within the `activeHabituals` and `activeStatistics` mapping blocks.

# Verification Method
1. Ensure the app runs locally (e.g., via `npm run dev`).
2. Navigate to the Skills view (`#skills` -> SkillHub).
3. Click "Create Habitual"; verify the modal overlay opens.
4. Enter test values and save; verify the modal closes and the new Habitual appears under "ACTIVE HABITUALS".
5. Click the "✕" button on the created Habitual and confirm deletion; verify it vanishes from the UI immediately.
