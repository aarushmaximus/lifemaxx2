import fs from 'fs';
import path from 'path';

// Read Dashboard.jsx to check what onClick does for the Complete button
const dashboardPath = 'c:\\Users\\ajays\\.gemini\\antigravity\\scratch\\lifemaxxantigrav\\react-app\\src\\components\\Dashboard.jsx';
const code = fs.readFileSync(dashboardPath, 'utf8');

if (code.includes('onClick={() => store.completeQuest(quest.id)}')) {
  console.log("BUG DETECTED: The Complete button calls store.completeQuest directly instead of markQuestReady, bypassing the drag-and-drop workflow when dragToRegister is true.");
} else if (code.includes('store.markQuestReady(quest.id)')) {
  console.log("OK: The Complete button correctly calls markQuestReady.");
} else {
  console.log("UNKNOWN: Could not find Complete button logic.");
}
