#!/usr/bin/env python3
"""
mt5_bridge/server.py  v3
────────────────────────
Changes vs v2:
  - WebSocket /ws/positions  → sub-second live position streaming
  - /history now returns EVERY deal field + debug stats (deals found, matched, orphaned)
  - /debug/deals  → raw JSON of first 20 deals so you can verify field values
  - position_id fallback chain: position_id → order → ticket
  - Handles DEAL_ENTRY_INOUT (single-deal round trips)
"""

import asyncio
import json
import os
from datetime import datetime, timezone
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    MT5_AVAILABLE = False
    print("[MT5] WARNING: MetaTrader5 not installed — running in DEMO mode")

app = FastAPI(title="APEXEDGE MT5 Bridge", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

_connected  = False
_session    = {}
_ws_clients = set()  # active WebSocket connections


# ─── Models ──────────────────────────────────────────────────────────────────
class ConnectRequest(BaseModel):
    login:    int
    password: str
    server:   str
    path:     Optional[str] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────
def require_connected():
    if not MT5_AVAILABLE:
        return  # demo mode — always ok
    if not _connected:
        raise HTTPException(401, detail="Not connected. POST /connect first.")


def deal_to_dict(deal):
    """
    Full deal serialisation.
    entry_map: 0=in, 1=out, 2=inout, 3=out_by
    type_map:  0=buy, 1=sell, 2=balance, 3=credit, 4=charge, 5=correction, 6=bonus, 7=commission
    """
    ENTRY = {0: "in", 1: "out", 2: "inout", 3: "out_by"}
    TYPE  = {0: "buy", 1: "sell"}

    entry_int = int(getattr(deal, "entry", 1))
    type_int  = int(getattr(deal, "type",  0))

    # position_id is the canonical matching key; fall back to order, then ticket
    pos_id = int(getattr(deal, "position_id", 0)) or int(getattr(deal, "order", 0)) or int(deal.ticket)

    return {
        "ticket":       int(deal.ticket),
        "order":        int(deal.order),
        "position_id":  pos_id,
        "time":         datetime.fromtimestamp(int(deal.time), tz=timezone.utc).isoformat(),
        "time_ms":      int(deal.time) * 1000,
        "type_int":     type_int,
        "type":         TYPE.get(type_int, "other"),      # 'buy', 'sell', or 'other'
        "entry_int":    entry_int,
        "entry":        ENTRY.get(entry_int, "out"),       # 'in', 'out', 'inout', 'out_by'
        "symbol":       str(deal.symbol) if deal.symbol else "",
        "volume":       float(deal.volume),
        "price":        float(deal.price),
        "profit":       float(deal.profit),
        "swap":         float(getattr(deal, "swap",       0)),
        "commission":   float(getattr(deal, "commission", 0)),
        "comment":      str(getattr(deal, "comment", "")),
        "magic":        int(getattr(deal, "magic",   0)),
        "reason":       int(getattr(deal, "reason",  0)),
    }


def position_to_dict(pos):
    type_int = int(getattr(pos, "type", 0))
    return {
        "ticket":        int(pos.ticket),
        "time":          datetime.fromtimestamp(int(pos.time), tz=timezone.utc).isoformat(),
        "type":          "buy" if type_int == 0 else "sell",
        "symbol":        str(pos.symbol),
        "volume":        float(pos.volume),
        "price_open":    float(pos.price_open),
        "price_current": float(pos.price_current),
        "profit":        float(pos.profit),
        "swap":          float(getattr(pos, "swap", 0)),
        "sl":            float(pos.sl),
        "tp":            float(pos.tp),
        "comment":       str(getattr(pos, "comment", "")),
        "magic":         int(getattr(pos, "magic",   0)),
    }


def account_info_dict():
    if not MT5_AVAILABLE or not _connected:
        return {"balance": 10000, "equity": 9850, "margin": 150, "margin_free": 9700,
                "margin_level": 6567, "currency": "USD", "leverage": 500,
                "company": "Demo Broker", "server": _session.get("server",""),
                "login": _session.get("login", 0)}
    info = mt5.account_info()
    if info is None:
        return {}
    d = info._asdict()
    return {k: v for k, v in d.items() if not k.startswith("_")}


# ─── REST routes ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":        "ok",
        "version":       "3.0.0",
        "mt5_available": MT5_AVAILABLE,
        "connected":     _connected,
        "session_login": _session.get("login"),
    }


