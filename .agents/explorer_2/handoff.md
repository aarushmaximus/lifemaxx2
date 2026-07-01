# Handoff Report: Milestone 4 (Coach) Fixes

## 1. Observation
- `Coach.jsx` lines 200-201 map `conversationContext` by fetching `m.text`, ignoring that `fletcher_proposal` messages contain structured data in `questData` / `chainData` with an empty string for `text`.
- `ai-engine.js` increments quota directly in `checkAndUpdateQuota()` before the `fetch` API call on line 66, causing 503/429 failures to leak quota.
- `Coach.jsx` line 216 assumes `response.data.candidates[0].content.parts[0].text` exists. If `content` is stripped due to safety filters, it throws `TypeError: Cannot read properties of undefined (reading 'parts')`.
- `ReactQuill` Enter handler in `Coach.jsx` line 431 uses a stale closure for `inputText`, passing an empty string on Enter.
- `Coach.jsx` line 286 extracts `msg.chainData` and calls `store.addQuestChain({ quests: [msg.chainData] })`, which flattens the chain into individual unlinked quests (as seen in `store.js` line 551), discarding steps.
- `Coach.jsx` contains the background interval for `/timer` in `useTimers()`. This unmounts and stops checking when the user leaves the Coach tab. `App.jsx` has no timer checking.
- The `/ftimer` functionality simply saves to `store.getSettings().fixedTimers` (line 260) but no polling mechanism exists to trigger notifications for it.
- `Coach.jsx` line 251 uses `chat.messages.findLastIndex(msg => msg.sender === 'timer_setter')` to modify the chat history, causing older unresolved forms to update the newest form in the UI.
- Quill rich text outputs `&nbsp;` when spaces are typed, bypassing `text.replace(/<[^>]+>/g, '').trim()` empty checks.

## 2. Logic Chain
1. To retain AI context, the mapper must selectively inject `JSON.stringify(msg.chainData || msg.questData)` when the sender is `fletcher_proposal`.
2. Quota leakage is resolved by separating quota verification from consumption. Only increment after a 200 OK `res.json()` success.
3. API structure changes (filtered content) require defensive optional chaining `?.` and a fallback error string to prevent UI crashes.
4. Using `useRef(inputText)` guarantees the Enter key handler always accesses the most up-to-date state without remounting the Quill instance.
5. Chain proposals must be explicitly constructed as a Chain object (with `steps`) and submitted to `store.upsertChain()` rather than `store.addQuestChain()`.
6. Timer logic (both regular and fixed) must run continuously. Hoisting an interval to `App.jsx` ensures background operation across tabs, fulfilling the missing `ftimer-notifier.js` legacy functionality natively.
7. Passing the specific `msgIndex` prop from `ChatMessage` down to `TimerSetterCard` actions eliminates the need for `findLastIndex` and guarantees the correct message is updated.

## 3. Caveats
- Moving the timer interval to `App.jsx` introduces a minor polling overhead (running `setInterval` at 1000ms globally). It is extremely lightweight but should wrap JSON parsing in `try/catch`.
- `Notification.requestPermission()` must be handled carefully. Browsers require user interaction, so we request it when the user clicks "Start Timer" or "Set Daily Timer", not automatically in the background.

## 4. Conclusion
The 14 identified bugs can be fully remediated without architectural overhauls. The primary changes involve defensive programming in `Coach.jsx` (optional chaining, refs, specific array indices) and moving the background polling mechanisms to `App.jsx` so notifications trigger reliably regardless of the active tab.

## 5. Verification Method
- Independent Implementer to apply changes outlined in `analysis.md`.
- **UI Test:** Type spaces and hit Enter in the Coach tab. It should not send an empty message.
- **Timer Test:** Start a `/timer` for 10 seconds, navigate to the Dashboard tab, and verify a browser notification still fires.
- **API Test:** Force an invalid payload or inspect quota in localStorage. The quota count must not increase on network failures.
- **Quest Test:** Request a `/cquest`, accept it, and check if it is inserted correctly as a Linked Chain rather than flat quests.
