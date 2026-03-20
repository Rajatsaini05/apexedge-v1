// src/config/aiModels.js
// Model definitions + per-provider API caller functions.
// To add a new model: push an entry to AI_MODELS and handle its provider
// in callModel() below — no other file needs to change.

export const AI_MODELS = [
  {
    id: 'claude-sonnet',
    label: 'Claude Sonnet',
    provider: 'Anthropic',
    model: 'claude-sonnet-4-20250514',
    color: '#818cf8',
    bg: 'rgba(99,102,241,.12)',
    border: 'rgba(99,102,241,.3)',
    free: false,
    icon: '◆',
    desc: 'Best analysis quality',
  },
  {
    id: 'claude-haiku',
    label: 'Claude Haiku',
    provider: 'Anthropic',
    model: 'claude-haiku-4-5-20251001',
    color: '#a78bfa',
    bg: 'rgba(139,92,246,.12)',
    border: 'rgba(139,92,246,.3)',
    free: false,
    icon: '◇',
    desc: 'Fast & lightweight',
  },
  {
    id: 'gpt4o',
    label: 'GPT-4o',
    provider: 'OpenAI',
    model: 'gpt-4o',
    color: '#34d399',
    bg: 'rgba(16,185,129,.12)',
    border: 'rgba(16,185,129,.3)',
    free: false,
    icon: '●',
    desc: 'OpenAI flagship',
  },
  {
    id: 'gpt4o-mini',
    label: 'GPT-4o Mini',
    provider: 'OpenAI',
    model: 'gpt-4o-mini',
    color: '#6ee7b7',
    bg: 'rgba(52,211,153,.1)',
    border: 'rgba(52,211,153,.25)',
    free: false,
    icon: '○',
    desc: 'Fast & affordable',
  },
  {
    id: 'gemini-pro',
    label: 'Gemini 1.5 Pro',
    provider: 'Google',
    model: 'gemini-1.5-pro',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,.12)',
    border: 'rgba(96,165,250,.3)',
    free: false,
    icon: '✦',
    desc: 'Google DeepMind',
  },
  {
    id: 'gemini-flash',
    label: 'Gemini 2.0 Flash',
    provider: 'Google',
    model: 'gemini-2.0-flash',
    color: '#93c5fd',
    bg: 'rgba(147,197,253,.1)',
    border: 'rgba(147,197,253,.25)',
    free: true,
    icon: '⚡',
    desc: 'Free · no key needed',
  },
];

// ─── API CALLERS ──────────────────────────────────────────────────────────────

async function callClaude(model, systemPrompt, userMsg, apiKey) {
  if (!apiKey) throw new Error('Anthropic API key required. Open "API Keys" in the topbar.');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.find(c => c.type === 'text')?.text || 'No response.';
}

async function callOpenAI(model, systemPrompt, userMsg, apiKey) {
  if (!apiKey) throw new Error('OpenAI API key required. Open "API Keys" in the topbar.');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMsg },
      ],
    }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  return d.choices?.[0]?.message?.content || 'No response.';
}

async function callGemini(model, systemPrompt, userMsg, apiKey) {
  // gemini-2.0-flash works on free tier without a key in supported regions
  const key = apiKey || '';
  const url  = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent${key ? `?key=${key}` : ''}`;
  const res  = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      generationConfig: { maxOutputTokens: 1200 },
    }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
  return d.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
}

/**
 * Universal dispatcher — routes to the right provider API.
 * @param {object} modelCfg  — one entry from AI_MODELS
 * @param {string} systemPrompt
 * @param {string} userMsg
 * @param {{ anthropic:string, openai:string, gemini:string }} keys
 */
export async function callModel(modelCfg, systemPrompt, userMsg, keys) {
  switch (modelCfg.provider) {
    case 'Anthropic': return callClaude(modelCfg.model, systemPrompt, userMsg, keys.anthropic);
    case 'OpenAI':    return callOpenAI(modelCfg.model, systemPrompt, userMsg, keys.openai);
    case 'Google':    return callGemini(modelCfg.model, systemPrompt, userMsg, keys.gemini);
    default: throw new Error(`Unknown provider: ${modelCfg.provider}`);
  }
}
