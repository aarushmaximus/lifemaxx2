# Handoff Report: Milestone 2.1 - Skill Hub Setup

## 1. Observation
- The legacy application splits the skill interface into two separate files: `js/views/skill-hub.js` (an action hub with buttons for quests, chains, and inline forms for habituals/stats) and `js/views/skill-detail.js` (which displays the actual macro vs. micro skill tree, XP bars, and history).
- `react-app/src/lib/store.js` acts as an event emitter via `store.on('change', fn)` and `store.emit('change')`, but it completely lacks a `store.off()` or equivalent cleanup method for removing listeners (see line 32 of `store.js`).
- Glassmorphism is natively supported via custom CSS classes `.glass-panel` and `.glass-panel-accent` defined in `react-app/src/index.css` (lines 44-71), which apply `rgba` backgrounds and `backdrop-filter: blur(12px)`.

## 2. Logic Chain
1. **Component Consolidation**: To fulfill the requirement to "Structure the macro and micro skill trees" coherently, the new `SkillHub.jsx` component should merge the legacy "Hub" (actions) and "Detail" (visual tree) views. The Macro skill acts as the root node/header, while Micro skills are rendered as sub-items with their own XP progress bars beneath it.
2. **State Integration & Memory Leak Fix**: React components use `useEffect` to subscribe to data. Without an `off` method in `store.js`, every component remount or `useEffect` re-run will push a duplicate listener to `store.listeners`, causing severe memory leaks. An `off` method must be added to the store before hooking it into React.
3. **Styling Strategy**: Instead of rewriting complex backdrop filters using Tailwind utility classes exclusively, the implementer should leverage the existing `.glass-panel` class in combination with Tailwind structural utilities (e.g., `className="glass-panel p-6 rounded-xl flex flex-col"`). Dynamic colors (like `macro.accentColor`) must be passed via React inline styles.

## 3. Caveats
- I did not implement the code per the constraints.
- Modifying `store.js` to add the `off()` method is technically outside the strict boundary of the React component, but it is architecturally necessary for a stable React migration.
- Modals for creating quests/habituals (Milestone 2.2) are ignored in this structural layout recommendation.

## 4. Conclusion
**Implementation Strategy for `SkillHub.jsx`:**
1. **Store Update**: Export a new method in `store.js`: 
   `function off(event, fn) { listeners = listeners.filter(l => l.fn !== fn); }`
2. **React Structure**: Create `SkillHub.jsx` that accepts a `macroId` prop. Use `useEffect` to fetch `macro`, `habituals`, `statistics`, and `chains`, and subscribe to `store.on('change', ...)` (returning `store.off` in the cleanup function).
3. **Layout**:
   - **Header**: Display Macro name, Level, and overall Macro XP Bar.
   - **Grid Layout**: Split the view. 
     - *Left Column (The Tree)*: Map through `macro.microSkills`, displaying each Micro Skill with its Level, Tier, and localized XP bar (replicating legacy `skill-detail.js`).
     - *Right Column (The Hub)*: Render Active Habituals, Active Statistics, and Action Buttons (replicating legacy `skill-hub.js`).
4. **Glassmorphism**: Use `<div className="glass-panel rounded-xl p-4">` for the card containers and use `style={{ '--sk-accent': macro?.accentColor }}` on the root component container to feed CSS variables to the children.

## 5. Verification Method
- **Store**: Verify `store.js` exports an `off` method.
- **Component**: Mount `<SkillHub macroId="some_id" />` in a test route and verify no event listener leaks occur on hot-reload.
- **UI**: Ensure the Micro skills list is visible alongside the action buttons (Habituals, Chains), confirming the hub and detail views were successfully unified.
