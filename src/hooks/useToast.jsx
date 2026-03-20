// src/hooks/useToast.jsx
// Lightweight global toast notification system.
// Wrap your app with <ToastProvider> (done in main.jsx).
//
// Usage anywhere in the app:
//   const { toast } = useToast();
//   toast.success('Trade saved!');
//   toast.error('Something went wrong.');
//   toast.info('Syncing trades…');

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

const ToastCtx = createContext(null);

// ── Single toast item ──────────────────────────────────────────────────────────
const ICONS = {
  success: <Check     size={14} />,
  error:   <X         size={14} />,
  warning: <AlertTriangle size={14} />,
  info:    <Info      size={14} />,
};

const COLORS = {
  success: { bg: 'rgba(16,185,129,.08)',  border: 'rgba(16,185,129,.25)', color: '#34d399' },
  error:   { bg: 'rgba(244,63,94,.08)',   border: 'rgba(244,63,94,.25)',  color: '#fb7185' },
  warning: { bg: 'rgba(245,158,11,.08)',  border: 'rgba(245,158,11,.25)', color: '#fcd34d' },
  info:    { bg: 'rgba(99,102,241,.08)',  border: 'rgba(99,102,241,.25)', color: '#818cf8' },
};

function ToastItem({ id, type, message, onDismiss }) {
  const c = COLORS[type] || COLORS.info;
  return (
    <div
      className="fade-in"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 8, marginBottom: 8,
        background: c.bg, border: `1px solid ${c.border}`,
        color: c.color, fontFamily: 'var(--fm)', fontSize: 12,
        maxWidth: 360, boxShadow: '0 4px 20px rgba(0,0,0,.4)',
        pointerEvents: 'all',
      }}
    >
      <span style={{ flexShrink: 0 }}>{ICONS[type]}</span>
      <span style={{ flex: 1, color: 'var(--text)' }}>{message}</span>
      <button
        onClick={() => onDismiss(id)}
        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2, flexShrink: 0 }}
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ── Provider ───────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter  = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((type, message, duration = 4000) => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, type, message }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const api = {
    success: (msg, dur) => show('success', msg, dur),
    error:   (msg, dur) => show('error',   msg, dur ?? 6000),
    warning: (msg, dur) => show('warning', msg, dur),
    info:    (msg, dur) => show('info',    msg, dur),
    dismiss,
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        zIndex: 9999, pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return { toast: ctx };
}
