# Milestone 4 - Coach Migration Analysis

## Overview
The legacy `coach.js` implements a chat interface acting as the user's AI coach ("Fletcher"). It features chat history, AI-generated responses using the Gemini API, custom interactive cards (Quest/Chain proposals, Timer Setters), and a sticky input area.

## State Management
1. **Coach Chats**: Already supported in `react-app/src/lib/store.js` via `getCoachChats`, `upsertCoachChat`, and `deleteCoachChat`.
2. **Timers**: Legacy stores active timers directly in `localStorage` under the key `lm_coach_timers`. The React port will need a custom React hook (e.g., `useTimers`) to sync this state, and an interval to trigger the notifications.
3. **AI Engine**: Legacy uses `window.LM.aiEngine.generateContent` which wraps `fetch` to Gemini. This needs to be ported to `react-app/src/lib/ai-engine.js`.

## UI Layout Analysis
- **Shell**: The entire view sits below the main header (`top: 60px`) and above the bottom nav (`bottom: 96px`).
- **Sidebar**: A slide-in `<aside>` showing previous chat histories, grouped by "Today", "Yesterday", and "Older".
- **Main Area**: 
  - **Header**: Contains a sidebar toggle, user avatar, and timer toggle with an active timer count badge.
  - **Timer Panel**: A horizontally scrolling flex container rendered conditionally below the header.
  - **Chat Area**: A scrollable list of message bubbles. The bottom needs an auto-scroll ref.
  - **Input Bar**: A sticky footer containing the command popup (`/quest`, `/timer`, etc.), a text area (or Quill editor), and a submit button.

## Quill Editor Integration (Milestone 4.2)
- **Current State**: `quill` or `react-quill` is **not** currently in `react-app/package.json`.
- **Implementation Approach**: 
  1. Add `react-quill` via npm/uv.
  2. The input field in the sticky bar can be replaced by a `<ReactQuill>` component to allow formatting.
  3. The rendered user chat bubbles will use `dangerouslySetInnerHTML` to display the formatted HTML output from Quill.
  4. Ensure keyboard events (like Enter to send) are appropriately hooked into the Quill instance or wrapper.

## Step-by-Step Implementation Strategy

1. **Prerequisites**:
   - Port `js/lib/ai-engine.js` to `react-app/src/lib/ai-engine.js`.
   - Install `react-quill` (`npm install react-quill quill`).

2. **Milestone 4.1: Skeleton & State Setup**:
   - Create `components/CoachSidebar.jsx` for history grouping.
   - Create `components/CoachTimerPanel.jsx` and implement the timer interval logic.
   - Set up the main `pages/Coach.jsx` to manage `activeChatId`, `isSidebarOpen`, and list `chats`.

3. **Milestone 4.2: Chat UI & Quill Integration**:
   - Build `components/ChatMessage.jsx` to handle different sender types: `user` (Quill HTML), `fletcher` (Markdown/Text), `fletcher_proposal` (Quest cards), `timer_setter`.
   - Replace the standard `<textarea>` with `<ReactQuill>` in a `CoachInput.jsx` component.
   - Connect the submit action to `ai-engine.js`, push a loading message, and update upon response.

## Proposed Code Changes
- Create `react-app/src/lib/ai-engine.js` (adapted from legacy).
- Create `react-app/src/pages/Coach.jsx` as the container.
- Create sub-components in `react-app/src/components/coach/` (Sidebar, TimerPanel, ChatBubble, InputBox).
