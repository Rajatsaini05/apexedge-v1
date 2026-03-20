// src/hooks/useAIProxy.js
// Smart AI caller:
//   - In PRODUCTION  → routes through /api/ai-proxy (API keys stay server-side)
//   - In DEVELOPMENT → calls AI APIs directly from browser (keys from UI)
//
// Usage in AIPage.jsx:
//   import { callModelSafe } from '../hooks/useAIProxy';
//   const text = await callModelSafe(modelCfg, systemPrompt, userMsg, keys);

const IS_PROD = import.meta.env.PROD; // true when built by Vite

/**
 * Safe AI dispatcher.
 * In production, routes through the Vercel Edge proxy so keys stay server-side.
 * In development, calls the AI APIs directly (uses keys entered in UI).
 */
export async function callModelSafe(modelCfg, systemPrompt, userMsg, keys = {}) {
  if (IS_PROD) {
    return callViaProxy(modelCfg, systemPrompt, userMsg);
  }
  // Dev fallback — uses dynamic import to avoid bundling both paths
  const { callModel } = await import('../config/aiModels.js');
  return callModel(modelCfg, systemPrompt, userMsg, keys);
}

async function callViaProxy(modelCfg, systemPrompt, userMsg) {
  const res = await fetch('/api/ai-proxy', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider:     modelCfg.provider,
      model:        modelCfg.model,
      systemPrompt,
      userMsg,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `Proxy error ${res.status}`);
  }
  return data.text;
}
