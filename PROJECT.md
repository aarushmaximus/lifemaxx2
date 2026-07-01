# Project: LifeMaxx React Migration

## Architecture
- Target: `react-app` directory (Vite + React + TailwindCSS).
- Migrating Vanilla JS views from `js/views/*` into React components in `react-app/src/components/*` or `react-app/src/pages/*`.
- State Management: React components will use `react-app/src/lib/store.js` (legacy localStorage data).
- The migration handles 4 primary views: Dashboard, Skill Hub, Analysis, and Coach.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Dashboard Migration | `js/views/dashboard.js` -> `react-app/src/components/Dashboard.jsx` | none | IN_PROGRESS (4e998780-ca33-463a-94d6-85191fd2c963) |
| 2 | Skill Hub Migration | `js/views/skill-hub.js` -> `react-app/src/components/SkillHub.jsx` | none | IN_PROGRESS (5b5dbf44-752c-4de2-980b-61ef5f4e916e) |
| 3 | Analysis Migration | `js/views/analysis.js` -> `react-app/src/components/Analysis.jsx` | none | DONE |
| 4 | Coach Migration | `js/views/coach.js` -> `react-app/src/components/Coach.jsx` | none | DONE |

## Interface Contracts
### React App ↔ Legacy Store
- UI components will interact with the data layer exclusively via `react-app/src/lib/store.js`.
- Legacy styling via TailwindCSS as mapped in `react-app/src/index.css`.

## Code Layout
- `js/views/*` (legacy source to analyze)
- `react-app/src/components/*` (new React components)
- `react-app/src/App.jsx` (will need to route/render the new components eventually, though milestones focus on individual component construction)
