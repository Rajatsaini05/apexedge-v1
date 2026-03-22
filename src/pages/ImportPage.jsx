// src/pages/ImportPage.jsx
// AI-powered CSV import.
// Step 1: Upload any broker CSV
// Step 2: AI (Claude) reads the headers + sample rows and returns the column mapping
// Step 3: Preview the detected trades, then import

import { useState, useRef, useCallback } from 'react';
import {
  Upload, Check, ChevronRight, CheckCircle, Brain,
  AlertTriangle, RefreshCw, Eye, EyeOff, FileText,
} from 'lucide-react';
import { Card, Badge, Btn, Divider, PnlSpan } from '../components/atoms';
import { TopBar } from '../components/layout';
import { previewCSV, autoDetectMapping, parseCSVWithMapping } from '../utils/csvParser';

// ── AI mapping via Claude API ─────────────────────────────────────────────────
async function detectMappingWithAI(headers, sampleRows, apiKey) {
  const prompt = `You are a trading data expert. Analyse these CSV headers and sample rows from a forex/CFD broker export.

HEADERS:
${JSON.stringify(headers)}

SAMPLE ROWS (first 3):
${sampleRows.slice(0,3).map(r => JSON.stringify(r)).join('\n')}

Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "format": "A",
  "explanation": "one sentence describing what format this is",
  "id": "column name for trade/order ID or ticket number",
  "pair": "column name for trading symbol/pair",
  "side": "column name for buy/sell direction (may be combined with type)",
  "type": "column name for order type if direction is embedded here",
  "entryDate": "column name for trade open/entry time",
  "exitDate": "column name for trade close/exit time (empty string if not present)",
  "entryPrice": "column name for entry/open price",
  "exitPrice": "column name for exit/close price (empty string if not present)",
  "lots": "column name for volume/lot size",
  "pnl": "column name for profit/loss (empty string if not present)",
  "tp": "column name for take profit (empty string if not present)",
  "sl": "column name for stop loss (empty string if not present)",
  "swap": "column name for swap/rollover (empty string if not present)",
  "commission": "column name for commission (empty string if not present)"
}

format "A" = each row is a complete closed trade (has both entry and exit columns).
format "B" = each row is a single order event (need to pair opens with closes).

Use exact column names from the headers. Use empty string "" for any field not found.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `Claude API error ${res.status}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text || '';

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned unexpected format');
  return JSON.parse(jsonMatch[0]);
}

