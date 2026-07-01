# Handoff Report: Milestone 2.2 - Progress Bars & Modals

**Core Findings**: The legacy `skill-hub.js` managed modals and panels via vanilla JS DOM manipulation and global `window.LM` components. The React `SkillHub.jsx` will implement the inline habitual panel using component state, while deferring to existing legacy modal instances on the `window.LM` object for quests and statistics. Progress bars need ARIA attributes and clamping to meet modern requirements.

## 1. Observation
- `skill-hub.js:68-91` defines a hidden `<div id="habitual-create-panel">` which is toggled via display:none/block. It creates habituals using `store.upsertHabitual` with a unique ID and `lastResetDate` in IST.
- `skill-hub.js:197-202` handles habitual deletion via `window.confirm` and `store.deleteHabitual(id)`.
- `skill-hub.js:122` handles statistic deletion and editing inline, calling `LM.components.statModal.open` for edits, and `store.deleteStatistic` for deletion.
- `skill-hub.js:152-170` maps action buttons:
  - Create Quest opens `LM.components.questModal.open(null, false)`.
  - Create Statistic opens `LM.components.statModal.open(null)`.
  - Chain Quests navigates using `#skill-chains/${macroId}`.
- `SkillHub.jsx:104-107` renders an XP progress bar using just a `style={{ width: `${pct}%` }}` property.
- `SkillHub.jsx:203-219` has placeholder `onClick` handlers for the Action Buttons mapping over `OPTIONS`.
- No React-native `QuestModal` or `StatModal` were found in the codebase. Other React components (like `Analysis.jsx`) invoke legacy modals and notifications via `window.LM.components`.

## 2. Logic Chain
- Because there are no native React modal components for Quests and Statistics yet, we must integrate the React app with the legacy vanilla JS components hosted on `window.LM`.
- Because the inline "Create Habitual" panel is entirely local to the Hub View, it must be completely converted to standard React controlled state.
- Because the Active Habituals and Active Statistics lists currently lack action controls in `SkillHub.jsx`, we must inject edit (for stats) and delete (for both) buttons that use `window.confirm` to mimic the legacy behavior safely.
- Because "ensure they meet requirements" is specified for progress bars, we must add ARIA accessibility standards (`role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`) and clamp the width percentage to 0-100% to avoid visual bugs if the data produces >100%.

## 3. Caveats
- Assuming `window.LM.components.notifications.show` and `window.LM.components.questModal`/`statModal` are available globally when the React app mounts.
- Routing for Chains is assumed to be handled by setting `window.location.hash`, as React Router is not evident here.

## 4. Conclusion
**Proposed Implementation Strategy for `SkillHub.jsx`:**

1. **State Management**:
   Add states for the Habitual Create panel:
   ```jsx
   const [showHabitualPanel, setShowHabitualPanel] = useState(false);
   const [habName, setHabName] = useState('');
   const [habGain, setHabGain] = useState(50);
   const [habLoss, setHabLoss] = useState(25);
   ```

2. **Action Buttons (OPTIONS)**:
   In the `onClick` of the `OPTIONS.map` loop, switch on `opt.id`:
   - `'create-quest'`: `if (window.LM?.components?.questModal) window.LM.components.questModal.open(null, false);`
   - `'create-habitual'`: `setShowHabitualPanel(prev => !prev);`
   - `'create-statistic'`: `if (window.LM?.components?.statModal) window.LM.components.statModal.open(null);`
   - `'chain-quests'`: `window.location.hash = '#skill-chains/' + macro.id;`

3. **Habitual Create Panel**:
   Conditionally render the panel above the Active Habituals block:
   ```jsx
   {showHabitualPanel && (
     <div className="glass-panel p-6 rounded-2xl flex flex-col space-y-4 mb-6">
       {/* Include inputs wired to habName, habGain, habLoss */}
       {/* Save Button logic: */}
       <button onClick={() => {
         if (!habName.trim()) return; // Show notification if possible
         const now = new Date();
         const todayIST = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().slice(0, 10);
         store.upsertHabitual({
           id: store.uid(), macroId: macro.id, name: habName.trim(), xpGain: Number(habGain), xpLoss: Number(habLoss), createdAt: Date.now(), todayStatus: null, lastResetDate: todayIST
         });
         setShowHabitualPanel(false); setHabName('');
       }}>Save Habitual</button>
     </div>
   )}
   ```

4. **Delete / Edit Actions**:
   - Update `habituals.map` to include a Delete button calling: 
     `if(window.confirm('Delete this habitual?')) store.deleteHabitual(h.id);`
   - Update `statistics.map` to include Edit (calls `statModal.open(s.id)`) and Delete (calls `store.deleteStatistic(s.id)`).

5. **Progress Bars**:
   - Update the Macro XP bar and the Micro Skills XP bars.
   - Add standard ARIA: `role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"`.
   - Constrain inline style: `width: \`${Math.min(100, Math.max(0, pct))}%\``.

## 5. Verification Method
- **To test Habituals**: Click "Create Habitual" in the Skill Hub UI, ensure the panel toggles. Fill out and save, check if it renders in the "Active Habituals" list. Click the ✕ button to verify it prompts deletion and removes it.
- **To test Progress Bars**: Inspect the XP Bar DOM element to verify `role="progressbar"` and `aria-valuenow` exist.
- **To test Modals**: Click "Create Quest" and "Create Statistic" and verify the legacy pop-ups open correctly.
