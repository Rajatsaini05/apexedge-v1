# APEXEDGE — Trading Intelligence Platform

A professional backtesting, trade journal and AI coaching platform for Forex/CFD traders. Built with React + Vite, Supabase (auth + database), TradingView charts, and multi-model AI (Claude, GPT-4o, Gemini).

---

## Quick Start

```bash
# 1. Install dependencies
npm install @supabase/supabase-js recharts lucide-react

# 2. Copy env file and fill in your Supabase credentials
cp .env.example .env

# 3. Run the Supabase schema (one-time)
# → Open supabase.com → your project → SQL Editor
# → Paste contents of supabase/migrations/001_initial_schema.sql → Run

# 4. Start dev server
npm run dev
# → http://localhost:5173
```

---

## Project Structure

```
apexedge/
├── src/
│   ├── App.jsx                      Root — routing + shared state
│   ├── main.jsx                     Entry point (wraps app in AuthProvider)
│   │
│   ├── styles/
│   │   └── GlobalStyles.jsx         CSS variables, fonts, keyframes
│   │
│   ├── config/
│   │   ├── supabase.js              Supabase client singleton
│   │   ├── aiModels.js              6 AI model configs + API callers
│   │   └── symbols.js               All trading pair symbol definitions
│   │
│   ├── hooks/
│   │   ├── useAuth.jsx              Auth context + signIn/signUp/signOut
│   │   ├── useTrades.js             Full CRUD for trades table (Supabase)
│   │   └── useAIProxy.js            Smart AI router (proxy in prod, direct in dev)
│   │
│   ├── utils/
│   │   ├── csvParser.js             Robust CSV parser with auto column detection
│   │   └── tradeEngine.js           Trade matching, stats, equity curve, candles
│   │
│   ├── components/
│   │   ├── atoms/index.jsx          Btn, Card, Badge, StatCard, PnlSpan, etc.
│   │   ├── layout/index.jsx         Sidebar + TopBar
│   │   └── charts/index.jsx         TVWidget (no default indicators) + LWChart
│   │
│   └── pages/
│       ├── AuthPage.jsx             Sign in / sign up / forgot password
│       ├── DashboardPage.jsx        Stats, equity curve, daily P&L
│       ├── ChartPage.jsx            TradingView + trade markers toggle
│       ├── PositionsPage.jsx        Trade table + manual entry + delete
│       ├── JournalPage.jsx          Per-trade notes + mistake tags
│       ├── AIPage.jsx               Multi-model AI coach (6 models, compare mode)
│       ├── ImportPage.jsx           CSV drag-drop + column mapping
│       ├── MT5Page.jsx              Python bridge connection + trade sync
│       ├── PlansPage.jsx            Pricing tiers (Stripe-ready)
│       └── SettingsPage.jsx         Profile, risk rules, password, display
│
├── api/
│   └── ai-proxy.js                  Vercel Edge Function — AI key proxy
│
├── mt5_bridge/
│   ├── server.py                    FastAPI + MetaTrader5 bridge
│   └── requirements.txt
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   Full DB schema with RLS
│
├── .env.example                     Environment variable template
├── .gitignore
├── vercel.json                      One-click Vercel deploy config
└── README.md
```

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
# Required — from Supabase Dashboard → Project Settings → API
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional — AI keys (only needed locally; use Vercel env vars in production)
VITE_ANTHROPIC_KEY=sk-ant-...
VITE_OPENAI_KEY=sk-...
VITE_GEMINI_KEY=AIza...
```

---

## Supabase Setup (5 minutes)

1. Create a project at **supabase.com**
2. Go to **SQL Editor** → paste `supabase/migrations/001_initial_schema.sql` → **Run**
3. Go to **Authentication → URL Configuration**:
   - Site URL: `http://localhost:5173`
   - Redirect URLs: `http://localhost:5173` (add your production URL later)
4. Go to **Project Settings → API** → copy **Project URL** and **anon public key** into `.env`

### Database Tables

| Table | Purpose |
|---|---|
| `profiles` | One row per user — name, plan, timezone, risk rules |
| `trades` | All trade records — entry/exit/pnl/notes/tags |
| `import_sessions` | Log of every CSV or MT5 import |
| `user_api_keys` | API key hints (not stored in plaintext) |

