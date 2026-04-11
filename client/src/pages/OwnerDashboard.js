import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { ownerAPI, groundAPI } from '../services/api';
import { C, SYNE, MONO, Badge, Btn, Spinner, Alert } from '../components/ui';
import useAuth, { subscribeToBookingUpdates } from '../store/authStore';
import toast from 'react-hot-toast';

// ── Sidebar ────────────────────────────────────────────
function Sidebar({ isApproved }) {
  const loc = useLocation();
  const links = [
    { to:'/owner/dashboard', icon:'📊', label:'Overview'   },
    { to:'/owner/bookings',  icon:'📋', label:'Bookings'   },
    { to:'/owner/grounds',   icon:'🏟️', label:'My Grounds' },
    ...(isApproved ? [{ to:'/owner/add', icon:'➕', label:'Add Ground' }] : []),
    { to:'/owner/analytics', icon:'📈', label:'Analytics'  },
  ];
  return (
    <aside style={{ width:210, background:'#111', borderRight:`1px solid ${C.border}`, padding:'28px 12px', minHeight:'calc(100vh - 60px)', flexShrink:0 }}>
      {links.map(l => {
        const active = loc.pathname === l.to;
        return (
          <Link key={l.to} to={l.to} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, marginBottom:2, color: active?C.lime:C.muted, textDecoration:'none', fontSize:13, fontWeight:500, background: active?'rgba(200,245,0,.07)':'transparent', transition:'all .15s' }}>
            {l.icon} {l.label}
          </Link>
        );
      })}
    </aside>
  );
}

