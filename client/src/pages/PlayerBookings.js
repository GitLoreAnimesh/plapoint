import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef } from 'react';
import { bookingAPI, paymentAPI } from '../services/api';
import { subscribeToBookingUpdates } from '../store/authStore';
import { C, SYNE, MONO, Badge, Btn, Spinner, Modal, Alert, Stars } from '../components/ui';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [tab, setTab] = useState('all');
  const [reviewModal, setReviewModal] = useState(null);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [msg, setMsg] = useState('');

  const payNow = async (bookingId) => {
    try {
      const res = await paymentAPI.initiate(bookingId);
      window.location.href = res.data.gatewayUrl;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not connect to payment gateway.');
    }
  };

  const payAdvanceNow = async (bookingId) => {
    try {
      const res = await paymentAPI.initiateAdvance(bookingId);
      window.location.href = res.data.gatewayUrl;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not initiate advance payment.');
    }
  };

  const tabRef = useRef('all');

  const load = (status) => {
    tabRef.current = status;
    setLoading(true);
    const p = status !== 'all' ? { status } : {};
    bookingAPI.my(p)
      .then(r => { setBookings(r.data.bookings || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(tab); }, [tab]);

  // Real-time updates — when owner confirms/cancels, update instantly
  useEffect(() => {
    const unsubscribe = subscribeToBookingUpdates((payload) => {
      setBookings(prev => {
        const idx = prev.findIndex(b => b._id === payload.bookingId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status: payload.status, cancelledBy: payload.cancelledBy };
        // Remove from list if we're filtered and status no longer matches
        if (tabRef.current !== 'all' && payload.status !== tabRef.current) {
          updated.splice(idx, 1);
        }
        return updated;
      });
      // Show a toast so the player knows something changed
      if (payload.status === 'confirmed') toast.success('Your booking has been confirmed by the owner!');
      if (payload.status === 'cancelled' && payload.cancelledBy === 'owner') toast.error('Your booking was cancelled by the owner.');
      if (payload.status === 'cancelled' && payload.cancelledBy === 'system') toast.error('Your booking expired due to timeout.');
    });
    return unsubscribe;
  }, []); // eslint-disable-line

  const cancel = async (id) => {
    const reason = window.prompt('Reason for cancelling (optional):');
    if (reason === null) return;
    try { await bookingAPI.cancel(id, reason || 'Cancelled by player'); load(tab); setMsg('Booking cancelled.'); }
    catch (err) { setMsg(err.response?.data?.error || 'Failed to cancel.'); }
  };

  const submitReview = async () => {
    try {
      await bookingAPI.review(reviewModal._id, review);
      setReviewModal(null); setMsg('✅ Review submitted!'); load(tab);
    } catch (err) { setMsg(err.response?.data?.error || 'Failed.'); }
  };

  const TABS = [['all','All'],['pending','Pending'],['confirmed','Confirmed'],['completed','Completed'],['cancelled','Cancelled']];
  const tab_s = { padding:'7px 18px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontSize:13, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontWeight:500, transition:'all .15s' };
  const tab_a = { background:C.card, color:C.text, borderColor:'#444' };

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>
      <h1 style={{ fontFamily:SYNE, fontSize:28, fontWeight:800, marginBottom:24, marginTop:0 }}>My Bookings</h1>
      {msg && <Alert type={msg.startsWith('✅')?'success':'error'} onClose={() => setMsg('')}>{msg}</Alert>}

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24 }}>
        {TABS.map(([v,l]) => <button key={v} onClick={() => setTab(v)} style={{ ...tab_s, ...(tab===v?tab_a:{}) }}>{l}</button>)}
      </div>

      {loading ? <Spinner /> : bookings.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:C.muted }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:18 }}>No bookings yet</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {bookings.map((b, i) => (
            <div key={b._id} className="card-glass animate-fade-in" style={{ animationDelay: `${i * 0.05}s`, borderRadius:12, padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:SYNE, fontWeight:700, fontSize:16, marginBottom:4 }}>{b.groundName}</div>
                  <div style={{ color:C.muted, fontSize:12, marginBottom:10 }}>📍 {b.city}  ·  🏅 {b.sport}</div>
                  <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                    <div><span style={{ fontSize:11, color:C.muted }}>Date  </span><span style={{ fontSize:13, fontWeight:600 }}>{new Date(b.date).toLocaleDateString('en-BD',{weekday:'short',day:'numeric',month:'short'})}</span></div>
                    <div><span style={{ fontSize:11, color:C.muted }}>Time  </span><span style={{ fontSize:13, fontWeight:600 }}>{b.startHour}:00 – {b.endHour}:00</span></div>
                    <div>
                      <span style={{ fontSize:11, color:C.muted }}>Pay  </span>
                      <span style={{ fontSize:13, fontWeight:600 }}>
                        {b.paymentMode === 'sslcommerz' ? '🔒 SSLCommerz' : '💵 At Venue'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize:11, color:C.muted }}>Payment  </span>
                      <span style={{ fontSize:12, fontWeight:700, color:
                        b.paymentStatus === 'paid'      ? '#22C55E' :
                        b.paymentStatus === 'failed'    ? '#EF4444' :
                        b.paymentStatus === 'cancelled' ? '#6B7280' :
                        b.paymentStatus === 'pending'   ? '#F59E0B' : C.muted
                      }}>
                        {b.paymentStatus?.toUpperCase() || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
                  <Badge status={b.status} />
                  <div style={{ fontFamily:MONO, fontWeight:700, fontSize:18, color:C.lime }}>৳{b.amount}</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
                    {/* Full gateway payment */}
                    {b.status === 'pending_payment' && b.paymentMode === 'sslcommerz' && b.paymentStatus !== 'paid' && (
                      <Btn size="sm" onClick={() => payNow(b._id)} style={{ background:'#3B82F6', color:'#fff', border:'none' }}>💳 Complete Payment</Btn>
                    )}
                    {b.status === 'pending' && b.paymentMode === 'sslcommerz' && b.paymentStatus === 'paid' && (
                      <span style={{ fontSize:11, color:'#22C55E', fontWeight:700, padding:'3px 8px', borderRadius:5, background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.25)' }}>✓ Paid — Awaiting Confirmation</span>
                    )}
                    {/* Advance payment via gateway */}
                    {b.advancePayment?.required && b.advancePayment.status === 'pending' && (
                      <Btn size="sm" onClick={() => payAdvanceNow(b._id)} style={{ background:'#7C3AED', color:'#fff', border:'none' }}>💳 Pay Advance ৳{b.advancePayment.amount}</Btn>
                    )}
                    {['pending','confirmed'].includes(b.status) && (
                      <Btn variant="danger" size="sm" onClick={() => cancel(b._id)}>Cancel</Btn>
                    )}
                    {b.status === 'completed' && !b.review?.rating && (
                      <Btn variant="ghost" size="sm" onClick={() => setReviewModal(b)}>⭐ Review</Btn>
                    )}
                  </div>
                </div>
              </div>

              {/* Cancellation reason */}
              {b.status === 'cancelled' && b.cancelReason && (
                <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.15)', borderRadius:8 }}>
                  <div style={{ fontSize:11, color:'#EF4444', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:3 }}>
                    Cancelled by {b.cancelledBy}
                  </div>
                  <div style={{ fontSize:13, color:'#9CA3AF' }}>Reason: {b.cancelReason}</div>
                </div>
              )}

              {/* Gateway payment details */}
              {b.paymentMode === 'sslcommerz' && b.sslPayment?.tranId && (
                <div style={{ marginTop:10, padding:'10px 14px', borderRadius:8,
                  background: b.paymentStatus === 'paid' ? 'rgba(34,197,94,.07)' : b.paymentStatus === 'failed' ? 'rgba(239,68,68,.07)' : 'rgba(59,130,246,.07)',
                  border: '1px solid ' + (b.paymentStatus === 'paid' ? 'rgba(34,197,94,.2)' : b.paymentStatus === 'failed' ? 'rgba(239,68,68,.2)' : 'rgba(59,130,246,.2)'),
                }}>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:4,
                    color: b.paymentStatus === 'paid' ? '#22C55E' : b.paymentStatus === 'failed' ? '#EF4444' : '#60A5FA' }}>
                    {b.paymentStatus === 'paid' && b.status === 'confirmed' ? '✓ Payment Confirmed' :
                     b.paymentStatus === 'paid' && b.status === 'pending'    ? '✓ Payment Received — Awaiting Owner Confirmation' :
                     b.paymentStatus === 'failed'  ? '✕ Payment Failed' : '⏳ Payment Pending'}
                  </div>
                  {b.sslPayment.paidAt && (
                    <div style={{ fontSize:12, color:'#9CA3AF' }}>
                      Paid at: {new Date(b.sslPayment.paidAt).toLocaleString()} · ৳{b.sslPayment.amount}
                    </div>
                  )}
                </div>
              )}

              {/* Advance payment status */}
              {b.advancePayment?.required && (
                <div style={{ marginTop:10, padding:'10px 14px', borderRadius:8,
                  background: b.advancePayment.status==='paid'    ? 'rgba(34,197,94,.07)'  :
                              b.advancePayment.status==='failed'  ? 'rgba(239,68,68,.07)'  :
                              b.advancePayment.status==='pending' ? 'rgba(124,58,237,.07)' : 'transparent',
                  border: '1px solid ' + (
                    b.advancePayment.status==='paid'    ? 'rgba(34,197,94,.2)'  :
                    b.advancePayment.status==='failed'  ? 'rgba(239,68,68,.2)'  :
                    b.advancePayment.status==='pending' ? 'rgba(124,58,237,.3)' : C.border),
                }}>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:2,
                    color: b.advancePayment.status==='paid'    ? '#22C55E' :
                           b.advancePayment.status==='failed'  ? '#EF4444' :
                           b.advancePayment.status==='pending' ? '#A78BFA' : C.muted }}>
                    {b.advancePayment.status==='paid'             ? '✓ Advance Payment Paid'    :
                     b.advancePayment.status==='failed'           ? '✕ Advance Payment Failed'  :
                     b.advancePayment.status==='pending'          ? '⏳ Advance Payment Required' : '—'}
                  </div>
                  <div style={{ fontSize:12, color:'#9CA3AF' }}>Amount: ৳{b.advancePayment.amount}
                    {b.advancePayment.paidAt && ` · Paid at: ${new Date(b.advancePayment.paidAt).toLocaleString()}`}
                  </div>
                </div>
              )}

              {/* Owner contact */}
              {['pending','confirmed'].includes(b.status) && b.ground?.owner && (
                <div style={{ marginTop:10, padding:'10px 14px', background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.15)', borderRadius:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#60A5FA', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Owner Contact</div>
                  <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                    <div><span style={{ fontSize:12, color:'#9CA3AF' }}>Name: </span><span style={{ fontSize:12, fontWeight:600 }}>{b.ground.owner.name}</span></div>
                    {b.ground.owner.phone && <div><span style={{ fontSize:12, color:'#9CA3AF' }}>Phone: </span><a href={'tel:'+b.ground.owner.phone} style={{ fontSize:12, fontWeight:700, color:'#C8F500', textDecoration:'none', fontFamily:"'Space Mono',monospace" }}>{b.ground.owner.phone}</a></div>}
                    {b.ground.owner.email && <div><span style={{ fontSize:12, color:'#9CA3AF' }}>Email: </span><a href={'mailto:'+b.ground.owner.email} style={{ fontSize:12, color:'#93C5FD', textDecoration:'none' }}>{b.ground.owner.email}</a></div>}
                  </div>
                </div>
              )}

              {/* Review */}
              {b.review?.rating && (
                <div style={{ marginTop:12, padding:'10px 14px', background:'#141414', borderRadius:8, borderTop:`1px solid ${C.border}` }}>
                  <Stars rating={b.review.rating} size={14} />
                  {b.review.comment && <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{b.review.comment}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {reviewModal && (
        <Modal title="Rate Your Experience" onClose={() => setReviewModal(null)}>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontWeight:600, marginBottom:4 }}>{reviewModal.groundName}</div>
            <div style={{ fontSize:12, color:C.muted }}>{new Date(reviewModal.date).toDateString()}</div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, color:C.muted, marginBottom:8, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Rating</label>
            <Stars rating={review.rating} onSelect={(r) => setReview({...review, rating:r})} size={28} />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:12, color:C.muted, marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Comment (optional)</label>
            <textarea value={review.comment} onChange={e => setReview({...review, comment:e.target.value})} placeholder="How was the facility?" rows={3}
              style={{ width:'100%', padding:'10px 14px', background:'#141414', border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:14, fontFamily:"'DM Sans',sans-serif", resize:'vertical', outline:'none', boxSizing:'border-box' }} />
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Btn onClick={submitReview} style={{ flex:1 }}>Submit Review</Btn>
            <Btn variant="ghost" onClick={() => setReviewModal(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
