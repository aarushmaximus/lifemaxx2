import assert from 'assert';

// Mock localStorage and window
global.localStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = String(v); }
};
global.window = { location: { hostname: 'localhost', protocol: 'http:' } };

import { store } from './react-app/src/lib/store.js';

async function testHabitualInfiniteXP() {
  console.log("--- Testing Habitual Infinite XP Exploit ---");
  store.upsertMacro({ id: 'm1', name: 'Macro 1' });
  const h = { id: 'h1', macroId: 'm1', name: 'Test Habit', xpGain: 100, xpLoss: 50, todayStatus: null };
  store.upsertHabitual(h);
  
  // Simulate Dashboard.jsx setStatus('yes') multiple times
  const setStatus = (status) => {
    h.todayStatus = status;
    store.upsertHabitual(h);
    if (status === 'yes') {
      store.awardXP([{ macroSkillId: h.macroId, xpAmount: h.xpGain }], false, `Habitual: ${h.name}`);
    } else if (status === 'no' && h.xpLoss) {
      store.awardXP([{ macroSkillId: h.macroId, xpAmount: -h.xpLoss }], false, `Habitual Missed: ${h.name}`);
    }
  };

  const initialOverall = store.getOverall().currentXP;
  console.log("Initial XP:", initialOverall);

  // User clicks 'Yes'
  setStatus('yes');
  const xpAfterFirstClick = store.getOverall().currentXP;
  console.log("XP after first click:", xpAfterFirstClick);
  assert(xpAfterFirstClick > initialOverall, "XP should increase after first click");

  // In Dashboard.jsx, disabled is {!isPending && !isYes}. If isYes is true, disabled is false!
  // So user can click again.
  setStatus('yes');
  setStatus('yes');
  setStatus('yes');
  
  const xpAfterMultipleClicks = store.getOverall().currentXP;
  console.log("XP after multiple clicks:", xpAfterMultipleClicks);
  
  try {
    assert.strictEqual(xpAfterFirstClick, xpAfterMultipleClicks, "XP should not increase on repeated clicks!");
  } catch (e) {
    console.error("BUG CONFIRMED: Habitual XP can be farmed infinitely by repeatedly clicking Yes.");
  }
}

async function testDragAndDropBrokenFlow() {
  console.log("\n--- Testing Drag & Drop Broken Flow ---");
  const quest = {
    id: 'q1',
    name: 'Test Quest',
    status: 'active',
    isReadyToClaim: false,
    targetSkills: [{ macroSkillId: 'm1', xpAmount: 50 }]
  };
  store.upsertQuest(quest);

  // In Dashboard.jsx: 
  // If (settings.dragToRegister !== false && !quest.isReadyToClaim) it renders the "✓ Complete" button
  // which calls store.completeQuest(quest.id) instead of store.markQuestReady(quest.id)
  
  // User clicks the button expecting to ready it for dragging:
  store.completeQuest(quest.id);
  
  const updatedQuest = store.getQuest('q1');
  console.log("Quest status after clicking Complete:", updatedQuest.status);
  console.log("Quest isReadyToClaim:", updatedQuest.isReadyToClaim);

  try {
    assert.strictEqual(updatedQuest.status, 'active', "Quest should remain active to be dragged");
    assert.strictEqual(updatedQuest.isReadyToClaim, true, "Quest should be ready to claim for drag-and-drop");
  } catch (e) {
    console.error("BUG CONFIRMED: Clicking 'Complete' fully completes the quest and skips the isReadyToClaim state, making the drag-to-claim flow impossible to use.");
  }
}

async function runTests() {
  await testHabitualInfiniteXP();
  await testDragAndDropBrokenFlow();
}

runTests();
