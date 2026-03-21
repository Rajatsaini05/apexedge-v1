// src/components/layout/index.jsx
// Responsive layout:
//   Desktop (>768px) → left sidebar (220px)
//   Mobile  (≤768px) → bottom tab bar (like a mobile app)

import { useState, useEffect } from 'react';
import { Zap, Home, BarChart2, List, BookOpen, Brain,
         Upload, Database, Settings, LogOut, User,
         CreditCard, LineChart, Newspaper, Menu, X } from 'lucide-react';
import { Badge, Divider } from '../atoms';

// ─── NAV ─────────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', icon: Home,        label: 'Dashboard'  },
  { id: 'chart',     icon: BarChart2,   label: 'Chart'       },
  { id: 'trades',    icon: List,        label: 'Positions'   },
  { id: 'analytics', icon: LineChart,   label: 'Analytics'   },
  { id: 'journal',   icon: BookOpen,    label: 'Journal'     },
  { id: 'ai',        icon: Brain,       label: 'AI Coach'    },
  { id: 'news',      icon: Newspaper,   label: 'News'        },
  { id: 'import',    icon: Upload,      label: 'Import'      },
  { id: 'mt5',       icon: Database,    label: 'MT5'         },
  { id: 'plans',     icon: CreditCard,  label: 'Plans'       },
  { id: 'settings',  icon: Settings,    label: 'Settings'    },
];

// Bottom nav shows only the most important 5 tabs on mobile
// Tap "More" to see the full drawer
const BOTTOM_NAV = ['dashboard', 'chart', 'trades', 'ai', 'news'];

// ─── Hook: detect mobile ──────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

// ─── DESKTOP SIDEBAR ─────────────────────────────────────────────────────────
const DesktopSidebar = ({ page, setPage, user, onLogout }) => {
  const [hasMT5, setHasMT5] = useState(false);
  useEffect(() => {
    try { setHasMT5(!!localStorage.getItem('apexedge_mt5_creds')); } catch {}
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
          <span style={{ fontFamily: 'var(--fh)', fontWeight: 800, fontSize: 16, letterSpacing: '.4px' }}>APEXEDGE</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
        {NAV.map(n => {
          const I = n.icon;
          const active = page === n.id;
          return (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: 'none', cursor: 'pointer', marginBottom: 1,
              transition: 'all .12s', textAlign: 'left', position: 'relative',
              fontFamily: 'var(--fb)', fontSize: 13,
              background: active ? 'rgba(99,102,241,.1)' : 'transparent',
              color: active ? '#818cf8' : 'var(--muted)',
              fontWeight: active ? 500 : 400,
            }}>
              <I size={15} />
              {n.label}
              {n.id === 'mt5' && (
                <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: hasMT5 ? 'var(--emerald)' : 'var(--muted)', boxShadow: hasMT5 ? '0 0 6px var(--emerald)' : 'none', animation: hasMT5 ? 'blink 2s ease infinite' : 'none' }} />
              )}
              {active && <div style={{ position: 'absolute', left: 0, top: '20%', width: 2, height: '60%', background: 'var(--indigo)', borderRadius: 2 }} />}
            </button>
          );
        })}
      </nav>

      <Divider />

      {/* User */}
      <div style={{ padding: '10px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.2))', border: '1px solid var(--line2)' }}>
            <User size={13} color="var(--indigo)" />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
            <p style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fm)' }}>{user?.plan || 'Free'} Plan</p>
          </div>
        </div>
        <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 12, cursor: 'pointer' }}>
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </aside>
  );
};

