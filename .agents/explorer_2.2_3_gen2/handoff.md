# Milestone 2.2 Investigation Report

## Observation
- **Habitual Management (`skill-hub.js`)**: Legacy habitual creation is handled by an inline hidden panel (`#habitual-create-panel`) toggled by the "Create Habitual" button. It gathers `#habitual-name-inp`, `#habitual-xpgain-inp`, and `#habitual-xploss-inp`, validates them, and calls `LM.store.upsertHabitual()`. Deletion uses a `confirm()` prompt followed by `LM.store.deleteHabitual()`.
- **Statistic Management (`skill-hub.js`)**: Deletion operates identically via `confirm()` and `LM.store.deleteStatistic()`.
- **Current React State (`SkillHub.jsx`)**: The component renders active habituals and statistics but lacks the inline creation panel and delete buttons. The `OPTIONS` action buttons map over a list but contain a placeholder comment `// Modals interactivity handled in 2.2` in their `onClick`.
- **Progress Bar Design (`STITCH_DESIGN.md`)**: The design spec mandates that progress bars must be exactly `3px` tall, use a specific multi-stop chrome gradient (`linear-gradient(135deg, #6e6e6e 0%, #c8c8c8 35%, #ffffff 50%, #c0c0c0 65%, #707070 100%)`), and feature a subtle white glow (`box-shadow: 0 0 6px rgba(255,255,255,0.15)`).
- **Current Progress Bars (`SkillHub.jsx`)**: The main XP bar and micro-skills bars currently use Tailwind height classes `h-3` (12px) and `h-1.5` (6px) with a solid `var(--sk-accent)` background, directly violating the 3px and chrome gradient requirements.

## Logic Chain
1. To replicate the legacy `skill-hub.js` behavior in React, `SkillHub.jsx` must implement `useState` hooks for the habitual panel's visibility (`isHabitualPanelOpen`) and its controlled input fields (`name`, `xpGain`, `xpLoss`).
2. A `handleSaveHabitual` function must be created to compute `todayIST`, validate inputs, and invoke `store.upsertHabitual()`. `SkillHub.jsx` already listens to `store.on('change')`, so the UI will update automatically.
3. To enable deletion, a `✕` button must be added to each mapped row in the "ACTIVE HABITUALS" and "ACTIVE STATISTICS" sections. These buttons will trigger an `onClick` that uses `window.confirm` and the respective `store.deleteHabitual/Statistic` method.
4. The empty `onClick` in the `OPTIONS` map needs to route actions based on `opt.id`. For `create-habitual`, it should toggle `isHabitualPanelOpen`. For other actions (`create-quest`, `create-statistic`, etc.), they should trigger simple placeholder alerts for now, as their respective global modals do not yet exist in the React `store/components`.
5. The progress bar styling in `SkillHub.jsx` must be fundamentally updated. The height classes must be changed to `h-[3px]`, and the `style` prop must be updated to apply the exact chrome gradient and `boxShadow` defined in `STITCH_DESIGN.md`.

## Caveats
- The legacy app utilized global `window.LM.components.questModal.open()` and `statModal.open()` which do not currently exist in the React application architecture. The strategy assumes these remaining `OPTIONS` buttons will act as placeholders until their full components are migrated in subsequent milestones.
- Applying the strict chrome gradient to the progress bars will replace the `var(--sk-accent)` color on the bars, which is expected per `STITCH_DESIGN.md` but changes the current visual appearance.

## Conclusion
**Step-by-Step Implementation Strategy for Milestone 2.2:**
1. **State Addition**: Add `isHabitualPanelOpen`, `habName`, `habGain`, and `habLoss` to `SkillHub.jsx` using `useState`.
2. **Action Wiring**: Update the `onClick` in the `OPTIONS` map. If `opt.id === 'create-habitual'`, toggle the inline panel state. For all other IDs, fire an `alert('Modal placeholder')`.
3. **Habitual Panel UI**: Render a conditionally visible form block directly above the "ACTIVE HABITUALS" list. It should use controlled inputs bound to the new state variables and include a "Save" button that triggers `store.upsertHabitual()`.
4. **Delete Handlers**: Insert a `✕` button inside the iterations for both habituals and statistics, attaching `window.confirm` and the respective store deletion function.
5. **Progress Bar Redesign**: Refactor the main XP bar and Micro Skill XP bars. Replace `h-3` / `h-1.5` with `h-[3px]`, and update the `style` prop of the fill `<div>` to use the chrome `linear-gradient` and white `boxShadow`.

## Verification Method
1. Launch the React app and navigate to the Skills view.
2. Verify visually that all progress bars are exactly 3px tall with a chrome gradient and subtle glow.
3. Click the "Create Habitual" option button; the inline panel should appear.
4. Input details and click save. Verify the panel closes and the new habitual appears in the list.
5. Click the `✕` next to a habitual and a statistic, confirm the prompt, and verify the items are removed from the UI.
