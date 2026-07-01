# Analysis of Coach Milestone 4 Iteration 2 Bug Fixes

## 1. Broken Enter-to-Submit (Stale Closure)
**Issue:** `ReactQuill`'s `keyboard.bindings.enter.handler` captures an empty `inputText` string due to a stale closure created on initial render.
**Fix:** Use a `useRef` to store the latest value of `inputText` (e.g. `textRef.current = inputText`) and access `textRef.current` in the handler, or use `quillRef.current.getEditor().getText()`. We will use a `useRef` for simplicity.

## 2. Chain Quest Acceptance Bug
**Issue:** The UI incorrectly pushes the raw AI JSON (`msg.chainData`) via `store.addQuestChain({ quests: [msg.chainData] })` which discards the structured steps.
**Fix:** Construct a proper Chain object based on the legacy structure (using `store.upsertChain`). Loop through `msg.chainData.steps` and map each to a Quest object with a `targetSkills` array having `xpAmount = s.xp`.

## 3. Crash Risk on `Notification.permission`
**Issue:** `Notification.permission` throws on iOS/unsupported browsers.
**Fix:** Wrap all accesses in `if ('Notification' in window)`.

## 4. Malformed Context Strings
**Issue:** AI proposals (`fletcher_proposal`) are missing from the `conversationContext` passed to Gemini. Thus, if the user says "Modify it to be 50XP", the AI lacks the context of the proposal.
**Fix:** In `contextMessages.map(m => ...)`, add a condition to stringify the proposal data so the AI knows what it just proposed.

## 5. Quota Leak
**Issue:** `checkAndUpdateQuota()` in `ai-engine.js` increments the quota *before* making the API call. If the API fails with 503 or 429, the quota is leaked.
**Fix:** Update `checkAndUpdateQuota` to just check the limit. Create a new `commitQuota()` function that increments it *after* a successful response.

## 6. API Parsing Error
**Issue:** Missing `content` object throws a TypeError in `response.data.candidates[0].content.parts[0].text`.
**Fix:** Add optional chaining: `response.data.candidates?.[0]?.content?.parts?.[0]?.text`.

## 7. Broken Background Timers & Fixed Timer Notification
**Issue:** `useTimers` hook stops tracking timers when `Coach` unmounts. Fixed timers (`/ftimer`) don't actually trigger.
**Fix:** Create a new `lib/timerService.js` singleton that manages `setInterval` globally. Update `Coach.jsx` to use this service via a simple subscription hook. The service will check both regular timers and `fixedTimers` (daily reminders) every second and fire notifications.

## 8. Race conditions in `useTimers`
**Issue:** Adding and deleting timers used `timers` from the stale closure.
**Fix:** Solved implicitly by moving to `timerService.js` which maintains its own state array.

## 9. UI Bug with `findLastIndex`
**Issue:** Multiple prompts update the wrong card due to `findLastIndex`.
**Fix:** Pass the specific message index from `ChatMessage` into the `onStartTimer` and `onSetFixedTimer` callbacks, instead of using `chat.messages.findLastIndex`.

## 10. NaN durations bypass checks
**Issue:** `totalMs <= 0` check fails if `totalMs` is NaN.
**Fix:** Change check to `if (!(totalMs > 0)) return;`.

## 11. Empty message bypass in Quill
**Issue:** `&nbsp;` bypasses the empty check.
**Fix:** Modify `const plainText = text.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim();` before submission.