// ── KPI Card ───────────────────────────────────────────
function KPI({ label, value, sub, mono }) {
  return (
    <div style={{ background:'#111', border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px' }}>
      <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:.5, color:C.muted, marginBottom:8 }}>{label}</div>
      <div style={{ fontFamily: mono?MONO:SYNE, fontSize:26, fontWeight:700, color:C.lime }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

// ── Overview ───────────────────────────────────────────
function Overview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { ownerAPI.getDashboard().then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <Spinner />;
  const { stats={}, todayBookings=[], grounds=[] } = data || {};
  const pendingGrounds = grounds.filter(g => !g.isApproved);
  return (
    <div>
      <h1 style={{ fontFamily:SYNE, fontSize:26, fontWeight:800, marginBottom:6, marginTop:0 }}>Dashboard</h1>
      <p style={{ color:C.muted, fontSize:14, marginBottom:28 }}>Today's overview for your facilities</p>
      {pendingGrounds.length > 0 && <Alert type="info">⏳ {pendingGrounds.length} facility awaiting admin approval: {pendingGrounds.map(g=>g.name).join(', ')}</Alert>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
        <KPI label="Today's Bookings"   value={stats.todayCount||0} />
        <KPI label="Pending Confirm"    value={stats.pendingCount||0} />
        <KPI label="This Week Revenue"  value={`৳${(stats.weekRevenue||0).toLocaleString()}`} mono />
        <KPI label="This Month Revenue" value={`৳${(stats.monthRevenue||0).toLocaleString()}`} mono />
      </div>
      <div style={{ background:'#111', border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
        <div style={{ fontFamily:SYNE, fontWeight:700, marginBottom:16 }}>Today's Schedule</div>
        {todayBookings.length === 0 ? <div style={{ color:C.muted, fontSize:14, textAlign:'center', padding:20 }}>No bookings today</div> : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {todayBookings.map(b => (
              <div key={b._id} style={{ display:'flex', alignItems:'center', gap:16, padding:'10px 14px', background:C.card, borderRadius:8 }}>
                <div style={{ fontFamily:MONO, fontSize:13, fontWeight:700, color:C.lime, minWidth:90 }}>{b.startHour}:00–{b.endHour}:00</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{b.player?.name}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{b.player?.phone || b.player?.email}</div>
                </div>
                <Badge status={b.status} />
                <div style={{ fontFamily:MONO, color:C.lime, fontWeight:700 }}>৳{b.amount}</div>
                <div style={{ fontSize:11 }}>
                  <span style={{ color:C.muted }}>{b.paymentMode === 'sslcommerz' ? '🔒 SSLCommerz' : '💵 At Venue'}  </span>
                  <span style={{ fontWeight:700, color: b.paymentStatus==='paid'?'#22C55E': b.paymentStatus==='failed'?'#EF4444': b.paymentStatus==='pending'?'#F59E0B':C.muted }}>
                    {b.paymentStatus?.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bookings Manager ───────────────────────────────────
function BookingsManager() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [processing, setProcessing] = useState(null); // bookingId currently being acted on
  const filterRef = React.useRef('');

  const load = (s='') => {
    filterRef.current = s;
    setLoading(true);
    ownerAPI.getBookings({ status:s||undefined })
      .then(r => { setBookings(r.data.bookings||[]); setLoading(false); })
      .catch(() => setLoading(false));
  };

  // ── Real-time sync via Socket.IO ──────────────────────
  useEffect(() => {
    load();
    const unsubscribe = subscribeToBookingUpdates((payload) => {
      // Update the matching booking in local state instantly — no refetch needed.
      setBookings(prev => {
        const idx = prev.findIndex(b => b._id === payload.bookingId);
        if (idx === -1) {
          // New booking appeared for this owner (e.g. just created) — refetch
          load(filterRef.current);
          return prev;
        }
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status: payload.status };
        // If we're filtered and the new status doesn't match, remove it
        if (filterRef.current && payload.status !== filterRef.current) {
          updated.splice(idx, 1);
        }
        return updated;
      });
    });
    return unsubscribe; // cleanup on unmount
  }, []); // eslint-disable-line

  const update = async (id, toStatus, reason='') => {
    // Optimistic: disable buttons immediately so owner can't double-click
    setProcessing(id);
    try {
      const res = await ownerAPI.updateBooking(id, { status: toStatus, reason });
      const updated = res.data.booking;
      // Update local state from API response (source of truth)
      setBookings(prev => {
        const filtered = prev.filter(b =>
          b._id !== updated._id ||
          (!filterRef.current || updated.status === filterRef.current)
        );
        return filtered.map(b => b._id === updated._id ? { ...b, ...updated } : b);
      });
      toast.success(`Booking ${toStatus}`);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Action failed.';
      toast.error(errMsg);
      // If it was a conflict (409) the booking state changed under us — refetch
      if (err.response?.status === 409) {
        load(filterRef.current);
      }
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <h1 style={{ fontFamily:SYNE, fontSize:26, fontWeight:800, marginBottom:24, marginTop:0 }}>Booking Manager</h1>
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['','All'],['pending','Pending'],['confirmed','Confirmed'],['completed','Completed'],['cancelled','Cancelled']].map(([v,l])=>(
          <button key={v} onClick={()=>{setFilter(v);load(v);}} style={{ padding:'6px 16px', borderRadius:8, border:`1px solid ${filter===v?C.lime:C.border}`, background:filter===v?'rgba(200,245,0,.07)':'transparent', color:filter===v?C.lime:C.muted, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>{l}</button>
        ))}
      </div>
      {loading ? <Spinner /> : (
        <div style={{ background:'#111', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
          {bookings.length === 0 ? <div style={{ padding:40, textAlign:'center', color:C.muted }}>No bookings found</div> : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Player','Ground','Date','Slot','Amount','Pay Mode','Advance','Status','Actions'].map(h=><th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, color:C.muted, background:C.card }}>{h}</th>)}</tr></thead>
              <tbody>
                {bookings.map(b=>(
                  <tr key={b._id} style={{ borderTop:`1px solid ${C.border}`, opacity: processing===b._id ? 0.5 : 1, transition:'opacity .15s' }}>
                    <td style={{ padding:'12px 14px', fontSize:13 }}>
                      <div style={{ fontWeight:600 }}>{b.player?.name}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{b.player?.phone||b.player?.email}</div>
                    </td>
                    <td style={{ padding:'12px 14px', fontSize:13 }}>{b.ground?.name}</td>
                    <td style={{ padding:'12px 14px', fontSize:13 }}>{new Date(b.date).toLocaleDateString('en-BD',{day:'numeric',month:'short'})}</td>
                    <td style={{ padding:'12px 14px', fontFamily:MONO, fontSize:12 }}>{b.startHour}:00–{b.endHour}:00</td>
                    <td style={{ padding:'12px 14px', fontFamily:MONO, color:C.lime, fontWeight:700 }}>৳{b.amount}</td>
                    <td style={{ padding:'12px 14px', fontSize:12 }}>{b.paymentMode==='sslcommerz'?'🔒 SSLCommerz':'💵 At Venue'}</td>
                    <td style={{ padding:'12px 14px', fontSize:12 }}>
                      {b.advancePayment?.required ? (
                        <span style={{ fontWeight:700, color:
                          b.advancePayment.status==='paid'   ? '#22C55E' :
                          b.advancePayment.status==='failed' ? '#EF4444' :
                          b.advancePayment.status==='pending'? '#F59E0B' : C.muted }}>
                          {b.advancePayment.status==='paid'    ? `✅ ৳${b.advancePayment.amount}` :
                           b.advancePayment.status==='failed'  ? '✗ Failed' :
                           b.advancePayment.status==='pending' ? `⏳ ৳${b.advancePayment.amount}` : '—'}
                        </span>
                      ) : <span style={{ color:C.muted }}>—</span>}
                    </td>
                    <td style={{ padding:'12px 14px' }}><Badge status={b.status} /></td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        {b.status==='pending_payment' && (
                          <>
                            <span style={{ fontSize:11, color:'#F59E0B', fontWeight:600, alignSelf:'center' }}>Awaiting payment</span>
                            <Btn size="sm" variant="danger" disabled={!!processing} onClick={()=>{const r=window.prompt('Cancellation reason:');if(r!==null)update(b._id,'cancelled',r||'Cancelled by owner');}}>Cancel</Btn>
                          </>
                        )}
                        {b.status==='pending' && (
                          <>
                            <Btn size="sm" disabled={!!processing} onClick={()=>update(b._id,'confirmed')}>Confirm</Btn>
                            <Btn size="sm" variant="danger" disabled={!!processing} onClick={()=>{const r=window.prompt('Cancellation reason:');if(r!==null)update(b._id,'cancelled',r||'Cancelled by owner');}}>Cancel</Btn>
                          </>
                        )}
                        {b.status==='confirmed' && (
                          <>
                            <Btn size="sm" variant="success" disabled={!!processing} onClick={()=>update(b._id,'completed')}>Complete</Btn>
                            <Btn size="sm" variant="ghost" disabled={!!processing} onClick={()=>update(b._id,'no_show')}>No Show</Btn>
                            <Btn size="sm" variant="danger" disabled={!!processing} onClick={()=>{const r=window.prompt('Cancellation reason:');if(r!==null)update(b._id,'cancelled',r||'Cancelled by owner');}}>Cancel</Btn>
                          </>
                        )}
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

// ── My Grounds ─────────────────────────────────────────
function MyGrounds() {
  const [grounds, setGrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotModal, setSlotModal] = useState(null);
  const [slots, setSlots] = useState([]);
  const [msg, setMsg] = useState('');
  const [advModal, setAdvModal] = useState(null);
  const [advForm, setAdvForm] = useState({ enabled:false, amount:'', instructions:'' });
  const [imgModal, setImgModal] = useState(null); // ground for image management
  const [delConfirm, setDelConfirm] = useState(null); // ground to delete

  const load = () => {
    ownerAPI.getGrounds().then(r=>{setGrounds(r.data.grounds||[]);setLoading(false);}).catch(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const openSlots = (g) => {
    setSlotModal(g);
    setSlots(g.slots?.length > 0 ? g.slots : Array.from({length:g.closeHour-g.openHour},(_,i)=>({ startHour:g.openHour+i, endHour:g.openHour+i+1, price:g.pricePerHour, label:'', isBlocked:false })));
  };

  const openAdv = (g) => {
    setAdvModal(g);
    const a = g.advancePayment || {};
    setAdvForm({ enabled:a.enabled||false, amount:a.amount||'', instructions:a.instructions||'' });
  };

  const saveAdv = async () => {
    try {
      await ownerAPI.setAdvancePayment(advModal._id, advForm);
      setMsg('✅ Advance payment settings saved!'); setAdvModal(null); load();
    } catch (err) { setMsg(err.response?.data?.error||'Failed.'); }
  };

  const saveSlots = async () => {
    try {
      await groundAPI.updateSlots(slotModal._id, slots.map(s=>({ startHour:s.startHour, endHour:s.endHour, price:+s.price, label:s.label||`${s.startHour}:00 – ${s.endHour}:00`, isBlocked:s.isBlocked||false })));
      setMsg('✅ Slots saved!'); setSlotModal(null); load();
    } catch (err) { setMsg(err.response?.data?.error||'Failed.'); }
  };

  const removeImage = async (groundId, imageUrl) => {
    if (!window.confirm('Remove this image?')) return;
    try {
      const res = await groundAPI.removeImage(groundId, imageUrl);
      // update imgModal ground in place
      setImgModal(res.data.ground);
      load();
      setMsg('✅ Image removed.');
    } catch (err) { setMsg(err.response?.data?.error||'Failed to remove image.'); }
  };

  const uploadImages = async (groundId, files) => {
    if (!files.length) return;
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('images', f));
      const res = await groundAPI.update(groundId, fd);
      setImgModal(res.data.ground);
      load();
      setMsg('✅ Images uploaded.');
    } catch (err) { setMsg(err.response?.data?.error||'Failed to upload.'); }
  };

  const deleteGround = async (ground) => {
    try {
      await ownerAPI.deleteGround(ground._id);
      setDelConfirm(null); setMsg('✅ Ground deleted.'); load();
    } catch (err) { setDelConfirm(null); setMsg(err.response?.data?.error||'Cannot delete ground.'); }
  };

  const fmt = (h) => { const p=h>=12?'PM':'AM'; const hr=h>12?h-12:h===0?12:h; return `${hr}:00 ${p}`; };

  const { user: ownerUser } = useAuth();
  const ownerApproved = ownerUser?.isApproved === true;

  if (loading) return <Spinner />;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h1 style={{ fontFamily:SYNE, fontSize:26, fontWeight:800, margin:0 }}>My Grounds</h1>
        {ownerApproved && (
          <Link to="/owner/add" style={{ padding:'8px 20px', background:C.lime, color:'#0D0D0D', borderRadius:8, fontWeight:700, textDecoration:'none', fontSize:13 }}>+ Add Ground</Link>
        )}
      </div>
      {!ownerApproved && (
        <Alert type="info" style={{ marginBottom:16 }}>⏳ Your account is pending admin approval. You cannot add grounds yet.</Alert>
      )}
      {msg && <Alert type={msg.startsWith('✅')?'success':'error'} onClose={()=>setMsg('')}>{msg}</Alert>}
      {grounds.length===0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:C.muted }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🏟️</div>
          <div style={{ fontSize:18, marginBottom:8 }}>No grounds yet</div>
          {ownerApproved && <Link to="/owner/add" style={{ color:C.lime }}>Add your first ground →</Link>}
          {!ownerApproved && <div style={{ color:C.muted, fontSize:13 }}>Grounds will appear here once your account is approved.</div>}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {grounds.map(g=>(
            <div key={g._id} style={{ background:'#111', border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
              {/* Header row */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:14 }}>
                <div>
                  <div style={{ fontFamily:SYNE, fontWeight:700, fontSize:18 }}>{g.name}</div>
                  <div style={{ color:C.muted, fontSize:13 }}>📍 {g.city}  ·  🏅 {g.sport}  ·  ৳{g.pricePerHour}/hr</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, padding:'3px 10px', borderRadius:100, background:g.isApproved?'rgba(34,197,94,.1)':'rgba(245,158,11,.1)', color:g.isApproved?C.green:'#F59E0B', fontWeight:700 }}>
                    {g.isApproved ? '● Live' : '⏳ Pending Approval'}
                  </span>
                  <Btn size="sm" variant="ghost" onClick={() => openSlots(g)}>Manage Slots</Btn>
                  <Btn size="sm" variant={g.advancePayment?.enabled ? 'success' : 'ghost'} onClick={() => openAdv(g)}>
                    {g.advancePayment?.enabled ? `Adv. ৳${g.advancePayment.amount}` : 'Adv. Pay: OFF'}
                  </Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setImgModal(g)}>🖼 Images ({g.images?.length||0})</Btn>
                  <Btn size="sm" variant="danger" onClick={() => setDelConfirm(g)}>🗑 Delete</Btn>
                </div>
              </div>
              {/* Image thumbnails preview */}
              {g.images?.length > 0 && (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                  {g.images.slice(0,4).map((img,i)=>(
                    <img key={i} src={img} alt="" style={{ width:64, height:48, objectFit:'cover', borderRadius:6, border:`1px solid ${C.border}` }} />
                  ))}
                  {g.images.length>4 && <div style={{ width:64, height:48, borderRadius:6, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', color:C.muted, fontSize:12 }}>+{g.images.length-4}</div>}
                </div>
              )}
              {/* Slots preview */}
              {g.slots?.length > 0 && (
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {g.slots.slice(0,6).map((s,i)=>(
                    <span key={i} style={{ fontSize:11, padding:'3px 10px', borderRadius:6, background: s.isBlocked?'rgba(239,68,68,.08)':C.card, color: s.isBlocked?C.red:C.muted, border:`1px solid ${s.isBlocked?'rgba(239,68,68,.2)':C.border}`, textDecoration: s.isBlocked?'line-through':'none' }}>
                      {fmt(s.startHour)}–{fmt(s.endHour)} · ৳{s.price}
                    </span>
                  ))}
                  {g.slots.length > 6 && <span style={{ fontSize:11, color:C.muted }}>+{g.slots.length-6} more</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────── */}
      {delConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:C.card, border:`1px solid #EF4444`, borderRadius:16, padding:28, width:'100%', maxWidth:400, textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🗑️</div>
            <h3 style={{ margin:'0 0 8px', fontFamily:SYNE, fontSize:18, color:'#EF4444' }}>Delete Ground?</h3>
            <p style={{ color:C.muted, fontSize:14, marginBottom:20 }}>
              You are about to permanently delete <strong style={{ color:C.text }}>{delConfirm.name}</strong>.<br/>
              All past booking records will remain. Active bookings must be cancelled first.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>deleteGround(delConfirm)} style={{ flex:1, padding:'10px', background:'#EF4444', color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>Yes, Delete</button>
              <button onClick={()=>setDelConfirm(null)} style={{ flex:1, padding:'10px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, cursor:'pointer', fontSize:13 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Management Modal ────────────────────── */}
      {imgModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width:'100%', maxWidth:560, maxHeight:'85vh', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ margin:0, fontFamily:SYNE, fontSize:18 }}>Images — {imgModal.name}</h3>
              <button onClick={()=>setImgModal(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer' }}>×</button>
            </div>
            <div style={{ overflowY:'auto', flex:1 }}>
              {imgModal.images?.length === 0 && (
                <div style={{ textAlign:'center', padding:'24px 0', color:C.muted, fontSize:14 }}>No images yet. Upload some below.</div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                {(imgModal.images||[]).map((img,i)=>(
                  <div key={i} style={{ position:'relative', borderRadius:8, overflow:'hidden', border:`1px solid ${C.border}` }}>
                    <img src={img} alt="" style={{ width:'100%', height:100, objectFit:'cover', display:'block' }} />
                    <button
                      onClick={()=>removeImage(imgModal._id, img)}
                      style={{ position:'absolute', top:4, right:4, background:'rgba(239,68,68,.9)', border:'none', borderRadius:4, color:'#fff', fontSize:11, padding:'2px 7px', cursor:'pointer', fontWeight:700 }}
                    >✕</button>
                  </div>
                ))}
              </div>
              <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:16 }}>
                <label style={{ display:'block', fontSize:12, color:C.muted, marginBottom:8 }}>Upload new images (max 8 total, 5MB each)</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={e => uploadImages(imgModal._id, e.target.files)}
                  style={{ fontSize:13, color:C.text }}
                />
              </div>
            </div>
            <div style={{ marginTop:16 }}>
              <Btn variant="ghost" onClick={()=>setImgModal(null)} style={{ width:'100%' }}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Advance Payment Settings Modal ───────────── */}
      {advModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.82)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:16, padding:28, width:'100%', maxWidth:460 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ margin:0, fontFamily:SYNE, fontSize:18 }}>Advance Payment — {advModal.name}</h3>
              <button onClick={()=>setAdvModal(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer' }}>×</button>
            </div>
            <Alert type="info" style={{ marginBottom:14 }}>
              🔒 Advance payments are collected via SSLCommerz (card/mobile banking). Players pay securely before the booking is confirmed.
            </Alert>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:advForm.enabled?'rgba(34,197,94,.07)':'rgba(255,255,255,.03)', border:'1px solid '+(advForm.enabled?'rgba(34,197,94,.25)':C.border), borderRadius:9, marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:600, fontSize:14 }}>{advForm.enabled ? 'Enabled' : 'Disabled'}</div>
                <div style={{ fontSize:12, color:C.muted }}>Require players to pay advance via SSLCommerz before booking is confirmed</div>
              </div>
              <button onClick={()=>setAdvForm(p=>({...p,enabled:!p.enabled}))} style={{ width:44, height:24, borderRadius:12, background:advForm.enabled?C.lime:C.border, border:'none', cursor:'pointer', position:'relative', transition:'background .2s' }}>
                <div style={{ position:'absolute', top:3, left:advForm.enabled?23:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s' }} />
              </button>
            </div>
            {advForm.enabled && (
              <>
                <div style={{ marginBottom:12 }}>
                  <label style={{ display:'block', fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, marginBottom:5 }}>Advance Amount (BDT) *</label>
                  <input value={advForm.amount} onChange={e=>setAdvForm(p=>({...p,amount:e.target.value}))} placeholder="e.g. 200" type="number"
                    style={{ width:'100%', padding:'9px 14px', background:'#141414', border:'1px solid '+C.border, borderRadius:8, color:C.text, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:"'Space Mono',monospace" }} />
                  <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>Player will be redirected to SSLCommerz gateway to pay this amount. Booking confirms automatically on success.</div>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, marginBottom:5 }}>Custom Instructions (optional)</label>
                  <textarea value={advForm.instructions} onChange={e=>setAdvForm(p=>({...p,instructions:e.target.value}))} placeholder="e.g. Advance payment required to secure your slot."
                    rows={2} style={{ width:'100%', padding:'9px 12px', background:'#141414', border:'1px solid '+C.border, borderRadius:8, color:C.text, fontSize:13, outline:'none', boxSizing:'border-box', resize:'vertical', fontFamily:"'DM Sans',sans-serif" }} />
                </div>
              </>
            )}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={saveAdv} style={{ flex:1, padding:'10px', background:C.lime, color:'#0D0D0D', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>Save Settings</button>
              <button onClick={()=>setAdvModal(null)} style={{ padding:'10px 18px', background:'transparent', border:'1px solid '+C.border, borderRadius:8, color:C.muted, cursor:'pointer', fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Slot manager modal ────────────────────────── */}
      {slotModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width:'100%', maxWidth:560, maxHeight:'85vh', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ margin:0, fontFamily:SYNE, fontSize:18 }}>Manage Slots — {slotModal.name}</h3>
              <button onClick={()=>setSlotModal(null)} style={{ background:'none', border:'none', color:C.muted, fontSize:22, cursor:'pointer' }}>×</button>
            </div>
            <div style={{ overflowY:'auto', flex:1 }}>
              <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>Click "Block" to make a slot unavailable. Set custom prices per slot.</div>
              {slots.map((s,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontFamily:MONO, fontSize:12, minWidth:110, color: s.isBlocked?C.red:C.text }}>{fmt(s.startHour)} – {fmt(s.endHour)}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:12, color:C.muted }}>৳</span>
                    <input type="number" value={s.price} onChange={e=>setSlots(prev=>prev.map((x,j)=>j===i?{...x,price:e.target.value}:x))} disabled={s.isBlocked}
                      style={{ width:70, padding:'4px 8px', background:'#141414', border:`1px solid ${C.border}`, borderRadius:6, color:C.text, fontSize:12, outline:'none', fontFamily:MONO }} />
                  </div>
                  <button onClick={()=>setSlots(prev=>prev.map((x,j)=>j===i?{...x,isBlocked:!x.isBlocked}:x))}
                    style={{ padding:'4px 12px', borderRadius:6, border:`1px solid ${s.isBlocked?'rgba(34,197,94,.4)':'rgba(239,68,68,.3)'}`, background:'transparent', color:s.isBlocked?C.green:C.red, fontSize:11, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    {s.isBlocked ? '✓ Unblock' : '✕ Block'}
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <Btn onClick={saveSlots} style={{ flex:1 }}>Save Slots</Btn>
              <Btn variant="ghost" onClick={()=>setSlotModal(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Ground ─────────────────────────────────────────
function AddGround() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:'', sport:'badminton', city:'', area:'', address:'', description:'', pricePerHour:'', amenities:[], openHour:'6', closeHour:'23', lat:'', lng:'' });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const AMENITIES = ['AC','Parking','Washroom','Changing Room','Cafe','WiFi','Floodlights'];
  const inp = { width:'100%', padding:'10px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box', marginBottom:14 };
  const lbl = { display:'block', fontSize:11, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:.5, marginBottom:5 };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name||!form.sport||!form.city||!form.pricePerHour) { setError('Name, sport, city, and price are required.'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => {
        if (k==='amenities') fd.append(k, v.join(','));
        else if (k==='lat'||k==='lng') { /* skip — handled below */ }
        else fd.append(k,v);
      });
      if (form.lat && form.lng) {
        fd.append('lat', form.lat);
        fd.append('lng', form.lng);
      }
      Array.from(images).forEach(f => fd.append('images', f));
      await groundAPI.create(fd);
      navigate('/owner/grounds');
    } catch (err) { setError(err.response?.data?.error||'Failed to create ground.'); }
    setLoading(false);
  };

  return (
    <div>
      <h1 style={{ fontFamily:SYNE, fontSize:26, fontWeight:800, marginBottom:24, marginTop:0 }}>Add New Ground</h1>
      <Alert type="info">After submitting, your facility will be reviewed by admin before going live.</Alert>
      <div style={{ background:'#111', border:`1px solid ${C.border}`, borderRadius:12, padding:28, maxWidth:700 }}>
        {error && <Alert type="error" onClose={()=>setError('')}>{error}</Alert>}
        <form onSubmit={submit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ gridColumn:'1/-1' }}><label style={lbl}>Facility Name *</label><input style={inp} placeholder="Arena Sports Complex" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></div>
            <div>
              <label style={lbl}>Sport *</label>
              <select style={inp} value={form.sport} onChange={e=>setForm({...form,sport:e.target.value})}>
                {['badminton','futsal','basketball','tennis','volleyball'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Price per Hour (৳) *</label><input style={inp} type="number" placeholder="400" value={form.pricePerHour} onChange={e=>setForm({...form,pricePerHour:e.target.value})} required /></div>
            <div><label style={lbl}>City *</label><input style={inp} placeholder="Dhaka" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} required /></div>
            <div><label style={lbl}>Area</label><input style={inp} placeholder="Gulshan" value={form.area} onChange={e=>setForm({...form,area:e.target.value})} /></div>
            <div style={{ gridColumn:'1/-1' }}><label style={lbl}>Full Address</label><input style={inp} placeholder="Building, Road, Thana" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} /></div>
            <div style={{ gridColumn:'1/-1' }}><label style={lbl}>Description</label><textarea style={{ ...inp, height:80, resize:'vertical' }} placeholder="Describe your facility..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></div>
            <div><label style={lbl}>Open Hour</label>
              <select style={inp} value={form.openHour} onChange={e=>setForm({...form,openHour:e.target.value})}>
                {Array.from({length:24},(_,i)=><option key={i} value={i}>{i}:00</option>)}
              </select>
            </div>
            <div><label style={lbl}>Close Hour</label>
              <select style={inp} value={form.closeHour} onChange={e=>setForm({...form,closeHour:e.target.value})}>
                {Array.from({length:24},(_,i)=><option key={i} value={i}>{i}:00</option>)}
              </select>
            </div>
            <div><label style={lbl}>Latitude (optional)</label><input style={inp} placeholder="23.8103" value={form.lat} onChange={e=>setForm({...form,lat:e.target.value})} /></div>
            <div><label style={lbl}>Longitude (optional)</label><input style={inp} placeholder="90.4125" value={form.lng} onChange={e=>setForm({...form,lng:e.target.value})} /></div>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={lbl}>Amenities</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {AMENITIES.map(a=>(
                <button key={a} type="button" onClick={()=>setForm(p=>({...p,amenities:p.amenities.includes(a)?p.amenities.filter(x=>x!==a):[...p.amenities,a]}))}
                  style={{ padding:'6px 14px', borderRadius:100, border:`1px solid ${form.amenities.includes(a)?C.lime:C.border}`, background:form.amenities.includes(a)?'rgba(200,245,0,.07)':'transparent', color:form.amenities.includes(a)?C.lime:C.muted, fontSize:12, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={lbl}>Ground Photos (up to 8)</label>
            <input type="file" multiple accept="image/*" onChange={e=>setImages(e.target.files)}
              style={{ fontSize:13, color:C.text }} />
            {images.length>0 && <div style={{ fontSize:12, color:C.muted, marginTop:6 }}>{images.length} file(s) selected</div>}
          </div>
          <Btn type="submit" size="lg" disabled={loading}>{loading?'Creating…':'Submit for Approval'}</Btn>
        </form>
      </div>
    </div>
  );
}

// ── Analytics ──────────────────────────────────────────
function Analytics() {
  const [data, setData] = useState(null);
  useEffect(() => { ownerAPI.getAnalytics().then(r=>setData(r.data)).catch(()=>{}); }, []);
  if (!data) return <Spinner />;

  const monthly = data.monthly || [];
  const bySport = data.bySport || [];
  const maxRev  = Math.max(...monthly.map(m => m.revenue), 1);
  const SPORT_COLORS = { badminton:'#C8F500', futsal:'#3B82F6', basketball:'#F59E0B', tennis:'#22C55E', volleyball:'#EF4444' };

  return (
    <div>
      <h1 style={{ fontFamily:SYNE, fontSize:26, fontWeight:800, marginBottom:24, marginTop:0 }}>Analytics</h1>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div style={{ background:'#111', border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
          <div style={{ fontFamily:SYNE, fontWeight:700, marginBottom:20, fontSize:15 }}>Monthly Revenue ({new Date().getFullYear()})</div>
          <div style={{ display:'flex', gap:5, alignItems:'flex-end', height:160 }}>
            {monthly.map(m => (
              <div key={m.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                {m.revenue > 0 && (
                  <div style={{ fontSize:9, color:C.muted, fontFamily:MONO, whiteSpace:'nowrap' }}>
                    ৳{m.revenue >= 1000 ? (m.revenue/1000).toFixed(1)+'k' : m.revenue}
                  </div>
                )}
                <div style={{
                  width:'100%',
                  height: Math.max((m.revenue / maxRev) * 130, m.revenue > 0 ? 4 : 2) + 'px',
                  background: m.revenue > 0 ? C.lime : C.border,
                  borderRadius:'3px 3px 0 0',
                  transition:'height .3s',
                }} />
                <div style={{ fontSize:9, color:C.muted }}>{m.month}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:'#111', border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
          <div style={{ fontFamily:SYNE, fontWeight:700, marginBottom:16, fontSize:15 }}>Revenue by Sport</div>
          {bySport.length === 0 ? (
            <div style={{ color:C.muted, fontSize:13, paddingTop:16 }}>No confirmed bookings yet.</div>
          ) : bySport.map((s) => {
            const maxS = Math.max(...bySport.map(x => x.revenue), 1);
            const pct  = Math.round((s.revenue / maxS) * 100);
            const color = SPORT_COLORS[s._id] || C.lime;
            return (
              <div key={s._id} style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:13, textTransform:'capitalize', fontWeight:600 }}>{s._id}</span>
                  <span style={{ fontFamily:MONO, fontSize:12, color }}>৳{s.revenue.toLocaleString()} · {s.count} bookings</span>
                </div>
                <div style={{ height:8, background:C.border, borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:pct+'%', background:color, borderRadius:4, transition:'width .4s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Not Approved Banner ────────────────────────────────
function NotApprovedBanner() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 24px', textAlign:'center' }}>
      <div style={{ fontSize:56, marginBottom:16 }}>⏳</div>
      <h2 style={{ fontFamily:SYNE, fontSize:22, fontWeight:800, marginBottom:10, marginTop:0 }}>Account Pending Approval</h2>
      <p style={{ color:C.muted, fontSize:14, maxWidth:380, lineHeight:1.7, marginBottom:24 }}>
        Your owner account is awaiting admin approval. Once approved, you can add grounds and start receiving bookings.
      </p>
      <div style={{ padding:'12px 20px', background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.25)', borderRadius:10, fontSize:13, color:'#F59E0B', fontWeight:600 }}>
        Please check back later or contact the admin.
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────
export default function OwnerDashboard() {
  const { user } = useAuth();
  const isApproved = user?.isApproved === true;

  return (
    <div style={{ display:'flex', background:C.bg, color:C.text, minHeight:'calc(100vh - 60px)' }}>
      <Sidebar isApproved={isApproved} />
      <main style={{ flex:1, padding:'32px 36px', overflow:'auto' }}>
        {!isApproved && (
          <Alert type="info" style={{ marginBottom:20 }}>
            ⏳ Your account is awaiting admin approval. You can view your dashboard but cannot add grounds until approved.
          </Alert>
        )}
        <Routes>
          <Route path="/"          element={<Overview />} />
          <Route path="/bookings"  element={<BookingsManager />} />
          <Route path="/grounds"   element={<MyGrounds />} />
          <Route path="/add"       element={isApproved ? <AddGround /> : <NotApprovedBanner />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/*"         element={<Overview />} />
        </Routes>
      </main>
    </div>
  );
}