// ── Demo CSV samples ──────────────────────────────────────────────────────────
const DEMO_CSVS = {
  mt5: {
    label: 'MT5 Statement',
    filename: 'demo_mt5.csv',
    content: `Ticket,Open Time,Type,Volume,Symbol,Price,S / L,T / P,Close Time,Price,Commission,Swap,Profit
12345001,2024.01.15 09:32:45,buy,0.10,XAUUSD,2025.50,2015.00,2045.00,2024.01.15 14:20:11,2041.30,-1.50,-0.20,1558.00
12345002,2024.01.16 10:15:00,sell,0.20,EURUSD,1.09850,1.10200,1.09200,2024.01.16 16:45:22,1.09310,-2.00,-0.10,108.00
12345003,2024.01.17 08:00:00,buy,0.15,GBPUSD,1.27300,1.26800,1.28200,2024.01.17 12:30:00,1.26750,-1.50,0.00,-82.50
12345004,2024.01.18 11:00:00,sell,0.10,USDJPY,148.500,149.200,147.500,2024.01.18 20:15:00,147.800,-1.00,-0.30,70.00
12345005,2024.01.19 09:45:00,buy,0.25,XAUUSD,2030.00,2020.00,2050.00,2024.01.19 15:00:00,2048.50,-2.50,-0.50,4625.00
12345006,2024.01.22 08:30:00,sell,0.10,EURUSD,1.08950,1.09400,1.08400,2024.01.22 13:20:00,1.08420,-1.00,0.00,53.00
12345007,2024.01.23 10:00:00,buy,0.20,GBPJPY,187.500,186.500,189.000,2024.01.23 17:45:00,186.300,-2.00,-0.40,-240.00
12345008,2024.01.24 09:15:00,buy,0.10,USDCAD,1.34200,1.33700,1.35000,2024.01.24 14:00:00,1.34950,-1.00,0.10,75.00`,
  },
  ic: {
    label: 'IC Markets',
    filename: 'demo_icmarkets.csv',
    content: `Deal,Symbol,Direction,Volume,Open Time,Open Price,Close Time,Close Price,Profit,Swap,Commission
87654001,GOLD,Long,0.10,2024-01-15 09:32:45,2025.50,2024-01-15 14:20:11,2041.30,1558.00,-0.20,-1.50
87654002,EURUSD,Short,0.20,2024-01-16 10:15:00,1.09850,2024-01-16 16:45:22,1.09310,108.00,-0.10,-2.00
87654003,GBPUSD,Long,0.15,2024-01-17 08:00:00,1.27300,2024-01-17 12:30:00,1.26750,-82.50,0.00,-1.50
87654004,USDJPY,Short,0.10,2024-01-18 11:00:00,148.500,2024-01-18 20:15:00,147.800,70.00,-0.30,-1.00
87654005,GOLD,Long,0.25,2024-01-19 09:45:00,2030.00,2024-01-19 15:00:00,2048.50,4625.00,-0.50,-2.50`,
  },
  xm: {
    label: 'XM / Pepperstone',
    filename: 'demo_xm.csv',
    content: `Order,Open Time,Type,Lots,Instrument,Open Price,S/L,T/P,Close Time,Close Price,Swap,Commission,Profit
11112001,01/15/2024 09:32,buy,0.10,XAUUSD,2025.50,2015.00,2045.00,01/15/2024 14:20,2041.30,-0.20,-1.50,1558.00
11112002,01/16/2024 10:15,sell,0.20,EURUSD,1.09850,1.10200,1.09200,01/16/2024 16:45,1.09310,-0.10,-2.00,108.00
11112003,01/17/2024 08:00,buy,0.15,GBPUSD,1.27300,1.26800,1.28200,01/17/2024 12:30,1.26750,0.00,-1.50,-82.50
11112004,01/18/2024 11:00,sell,0.10,USDJPY,148.500,149.200,147.500,01/18/2024 20:15,147.800,-0.30,-1.00,70.00`,
  },
  ftmo: {
    label: 'FTMO / Funded',
    filename: 'demo_ftmo.csv',
    content: `"Trade #","Symbol","Side","Lots","Entry Price","Entry Time","Exit Price","Exit Time","Net Profit","Commission","Swap","TP","SL"
"FT-100001","EURUSD","Buy","0.20","1.09250","2024-01-15T10:30:00Z","1.09750","2024-01-15T15:45:00Z","100.00","-4.00","0.00","1.10000","1.09000"
"FT-100002","XAUUSD","Sell","0.10","2038.50","2024-01-16T09:00:00Z","2028.00","2024-01-16T14:30:00Z","105.00","-2.00","-0.50","2020.00","2045.00"
"FT-100003","GBPUSD","Buy","0.15","1.27100","2024-01-17T08:30:00Z","1.26800","2024-01-17T11:00:00Z","-45.00","-3.00","0.00","1.28000","1.26500"
"FT-100004","USDJPY","Sell","0.25","148.800","2024-01-18T07:00:00Z","147.900","2024-01-18T16:00:00Z","225.00","-5.00","-1.00","147.000","149.500"`,
  },
};

