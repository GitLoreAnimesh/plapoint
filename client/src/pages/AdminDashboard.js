import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { C, SYNE, MONO, Badge, Btn, Spinner, Alert } from '../components/ui';

// ── Sidebar ────────────────────────────────────────────
function Sidebar() {
  const loc = useLocation();
  const links = [
    { to:'/admin/dashboard', icon:'📊', label:'Overview'  },
    { to:'/admin/owners',    icon:'🏢', label:'Owners'    },
    { to:'/admin/grounds',   icon:'🏟️', label:'Grounds'   },
    { to:'/admin/users',     icon:'👥', label:'Players'   },
    { to:'/admin/bookings',  icon:'📋', label:'Bookings'  },
  ];
  return (
    <aside style={{ width:210, background:'#0A0A0A', borderRight:`1px solid ${C.border}`, padding:'28px 12px', minHeight:'calc(100vh - 60px)', flexShrink:0 }}>
      <div style={{ fontFamily:SYNE, fontSize:11, fontWeight:700, color:C.muted, letterSpacing:2, textTransform:'uppercase', padding:'0 12px', marginBottom:16 }}>Admin Panel</div>
      {links.map(l=>{
        const active = loc.pathname === l.to;
        return (
          <Link key={l.to} to={l.to} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, marginBottom:2, color:active?C.lime:C.muted, textDecoration:'none', fontSize:13, fontWeight:500, background:active?'rgba(200,245,0,.07)':'transparent' }}>
            {l.icon} {l.label}
          </Link>
        );
      })}
    </aside>
  );
}

// ── KPI ────────────────────────────────────────────────
function KPI({ label, value, color, icon }) {
  return (
    <div style={{ background:'#111', border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px' }}>
      <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:.5, color:C.muted, marginBottom:8 }}>{icon} {label}</div>
      <div style={{ fontFamily:MONO, fontSize:26, fontWeight:700, color:color||C.lime }}>{value}</div>
    </div>
  );
}