@app.post("/connect")
def connect(req: ConnectRequest):
    global _connected, _session
    if not MT5_AVAILABLE:
        _connected = True
        _session   = {"login": req.login, "server": req.server, "password": req.password}
        return {"status": "connected", "mode": "demo"}

    try: mt5.shutdown()
    except: pass

    kwargs = {"login": req.login, "password": req.password, "server": req.server}
    if req.path:
        kwargs["path"] = req.path

    if not mt5.initialize(**kwargs):
        err = mt5.last_error()
        raise HTTPException(400, detail=f"initialize() failed: {err}")

    if not mt5.login(req.login, password=req.password, server=req.server):
        err = mt5.last_error()
        mt5.shutdown()
        raise HTTPException(401, detail=f"login() failed: {err}")

    _connected = True
    _session   = {"login": req.login, "password": req.password, "server": req.server}
    return {"status": "connected", "account": account_info_dict()}


@app.post("/reconnect")
def reconnect():
    global _connected
    if not MT5_AVAILABLE:
        return {"status": "connected", "mode": "demo"}
    if not _session.get("password"):
        raise HTTPException(401, detail="No session — call /connect first.")
    try: mt5.shutdown()
    except: pass
    if not mt5.initialize(login=_session["login"], password=_session["password"], server=_session["server"]):
        _connected = False
        raise HTTPException(400, detail=f"reconnect failed: {mt5.last_error()}")
    _connected = True
    return {"status": "connected", "account": account_info_dict()}


@app.get("/account")
def account():
    require_connected()
    return account_info_dict()


@app.get("/history")
def history(from_date: Optional[str] = None, to_date: Optional[str] = None):
    require_connected()
    if not MT5_AVAILABLE:
        return {"deals": [], "count": 0, "stats": {}, "mode": "demo"}

    # Use year 2000 default — wide enough to catch all broker history
    date_from = datetime(2000, 1, 1, tzinfo=timezone.utc)
    date_to   = datetime.now(tz=timezone.utc)

    def parse_dt(s):
        """Parse ISO string; always returns UTC-aware datetime."""
        try:
            cleaned = s.strip().replace("Z", "+00:00").replace(" ", "T")
            dt = datetime.fromisoformat(cleaned)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception as e:
            print(f"[MT5] Date parse error for '{s}': {e}")
            return None

    if from_date:
        parsed = parse_dt(from_date)
        if parsed: date_from = parsed
    if to_date:
        parsed = parse_dt(to_date)
        if parsed: date_to = parsed

    print(f"[MT5] Fetching deals {date_from.date()} → {date_to.date()}")

    deals = mt5.history_deals_get(date_from, date_to)

    # Retry once on None — common on first call after reconnect
    if deals is None:
        import time as _time
        _time.sleep(0.8)
        print(f"[MT5] Retry after: {mt5.last_error()}")
        deals = mt5.history_deals_get(date_from, date_to)

    if deals is None:
        err = mt5.last_error()
        raise HTTPException(500,
            detail=f"history_deals_get failed: {err[0]} — {err[1]}. "
                   "Make sure MT5 is open and you are logged in. "
                   "Also check: Tools → Options → Expert Advisors → Allow automated trading.")

    result  = [deal_to_dict(d) for d in deals]
    entries = [d for d in result if d["entry"] == "in"]
    exits   = [d for d in result if d["entry"] in ("out","out_by","inout")]
    others  = [d for d in result if d["entry"] not in ("in","out","out_by","inout")]

    print(f"[MT5] {len(result)} deals | {len(entries)} opens | {len(exits)} closes | {len(others)} other")

    return {
        "deals": result,
        "count": len(result),
        "stats": {
            "total":  len(result),
            "opens":  len(entries),
            "closes": len(exits),
            "other":  len(others),
            "from":   date_from.isoformat(),
            "to":     date_to.isoformat(),
        }
    }


