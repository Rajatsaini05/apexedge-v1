// src/components/atoms/index.jsx
// Primitive UI building blocks shared across every page.
// Export everything from one file so imports stay tidy:
//   import { Btn, Card, Badge, PnlSpan } from '../components/atoms';

// ─── BTN ──────────────────────────────────────────────────────────────────────
export const Btn = ({ children, onClick, variant = 'primary', size = 'md', disabled, style, className }) => {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    border: 'none', fontFamily: 'var(--fb)', fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all .15s', borderRadius: 'var(--r-sm)', letterSpacing: '.3px',
  };
  const sizes = {
    sm: { padding: '5px 12px', fontSize: 12 },
    md: { padding: '8px 18px', fontSize: 13 },
  };
  const variants = {
    primary: { background: 'var(--indigo)', color: '#fff' },
    ghost:   { background: 'transparent', color: 'var(--sub)', border: '1px solid var(--line)' },
    danger:  { background: 'rgba(244,63,94,.1)',  color: 'var(--rose)',    border: '1px solid rgba(244,63,94,.25)' },
    success: { background: 'rgba(16,185,129,.1)', color: 'var(--emerald)', border: '1px solid rgba(16,185,129,.25)' },
    subtle:  { background: 'var(--card2)', color: 'var(--sub)', border: '1px solid var(--line)' },
  };
  return (
    <button onClick={onClick} disabled={disabled} className={className}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

// ─── CARD ─────────────────────────────────────────────────────────────────────
export const Card = ({ children, style, className, glow }) => (
  <div className={className} style={{
    background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--r)',
    boxShadow: glow
      ? '0 0 0 1px var(--line2), 0 8px 32px rgba(0,0,0,.5)'
      : '0 2px 12px rgba(0,0,0,.3)',
    ...style,
  }}>
    {children}
  </div>
);

// ─── BADGE ────────────────────────────────────────────────────────────────────
const BADGE_MAP = {
  indigo:  ['rgba(99,102,241,.12)',  '#818cf8'],
  emerald: ['rgba(16,185,129,.12)',  '#34d399'],
  rose:    ['rgba(244,63,94,.12)',   '#fb7185'],
  amber:   ['rgba(245,158,11,.12)',  '#fcd34d'],
  sky:     ['rgba(56,189,248,.12)',  '#7dd3fc'],
  violet:  ['rgba(139,92,246,.12)',  '#a78bfa'],
  slate:   ['rgba(148,163,184,.08)', '#94a3b8'],
};
export const Badge = ({ children, color = 'indigo' }) => {
  const [bg, col] = BADGE_MAP[color] ?? BADGE_MAP.indigo;
  return (
    <span style={{
      background: bg, color: col, padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontFamily: 'var(--fm)', fontWeight: 500,
      whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {children}
    </span>
  );
};

// ─── MONO ─────────────────────────────────────────────────────────────────────
export const Mono = ({ children, color, style }) => (
  <span style={{ fontFamily: 'var(--fm)', color: color || 'inherit', ...style }}>
    {children}
  </span>
);

// ─── PNL SPAN ─────────────────────────────────────────────────────────────────
export const PnlSpan = ({ v }) => {
  if (v == null) return <Mono color="var(--muted)">—</Mono>;
  return (
    <Mono
      color={v > 0 ? 'var(--emerald)' : v < 0 ? 'var(--rose)' : 'var(--sub)'}
      style={{ fontWeight: 500 }}
    >
      {v > 0 ? '+' : ''}{v.toFixed(2)}
    </Mono>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const ACCENT_MAP = {
  indigo:  'var(--indigo)',
  emerald: 'var(--emerald)',
  rose:    'var(--rose)',
  amber:   'var(--amber)',
  sky:     'var(--sky)',
  violet:  'var(--violet)',
};
export const StatCard = ({ label, value, sub, icon: Icon, trend, accent = 'indigo', glow }) => {
  const col = ACCENT_MAP[accent] ?? 'var(--indigo)';
  return (
    <Card glow={glow} style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: 'var(--fm)', marginBottom: 8 }}>
            {label}
          </p>
          <p style={{ fontFamily: 'var(--fh)', fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1, marginBottom: 4 }}>
            {value}
          </p>
          {sub && <p style={{ fontSize: 11, color: 'var(--sub)', fontFamily: 'var(--fm)' }}>{sub}</p>}
        </div>
        {Icon && (
          <div style={{
            width: 38, height: 38, borderRadius: 8, flexShrink: 0, marginLeft: 12,
            background: `color-mix(in srgb, ${col} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${col} 20%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={17} color={col} />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div style={{ marginTop: 12, height: 2, background: 'var(--line)', borderRadius: 2 }}>
          <div style={{
            height: '100%', borderRadius: 2, transition: 'width .4s ease',
            width: `${Math.min(Math.abs(trend), 100)}%`,
            background: trend >= 0 ? 'var(--emerald)' : 'var(--rose)',
          }} />
        </div>
      )}
    </Card>
  );
};

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, desc, cta, onCta }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center', flex: 1 }}>
    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--card2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
      {Icon && <Icon size={28} color="var(--muted)" />}
    </div>
    <h3 style={{ fontFamily: 'var(--fh)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
    <p style={{ color: 'var(--sub)', fontSize: 13, maxWidth: 320, marginBottom: 24, lineHeight: 1.6 }}>{desc}</p>
    {cta && <Btn onClick={onCta}>{cta}</Btn>}
  </div>
);

// ─── DIVIDER ──────────────────────────────────────────────────────────────────
export const Divider = () => (
  <div style={{ height: 1, background: 'var(--line)' }} />
);

// ─── RECHARTS TOOLTIP ─────────────────────────────────────────────────────────
export const RTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontFamily: 'var(--fm)' }}>
      <p style={{ color: 'var(--sub)', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.value >= 0 ? 'var(--emerald)' : 'var(--rose)' }}>
          ${p.value?.toFixed(2)}
        </p>
      ))}
    </div>
  );
};

// ─── TOGGLE PILL ──────────────────────────────────────────────────────────────
export const TogglePill = ({ on, onToggle, label, badge }) => (
  <button
    onClick={onToggle}
    style={{
      display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px',
      borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--fm)',
      fontSize: 12, fontWeight: 500, transition: 'all .15s',
      border: `1px solid ${on ? 'var(--indigo)' : 'var(--line)'}`,
      background: on ? 'rgba(99,102,241,.12)' : 'var(--card2)',
      color: on ? '#818cf8' : 'var(--sub)',
    }}
  >
    <div style={{ width: 28, height: 15, borderRadius: 10, position: 'relative', transition: 'background .2s', flexShrink: 0, background: on ? 'var(--indigo)' : 'var(--muted)' }}>
      <div style={{ position: 'absolute', top: 2, width: 11, height: 11, borderRadius: '50%', background: '#fff', transition: 'left .2s', left: on ? 15 : 2 }} />
    </div>
    {label}
    {badge != null && <Badge color="indigo">{badge}</Badge>}
  </button>
);