All tables have **Row Level Security** — users can only read/write their own rows.

---

## MT5 Bridge Setup

The MT5 bridge lets you sync real trades from MetaTrader 5 directly into APEXEDGE.

**Requirements:** Windows PC with MetaTrader 5 installed.

```bash
# 1. Open MetaTrader 5 and log in to your account first

# 2. Install bridge dependencies
cd mt5_bridge
pip install -r requirements.txt

# 3. Start the bridge
python server.py
# Running at http://localhost:8000

# 4. In APEXEDGE → MT5 Connect → enter credentials → Connect
```

**Bridge endpoints:**
- `GET  /health`            — check if bridge is running
- `POST /connect`           — authenticate with MT5
- `GET  /account`           — balance, equity, leverage
- `GET  /history`           — all closed deals (converts to APEXEDGE trades)
- `GET  /open_positions`    — currently open positions
- `POST /disconnect`        — graceful shutdown

---

## AI Coach

The AI Coach supports 6 models across 3 providers:

| Model | Provider | Free? | Best for |
|---|---|---|---|
| Claude Sonnet | Anthropic | API key | Best analysis quality |
| Claude Haiku | Anthropic | API key | Fast responses |
| GPT-4o | OpenAI | API key | Alternative perspective |
| GPT-4o Mini | OpenAI | API key | Fast & cheap |
| Gemini 1.5 Pro | Google | API key | Long context |
| **Gemini 2.0 Flash** | **Google** | **✅ Free** | No key needed |

**In development:** add keys in the AI Coach → API Keys panel (session only, never stored).

**In production:** keys are set as Vercel environment variables and proxied through `/api/ai-proxy.js` — they never reach the browser.

---

## Deploying to Production

### Option A — Vercel (recommended, free tier available)

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "initial"
git remote add origin https://github.com/your-user/apexedge.git
git push -u origin main

# 2. Go to vercel.com → Add New Project → import your repo

# 3. Add Environment Variables in Vercel dashboard:
#    VITE_SUPABASE_URL
#    VITE_SUPABASE_ANON_KEY
#    ANTHROPIC_KEY         (server-side only, no VITE_ prefix)
#    OPENAI_KEY
#    GEMINI_KEY

# 4. Deploy — done. Vercel auto-deploys on every git push.
```

### Option B — Self-hosted (VPS / Docker)

```bash
npm run build          # outputs to dist/
# Serve dist/ with nginx, Caddy, or any static host
```

---

## Adding Stripe for Plans

1. Create products in [Stripe Dashboard](https://dashboard.stripe.com)
2. Copy price IDs into `src/pages/PlansPage.jsx` (`priceId` field per plan)
3. Create a Supabase Edge Function or Vercel API route for checkout:

```js
// api/create-checkout.js
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req) {
  const { priceId, returnUrl, userId } = await req.json();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}?success=true`,
    cancel_url:  `${returnUrl}?cancelled=true`,
    metadata:    { userId },
  });
  return Response.json({ url: session.url });
}
```

4. Add a Stripe webhook to update `profiles.plan` on successful payment.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, CSS custom properties |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (JWT, email/password) |
| Charts | TradingView Advanced Chart Widget + Lightweight Charts v4 |
| Analytics | Recharts |
| AI | Anthropic Claude, OpenAI GPT-4o, Google Gemini |
| MT5 Bridge | Python FastAPI + MetaTrader5 library |
| Deployment | Vercel (frontend + edge functions) |
| Payments | Stripe (optional) |

---

## CSV Import Format

Any broker CSV is supported. The importer auto-detects common column names and lets you map manually. Minimum required columns:

| Column | Examples |
|---|---|
| Date/Time | `Date`, `Time`, `Open Time`, `Created` |
| Order ID | `Order ID`, `Ticket`, `Deal` |
| Symbol | `Pair`, `Symbol`, `Instrument` |
| Direction | `Side`, `Direction` (`buy`/`sell`) |
| Lot Size | `Lot Size`, `Volume`, `Qty` |
| Price | `Price`, `Fill Price` |
| Status | `Status` (`filled`/`cancelled`) |

---

## License

MIT — free to use, modify and sell.
