// test-workout.js
// Oracle for Workout ID loss vulnerability

import { createElement } from 'react';

function runTest() {
  console.log("--- STARTING WORKOUT ID TEST ---");

  // Legacy behavior: 
  // onclick="window.location.hash='#workout/${q.id}'"
  const legacyAction = (questId) => {
    return `#workout/${questId}`;
  };

  // React worker behavior:
  // onClick={() => setActiveTab('workout')}
  let activeTab = 'dashboard';
  const setActiveTab = (tab) => {
    activeTab = tab;
  };

  const reactWorkerAction = (questId) => {
    setActiveTab('workout');
    return activeTab;
  };

  const questId = 'quest-xyz-123';
  
  const legacyResult = legacyAction(questId);
  const newResult = reactWorkerAction(questId);

  console.log(`Legacy routed to: ${legacyResult}`);
  console.log(`New React app routed to tab: ${newResult}`);

  if (newResult.includes(questId)) {
    console.log("✅ TEST PASSED: Quest ID is preserved in navigation.");
  } else {
    console.log("❌ TEST FAILED: Quest ID is LOST during navigation.");
    console.error("VULNERABILITY DETECTED: Start Workout button drops the quest ID, meaning the Workout view will not know which quest to load.");
  }
}

runTest();