function downloadDemo(key) {
  const d = DEMO_CSVS[key];
  const blob = new Blob([d.content], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: d.filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const ImportPage = ({ onImport }) => {
  const [step,          setStep]          = useState(1);
  const [csvText,       setCsvText]       = useState('');
  const [fileName,      setFileName]      = useState('');
  const [preview,       setPreview]       = useState({ headers:[], rows:[] });
  const [mapping,       setMapping]       = useState(null);
  const [aiExplain,     setAiExplain]     = useState('');
  const [parsedTrades,  setParsedTrades]  = useState([]);
  const [detecting,     setDetecting]     = useState(false);
  const [detectErr,     setDetectErr]     = useState('');
  const [apiKey,        setApiKey]        = useState(() => sessionStorage.getItem('apexedge_claude_key') || '');
  const [showKey,       setShowKey]       = useState(false);
  const [drag,          setDrag]          = useState(false);
  const [result,        setResult]        = useState(null);
  const fileRef = useRef(null);

  // ── Load file ──────────────────────────────────────────────────────────────
  const loadCSV = useCallback((text, name = '') => {
    const clean = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();
    setCsvText(clean);
    setFileName(name);
    setDetectErr('');
    setParsedTrades([]);
    setStep(2);

    const pv = previewCSV(clean);
    setPreview(pv);

    // ALWAYS run auto-detect first so mapping + trades are available immediately
    const auto = autoDetectMapping(pv.headers);
    setMapping(auto);
    setAiExplain('Auto-detected from column names');
    runParse(clean, auto);

    // Then try AI on top of it if key is set (improves accuracy but not required)
    if (apiKey.trim()) {
      runAIDetect(clean, pv, apiKey.trim());
    }
  }, [apiKey]);

  // ── AI detect (enhances auto-detect, doesn't block it) ───────────────────
  const runAIDetect = useCallback(async (text, pv, key) => {
    setDetecting(true); setDetectErr('');
    try {
      const m = await detectMappingWithAI(pv.headers, pv.rows, key);
      setMapping(m);
      setAiExplain(m.explanation || '✓ AI mapping complete');
      sessionStorage.setItem('apexedge_claude_key', key);
      runParse(text, m);
    } catch (e) {
      // AI failed — auto-detect is already set, just show a warning
      setDetectErr(`AI detect failed (${e.message}) — using auto-detect instead. You can still import.`);
      // mapping + parsedTrades already set from auto-detect in loadCSV, don't clear them
    } finally {
      setDetecting(false);
    }
  }, []);

  // ── Parse ──────────────────────────────────────────────────────────────────
  function runParse(text, m) {
    const trades = parseCSVWithMapping(text, m);
    setParsedTrades(trades);
  }

  // ── File handlers ──────────────────────────────────────────────────────────
  const handleFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => loadCSV(ev.target.result, f.name);
    r.readAsText(f);
    e.target.value = '';
  };
  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => loadCSV(ev.target.result, f.name);
    r.readAsText(f);
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const doImport = async () => {
    if (!parsedTrades.length) return;
    await onImport([], parsedTrades, { source: 'csv', filename: fileName });
    setResult({ trades: parsedTrades.length });
    setStep(4);
  };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <TopBar
        title="Import Trades"
        subtitle="AI-powered · understands any broker CSV format automatically"
        actions={<Badge color="indigo"><Brain size={11}/> Claude AI Mapping</Badge>}
      />

      <div style={{ flex:1, overflowY:'auto', padding:24 }}>

        {/* Stepper */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:28 }}>
          {['Upload','AI Detect','Preview','Done'].map((s,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{
                width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:10,fontFamily:'var(--fm)',fontWeight:600,transition:'all .2s',
                background: step>i+1?'var(--emerald)':step===i+1?'var(--indigo)':'var(--card2)',
                border:`1px solid ${step>i+1?'var(--emerald)':step===i+1?'var(--indigo)':'var(--line)'}`,
                color: step>=i+1?'#fff':'var(--muted)',
              }}>
                {step>i+1?<Check size={12}/>:i+1}
              </div>
              <span style={{ fontSize:12,color:step===i+1?'var(--text)':'var(--muted)',fontFamily:'var(--fm)' }}>{s}</span>
              {i<3 && <ChevronRight size={12} color="var(--muted)"/>}
            </div>
          ))}
        </div>

        {/* ── STEP 1: UPLOAD ── */}
        {step===1 && (
          <div>
            {/* API Key input */}
            <Card style={{ padding:16, marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <Brain size={20} color="var(--indigo)" style={{ flexShrink:0, marginTop:2 }}/>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Claude AI Column Detection</p>
                  <p style={{ fontSize:12, color:'var(--sub)', fontFamily:'var(--fm)', marginBottom:10 }}>
                    Paste your Claude API key to enable AI-powered column detection. Works with any broker CSV — even unusual formats. Without the key, basic auto-detection is used.
                  </p>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <div style={{ position:'relative', flex:1 }}>
                      <input
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder="sk-ant-api03-… (optional but recommended)"
                        type={showKey ? 'text' : 'password'}
                        style={{ paddingRight:36, fontSize:12 }}
                      />
                      <button onClick={()=>setShowKey(v=>!v)} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--muted)',cursor:'pointer' }}>
                        {showKey ? <EyeOff size={13}/> : <Eye size={13}/>}
                      </button>
                    </div>
                    {apiKey && <Badge color="emerald">✓ Key set</Badge>}
                  </div>
                  <p style={{ fontSize:10, color:'var(--muted)', fontFamily:'var(--fm)', marginTop:5 }}>
                    Key is stored in session memory only — never sent to any server except Claude.
                  </p>
                </div>
              </div>
            </Card>

            {/* Drop zone */}
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" onChange={handleFile} style={{ display:'none' }}/>
            <div
              onDrop={handleDrop}
              onDragOver={e=>{e.preventDefault();setDrag(true)}}
              onDragLeave={()=>setDrag(false)}
              onClick={()=>fileRef.current?.click()}
              style={{ border:`2px dashed ${drag?'var(--indigo)':'var(--line)'}`,borderRadius:14,padding:56,textAlign:'center',transition:'all .2s',background:drag?'rgba(99,102,241,.04)':'transparent',cursor:'pointer',marginBottom:20 }}
            >
              <div style={{ width:56,height:56,borderRadius:12,background:'var(--card2)',border:'1px solid var(--line)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px' }}>
                <Upload size={24} color="var(--muted)"/>
              </div>
              <h3 style={{ fontFamily:'var(--fh)',fontWeight:700,fontSize:17,marginBottom:8 }}>Drop your CSV file here</h3>
              <p style={{ color:'var(--sub)',fontSize:13,marginBottom:20 }}>
                MT5 · MT4 · IC Markets · XM · Pepperstone · FTMO · Bybit · any broker
              </p>
              <Btn onClick={e=>{e.stopPropagation();fileRef.current?.click();}}><Upload size={13}/>Browse File</Btn>
            </div>

            {/* Demo CSVs */}
            <Card style={{ padding:20 }}>
              <p style={{ fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.7px',fontFamily:'var(--fm)',marginBottom:14 }}>
                No CSV? Download a demo file to test
              </p>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:10 }}>
                {Object.entries(DEMO_CSVS).map(([key,d]) => (
                  <div key={key} style={{ display:'flex',flexDirection:'column',gap:8 }}>
                    <div style={{ background:'var(--card2)',border:'1px solid var(--line)',borderRadius:8,padding:'10px 14px' }}>
                      <p style={{ fontSize:12,fontWeight:600,marginBottom:4 }}>{d.label}</p>
                      <p style={{ fontSize:10,color:'var(--muted)',fontFamily:'var(--fm)',marginBottom:8 }}>{d.filename}</p>
                      <div style={{ display:'flex',gap:6 }}>
                        <Btn variant="ghost" size="sm" onClick={()=>downloadDemo(key)}><FileText size={11}/>Download</Btn>
                        <Btn size="sm" onClick={()=>loadCSV(d.content, d.filename)}>Try it</Btn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── STEP 2: AI DETECT ── */}
        {step===2 && (
          <div>
            {/* AI status */}
            <Card style={{ padding:14, marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                {detecting
                  ? <><div className="spin" style={{ width:18,height:18,border:'2px solid var(--line)',borderTopColor:'var(--indigo)',borderRadius:'50%'}}/><span style={{ fontSize:12,color:'var(--sub)',fontFamily:'var(--fm)' }}>Claude is analysing your CSV…</span></>
                  : <><Brain size={16} color={apiKey?'var(--indigo)':'var(--emerald)'}/><span style={{ fontSize:13,color:'var(--text)' }}>{aiExplain || 'Ready'}</span></>
                }
                {!detecting && mapping && (
                  <Badge color={apiKey && !detectErr ? 'indigo' : 'emerald'}>
                    {apiKey && !detectErr ? '✓ AI Mapped' : '✓ Auto-detected'}
                  </Badge>
                )}
              </div>
              {detectErr && <p style={{ fontSize:11, color:'var(--amber)', fontFamily:'var(--fm)', marginTop:8, lineHeight:1.5 }}>{detectErr}</p>}
              {!apiKey && !detecting && (
                <p style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--fm)', marginTop:6 }}>
                  No Claude key — using auto-detection. Works for standard broker formats. Add a key on step 1 for better accuracy on unusual formats.
                </p>
              )}
            </Card>

            {/* Mapping display — always shown once mapping exists */}
            {mapping && (
              <div style={{ display:'grid',gridTemplateColumns:'minmax(0, 360px) minmax(0, 1fr)',gap:16 }}>
                <Card style={{ padding:18 }}>
                  <p style={{ fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.7px',fontFamily:'var(--fm)',marginBottom:14 }}>Detected Column Mapping</p>
                  {[
                    ['Format',      mapping.format==='A'?'Complete trades (entry + exit per row)':'Order events (pair matching)'],
                    ['Trade ID',    mapping.id],
                    ['Symbol',      mapping.pair],
                    ['Direction',   mapping.side||mapping.type],
                    ['Entry Time',  mapping.entryDate],
                    ['Exit Time',   mapping.exitDate],
                    ['Entry Price', mapping.entryPrice],
                    ['Exit Price',  mapping.exitPrice],
                    ['Lots/Volume', mapping.lots],
                    ['P&L',         mapping.pnl],
                    ['SL',          mapping.sl],
                    ['TP',          mapping.tp],
                  ].map(([label,val]) => (
                    <div key={label} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:'1px solid var(--line)',fontSize:11 }}>
                      <span style={{ fontFamily:'var(--fm)',color:'var(--muted)' }}>{label}</span>
                      <span style={{ fontFamily:'var(--fm)',color:val?'var(--emerald)':'var(--muted)',fontWeight:val?500:400 }}>
                        {val || '—'}
                      </span>
                    </div>
                  ))}

                  <div style={{ marginTop:16, display:'flex', gap:8, flexWrap:'wrap' }}>
                    <Btn variant="ghost" size="sm" onClick={()=>{setStep(1);setMapping(null);}}>← Back</Btn>
                    {parsedTrades.length > 0
                      ? (
                        <Btn size="sm" onClick={()=>setStep(3)}>
                          Preview {parsedTrades.length} trades →
                        </Btn>
                      ) : !detecting && (
                        <div style={{ flex:1 }}>
                          <div style={{ padding:'10px 12px', background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.2)', borderRadius:7, marginBottom:8 }}>
                            <p style={{ fontSize:11, color:'var(--amber)', fontFamily:'var(--fm)', lineHeight:1.6 }}>
                              ⚠ No trades detected with current mapping. Try adjusting the column selectors below, or check that your CSV has closed trades with both entry and exit prices.
                            </p>
                          </div>
                          <Btn variant="ghost" size="sm" onClick={()=>{
                            // Force re-parse so user can see if manual column edits help
                            runParse(csvText, mapping);
                          }}>↻ Re-parse with current mapping</Btn>
                        </div>
                      )
                    }
                  </div>

                  {/* Re-detect with AI */}
                  {!apiKey && (
                    <div style={{ marginTop:12,padding:10,background:'rgba(99,102,241,.06)',border:'1px solid var(--line2)',borderRadius:7 }}>
                      <p style={{ fontSize:11,color:'var(--sub)',fontFamily:'var(--fm)',marginBottom:8 }}>Add a Claude API key for better accuracy:</p>
                      <input value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-ant-…" type="password" style={{ fontSize:11,marginBottom:8 }}/>
                      <Btn size="sm" disabled={!apiKey} onClick={()=>runAIDetect(csvText,preview,apiKey)}>
                        <Brain size={11}/> Re-detect with AI
                      </Btn>
                    </div>
                  )}
                </Card>

                {/* CSV preview table */}
                <Card style={{ padding:0,overflow:'hidden' }}>
                  <p style={{ fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.7px',fontFamily:'var(--fm)',padding:'12px 16px 8px' }}>
                    Raw CSV Preview ({fileName})
                  </p>
                  <Divider/>
                  <div style={{ overflowX:'auto',maxHeight:320 }}>
                    <table style={{ width:'100%',borderCollapse:'collapse' }}>
                      <thead style={{ position:'sticky',top:0 }}>
                        <tr>
                          {preview.headers.map(h=>(
                            <th key={h} style={{ padding:'8px 12px',borderBottom:'1px solid var(--line)',fontSize:10,color: Object.values(mapping||{}).includes(h)?'var(--indigo)':'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',fontFamily:'var(--fm)',textAlign:'left',whiteSpace:'nowrap',background:'var(--surface)',fontWeight: Object.values(mapping||{}).includes(h)?700:400 }}>
                              {h}
                              {Object.values(mapping||{}).includes(h) && <span style={{ color:'var(--emerald)',marginLeft:4 }}>✓</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row,i)=>(
                          <tr key={i} style={{ background: i%2===0?'transparent':'rgba(255,255,255,.01)' }}>
                            {preview.headers.map(h=>(
                              <td key={h} style={{ padding:'7px 12px',borderBottom:'1px solid var(--line)',fontSize:11,fontFamily:'var(--fm)',color:'var(--sub)',whiteSpace:'nowrap' }}>
                                {row[h]||'—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: PREVIEW TRADES ── */}
        {step===3 && (
          <div>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
              <div>
                <h3 style={{ fontFamily:'var(--fh)',fontWeight:700,fontSize:16 }}>
                  {parsedTrades.length} trades ready to import
                </h3>
                <p style={{ fontSize:12,color:'var(--sub)',fontFamily:'var(--fm)',marginTop:4 }}>
                  {parsedTrades.filter(t=>t.status==='win').length} wins ·{' '}
                  {parsedTrades.filter(t=>t.status==='loss').length} losses ·{' '}
                  Net: ${parsedTrades.reduce((s,t)=>s+(t.pnl||0),0).toFixed(2)}
                </p>
              </div>
              <div style={{ display:'flex',gap:8 }}>
                <Btn variant="ghost" size="sm" onClick={()=>setStep(2)}>← Back</Btn>
                <Btn onClick={doImport}><Check size={13}/>Import {parsedTrades.length} Trades</Btn>
              </div>
            </div>

            <Card style={{ padding:0,overflow:'hidden' }}>
              <div style={{ maxHeight:480,overflowY:'auto',overflowX:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead style={{ position:'sticky',top:0,zIndex:1 }}>
                    <tr>
                      {['Pair','Dir','Entry Time','Exit Time','Entry $','Exit $','Lots','P&L','Result'].map(h=>(
                        <th key={h} style={{ padding:'9px 14px',fontSize:10,letterSpacing:'.6px',textTransform:'uppercase',color:'var(--muted)',fontFamily:'var(--fm)',fontWeight:500,background:'var(--surface)',borderBottom:'1px solid var(--line)',textAlign:'left',whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTrades.map((t,i)=>(
                      <tr key={t.id} style={{ background:i%2===0?'transparent':'rgba(255,255,255,.01)' }}>
                        <td style={{ padding:'8px 14px',fontSize:13,fontWeight:600 }}>{t.pair}</td>
                        <td style={{ padding:'8px 14px' }}><span style={{ fontSize:11,color:t.side==='buy'?'var(--emerald)':'var(--rose)',fontFamily:'var(--fm)',fontWeight:500 }}>{t.side==='buy'?'▲ L':'▼ S'}</span></td>
                        <td style={{ padding:'8px 14px',fontSize:11,fontFamily:'var(--fm)',color:'var(--sub)',whiteSpace:'nowrap' }}>{t.entryDate?new Date(t.entryDate).toLocaleString('en-GB',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}</td>
                        <td style={{ padding:'8px 14px',fontSize:11,fontFamily:'var(--fm)',color:'var(--sub)',whiteSpace:'nowrap' }}>{t.exitDate?new Date(t.exitDate).toLocaleString('en-GB',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}</td>
                        <td style={{ padding:'8px 14px',fontSize:12,fontFamily:'var(--fm)' }}>{t.entryPrice?.toFixed(5)||'—'}</td>
                        <td style={{ padding:'8px 14px',fontSize:12,fontFamily:'var(--fm)' }}>{t.exitPrice?.toFixed(5)||'—'}</td>
                        <td style={{ padding:'8px 14px',fontSize:12,fontFamily:'var(--fm)' }}>{t.lots}</td>
                        <td style={{ padding:'8px 14px' }}><PnlSpan v={t.pnl}/></td>
                        <td style={{ padding:'8px 14px' }}>
                          {t.status==='win'?<Badge color="emerald">WIN</Badge>:t.status==='loss'?<Badge color="rose">LOSS</Badge>:t.status==='open'?<Badge color="indigo">OPEN</Badge>:<Badge color="slate">BE</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── STEP 4: DONE ── */}
        {step===4 && (
          <div className="fade-up" style={{ textAlign:'center',padding:64 }}>
            <div style={{ width:72,height:72,borderRadius:'50%',background:'rgba(16,185,129,.1)',border:'2px solid var(--emerald)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px' }}>
              <CheckCircle size={32} color="var(--emerald)"/>
            </div>
            <h2 style={{ fontFamily:'var(--fh)',fontSize:22,fontWeight:700,color:'var(--emerald)',marginBottom:8 }}>Import Complete!</h2>
            <p style={{ color:'var(--sub)',fontFamily:'var(--fm)',fontSize:14,marginBottom:24 }}>
              {result?.trades} trades saved to your journal.
            </p>
            <Btn onClick={()=>{setStep(1);setMapping(null);setParsedTrades([]);setResult(null);}}><Upload size={13}/>Import Another File</Btn>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportPage;
