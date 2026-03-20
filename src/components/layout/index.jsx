// src/components/layout/index.jsx
// Sidebar navigation + page TopBar.
// Export both from one file:
//   import { Sidebar, TopBar } from '../components/layout';

import { Zap, Home, BarChart2, List, BookOpen, Brain,
         Upload, Database, Settings, LogOut, User, CreditCard, LineChart, Newspaper } from 'lucide-react';
import { Badge, Divider } from '../atoms';
import { useState, useEffect } from 'react';

// ─── NAV DEFINITION ──────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', icon: Home,        label: 'Dashboard'   },
  { id: 'chart',     icon: BarChart2,   label: 'Chart'        },
  { id: 'trades',    icon: List,        label: 'Positions'    },
  { id: 'analytics', icon: LineChart,   label: 'Analytics'    },
  { id: 'journal',   icon: BookOpen,    label: 'Journal'      },
  { id: 'ai',        icon: Brain,       label: 'AI Coach'     },
  { id: 'news',      icon: Newspaper,   label: 'News'         },
  { id: 'import',    icon: Upload,      label: 'Import'       },
  { id: 'mt5',       icon: Database,    label: 'MT5 Connect'  },
  { id: 'plans',     icon: CreditCard,  label: 'Plans'        },
  { id: 'settings',  icon: Settings,    label: 'Settings'     },
];

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
export const Sidebar = ({ page, setPage, user, onLogout, notifications }) => {
  // Read MT5 saved-creds from localStorage for the dot indicator
  const [hasMT5, setHasMT5] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('apexedge_mt5_creds');
      setHasMT5(!!saved);
    } catch {}
  }, [page]);

  return (
  <aside style={{
    width: 220, minHeight: '100vh', flexShrink: 0,
    background: 'var(--surface)', borderRight: '1px solid var(--line)',
    display: 'flex', flexDirection: 'column',
  }}>
    {/* Logo */}
    <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <Zap size={15} color="#fff" />
        </div>
        <span style={{ fontFamily: 'var(--fh)', fontWeight: 800, fontSize: 16, letterSpacing: '.4px' }}>
          APEXEDGE
        </span>
      </div>
    </div>

    {/* Nav items */}
    <nav style={{ flex: 1, padding: '10px 10px' }}>
      {NAV.map(n => {
        const I      = n.icon;
        const active = page === n.id;
        return (
          <button
            key={n.id}
            onClick={() => setPage(n.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: 'none', cursor: 'pointer', marginBottom: 1,
              transition: 'all .12s', textAlign: 'left', position: 'relative',
              fontFamily: 'var(--fb)', fontSize: 13,
              background: active ? 'rgba(99,102,241,.1)' : 'transparent',
              color:      active ? '#818cf8' : 'var(--muted)',
              fontWeight: active ? 500 : 400,
            }}
          >
            <I size={15} />
            {n.label}

            {/* MT5 connection dot */}
            {n.id === 'mt5' && (
              <div style={{
                marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%',
                background: hasMT5 ? 'var(--emerald)' : 'var(--muted)',
                boxShadow:  hasMT5 ? '0 0 6px var(--emerald)' : 'none',
                animation:  hasMT5 ? 'blink 2s ease infinite' : 'none',
              }} />
            )}

            {/* AI unread badge */}
            {n.id === 'ai' && notifications > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--rose)', color: '#fff', borderRadius: 10, fontSize: 9, padding: '1px 6px', fontFamily: 'var(--fm)' }}>
                {notifications}
              </span>
            )}

            {/* Active indicator bar */}
            {active && (
              <div style={{ position: 'absolute', left: 0, top: '20%', width: 2, height: '60%', background: 'var(--indigo)', borderRadius: 2 }} />
            )}
          </button>
        );
      })}
    </nav>

    <Divider />

    {/* User footer */}
    <div style={{ padding: '10px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.2))', border: '1px solid var(--line2)' }}>
          <User size={13} color="var(--indigo)" />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
          <p style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fm)' }}>Pro Plan</p>
        </div>
      </div>
      <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 12, cursor: 'pointer' }}>
        <LogOut size={13} /> Sign out
      </button>
    </div>
  </aside>
  );
};

// ─── TOP BAR ──────────────────────────────────────────────────────────────────
export const TopBar = ({ title, subtitle, actions, tradeCount }) => (
  <div style={{ height: 58, borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, flexShrink: 0 }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <h1 style={{ fontFamily: 'var(--fh)', fontSize: 17, fontWeight: 700, lineHeight: 1 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fm)', marginTop: 2 }}>{subtitle}</p>}
    </div>
    {tradeCount != null && <Badge color="slate">{tradeCount} trades</Badge>}
    {actions}
  </div>
);
