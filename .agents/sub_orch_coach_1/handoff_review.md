# Handoff Report: Milestone 4 (Coach Migration) Review

## Review Summary

**Verdict**: REQUEST_CHANGES

## Findings

### [Critical] Broken Enter-to-Submit (Stale Closure)
- **What**: The `ReactQuill` Enter key handler is trapped in a stale closure.
- **Where**: `react-app/src/pages/Coach.jsx` line 431.
- **Why**: `ReactQuill` evaluates the `modules` configuration only once when it mounts. The inline handler `() => { handleSendMessage(inputText); ... }` captures the initial state of `inputText` (an empty string). Consequently, pressing Enter will do nothing because the text is evaluated as empty. Note that a `handleKeyDown` function was written at line 235 but is never attached or used.
- **Suggestion**: Use a `useRef` to track the latest value of `inputText` so the handler can access `inputTextRef.current`, or use `this.quill.root.innerHTML` to get the value inside the handler.

### [Critical] Chain Quest Acceptance Bug
- **What**: Accepting a Chain proposal creates a single standard quest and discards all the chain steps.
- **Where**: `react-app/src/pages/Coach.jsx` line 287 (`store.addQuestChain({ quests: [msg.chainData] })`).
- **Why**: The worker used `store.addQuestChain` which is designed to batch-add standard quests. It completely ignores `msg.chainData.steps` and doesn't store anything in `KEYS.chains`. This breaks the multi-step chain quest functionality. 
- **Suggestion**: Follow the legacy `js/views/coach.js` implementation: construct a proper Chain object and use `store.upsertChain(newChain)`. Be sure to adapt the steps to use `targetSkills` instead of raw XP to match the new schema, just like you successfully did for regular quests.

### [Major] Crash Risk (Notification API)
- **What**: Direct access to `Notification.permission` without checking API availability.
- **Where**: `react-app/src/pages/Coach.jsx` line 66 (in `useTimers`) and line 276 (in `setFixedTimer`).
- **Why**: Accessing `Notification.permission` on browsers that do not support the API (e.g., iOS Safari) will throw a `ReferenceError`, crashing the app when the user tries to set a timer. 
- **Suggestion**: Guard the checks safely: `if ('Notification' in window && Notification.permission === 'default')`.

## Verified Claims
- `lib/ai-engine.js` was correctly ported and manages the quota and Gemini API logic properly.
- The `useTimers` hook successfully bridges the legacy local storage timer logic into a React-friendly interval system.
- Standard quest acceptance properly converts raw XP to the new `targetSkills` schema.

## Verification Method
1. `npm run build` timed out on permissions, so rigorous static analysis was performed on `Coach.jsx`, `ai-engine.js`, and `store.js`.
2. Evaluated closures, React hook lifecycle, state management, and legacy code compatibility (`legacy/js/views/coach.js`).
