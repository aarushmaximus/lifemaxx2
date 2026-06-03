// LIFEMAXX — AI Intelligence Engine (Gemini 2.5 Flash)
window.LM.aiEngine = (function () {
  const S = window.LM.store;
  let isRequestPending = false;

  // Checks and updates daily rolling local quota
  function checkAndUpdateQuota() {
    const settings = S.getSettings();
    const limit = settings.geminiQuotaLimit || 20;
    const now = Date.now();
    let quotaData = { count: 0, lastReset: now };
    try {
      const stored = localStorage.getItem('lm_ai_quota');
      if (stored) {
        quotaData = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to parse lm_ai_quota, resetting.", e);
    }

    // Reset if 24 hours have elapsed
    if (now - quotaData.lastReset >= 86400000) {
      quotaData.count = 0;
      quotaData.lastReset = now;
    }

    if (quotaData.count >= limit) {
      return false;
    }

    quotaData.count++;
    localStorage.setItem('lm_ai_quota', JSON.stringify(quotaData));
    return true;
  }

  function getQuotaCount() {
    const now = Date.now();
    try {
      const stored = localStorage.getItem('lm_ai_quota');
      if (stored) {
        const data = JSON.parse(stored);
        if (now - data.lastReset >= 86400000) {
          return 0;
        }
        return data.count;
      }
    } catch {}
    return 0;
  }

  async function generateContent(prompt, systemInstruction = null) {
    if (isRequestPending) {
      return { error: "A request is already pending. Intercepted concurrency." };
    }

    const settings = S.getSettings();
    const apiKey = settings.geminiApiKey;
    const model = settings.geminiModel || 'gemini-2.5-flash';
    const limit = settings.geminiQuotaLimit || 20;
    if (!apiKey) {
      return { error: "Gemini API key is not configured in Settings." };
    }

    // Check daily quota
    if (!checkAndUpdateQuota()) {
      return { error: `Daily AI call quota exceeded (max ${limit} requests per rolling 24 hours).` };
    }

    isRequestPending = true;
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const payload = {
        contents: [{ parts: [{ text: prompt }] }]
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      // Enforce JSON MIME type for structured calls
      if (prompt.includes("JSON") || prompt.includes("json")) {
        payload.generationConfig = {
          responseMimeType: "application/json"
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { error: `Gemini API returned error status ${res.status}: ${errorText}` };
      }

      const json = await res.json();
      return { data: json };
    } catch (err) {
      return { error: err.message || "Network request failed." };
    } finally {
      isRequestPending = false;
    }
  }

  return {
    generateContent,
    getQuotaCount,
    isPending: () => isRequestPending
  };
})();
