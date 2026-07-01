# Observation

- **Target Path**: `react-app/src/components/Analysis.jsx`
- **Legacy Source**: `js/views/analysis.js`
- The legacy `analysis.js` acts as a view controller managing three distinct tabs: `today`, `archive`, and `progression`.
- **UI & DOM**: The legacy file heavily relies on raw HTML string interpolation to render a 24-hour heat map grid, an interactive archive viewer (with collapsable weeks), and SVG line charts for workout progression.
- **AI Chat Code**: `analysis.js` contains functions for an AI Chat interface (`initChat`, `sendChatMessage`, `pushMessage`). However, the HTML required for this interface (`#coach-input-text`, `#analysis-chat-history`) is missing from its `render()` output, and is instead handled by `js/views/coach.js`.
- **State Management**: The React application's store (`react-app/src/lib/store.js`) maintains the legacy pub/sub architecture (`store.on('change', fn)` and `store.emit()`) rather than exporting modern React Hooks like `useSyncExternalStore`.
- **CSS / Styling**: The legacy app used custom Material Design 3 tokens mapped to Tailwind classes (e.g., `bg-surface-container`, `text-on-surface`). The React app's `index.css` and `tailwind.config.js` replace these with standard Tailwind colors and specific CSS variables (e.g., `var(--bg-surface)`).

# Logic Chain

1. **Component Structure**: Because the view handles three separate, complex domains, the migration should break `Analysis.jsx` into a main container that manages tab state, and three sub-components: `AnalysisToday`, `AnalysisArchive`, and `AnalysisProgression`.
2. **AI Chat Exclusion**: Since the AI Chat UI is actively managed by `coach.js` and `Coach.jsx` (as seen in `App.jsx` imports), the entire "Fletcher" chat logic in `analysis.js` is dead code in this context and MUST be completely omitted from `Analysis.jsx`.
3. **Data Subscription**: To achieve reactivity, the main container (or individual sub-components) must implement a `useEffect` hook that subscribes to `store.on('change', handler)` and updates local React state (e.g., triggering a re-render) to fetch the latest store data.
4. **SVG Migration**: The string-interpolated SVGs for Weekly Stats and Workout Progression must be converted into declarative JSX (`<svg>`, `<polyline>`, `<circle>`). The mathematical logic (mapping X to width, Y to height) and the Epley 1RM formula (`weight * (1 + reps / 30)`) can be directly ported into the component's render body.
5. **UI Class Mapping**: When converting the HTML to JSX, legacy specific utility classes must be translated. For example, `bg-surface-container` should map to the closest equivalent in the new config, such as `bg-[var(--bg-surface)]` or standard Tailwind like `bg-[#101016]`.

# Caveats

- The Epley formula for the 1 Rep Max calculation is currently hardcoded directly within `analysis.js`. It may be beneficial to extract this into `react-app/src/lib/formulas.js` during implementation, but keeping it localized is acceptable.
- The `react-app/src/components` and `react-app/src/pages` directories are currently mostly empty. The implementer must ensure the new `Analysis.jsx` component is correctly exported and matches the import path expected by `App.jsx`.

# Conclusion

The migration strategy is to build `Analysis.jsx` as a parent wrapper that handles tab navigation and store subscriptions. It will conditionally render:
- `<AnalysisToday />`: Renders the 24-hour grid, selection state, and daily stats.
- `<AnalysisArchive />`: Manages the `list`, `week_details`, and `week_stats` modes, including JSX-based SVG charts.
- `<AnalysisProgression />`: Renders the Epley 1RM workout progression charts using JSX SVGs.
All legacy AI chat logic should be discarded during this migration, and legacy CSS classes must be translated to the new React tailwind setup.

# Verification Method

1. Verify `react-app/src/components/Analysis.jsx` (or `pages/Analysis.jsx` if matching `App.jsx`) is created and exported.
2. Run the React development server using `npm run dev` in the `react-app` directory.
3. Open the application, navigate to the Analysis tab, and verify that the Today, Archive, and Progression tabs render without runtime errors.
4. Verify that the SVG charts render correctly.
5. In the UI, add a daily log entry (or modify a stat) and ensure the Analysis components re-render automatically via the store subscription.