@app.get("/debug/deals")
def debug_deals():
    """Returns first 30 raw deals as-is for debugging the field values."""
    require_connected()
    if not MT5_AVAILABLE:
        return {"message": "Demo mode — no real deals"}
    date_from = datetime(2000, 1, 1, tzinfo=timezone.utc)
    date_to   = datetime.now(tz=timezone.utc)
    deals = mt5.history_deals_get(date_from, date_to)
    if deals is None:
        return {"error": str(mt5.last_error()), "deals": []}
    sample = [deal_to_dict(d) for d in deals[:30]]
    entry_counts = {}
    type_counts  = {}
    for d in [deal_to_dict(x) for x in deals]:
        entry_counts[d["entry"]] = entry_counts.get(d["entry"], 0) + 1
        type_counts[d["type"]]   = type_counts.get(d["type"],  0) + 1
    return {
        "total_deals":   len(deals),
        "entry_counts":  entry_counts,
        "type_counts":   type_counts,
        "sample_30":     sample,
    }


@app.get("/open_positions")
def open_positions():
    require_connected()
    if not MT5_AVAILABLE:
        return {"positions": [], "count": 0}
    positions = mt5.positions_get() or []
    return {"positions": [position_to_dict(p) for p in positions], "count": len(positions)}


@app.post("/disconnect")
def disconnect():
    global _connected, _session
    if MT5_AVAILABLE and _connected:
        try: mt5.shutdown()
        except: pass
    _connected = False
    _session   = {}
    return {"status": "disconnected"}


# ─── WebSocket live positions ─────────────────────────────────────────────────
@app.websocket("/ws/positions")
async def ws_positions(websocket: WebSocket):
    """
    Streams live position + account updates.
    Sends JSON every 1 second when positions change, every 2 seconds otherwise.
    """
    await websocket.accept()
    _ws_clients.add(websocket)
    last_snapshot = None
    try:
        while True:
            if not _connected:
                await websocket.send_json({"type": "disconnected"})
                await asyncio.sleep(2)
                continue

            if MT5_AVAILABLE:
                positions = mt5.positions_get() or []
                pos_list  = [position_to_dict(p) for p in positions]
                acct      = account_info_dict()
            else:
                pos_list  = []
                acct      = account_info_dict()

            snapshot = json.dumps(pos_list)
            changed  = snapshot != last_snapshot
            last_snapshot = snapshot

            payload = {
                "type":       "update",
                "changed":    changed,
                "positions":  pos_list,
                "count":      len(pos_list),
                "equity":     acct.get("equity", 0),
                "balance":    acct.get("balance", 0),
                "margin":     acct.get("margin", 0),
                "margin_free": acct.get("margin_free", 0),
                "margin_level": acct.get("margin_level", 0),
                "ts":         datetime.now(tz=timezone.utc).isoformat(),
            }
            await websocket.send_json(payload)
            # 1s when positions exist (fast for active trading), 2s when flat
            await asyncio.sleep(1 if pos_list else 2)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] error: {e}")
    finally:
        _ws_clients.discard(websocket)


# ─── Entry ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("MT5_BRIDGE_PORT", 8000))
    print(f"\n  APEXEDGE MT5 Bridge v3.0")
    print(f"  REST:      http://localhost:{port}")
    print(f"  WebSocket: ws://localhost:{port}/ws/positions")
    print(f"  Debug:     http://localhost:{port}/debug/deals")
    print(f"  MT5: {'✓ Ready' if MT5_AVAILABLE else '✗ Not installed (demo mode)'}\n")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
