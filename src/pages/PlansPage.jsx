// src/pages/PlansPage.jsx
// Pricing & plan management page.
// Stripe integration hooks are stubbed — wire up your Stripe price IDs.

import { Check, Zap, Shield, Star, Crown } from 'lucide-react';
import { Card, Badge, Btn } from '../components/atoms';
import { TopBar } from '../components/layout';
import { useAuth } from '../hooks/useAuth';

const PLANS = [
  {
    id:      'free',
    name:    'Starter',
    price:   '$0',
    period:  'forever',
    color:   'var(--sub)',
    icon:    Zap,
    badge:   null,
    features: [
      'Up to 100 trades',
      'CSV import (1 broker format)',
      'Dashboard & equity curve',
      'Basic journal',
      'Gemini Flash AI (free)',
    ],
    cta: 'Current Plan',
    disabled: true,
  },
  {
    id:      'pro',
    name:    'Pro',
    price:   '$19',
    period:  'per month',
    color:   'var(--indigo)',
    icon:    Star,
    badge:   'Most Popular',
    features: [
      'Unlimited trades',
      'All broker CSV formats',
      'MT5 auto-sync',
      'Full journal + mistake tags',
      'All AI models (Claude, GPT-4o, Gemini)',
      'Compare models side-by-side',
      'Export reports (CSV / PDF)',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    disabled: false,
    priceId: 'price_pro_monthly', // ← replace with your Stripe price ID
  },
  {
    id:      'enterprise',
    name:    'Enterprise',
    price:   '$79',
    period:  'per month',
    color:   'var(--amber)',
    icon:    Crown,
    badge:   'Teams',
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Shared trade journal',
      'Team performance analytics',
      'Custom CSV mapping profiles',
      'Dedicated AI model budget',
      'White-label option',
      'SLA support',
    ],
    cta: 'Contact Sales',
    disabled: false,
    priceId: 'price_enterprise_monthly',
  },
];

const PlanCard = ({ plan, currentPlan, onUpgrade }) => {
  const Icon    = plan.icon;
  const isCurrent = plan.id === currentPlan;
  const active  = plan.color;

  return (
    <Card
      glow={plan.id === 'pro'}
      style={{ padding: 28, display: 'flex', flexDirection: 'column', position: 'relative', border: isCurrent ? `1px solid ${active}` : '1px solid var(--line)' }}
    >
      {plan.badge && (
        <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: plan.color === 'var(--indigo)' ? 'var(--indigo)' : 'var(--amber)', color: '#fff', fontSize: 10, fontFamily: 'var(--fm)', fontWeight: 700, padding: '3px 12px', borderRadius: 20, letterSpacing: '.5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {plan.badge}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `color-mix(in srgb, ${active} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${active} 25%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={active} />
        </div>
        <div>
          <p style={{ fontFamily: 'var(--fh)', fontWeight: 700, fontSize: 16 }}>{plan.name}</p>
          {isCurrent && <Badge color="emerald">Current Plan</Badge>}
        </div>
      </div>

      {/* Price */}
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontFamily: 'var(--fh)', fontSize: 36, fontWeight: 800, color: active }}>{plan.price}</span>
        <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 6, fontFamily: 'var(--fm)' }}>/{plan.period}</span>
      </div>

      {/* Features */}
      <ul style={{ listStyle: 'none', marginBottom: 28, flex: 1 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10, fontSize: 13, color: 'var(--sub)' }}>
            <Check size={14} color="var(--emerald)" style={{ flexShrink: 0, marginTop: 2 }} />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Btn
        onClick={() => !isCurrent && onUpgrade(plan)}
        disabled={isCurrent || plan.disabled}
        style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 13, background: isCurrent ? 'var(--card2)' : plan.id === 'pro' ? 'var(--indigo)' : 'transparent', color: isCurrent ? 'var(--muted)' : plan.id === 'pro' ? '#fff' : active, border: plan.id !== 'pro' ? `1px solid ${active}` : 'none' }}
      >
        {plan.cta}
      </Btn>
    </Card>
  );
};

const PlansPage = () => {
  const { profile } = useAuth();
  const currentPlan = profile?.plan || 'free';

  const handleUpgrade = async (plan) => {
    if (plan.id === 'enterprise') {
      window.location.href = 'mailto:hello@apexedge.io?subject=Enterprise Plan';
      return;
    }
    // TODO: redirect to Stripe Checkout
    // const { data } = await supabase.functions.invoke('create-checkout', {
    //   body: { priceId: plan.priceId, returnUrl: window.location.href }
    // });
    // window.location.href = data.url;
    alert(`Stripe integration coming soon!\nPrice ID: ${plan.priceId}`);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Plans & Pricing" subtitle="Upgrade to unlock unlimited trades and all AI models" />
      <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontFamily: 'var(--fh)', fontSize: 28, fontWeight: 800, marginBottom: 10 }}>
            Choose your plan
          </h2>
          <p style={{ color: 'var(--sub)', fontSize: 14, maxWidth: 480, margin: '0 auto' }}>
            Start free and upgrade when you need more power. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, maxWidth: 960, margin: '0 auto', alignItems: 'start' }}>
          {PLANS.map(plan => (
            <PlanCard key={plan.id} plan={plan} currentPlan={currentPlan} onUpgrade={handleUpgrade} />
          ))}
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 620, margin: '48px auto 0' }}>
          <h3 style={{ fontFamily: 'var(--fh)', fontWeight: 700, fontSize: 17, marginBottom: 20, textAlign: 'center' }}>Common Questions</h3>
          {[
            ['Can I import data from any broker?', 'Yes. The CSV importer supports any format — you map the columns yourself. MT5 auto-sync is available on Pro and above.'],
            ['Do you store my API keys?', 'No. AI model keys are stored in your browser session only and never leave your device. They are never sent to our servers.'],
            ['What happens to my data if I cancel?', 'Your data stays in the database for 30 days after cancellation. You can export it any time before deletion.'],
            ['Is there a free trial for Pro?', 'Yes — you get a 7-day free trial when you upgrade. No charge until the trial ends.'],
          ].map(([q, a]) => (
            <div key={q} style={{ marginBottom: 20, padding: 18, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, fontFamily: 'var(--fh)' }}>{q}</p>
              <p style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.6 }}>{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlansPage;
