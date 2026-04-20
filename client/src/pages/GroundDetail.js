import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { groundAPI, bookingAPI, paymentAPI, IMAGE_BASE_URL } from '../services/api';
import useAuth, { subscribeToBookingUpdates } from '../store/authStore';
import { C, SYNE, MONO, Spinner, Alert, Btn, Modal, SPORT_EMOJI } from '../components/ui';

// ── Slot Grid 
function SlotGrid({ ground, date, onBook }) {
  const [booked,   setBooked]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!date) return;
    
    const fetchAvail = () => {
      groundAPI.getAvailability(ground._id, date)
        .then(r => setBooked(r.data.booked || []))
        .catch(() => {});
    };

    setLoading(true); setSelected(null);
    fetchAvail();
    setLoading(false);

    // Completely refetch slots live if anyone triggers event
    const unsub = subscribeToBookingUpdates((payload) => {
      if (payload.groundId === ground._id) fetchAvail();
    });
    return () => unsub();
  }, [date, ground._id]);

  const slots = ground.slots?.length > 0
    ? ground.slots.filter(s => !s.isBlocked)
    : Array.from({ length: ground.closeHour - ground.openHour }, (_, i) => ({
        _id: 'a' + i, startHour: ground.openHour + i,
        endHour: ground.openHour + i + 1, price: ground.pricePerHour,
      }));

  const getSlotBooking = (s) => booked.find(b => b.startHour < s.endHour && b.endHour > s.startHour);
  const isPast   = (s) => {
    const d = new Date(date), now = new Date();
    if (d.toDateString() !== now.toDateString()) return d < now;
    return s.startHour <= now.getHours();
  };
  const fmt = (h) => {
    const p = h >= 12 ? 'PM' : 'AM', hr = h > 12 ? h - 12 : h || 12;
    return hr + ':00 ' + p;
  };

  if (loading) return <Spinner size={24} />;
  if (!date)   return <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: 13 }}>Select a date to see slots</div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 7 }}>
        {slots.map(s => {
          const bookingRecord = getSlotBooking(s);
          const past = isPast(s);
          const isUnderPayment = bookingRecord?.status === 'pending_payment';
          const taken = !!bookingRecord && !isUnderPayment;
          const blocked = taken || past || isUnderPayment;
          const isSel = selected?.startHour === s.startHour && selected?.endHour === s.endHour;

          // Compute styles
          let borderColor = isSel ? C.lime : C.border;
          let bgColor = 'rgba(255,255,255,.02)';
          let textColor = C.text;
          let bottomText = '৳' + s.price;
          let bottomColor = C.muted;

          if (taken) {
            borderColor = 'transparent';
            bgColor = 'rgba(239,68,68,.07)';
            textColor = '#EF4444';
            bottomText = 'Booked';
            bottomColor = '#EF4444';
          } else if (isUnderPayment) {
            borderColor = 'transparent';
            bgColor = 'rgba(245,158,11,.08)';
            textColor = '#F59E0B';
            bottomText = 'Locked';
            bottomColor = '#F59E0B';
          } else if (past) {
            textColor = C.border;
            bottomText = 'Past';
          } else if (isSel) {
            bgColor = 'rgba(200,245,0,.1)';
            textColor = C.lime;
            bottomColor = C.lime;
          }

          return (
            <button key={s._id} disabled={blocked} onClick={() => setSelected(isSel ? null : s)} title={isUnderPayment ? "Another player is currently paying for this slot" : ""} style={{
              padding: '9px 6px', borderRadius: 8, border: '1.5px solid ' + borderColor, background: bgColor, color: textColor,
              cursor: blocked ? 'default' : 'pointer', opacity: past ? .35 : 1, transition: 'all .12s',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 3 }}>{fmt(s.startHour)} – {fmt(s.endHour)}</div>
              <div style={{ fontSize: 11, fontFamily: MONO, color: bottomColor }}>{bottomText}</div>
            </button>
          );
        })}
      </div>
      {selected && !getSlotBooking(selected) && (
        <div style={{ marginTop: 14, padding: 14, background: 'rgba(200,245,0,.06)', border: '1px solid rgba(200,245,0,.2)', borderRadius: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{fmt(selected.startHour)} – {fmt(selected.endHour)}</div>
          <div style={{ fontFamily: MONO, color: C.lime, fontSize: 20, fontWeight: 700, marginBottom: 12 }}>৳{selected.price}</div>
          <Btn onClick={() => onBook(selected)}>Proceed to Booking →</Btn>
        </div>
      )}
    </div>
  );
}

// ── Gateway Redirect Overlay 
function PaymentRedirectOverlay() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,13,13,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.lime, animation: 'spin .7s linear infinite', marginBottom: 24 }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontFamily: SYNE, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Redirecting to Payment Gateway</div>
      <div style={{ color: C.muted, fontSize: 14 }}>Please do not close this window…</div>
      <div style={{ marginTop: 32, padding: '12px 20px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, color: C.muted, textAlign: 'center', maxWidth: 340 }}>
        You will be redirected to a <strong style={{ color: C.lime }}>SSLCommerz secure payment page</strong>. Supports card and mobile banking.
      </div>
    </div>
  );
}

