import React, { useState } from 'react';

// ── Design Tokens ──────────────────────────────────────
export const C = {
  bg:      '#0D0D0D',
  surface: '#141414',
  card:    '#1A1A1A',
  border:  '#242424',
  lime:    '#C8F500',
  blue:    '#3B82F6',
  red:     '#EF4444',
  amber:   '#F59E0B',
  green:   '#22C55E',
  muted:   '#6B7280',
  sub:     '#9CA3AF',
  text:    '#F3F4F6',
};

export const SPORT_EMOJI = { badminton:'🏸', futsal:'⚽', basketball:'🏀', tennis:'🎾', volleyball:'🏐' };
export const STATUS_CFG  = {
  pending:   { color:'#F59E0B', bg:'rgba(245,158,11,.12)',  label:'Pending'   },
  confirmed: { color:'#22C55E', bg:'rgba(34,197,94,.12)',   label:'Confirmed' },
  cancelled: { color:'#EF4444', bg:'rgba(239,68,68,.12)',   label:'Cancelled' },
  completed: { color:'#3B82F6', bg:'rgba(59,130,246,.12)',  label:'Completed' },
  no_show:   { color:'#6B7280', bg:'rgba(107,114,128,.12)', label:'No Show'   },
};

// ── Typography ──────────────────────────────────────────
export const SYNE = "'Syne', sans-serif";
export const MONO = "'Space Mono', monospace";
export const SANS = "'DM Sans', sans-serif";

// ── Badge ───────────────────────────────────────────────
export function Badge({ status }) {
  const cfg = STATUS_CFG[status] || { color: C.muted, bg: 'rgba(107,114,128,.12)', label: status };
  return (
    <span className={`badge-glow status-${status}`} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:700, color:cfg.color, background:cfg.bg, textTransform:'capitalize', fontFamily:SANS }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:cfg.color, display:'inline-block' }} />
      {cfg.label}
    </span>
  );
}

// ── Button ──────────────────────────────────────────────
export function Btn({ children, variant='primary', size='md', onClick, disabled, style={}, type='button' }) {
  const base = { display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, border:'none', cursor: disabled?'not-allowed':'pointer', fontFamily:SANS, fontWeight:600, transition:'all .15s', opacity: disabled ? .5 : 1, borderRadius:8 };
  const variants = {
    primary:  { background:C.lime,  color:'#0D0D0D' },
    danger:   { background:'transparent', color:C.red,  border:`1px solid rgba(239,68,68,.4)` },
    ghost:    { background:'transparent', color:C.sub,  border:`1px solid ${C.border}` },
    success:  { background:'rgba(34,197,94,.1)',  color:C.green, border:`1px solid rgba(34,197,94,.3)` },
  };
  const sizes = { sm:{ padding:'5px 12px', fontSize:12 }, md:{ padding:'8px 18px', fontSize:13 }, lg:{ padding:'12px 28px', fontSize:15 } };
  return <button type={type} onClick={onClick} disabled={disabled} className={`btn-premium variant-${variant}`} style={{ ...base, ...variants[variant], ...sizes[size], ...style }}>{children}</button>;
}

// ── Input ───────────────────────────────────────────────
export function Input({ label, error, ...props }) {
  return (
    <div style={{ marginBottom:16 }}>
      {label && <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>{label}</label>}
      <input className="input-minimal" style={{ width:'100%', padding:'10px 14px', background:C.surface, border:`1px solid ${error?C.red:C.border}`, borderRadius:8, color:C.text, fontSize:14, fontFamily:SANS, outline:'none', boxSizing:'border-box' }} {...props} />
      {error && <span style={{ fontSize:11, color:C.red, marginTop:4, display:'block' }}>{error}</span>}
    </div>
  );
}

// ── Select ──────────────────────────────────────────────
export function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom:16 }}>
      {label && <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.muted, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>{label}</label>}
      <select className="input-minimal" style={{ width:'100%', padding:'10px 14px', background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:14, fontFamily:SANS, outline:'none', boxSizing:'border-box' }} {...props}>{children}</select>
    </div>
  );
}

// ── Card ────────────────────────────────────────────────
export function Card({ children, style={}, onClick }) {
  return <div onClick={onClick} className="card-glass" style={{ borderRadius:12, padding:20, ...style }}>{children}</div>;
}

// ── Alert ───────────────────────────────────────────────
export function Alert({ type='error', children, onClose }) {
  const cfg = { error:{ bg:'rgba(239,68,68,.1)', border:'rgba(239,68,68,.3)', color:C.red }, success:{ bg:'rgba(34,197,94,.1)', border:'rgba(34,197,94,.3)', color:C.green }, info:{ bg:'rgba(59,130,246,.1)', border:'rgba(59,130,246,.3)', color:C.blue } };
  const s = cfg[type] || cfg.error;
  return (
    <div style={{ padding:'10px 14px', borderRadius:8, border:`1px solid ${s.border}`, background:s.bg, color:s.color, fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
      <span style={{ flex:1 }}>{children}</span>
      {onClose && <button onClick={onClose} style={{ background:'none', border:'none', color:'inherit', cursor:'pointer', padding:0, fontSize:16, lineHeight:1 }}>×</button>}
    </div>
  );
}

// ── Spinner ──────────────────────────────────────────────
export function Spinner({ size=32 }) {
  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:40 }}>
      <div style={{ width:size, height:size, border:`3px solid ${C.border}`, borderTopColor:C.lime, borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────
export function Modal({ title, children, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:28, maxWidth:480, width:'100%', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ margin:0, fontFamily:SYNE, fontSize:18, fontWeight:700 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer', padding:0 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Page Title ───────────────────────────────────────────
export function PageTitle({ children }) {
  return <h1 style={{ fontFamily:SYNE, fontSize:28, fontWeight:800, marginBottom:24, marginTop:0 }}>{children}</h1>;
}

// ── Table ────────────────────────────────────────────────
export function Table({ headers, rows }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            {headers.map(h => <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, color:C.muted, background:C.surface, whiteSpace:'nowrap' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
              {row.map((cell, j) => <td key={j} style={{ padding:'12px 14px', fontSize:13, color:C.text }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Star Rating ─────────────────────────────────────────
export function Stars({ rating, onSelect, size=18 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display:'flex', gap:3 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onClick={() => onSelect?.(n)} onMouseEnter={() => onSelect && setHovered(n)} onMouseLeave={() => setHovered(0)}
          style={{ fontSize:size, cursor:onSelect?'pointer':'default', color: n<=(hovered||rating) ? '#F59E0B' : C.border }}>★</span>
      ))}
    </div>
  );
}
