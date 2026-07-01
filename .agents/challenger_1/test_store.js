import { store } from '../src/lib/store.js';

// Setup Mock for localStorage
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = v; },
  removeItem: (k) => { delete storage[k]; }
};

// Test 1: completeQuest double completion race / edge case
function testDoubleComplete() {
  const quest = {
    id: 'q1',
    status: 'active',
    isReadyToClaim: false,
    targetSkills: [{ macroSkillId: 'm1', xpAmount: 10 }]
  };
  store.upsertMacro({ id: 'm1', name: 'Macro 1', currentXP: 0 });
  store.upsertQuest(quest);

  // Normal dragToRegister flow
  store.markQuestReady('q1');
  let q = store.getQuest('q1');
  console.assert(q.isReadyToClaim === true, 'Quest should be ready to claim');

  store.completeQuest('q1');
  q = store.getQuest('q1');
  console.assert(q.status === 'completed', 'Quest should be completed');
  
  const xp = store.getMacro('m1').currentXP;
  console.assert(xp === 10, `XP should be 10, got ${xp}`);

  // Try to complete again
  store.completeQuest('q1');
  const newXp = store.getMacro('m1').currentXP;
  console.assert(newXp === 10, `XP should not increase on double complete, got ${newXp}`);
}

// Test 2: Invalid XP values in completeChainStep
function testChainStepInvalidXP() {
  const chain = {
    id: 'c1',
    macroId: 'm1',
    name: 'Chain 1',
    steps: [
      { id: 's1', name: 'Step 1', targetSkills: [{ macroSkillId: 'm1', xpAmount: 'not-a-number' }] }
    ]
  };
  store.upsertChain(chain);
  const step = store.completeChainStep('c1', 's1');
  const xp = store.getMacro('m1').currentXP;
  console.log(`After chain step with invalid XP, macro XP is: ${xp}`);
}

// Test 3: dragToRegister === false flow
function testDragToRegisterFalse() {
  const quest = {
    id: 'q2',
    status: 'active',
    isReadyToClaim: false,
    targetSkills: [{ macroSkillId: 'm1', xpAmount: 20 }]
  };
  store.upsertQuest(quest);

  // Directly complete
  store.completeQuest('q2');
  let q = store.getQuest('q2');
  console.assert(q.status === 'completed', 'Quest should be completed');
  const xp = store.getMacro('m1').currentXP;
  console.log(`XP after direct complete (dragToRegister=false): ${xp}`);
}

// Run tests
try {
  testDoubleComplete();
  testChainStepInvalidXP();
  testDragToRegisterFalse();
  console.log("All store tests executed successfully.");
} catch (e) {
  console.error("Test failed:", e);
}