// ─── MOBILE BOTTOM NAV ────────────────────────────────────────────────────────
const MobileNav = ({ page, setPage, user, onLogout }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const bottomItems = NAV.filter(n => BOTTOM_NAV.includes(n.id));

  const goTo = (id) => { setPage(id); setDrawerOpen(false); };

  return (
    <>
      {/* Bottom tab bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--surface)', borderTop: '1px solid var(--line)',
        display: 'flex', alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {bottomItems.map(n => {
          const I = n.icon;
          const active = page === n.id && !drawerOpen;
          return (
            <button key={n.id} onClick={() => goTo(n.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3, padding: '10px 4px',
              border: 'none', background: 'transparent',
              color: active ? 'var(--indigo)' : 'var(--muted)',
              cursor: 'pointer', transition: 'color .12s',
            }}>
              <I size={20} />
              <span style={{ fontSize: 9, fontFamily: 'var(--fm)', letterSpacing: '.3px' }}>{n.label}</span>
              {active && <div style={{ position: 'absolute', bottom: 0, width: 24, height: 2, background: 'var(--indigo)', borderRadius: 2 }} />}
            </button>
          );
        })}
        {/* More button */}
        <button onClick={() => setDrawerOpen(v => !v)} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 3, padding: '10px 4px',
          border: 'none', background: 'transparent',
          color: drawerOpen ? 'var(--indigo)' : 'var(--muted)',
          cursor: 'pointer',
        }}>
          {drawerOpen ? <X size={20} /> : <Menu size={20} />}
          <span style={{ fontSize: 9, fontFamily: 'var(--fm)', letterSpacing: '.3px' }}>More</span>
        </button>
      </nav>

      {/* Full drawer overlay */}
      {drawerOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: 'rgba(6,7,13,.95)',
          display: 'flex', flexDirection: 'column',
          paddingBottom: 'calc(60px + env(safe-area-inset-bottom))',
        }} onClick={() => setDrawerOpen(false)}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 20px 0', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={15} color="#fff" />
              </div>
              <span style={{ fontFamily: 'var(--fh)', fontWeight: 800, fontSize: 18 }}>APEXEDGE</span>
            </div>

            {/* All nav items in a grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
              {NAV.map(n => {
                const I = n.icon;
                const active = page === n.id;
                return (
                  <button key={n.id} onClick={() => goTo(n.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', borderRadius: 10,
                    border: `1px solid ${active ? 'rgba(99,102,241,.3)' : 'var(--line)'}`,
                    background: active ? 'rgba(99,102,241,.1)' : 'var(--card)',
                    color: active ? '#818cf8' : 'var(--sub)',
                    cursor: 'pointer', fontFamily: 'var(--fb)', fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    textAlign: 'left',
                  }}>
                    <I size={18} />
                    {n.label}
                  </button>
                );
              })}
            </div>

            {/* User + sign out */}
            <div style={{ marginTop: 'auto', padding: '16px 0', borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.2))', border: '1px solid var(--line2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={16} color="var(--indigo)" />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{user?.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fm)' }}>{user?.email}</p>
                </div>
              </div>
              <button onClick={() => { onLogout(); setDrawerOpen(false); }} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--line)', background: 'transparent',
                color: 'var(--rose)', cursor: 'pointer', fontFamily: 'var(--fb)', fontSize: 13,
                width: '100%',
              }}>
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── EXPORTED SIDEBAR (switches between desktop/mobile) ──────────────────────
export const Sidebar = ({ page, setPage, user, onLogout, notifications }) => {
  const mobile = useIsMobile();
  if (mobile) return <MobileNav page={page} setPage={setPage} user={user} onLogout={onLogout} />;
  return <DesktopSidebar page={page} setPage={setPage} user={user} onLogout={onLogout} />;
};

// ─── TOP BAR ─────────────────────────────────────────────────────────────────
export const TopBar = ({ title, subtitle, actions, tradeCount }) => {
  const mobile = useIsMobile();
  return (
    <div style={{
      height: mobile ? 50 : 58,
      borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center',
      padding: mobile ? '0 14px' : '0 24px',
      gap: mobile ? 8 : 16, flexShrink: 0,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontFamily: 'var(--fh)', fontSize: mobile ? 15 : 17, fontWeight: 700, lineHeight: 1 }}>{title}</h1>
        {subtitle && !mobile && <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fm)', marginTop: 2 }}>{subtitle}</p>}
      </div>
      {tradeCount != null && !mobile && <Badge color="slate">{tradeCount} trades</Badge>}
      {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
    </div>
  );
};