// ── Overview ───────────────────────────────────────────
function Overview() {
  const [stats, setStats] = useState(null);
  useEffect(() => { adminAPI.getStats().then(r=>setStats(r.data.stats)).catch(()=>{}); }, []);
  if (!stats) return <Spinner />;
  return (
    <div>
      <h1 style={{ fontFamily:SYNE, fontSize:26, fontWeight:800, marginBottom:6, marginTop:0 }}>Admin Overview</h1>
      <p style={{ color:C.muted, fontSize:14, marginBottom:28 }}>Platform health at a glance</p>
      {(stats.pendingOwners > 0 || stats.pendingGrounds > 0) && (
        <Alert type="info">
          ⚠️ Action needed: {stats.pendingOwners > 0 && `${stats.pendingOwners} owner${stats.pendingOwners>1?'s':''} awaiting approval`}{stats.pendingOwners > 0 && stats.pendingGrounds > 0 && ' · '}{stats.pendingGrounds > 0 && `${stats.pendingGrounds} ground${stats.pendingGrounds>1?'s':''} awaiting approval`}
        </Alert>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        <KPI label="Total Players"   value={stats.players}   icon="🏃" />
        <KPI label="Total Owners"    value={stats.owners}    icon="🏢" />
        <KPI label="Live Grounds"    value={stats.grounds}   icon="🏟️" />
        <KPI label="Total Bookings"  value={stats.bookings}  icon="📋" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        <KPI label="Total Revenue"       value={`৳${(stats.totalRevenue||0).toLocaleString()}`} icon="💰" color={C.lime} />
        <KPI label="Pending Owners"      value={stats.pendingOwners}  icon="⏳" color={stats.pendingOwners>0?'#F59E0B':C.muted} />
        <KPI label="Pending Grounds"     value={stats.pendingGrounds} icon="⏳" color={stats.pendingGrounds>0?'#F59E0B':C.muted} />
      </div>
    </div>
  );
}

// ── Owners Panel ───────────────────────────────────────
function OwnersPanel() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');

  const load = (approved='') => {
    setLoading(true);
    adminAPI.getOwners(approved!==''?{approved}:{}).then(r=>{setOwners(r.data.owners||[]);setLoading(false);}).catch(()=>setLoading(false));
  };
  useEffect(()=>{load();},[]);

  const approve = async (id) => {
    try { await adminAPI.approveOwner(id, { isApproved: true }); setMsg('✅ Owner approved!'); load(filter); }
    catch (err) { setMsg(err.response?.data?.error||'Failed.'); }
  };
  const ban = async (id, name) => {
    const reason = window.prompt(`Ban reason for ${name}:`);
    if (!reason) return;
    try { await adminAPI.banUser(id, { isBanned: true, banReason: reason }); setMsg('✅ User banned.'); load(filter); }
    catch (err) { setMsg(err.response?.data?.error||'Failed.'); }
  };
  const unban = async (id) => {
    try { await adminAPI.banUser(id, { isBanned: false }); setMsg('✅ User unbanned.'); load(filter); }
    catch (err) { setMsg(err.response?.data?.error||'Failed.'); }
  };

  return (
    <div>
      <h1 style={{ fontFamily:SYNE, fontSize:26, fontWeight:800, marginBottom:24, marginTop:0 }}>Owner Management</h1>
      {msg && <Alert type={msg.startsWith('✅')?'success':'error'} onClose={()=>setMsg('')}>{msg}</Alert>}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['','All'],['false','Pending'],['true','Approved']].map(([v,l])=>(
          <button key={v||'all'} onClick={()=>{setFilter(v);load(v);}} style={{ padding:'6px 16px', borderRadius:8, border:`1px solid ${filter===v?C.lime:C.border}`, background:filter===v?'rgba(200,245,0,.07)':'transparent', color:filter===v?C.lime:C.muted, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>{l}</button>
        ))}
      </div>
      {loading ? <Spinner /> : (
        <div style={{ background:'#111', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
          {owners.length===0 ? <div style={{ padding:40, textAlign:'center', color:C.muted }}>No owners found</div> : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Name','Email','Phone','Status','Joined','Actions'].map(h=><th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, color:C.muted, background:C.card }}>{h}</th>)}</tr></thead>
              <tbody>
                {owners.map(o=>(
                  <tr key={o._id} style={{ borderTop:`1px solid ${C.border}` }}>
                    <td style={{ padding:'12px 14px', fontWeight:600, fontSize:13 }}>{o.name}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{o.email}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{o.phone||'—'}</td>
                    <td style={{ padding:'12px 14px' }}>
                      {o.isBanned ? <span style={{ color:C.red, fontSize:11, fontWeight:700 }}>● Banned</span>
                      : o.isApproved ? <span style={{ color:C.green, fontSize:11, fontWeight:700 }}>● Approved</span>
                      : <span style={{ color:'#F59E0B', fontSize:11, fontWeight:700 }}>⏳ Pending</span>}
                    </td>
                    <td style={{ padding:'12px 14px', fontSize:12, color:C.muted }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        {!o.isApproved && !o.isBanned && <Btn size="sm" onClick={()=>approve(o._id)}>✓ Approve</Btn>}
                        {!o.isBanned ? <Btn size="sm" variant="danger" onClick={()=>ban(o._id,o.name)}>Ban</Btn>
                        : <Btn size="sm" variant="success" onClick={()=>unban(o._id)}>Unban</Btn>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Grounds Panel ──────────────────────────────────────
function GroundsPanel() {
  const [grounds, setGrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');

  const load = (approved='') => {
    setLoading(true);
    adminAPI.getGrounds(approved!==''?{approved}:{}).then(r=>{setGrounds(r.data.grounds||[]);setLoading(false);}).catch(()=>setLoading(false));
  };
  useEffect(()=>{load();},[]);

  const approve = async (id) => { try { await adminAPI.approveGround(id, { isApproved: true }); setMsg('✅ Ground approved and live!'); load(filter); } catch(err){ setMsg(err.response?.data?.error||'Failed.'); } };
  const reject  = async (id) => { try { await adminAPI.approveGround(id, { isApproved: false }); setMsg('✅ Ground rejected.'); load(filter); } catch(err){ setMsg(err.response?.data?.error||'Failed.'); } };
  const remove  = async (id) => { if (!window.confirm('Delete this ground permanently?')) return; try { await adminAPI.deleteGround(id); setMsg('✅ Deleted.'); load(filter); } catch(err){ setMsg('Failed.'); } };

  return (
    <div>
      <h1 style={{ fontFamily:SYNE, fontSize:26, fontWeight:800, marginBottom:24, marginTop:0 }}>Ground Management</h1>
      {msg && <Alert type={msg.startsWith('✅')?'success':'error'} onClose={()=>setMsg('')}>{msg}</Alert>}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['','All'],['false','Pending'],['true','Approved']].map(([v,l])=>(
          <button key={v||'all'} onClick={()=>{setFilter(v);load(v);}} style={{ padding:'6px 16px', borderRadius:8, border:`1px solid ${filter===v?C.lime:C.border}`, background:filter===v?'rgba(200,245,0,.07)':'transparent', color:filter===v?C.lime:C.muted, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>{l}</button>
        ))}
      </div>
      {loading ? <Spinner /> : (
        <div style={{ background:'#111', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
          {grounds.length===0 ? <div style={{ padding:40, textAlign:'center', color:C.muted }}>No grounds found</div> : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Facility','Sport','City','Owner','Price','Status','Actions'].map(h=><th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, color:C.muted, background:C.card }}>{h}</th>)}</tr></thead>
              <tbody>
                {grounds.map(g=>(
                  <tr key={g._id} style={{ borderTop:`1px solid ${C.border}` }}>
                    <td style={{ padding:'12px 14px', fontWeight:600, fontSize:13 }}>{g.name}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, textTransform:'capitalize' }}>{g.sport}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{g.city}</td>
                    <td style={{ padding:'12px 14px', fontSize:13 }}>{g.owner?.name}<div style={{ fontSize:11, color:C.muted }}>{g.owner?.email}</div></td>
                    <td style={{ padding:'12px 14px', fontFamily:MONO, fontSize:13, color:C.lime }}>৳{g.pricePerHour}</td>
                    <td style={{ padding:'12px 14px' }}>{g.isApproved ? <span style={{ color:C.green, fontSize:11, fontWeight:700 }}>● Live</span> : <span style={{ color:'#F59E0B', fontSize:11, fontWeight:700 }}>⏳ Pending</span>}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', gap:5 }}>
                        {!g.isApproved && <Btn size="sm" onClick={()=>approve(g._id)}>✓ Approve</Btn>}
                        {g.isApproved  && <Btn size="sm" variant="danger" onClick={()=>reject(g._id)}>Reject</Btn>}
                        <Btn size="sm" variant="ghost" onClick={()=>remove(g._id)}>🗑</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Players Panel ──────────────────────────────────────
function PlayersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  const load = (s='') => {
    setLoading(true);
    adminAPI.getUsers({ role:'player', search:s||undefined }).then(r=>{setUsers(r.data.users||[]);setLoading(false);}).catch(()=>setLoading(false));
  };
  useEffect(()=>{load();},[]);

  const ban = async (id, name) => {
    const reason = window.prompt(`Ban reason for ${name}:`);
    if (!reason) return;
    try { await adminAPI.banUser(id, { isBanned: true, banReason: reason }); setMsg('✅ User banned.'); load(search); }
    catch { setMsg('Failed.'); }
  };
  const unban = async (id) => {
    try { await adminAPI.banUser(id, { isBanned: false }); setMsg('✅ User unbanned.'); load(search); }
    catch { setMsg('Failed.'); }
  };

  return (
    <div>
      <h1 style={{ fontFamily:SYNE, fontSize:26, fontWeight:800, marginBottom:24, marginTop:0 }}>Player Management</h1>
      {msg && <Alert type={msg.startsWith('✅')?'success':'error'} onClose={()=>setMsg('')}>{msg}</Alert>}
      <input value={search} onChange={e=>{setSearch(e.target.value);load(e.target.value);}} placeholder="Search by name or email…"
        style={{ width:'100%', maxWidth:360, padding:'9px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none', marginBottom:20 }} />
      {loading ? <Spinner /> : (
        <div style={{ background:'#111', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
          {users.length===0 ? <div style={{ padding:40, textAlign:'center', color:C.muted }}>No players found</div> : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Name','Email','Phone','Status','Joined','Actions'].map(h=><th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, color:C.muted, background:C.card }}>{h}</th>)}</tr></thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u._id} style={{ borderTop:`1px solid ${C.border}` }}>
                    <td style={{ padding:'12px 14px', fontWeight:600, fontSize:13 }}>{u.name}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{u.email}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.muted }}>{u.phone||'—'}</td>
                    <td style={{ padding:'12px 14px' }}>{u.isBanned ? <span style={{ color:C.red, fontSize:11, fontWeight:700 }}>● Banned</span> : <span style={{ color:C.green, fontSize:11, fontWeight:700 }}>● Active</span>}</td>
                    <td style={{ padding:'12px 14px', fontSize:12, color:C.muted }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding:'12px 14px' }}>
                      {!u.isBanned ? <Btn size="sm" variant="danger" onClick={()=>ban(u._id,u.name)}>Ban</Btn>
                      : <Btn size="sm" variant="success" onClick={()=>unban(u._id)}>Unban</Btn>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Bookings Monitor ───────────────────────────────────
function BookingsMonitor() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');

  const load = (s='') => {
    setLoading(true);
    adminAPI.getBookings(s?{status:s}:{}).then(r=>{setBookings(r.data.bookings||[]);setLoading(false);}).catch(()=>setLoading(false));
  };
  useEffect(()=>{load();},[]);

  const cancel = async (id) => {
    const reason = window.prompt('Reason for cancellation?') || 'Admin cancelled';
    try { await adminAPI.cancelBooking(id, { reason }); setMsg('✅ Booking cancelled.'); load(filter); }
    catch { setMsg('Failed.'); }
  };

  return (
    <div>
      <h1 style={{ fontFamily:SYNE, fontSize:26, fontWeight:800, marginBottom:24, marginTop:0 }}>Booking Monitor</h1>
      {msg && <Alert type={msg.startsWith('✅')?'success':'error'} onClose={()=>setMsg('')}>{msg}</Alert>}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['','All'],['pending','Pending'],['confirmed','Confirmed'],['cancelled','Cancelled'],['completed','Completed']].map(([v,l])=>(
          <button key={v||'all'} onClick={()=>{setFilter(v);load(v);}} style={{ padding:'6px 16px', borderRadius:8, border:`1px solid ${filter===v?C.lime:C.border}`, background:filter===v?'rgba(200,245,0,.07)':'transparent', color:filter===v?C.lime:C.muted, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>{l}</button>
        ))}
      </div>
      {loading ? <Spinner /> : (
        <div style={{ background:'#111', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
          {bookings.length===0 ? <div style={{ padding:40, textAlign:'center', color:C.muted }}>No bookings</div> : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Player','Ground','City','Date','Slot','Amount','Status','Actions'].map(h=><th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, color:C.muted, background:C.card }}>{h}</th>)}</tr></thead>
              <tbody>
                {bookings.map(b=>(
                  <tr key={b._id} style={{ borderTop:`1px solid ${C.border}` }}>
                    <td style={{ padding:'12px 14px', fontSize:13, fontWeight:500 }}>{b.player?.name}</td>
                    <td style={{ padding:'12px 14px', fontSize:13 }}>{b.ground?.name}</td>
                    <td style={{ padding:'12px 14px', fontSize:12, color:C.muted }}>{b.ground?.city}</td>
                    <td style={{ padding:'12px 14px', fontSize:12 }}>{new Date(b.date).toLocaleDateString('en-BD',{day:'numeric',month:'short'})}</td>
                    <td style={{ padding:'12px 14px', fontFamily:MONO, fontSize:12 }}>{b.startHour}:00–{b.endHour}:00</td>
                    <td style={{ padding:'12px 14px', fontFamily:MONO, color:C.lime, fontWeight:700 }}>
                  ৳{b.amount}
                  <div style={{ fontSize:10, marginTop:2 }}>
                    <span style={{ color:C.muted }}>{b.paymentMode === 'sslcommerz' ? '🔒' : '💵'}  </span>
                    <span style={{ color: b.paymentStatus==='paid'?'#22C55E':b.paymentStatus==='failed'?'#EF4444':'#F59E0B' }}>{b.paymentStatus?.toUpperCase()}</span>
                  </div>
                </td>
                    <td style={{ padding:'12px 14px' }}><Badge status={b.status} /></td>
                    <td style={{ padding:'12px 14px' }}>
                      {!['cancelled','completed'].includes(b.status) && <Btn size="sm" variant="danger" onClick={()=>cancel(b._id)}>Cancel</Btn>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────
export default function AdminDashboard() {
  return (
    <div style={{ display:'flex', background:C.bg, color:C.text, minHeight:'calc(100vh - 60px)' }}>
      <Sidebar />
      <main style={{ flex:1, padding:'32px 36px', overflow:'auto' }}>
        <Routes>
          <Route path="/"          element={<Overview />} />
          <Route path="/owners"    element={<OwnersPanel />} />
          <Route path="/grounds"   element={<GroundsPanel />} />
          <Route path="/users"     element={<PlayersPanel />} />
          <Route path="/bookings"  element={<BookingsMonitor />} />
          <Route path="/*"         element={<Overview />} />
        </Routes>
      </main>
    </div>
  );
}
