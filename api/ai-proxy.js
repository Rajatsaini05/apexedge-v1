// api/ai-proxy.js
// Vercel Edge Function — proxies AI requests so your API keys
// never touch the browser in production.
//
// Deploy: push to Vercel, set env vars in Vercel dashboard.
// Usage from frontend: POST /api/ai-proxy
//   body: { provider, model, systemPrompt, userMsg }
//
// Set these in Vercel → Project → Settings → Environment Variables:
//   ANTHROPIC_KEY=sk-ant-...
//   OPENAI_KEY=sk-...
//   GEMINI_KEY=AIza...

export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin':  '*',   // replace with your domain in production
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req) {
  // Preflight
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST')    return new Response('Method not allowed', { status: 405, headers: CORS });

  let body;
  try { body = await req.json(); }
  catch { return new Response('Invalid JSON', { status: 400, headers: CORS }); }

  const { provider, model, systemPrompt, userMsg } = body;
  if (!provider || !model || !userMsg) return new Response('Missing fields', { status: 400, headers: CORS });

  try {
    let text;

    // ── Claude ────────────────────────────────────────────────────────────────
    if (provider === 'Anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':       'application/json',
          'anthropic-version':  '2023-06-01',
          'x-api-key':          process.env.ANTHROPIC_KEY,
        },
        body: JSON.stringify({
          model, max_tokens: 1200,
          system:   systemPrompt,
          messages: [{ role: 'user', content: userMsg }],
        }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      text = d.content?.find(c => c.type === 'text')?.text || '';
    }

    // ── OpenAI ────────────────────────────────────────────────────────────────
    else if (provider === 'OpenAI') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model, max_tokens: 1200,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userMsg },
          ],
        }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      text = d.choices?.[0]?.message?.content || '';
    }

    // ── Gemini ────────────────────────────────────────────────────────────────
    else if (provider === 'Google') {
      const key = process.env.GEMINI_KEY || '';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent${key ? `?key=${key}` : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents:           [{ role: 'user', parts: [{ text: userMsg }] }],
          generationConfig:   { maxOutputTokens: 1200 },
        }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
      text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    else {
      return new Response(`Unknown provider: ${provider}`, { status: 400, headers: CORS });
    }

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
}
