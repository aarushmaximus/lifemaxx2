# Original User Request

## Initial Request — 2026-06-30T08:16:10+05:30

Migrate the complex Vanilla JS UI views of the LifeMaxx application into functional React components, utilizing standard TailwindCSS and the pre-configured React environment.

Working directory: `c:\Users\ajays\.gemini\antigravity\scratch\lifemaxxantigrav\react-app`
Integrity mode: development

## Requirements

### R1. Dashboard Migration
Convert the Vanilla JS `js/views/dashboard.js` logic into a `Dashboard.jsx` React component. This includes building the daily quest grid, the top status bar (daily total XP vs goal), the swipable stat logging carousel, and drag-and-drop quest ordering. Ensure all `store.js` calls correctly use the provided `src/lib/store.js` ES Module.

### R2. Skill Hub Migration
Convert `js/views/skill-hub.js` into a `SkillHub.jsx` React component. This must replicate the Macro and Micro skill trees, XP progress bars, and the modal interactions for adding/managing skills.

### R3. Analysis & Archive Migration
Convert `js/views/analysis.js` into an `Analysis.jsx` React component. This must include the weekly stats SVGs (graphs), the past-day archive drill-down (time tracking hour blocks and past stat editing UI), and the workout progression charts.

### R4. Coach (AI Chat) Migration
Convert `js/views/coach.js` into a `Coach.jsx` component, migrating the chat interface and the Quill rich text editor into React equivalents (e.g. using `react-quill` or a custom wrapper).

## Acceptance Criteria

### Functional UI Parity
- [ ] Running `npm run dev` in the `react-app` directory successfully starts the React application without fatal errors.
- [ ] The React app accurately reads legacy `localStorage` data via `src/lib/store.js`.
- [ ] Users can drag and drop quests in the React Dashboard just like the Vanilla app.
- [ ] Clicking a quest toggles its completion state and accurately awards XP.
- [ ] The SVG stat graphs in the Analysis tab render correctly based on history data.

### Styling Parity
- [ ] All components utilize the standard TailwindCSS classes that were mapped to the custom CSS variables in `src/index.css`.
- [ ] The premium dark-mode, glassmorphism aesthetics of the original app are visually identical in the React version.
