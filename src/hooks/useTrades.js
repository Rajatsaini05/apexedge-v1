// src/hooks/useTrades.js
// Supabase trades CRUD with guaranteed timeout — never hangs.
// If the DB query takes > 10s, loading resolves with empty array
// so the user sees the dashboard instead of an infinite spinner.

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './useAuth';

// ── Column mapping: JS camelCase ↔ DB snake_case ───────────────────────────
function toDb(t) {
  return {
    id:           t.id,
    user_id:      t.userId,
    pair:         t.pair         || '',
    side:         t.side         || 'buy',
    entry_date:   t.entryDate    || null,
    exit_date:    t.exitDate     || null,
    entry_price:  t.entryPrice   ?? null,
    exit_price:   t.exitPrice    ?? null,
    lots:         t.lots         ?? 0,
    pnl:          t.pnl          ?? null,
    status:       t.status       || 'open',
    duration:     t.duration     || null,
    rr:           t.rr           ?? null,
    tp:           t.tp           ?? null,
    sl:           t.sl           ?? null,
    notes:        t.notes        || '',
    tags:         t.tags         || [],
    source:       t.source       || 'csv',
    broker:       t.broker       || null,
    raw_entry_id: t.rawEntryId   || t.entryId || null,
    raw_exit_id:  t.rawExitId    || t.exitId  || null,
  };
}

function fromDb(row) {
  return {
    id:          row.id,
    pair:        row.pair,
    side:        row.side,
    entryDate:   row.entry_date,
    exitDate:    row.exit_date,
    entryPrice:  row.entry_price  != null ? parseFloat(row.entry_price)  : null,
    exitPrice:   row.exit_price   != null ? parseFloat(row.exit_price)   : null,
    lots:        parseFloat(row.lots)  || 0,
    pnl:         row.pnl          != null ? parseFloat(row.pnl)          : null,
    status:      row.status,
    duration:    row.duration,
    rr:          row.rr           != null ? parseFloat(row.rr)           : null,
    tp:          row.tp           != null ? parseFloat(row.tp)           : null,
    sl:          row.sl           != null ? parseFloat(row.sl)           : null,
    notes:       row.notes        || '',
    tags:        row.tags         || [],
    source:      row.source,
    broker:      row.broker,
    entryId:     row.raw_entry_id,
    exitId:      row.raw_exit_id,
    createdAt:   row.created_at,
  };
}

// Wraps a Supabase query with a hard timeout
async function withTimeout(queryPromise, ms = 10000, fallback = null) {
  return Promise.race([
    queryPromise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useTrades() {
  const { user } = useAuth();
  const [trades,  setTrades]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // ── Fetch all trades ─────────────────────────────────────────────────────────
  const fetchTrades = useCallback(async () => {
    if (!user?.id) {
      setTrades([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await withTimeout(
        supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('exit_date', { ascending: false, nullsFirst: false }),
        10000,
        { data: null, error: { message: 'Request timed out — check your Supabase connection.' } }
      );

      if (result?.error) {
        console.warn('[useTrades] fetch error:', result.error.message);
        setError(result.error.message);
        setTrades([]);
      } else {
        setTrades((result?.data || []).map(fromDb));
      }
    } catch (e) {
      console.warn('[useTrades] fetch exception:', e.message);
      setError(e.message);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // ← user.id not user object — prevents refetch on every render

  // Fetch only once when user.id becomes available
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!user?.id) {
      fetchedRef.current = false; // reset so next login fetches fresh
      setLoading(false);
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchTrades();
  }, [user?.id, fetchTrades]);

  // ── Bulk import (upsert in batches of 500) ──────────────────────────────────
  const importTrades = useCallback(async (newTrades, meta = {}) => {
    if (!user || !newTrades.length) return { count: 0 };

    const rows = newTrades.map(t => toDb({ ...t, userId: user.id }));
    const BATCH = 500;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const result = await withTimeout(
        supabase.from('trades').upsert(batch, { onConflict: 'id' }),
        30000,
        { error: { message: 'Import timed out. Try a smaller file.' } }
      );
      if (result?.error) throw new Error(result.error.message);
      inserted += batch.length;
    }

    // Log the import session
    await supabase.from('import_sessions').insert({
      user_id:      user.id,
      source:       meta.source   || 'csv',
      filename:     meta.filename || null,
      broker:       meta.broker   || null,
      trades_built: inserted,
    }).catch(() => {}); // non-critical

    await fetchTrades();
    return { count: inserted };
  }, [user, fetchTrades]);

  // ── Update single trade ──────────────────────────────────────────────────────
  const updateTrade = useCallback(async (id, updates) => {
    if (!user) return;

    const dbUpdates = {};
    if (updates.notes     !== undefined) dbUpdates.notes     = updates.notes;
    if (updates.tags      !== undefined) dbUpdates.tags      = updates.tags;
    if (updates.pnl       !== undefined) dbUpdates.pnl       = updates.pnl;
    if (updates.status    !== undefined) dbUpdates.status    = updates.status;
    if (updates.exitDate  !== undefined) dbUpdates.exit_date  = updates.exitDate;
    if (updates.exitPrice !== undefined) dbUpdates.exit_price = updates.exitPrice;

    const result = await withTimeout(
      supabase.from('trades').update(dbUpdates).eq('id', id).eq('user_id', user.id).select().single(),
      8000,
      { error: { message: 'Update timed out.' } }
    );
    if (result?.error) throw new Error(result.error.message);

    const updated = fromDb(result.data);
    setTrades(prev => prev.map(t => t.id === id ? updated : t));
    return updated;
  }, [user]);

  // ── Add single trade ─────────────────────────────────────────────────────────
  const addTrade = useCallback(async (trade) => {
    if (!user) return;
    const row = toDb({ ...trade, userId: user.id });
    const result = await withTimeout(
      supabase.from('trades').insert(row).select().single(),
      8000,
      { error: { message: 'Insert timed out.' } }
    );
    if (result?.error) throw new Error(result.error.message);
    const t = fromDb(result.data);
    setTrades(prev => [t, ...prev]);
    return t;
  }, [user]);

  // ── Delete single trade ──────────────────────────────────────────────────────
  const deleteTrade = useCallback(async (id) => {
    if (!user) return;
    const result = await withTimeout(
      supabase.from('trades').delete().eq('id', id).eq('user_id', user.id),
      8000,
      { error: { message: 'Delete timed out.' } }
    );
    if (result?.error) throw new Error(result.error.message);
    setTrades(prev => prev.filter(t => t.id !== id));
  }, [user]);

  // ── Clear all trades ──────────────────────────────────────────────────────────
  const clearAllTrades = useCallback(async () => {
    if (!user) return;
    const result = await withTimeout(
      supabase.from('trades').delete().eq('user_id', user.id),
      15000,
      { error: { message: 'Clear timed out.' } }
    );
    if (result?.error) throw new Error(result.error.message);
    setTrades([]);
  }, [user]);

  return {
    trades,
    loading,
    error,
    refetch:        fetchTrades,
    importTrades,
    updateTrade,
    addTrade,
    deleteTrade,
    clearAllTrades,
    setTrades,
  };
}
