// src/components/ErrorBoundary.jsx
// Catches unexpected React render errors and shows a clean recovery screen
// instead of a white blank page.
//
// Usage: wrap <App /> or any subtree in <ErrorBoundary>

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null, info: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[APEXEDGE] Uncaught error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#06070d', padding: 32, flexDirection: 'column', gap: 24, textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 24 }}>⚡</span>
        </div>

        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, fontFamily: "'DM Sans', sans-serif", maxWidth: 400, lineHeight: 1.6 }}>
            An unexpected error occurred. Your data is safe in Supabase — just refresh the page to continue.
          </p>
        </div>

        {/* Error detail (collapsible) */}
        <details style={{ maxWidth: 560, textAlign: 'left' }}>
          <summary style={{ color: '#475569', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer', marginBottom: 8 }}>
            Error details
          </summary>
          <pre style={{
            background: '#10121f', border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 8, padding: '12px 16px', fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace", color: '#fb7185',
            overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.6,
          }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.info?.componentStack?.trim()}
          </pre>
        </details>

        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 28px', fontSize: 14, fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          Reload App
        </button>
      </div>
    );
  }
}
