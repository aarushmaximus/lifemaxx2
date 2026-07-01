import assert from 'assert';

// Mock localStorage and window
global.localStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = String(v); }
};
global.window = { location: { hostname: 'localhost', protocol: 'http:' } };

import { store } from './react-app/src/lib/store.js';

async function testHabitualMissXPBug() {
  console.log("--- Testing Habitual Miss XP Bug ---");
  
  // Set up initial state
  store.upsertMacro({ id: 'm1', name: 'Macro 1', currentXP: 100 });
  const overall = store.getOverall();
  overall.currentXP = 100;
  global.localStorage.setItem('lm_overall', JSON.stringify(overall));
  
  const h = { id: 'h1', macroId: 'm1', name: 'Test Habit', xpGain: 50, xpLoss: 50, todayStatus: null };
  store.upsertHabitual(h);
  
  const initialMacroXP = store.getMacro('m1').currentXP;
  const initialOverallXP = store.getOverall().currentXP;
  
  console.log(`Initial: MacroXP = ${initialMacroXP}, OverallXP = ${initialOverallXP}`);
  
  // Simulate Dashboard.jsx setStatus('no')
  h.todayStatus = 'no';
  store.upsertHabitual(h);
  
  // Dashboard calls this exact line:
  store.awardXP([{ macroSkillId: h.macroId, xpAmount: -h.xpLoss }], false, `Habitual Missed: ${h.name}`);
  
  const finalMacroXP = store.getMacro('m1').currentXP;
  const finalOverallXP = store.getOverall().currentXP;
  
  console.log(`After Miss: MacroXP = ${finalMacroXP}, OverallXP = ${finalOverallXP}`);
  
  // The bug is that Macro XP decreases, but Overall XP INCREASES!
  console.log(`Difference: MacroXP changed by ${finalMacroXP - initialMacroXP}, OverallXP changed by ${finalOverallXP - initialOverallXP}`);
}

testHabitualMissXPBug();
