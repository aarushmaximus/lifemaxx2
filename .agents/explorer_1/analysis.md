# Coach Bugs Analysis (Milestone 4 - Iteration 2)

## 1. Stale Closure in ReactQuill (Enter key binding)
**File**: `Coach.jsx`
**Location**: `ReactQuill` component `modules` prop (line 431)
**Issue**: The `handler` for the Enter key is defined using a stale closure of `inputText`. `inputText` will always evaluate to the initial value (or the value at the time the module was created) when the Enter key is pressed, causing Quill to delete the user input without actually sending the typed text.
**Fix Strategy**: 
- Instead of using `inputText` in the handler, access the quill editor instance directly to get the current HTML (e.g. `const text = this.quill.root.innerHTML`), or use a `useRef` to store the latest `inputText` and access `ref.current` inside the handler.

## 2. Chain Quest Acceptance Bug
**File**: `Coach.jsx`
**Location**: `handleProposalAction` (line 287)
**Issue**: When accepting a chain quest, the code does `store.addQuestChain({ quests: [msg.chainData] })`. This simply wraps the raw `chainData` inside a `quests` array, discarding the actual step structures and failing to conform to the store's `Chain` object schema.
**Fix Strategy**:
- Construct a proper `Chain` object: give it an ID, name, description.
- Map over `msg.chainData.steps` to create individual quest step objects (with ID, name, status='locked', and `targetSkills` array containing the xp).
- Use `store.upsertChain(newChain)` to properly save it.

## 3. Notification Crash Risk
**File**: `Coach.jsx`
**Location**: `fireTimerNotification` (line 13), `addTimer` (line 66), `setFixedTimer` (line 276)
**Issue**: Accessing `Notification.permission` throws an exception on browsers that do not support the `Notification` API (like iOS).
**Fix Strategy**: 
- Guard the permission checks with `if ('Notification' in window)`.

## 4. Broken Background Timers
**File**: `Coach.jsx` & `App.jsx`
**Location**: `useTimers` hook in `Coach.jsx`
**Issue**: `useTimers` starts the timer polling interval inside `Coach.jsx`. When the user navigates away from the Coach tab, the component is unmounted, the interval is cleared, and timers stop firing.
**Fix Strategy**: 
- Move `useTimers` out of `Coach.jsx` and into a global context, such as `App.jsx` or by subscribing to a tick event from `store.js`. Pass down the timer state to `Coach.jsx` or export a global hook that uses a singleton interval.

## 5. Incomplete Fixed Timer
**File**: `Coach.jsx`
**Location**: `setFixedTimer` (line 260)
**Issue**: Saving a `/ftimer` pushes a new fixed timer into the settings, but there is no mechanism to actually check the time and trigger a notification when the time is reached (legacy logic was omitted).
**Fix Strategy**:
- In the global timer loop (moved to `App.jsx` per bug #4), add logic to check `settings.fixedTimers` against the current time (`HH:MM`). If they match and haven't fired yet today, fire `fireTimerNotification` and mark it as fired for today.

## 6. Race Conditions in useTimers
**File**: `Coach.jsx`
**Location**: `addTimer` (line 61)
**Issue**: `const next = [...timers, newTimer]; setTimers(next);` uses a stale `timers` array if multiple timers are added quickly or if the interval causes state overlapping.
**Fix Strategy**: 
- Use the functional form: `setTimers(prev => { const next = [...prev, newTimer]; localStorage.setItem(...); return next; });`

## 7. UI Bug (`findLastIndex` mismatch)
**File**: `Coach.jsx`
**Location**: `startTimer` (line 251), `setFixedTimer` (line 269)
**Issue**: `findLastIndex(msg => msg.sender === 'timer_setter')` incorrectly modifies the very last timer card even if the user clicks "Start Timer" on an older timer card in the chat history.
**Fix Strategy**: 
- Pass the message `index` to the `TimerSetterCard` / `FTimerSetterCard` components. Use this specific index to update the correct message in the chat array, similarly to how `ProposalCard` passes the `index` via `onAction`.

## 8. NaN durations in Timer Input
**File**: `Coach.jsx`
**Location**: `startTimer` (line 244)
**Issue**: If the user leaves inputs blank, `h`, `m`, `s` can evaluate to `NaN`. `NaN <= 0` is false, bypassing the negative check and saving a timer with `durationMs: NaN`.
**Fix Strategy**: 
- Ensure inputs fallback to 0. Add `if (isNaN(totalMs) || totalMs <= 0) return;`

## 9. Quill Validation (Empty message bypass)
**File**: `Coach.jsx`
**Location**: `handleSendMessage` (line 155)
**Issue**: Stripping HTML tags from Quill's empty line (`<p>&nbsp;</p>`) leaves `&nbsp;`. The standard `.trim()` does not remove this HTML entity, so an empty message bypasses the `!plainText` check.
**Fix Strategy**: 
- Add `.replace(/&nbsp;/g, '')` before trimming, or use a proper HTML parser to extract text content.

## 10. Quota Leak
**File**: `ai-engine.js`
**Location**: `checkAndUpdateQuota` (line 6), `generateContent` (line 67)
**Issue**: The quota count is incremented BEFORE the API request is made. If the request fails (e.g. 503, 429, or network error), the quota is permanently lost.
**Fix Strategy**: 
- Split `checkAndUpdateQuota` into `checkQuota()` and `incrementQuota()`. Only call `incrementQuota()` after `fetch` succeeds.

## 11. API Parsing Error
**File**: `ai-engine.js`
**Location**: `generateContent` (line 216)
**Issue**: `response.data.candidates[0].content.parts[0].text` throws a TypeError if the API returns an empty payload (e.g. due to safety filters or blocking).
**Fix Strategy**: 
- Use optional chaining: `response.data.candidates?.[0]?.content?.parts?.[0]?.text`. Add a fallback if missing.

## 12. Malformed Context Strings
**File**: `Coach.jsx`
**Location**: `handleSendMessage` (line 201)
**Issue**: AI proposals (`msg.sender === 'fletcher_proposal'`) have empty `msg.text`. When building the chat context for the prompt, the AI only sees `Fletcher: ` with no details of the actual proposed JSON, causing it to lose context of what it just proposed.
**Fix Strategy**: 
- During context building, check if the message is a proposal. If so, serialize the `questData` or `chainData` into the context string: `Fletcher: [Proposed: ${JSON.stringify(m.questData || m.chainData)}]`.
