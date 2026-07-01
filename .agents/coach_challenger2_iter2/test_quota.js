const assert = require('assert');

let localStorageMock = {};
global.localStorage = {
  getItem: (k) => localStorageMock[k] || null,
  setItem: (k, v) => { localStorageMock[k] = v; }
};

let S = {
  getSettings: () => ({ geminiQuotaLimit: 1000 })
};

function checkQuota() {
  const settings = S.getSettings();
  const limit = settings.geminiQuotaLimit || 1000;
  const now = Date.now();
  let quotaData = { count: 0, lastReset: now };
  try {
    const stored = localStorage.getItem('lm_ai_quota');
    if (stored) {
      quotaData = JSON.parse(stored);
    }
  } catch (e) {}

  if (now - quotaData.lastReset >= 86400000) {
    quotaData.count = 0;
    quotaData.lastReset = now;
  }

  return quotaData.count < limit;
}

function commitQuota() {
  const now = Date.now();
  let quotaData = { count: 0, lastReset: now };
  try {
    const stored = localStorage.getItem('lm_ai_quota');
    if (stored) {
      quotaData = JSON.parse(stored);
    }
  } catch (e) {}
  
  if (now - quotaData.lastReset >= 86400000) {
    quotaData.count = 0;
    quotaData.lastReset = now;
  }
  
  quotaData.count++;
  localStorage.setItem('lm_ai_quota', JSON.stringify(quotaData));
}

// Test
assert.strictEqual(checkQuota(), true);
commitQuota();
let data = JSON.parse(localStorageMock['lm_ai_quota']);
assert.strictEqual(data.count, 1);

// Set count to 1000
localStorageMock['lm_ai_quota'] = JSON.stringify({ count: 1000, lastReset: Date.now() });
assert.strictEqual(checkQuota(), false);

console.log('Tests passed.');
