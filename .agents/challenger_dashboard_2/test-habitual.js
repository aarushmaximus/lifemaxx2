// test-habitual.js
// Stress Test / Oracle for HabitualCard double-click vulnerability

import { store } from '../../react-app/src/lib/store.js';

function runTest() {
  console.log("--- STARTING HABITUAL STRESS TEST ---");

  // 1. Setup mock habitual
  const hId = 'test-habitual-123';
  store.upsertHabitual({
    id: hId,
    macroId: 'macro-1',
    name: 'Drink Water',
    xpGain: 50,
    xpLoss: 20,
    todayStatus: null
  });

  // Setup mock macro for XP to go to
  store.upsertMacro({
    id: 'macro-1',
    name: 'Health',
    currentXP: 0
  });
  
  const initialXP = store.getMacro('macro-1').currentXP;
  console.log(`Initial XP: ${initialXP}`);

  // 2. Simulate the setStatus function inside HabitualCard
  const mockHabitualProps = store.getHabitual(hId);
  const setStatus = (status) => {
    // Exactly as written in Dashboard.jsx HabitualCard:
    mockHabitualProps.todayStatus = status;
    store.upsertHabitual(mockHabitualProps);
    if (status === 'yes') {
      store.awardXP([{ macroSkillId: mockHabitualProps.macroId, xpAmount: mockHabitualProps.xpGain }], false, `Habitual: ${mockHabitualProps.name}`);
    } else if (status === 'no' && mockHabitualProps.xpLoss) {
      store.awardXP([{ macroSkillId: mockHabitualProps.macroId, xpAmount: -mockHabitualProps.xpLoss }], false, `Habitual Missed: ${mockHabitualProps.name}`);
    }
  };

  // 3. Simulate rapid double-click (e.g. before React re-renders and disables the button)
  setStatus('yes');
  setStatus('yes');
  setStatus('yes');

  const finalXP = store.getMacro('macro-1').currentXP;
  console.log(`Final XP after 3 rapid clicks: ${finalXP}`);

  if (finalXP === initialXP + 50) {
    console.log("✅ TEST PASSED: XP was only awarded once.");
  } else {
    console.log(`❌ TEST FAILED: XP was awarded multiple times! Expected 50, got ${finalXP}.`);
    console.error("VULNERABILITY DETECTED: HabitualCard allows infinite XP farming via rapid clicks before re-render.");
  }
}

runTest();
