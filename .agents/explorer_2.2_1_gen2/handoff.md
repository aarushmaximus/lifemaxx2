# Observation
1. `js/views/skill-hub.js` managed "Create Habitual" via an inline panel (toggled by the `create-habitual` action button). On save, it called `store.upsertHabitual` with auto-generated ID, formatting the date to IST.
2. Legacy `skill-hub.js` had 6 action OPTIONS (`create-quest`, `create-habitual`, `create-statistic`, `chain-quests`, `microskills`, `widgets`), while `SkillHub.jsx` currently only has 4 (missing `microskills` and `widgets`).
3. Deleting habituals in legacy was done via a small `✕` button on each habitual calling `store.deleteHabitual(id)`. Deleting statistics was similar, calling `store.deleteStatistic(id)`.
4. Editing statistics opened a legacy modal via `window.LM.components.statModal.open(s.id)`. Other options triggered legacy modals or router navigation (e.g., `LM.router.navigate('#skill-chains/${macroId}')`).
5. `SkillHub.jsx` correctly maps `pct` (capped to 100 by `F.progressPercent`) to the width of the main and microskill progress bars using `style={{ width: \`\${pct}%\` }}`.

# Logic Chain
1. To port the Habitual creation panel accurately, we need React state for the form visibility (`showHabitualForm`) and input fields (`habitualName`, `habitualXpGain`, `habitualXpLoss`).
2. Submitting the form should validate the fields, generate a UID, fetch the IST date string, and push to `store.upsertHabitual()`, mimicking legacy behavior.
3. The missing 2 options (`microskills`, `widgets`) should be added to the `OPTIONS` array in `SkillHub.jsx` so feature parity is met.
4. Active Habituals and Statistics need delete buttons connected to `handleDeleteHabitual` and `handleDeleteStatistic` which invoke `window.confirm` and the respective store delete methods.
5. Action button interactions should be wired in the `onClick` handler. `create-habitual` toggles the inline form. Navigation buttons could update the parent component's tab/view state or update the hash, while modal buttons (Quest/Statistic) can use placeholders or dispatch custom events until the modals are fully migrated.

# Caveats
1. React routing/modal system isn't fully defined yet. `App.jsx` handles basic tabs (dashboard, skills, analysis, coach) but sub-routes like `#skill-chains` or Modals don't exist yet in the React codebase. We assume placeholders or simple alerts for these unmigrated modals.
2. The legacy date format for habituals is based on IST (UTC+5:30) midnight resets. We will reuse the same timezone offset math before upserting.

# Conclusion
The migration for Milestone 2.2 in `SkillHub.jsx` should include:
1. Adding 2 missing action buttons (`microskills`, `widgets`) to the `OPTIONS` array.
2. Adding `useState` hooks for `showHabitualForm`, `name`, `xpGain`, `xpLoss`.
3. Wiring `onClick` for `create-habitual` to toggle `showHabitualForm`.
4. Rendering the Habitual form inline above the "Active Habituals" list, calling `store.upsertHabitual` on save.
5. Adding "✕" and "✎" buttons to Habitual and Statistic lists, calling `store.deleteHabitual` and `store.deleteStatistic` (with `window.confirm`).

# Verification Method
1. Open `SkillHub.jsx` in the browser and click "Create Habitual" to verify the inline form toggles.
2. Submit a new Habitual, ensure it appears in the Active Habituals list.
3. Click "✕" on a Habitual and verify it gets removed from the UI and the store.
4. Verify the 6 OPTIONS buttons render correctly.