// ── Main Page 
export default function GroundDetailPage() {
  const { id }               = useParams();
  const { user }             = useAuth();
  const navigate             = useNavigate();
  const [searchParams]       = useSearchParams();

  const [ground,   setGround]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [date,     setDate]     = useState('');
  const [imgIdx,   setImgIdx]   = useState(0);

  const [bookModal,   setBookModal]   = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [bookError,   setBookError]   = useState('');
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    groundAPI.getOne(id)
      .then(r => { setGround(r.data.ground); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  // Handle return from gateway
  useEffect(() => {
    const paymentResult = searchParams.get('payment');
    const bookingId     = searchParams.get('bookingId');
    if (!paymentResult) return;
    if (paymentResult === 'success' && bookingId) {
      toast.success('Payment received! Awaiting owner confirmation.');
      navigate('/bookings', { replace: true });
    } else if (paymentResult === 'advance_success') {
      toast.success('Advance payment confirmed! Booking is now active.');
      navigate('/bookings', { replace: true });
    } else if (paymentResult === 'failed') {
      toast.error('Payment failed. Please try again.');
    } else if (paymentResult === 'cancelled') {
      toast('Payment cancelled.', { icon: 'ℹ️' });
    }
  }, []);
  const today = new Date().toISOString().split('T')[0];
  const adv   = ground?.advancePayment;
  const owner = ground?.owner;

  const handleBook = async (slot) => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'player') { setBookError('Only players can book slots.'); return; }
    setSubmitting(true); setBookError('');

    try {
      const res = await bookingAPI.create({
        groundId: id, date,
        startHour: slot.startHour, endHour: slot.endHour,
        paymentMode: 'pay_at_venue',
      });
      const booking = res.data.booking;

      if (adv?.enabled) {
        setBookModal(null);
        setSubmitting(false);
        toast('Booking created! Please pay the advance to confirm your slot.', { icon: '⚡' });
        try {
          setRedirecting(true);
          const payRes = await paymentAPI.initiateAdvance(booking._id);
          window.location.href = payRes.data.gatewayUrl;
        } catch (err) {
          setRedirecting(false);
          navigate('/bookings');
        }
      } else {
        setBookModal(null);
        setSubmitting(false);
        toast.success('Booking created! Owner will confirm shortly.');
        navigate('/bookings');
      }
    } catch (err) {
      setBookError(err.response?.data?.error || 'Booking failed. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 60 }}><Spinner /></div>;
  if (!ground) return <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Ground not found.</div>;

  const imgs = ground.images || [];

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 24px' }}>
      {redirecting && <PaymentRedirectOverlay />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 385px', gap: 28, alignItems: 'start' }}>

        {/* ── LEFT ─────────────────────────────────────── */}
        <div>
          {/* Gallery */}
          <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 22, position: 'relative', height: 290, background: C.card }}>
            {imgs.length > 0
              ? <img src={IMAGE_BASE_URL + imgs[imgIdx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>{SPORT_EMOJI[ground.sport] || '🏟️'}</div>}
            {imgs.length > 1 && (
              <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
                {imgs.map((_, i) => <button key={i} onClick={() => setImgIdx(i)} style={{ width: i === imgIdx ? 18 : 7, height: 7, borderRadius: 4, background: i === imgIdx ? C.lime : 'rgba(255,255,255,.3)', border: 'none', cursor: 'pointer', transition: 'all .2s' }} />)}
              </div>
            )}
          </div>

          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <h1 style={{ fontFamily: SYNE, fontSize: 26, fontWeight: 800, margin: '0 0 5px' }}>{ground.name}</h1>
              <div style={{ color: C.muted, fontSize: 13 }}>📍 {ground.area ? ground.area + ', ' : ''}{ground.city} · {SPORT_EMOJI[ground.sport]} {ground.sport}</div>
            </div>
            {ground.rating > 0 && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: '#F59E0B' }}>★ {ground.rating}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{ground.totalReviews} reviews</div>
              </div>
            )}
          </div>

          {ground.description && <p style={{ color: '#9CA3AF', lineHeight: 1.7, marginBottom: 18, fontSize: 14 }}>{ground.description}</p>}

          {/* Stats strip */}
          <div style={{ display: 'flex', padding: 14, background: C.card, borderRadius: 10, border: '1px solid ' + C.border, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center', gap: 0 }}>
            {[
              ['Hours',   ground.openHour + ':00 – ' + ground.closeHour + ':00', false],
              ['Price',   '৳' + ground.pricePerHour + '/hr',                     true],
              ['Address', ground.address || ground.city,                         false],
            ].map(([k, v, mono], i) => (
              <React.Fragment key={k}>
                {i > 0 && <div style={{ borderLeft: '1px solid ' + C.border, margin: '0 14px', height: 30 }} />}
                <div>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 3 }}>{k}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, fontFamily: mono ? MONO : 'inherit', color: mono ? C.lime : C.text }}>{v}</div>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Amenities */}
          {ground.amenities?.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 9 }}>Amenities</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {ground.amenities.map(a => <span key={a} style={{ padding: '4px 11px', borderRadius: 7, background: C.card, border: '1px solid ' + C.border, fontSize: 12 }}>✓ {a}</span>)}
              </div>
            </div>
          )}

          {/* Owner Contact */}
          {user?.role === 'player' && owner && (
            <div style={{ marginBottom: 18, padding: 16, background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.18)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>📞 Owner Contact</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
                <div><div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Name</div><div style={{ fontSize: 14, fontWeight: 600 }}>{owner.name}</div></div>
                {owner.phone && <div><div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Phone</div><a href={'tel:' + owner.phone} style={{ fontSize: 14, fontWeight: 700, color: C.lime, textDecoration: 'none', fontFamily: MONO }}>{owner.phone}</a></div>}
                {owner.email && <div><div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Email</div><a href={'mailto:' + owner.email} style={{ fontSize: 14, fontWeight: 600, color: '#93C5FD', textDecoration: 'none' }}>{owner.email}</a></div>}
              </div>
            </div>
          )}

          {/* Advance Payment Notice */}
          {adv?.enabled && (
            <div style={{ padding: 16, background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.3)', borderRadius: 12, marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#A78BFA', marginBottom: 6 }}>⚡ Advance Payment Required — ৳{adv.amount}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                An advance payment of ৳{adv.amount} is required to confirm your booking. You will be redirected to the secure payment gateway after booking.
              </div>
              {adv.instructions && <div style={{ marginTop: 8, fontSize: 12, color: C.muted, fontStyle: 'italic' }}>Note: {adv.instructions}</div>}
            </div>
          )}
        </div>

        {/* ── RIGHT — Booking Panel */}
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, padding: 22, position: 'sticky', top: 80 }}>
          <div style={{ fontFamily: SYNE, fontWeight: 700, fontSize: 17, marginBottom: 18 }}>Book a Slot</div>

          {/* Date */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }}>Date</label>
            <style>{`input[type="date"].pp-d::-webkit-calendar-picker-indicator{cursor:pointer} input[type="date"].pp-d{color-scheme:light}`}</style>
            <input type="date" className="pp-d" min={today} value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, color: '#111', fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }} />
          </div>


          {/* Slots */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Available Slots</label>
            <SlotGrid ground={ground} date={date} onBook={(slot) => { setBookModal(slot); setBookError(''); }} />
          </div>

          {!user && (
            <div style={{ marginTop: 14, padding: 11, background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 8, fontSize: 12, color: '#93C5FD', textAlign: 'center' }}>
              <a href="/login" style={{ color: C.lime }}>Login</a> to book this ground
            </div>
          )}
        </div>
      </div>

      {/* ── BOOKING MODAL*/}
      {bookModal && (
        <Modal title="Confirm Booking" onClose={() => { setBookModal(null); setBookError(''); }}>
          {bookError && <Alert type="error" onClose={() => setBookError('')}>{bookError}</Alert>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}>
            {[
              ['Ground',  ground.name],
              ['Date',    new Date(date).toLocaleDateString('en-BD', { weekday: 'short', day: 'numeric', month: 'short' })],
              ['Slot',    bookModal.startHour + ':00 – ' + bookModal.endHour + ':00'],
              ['Payment', adv?.enabled ? 'Advance via SSLCommerz' : 'Pay at Venue'],
            ].map(([k, v]) => (
              <div key={k} style={{ background: '#141414', borderRadius: 8, padding: '9px 12px' }}>
                <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: 12, background: 'rgba(200,245,0,.06)', borderRadius: 8, textAlign: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Total  </span>
            <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: C.lime }}>৳{bookModal.price}</span>
          </div>

          {/* Advance payment info */}
          {adv?.enabled && (
            <div style={{ marginBottom: 14, padding: 12, background: 'rgba(124,58,237,.07)', border: '1px solid rgba(124,58,237,.3)', borderRadius: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#A78BFA', marginBottom: 6 }}>⚡ Advance Payment Required — ৳{adv.amount}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                After booking, you will be redirected to pay ৳{adv.amount} via the payment gateway. Your slot will be confirmed once the advance is paid.
              </div>
              {adv.instructions && <div style={{ marginTop: 6, fontSize: 12, color: '#c4b5fd', fontStyle: 'italic' }}>{adv.instructions}</div>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 9 }}>
            <Btn onClick={() => handleBook(bookModal)} disabled={submitting} style={{ flex: 1 }}>
              {submitting
                ? 'Processing…'
                : adv?.enabled
                  ? '⚡ Book & Pay Advance ৳' + adv.amount
                  : '✓ Confirm Booking'}
            </Btn>
            <Btn variant="ghost" onClick={() => { setBookModal(null); setBookError(''); }}>Back</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
