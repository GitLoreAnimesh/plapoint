import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { groundAPI, IMAGE_BASE_URL } from '../services/api';
import { C, SYNE, Spinner, SPORT_EMOJI } from '../components/ui';

const SPORTS = ['badminton','futsal','basketball','tennis','volleyball'];
const CITIES  = ['Dhaka','Chittagong','Sylhet','Rajshahi','Khulna','Barisal','Rangpur','Comilla','Mymensingh'];

function GroundCard({ g }) {
  const img = g.images?.[0];
  return (
    <Link to={`/grounds/${g._id}`} style={{ textDecoration:'none', color:'inherit' }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden', transition:'all .2s', cursor:'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.lime; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'none'; }}>
        {/* Image */}
        <div style={{ height:160, background: img ? `url(${IMAGE_BASE_URL}${img}) center/cover` : 'linear-gradient(135deg, #1a1a1a 0%, #242424 100%)', position:'relative' }}>
          {!img && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:52 }}>{SPORT_EMOJI[g.sport] || '🏟️'}</div>}
          <div style={{ position:'absolute', top:10, left:10, background:'rgba(13,13,13,.85)', borderRadius:100, padding:'3px 10px', fontSize:11, fontWeight:700, color:C.lime, textTransform:'capitalize' }}>
            {SPORT_EMOJI[g.sport]} {g.sport}
          </div>
          {g.rating > 0 && (
            <div style={{ position:'absolute', top:10, right:10, background:'rgba(13,13,13,.85)', borderRadius:100, padding:'3px 10px', fontSize:11, fontWeight:700, color:'#F59E0B' }}>
              ★ {g.rating} <span style={{ color:'#6B7280' }}>({g.totalReviews})</span>
            </div>
          )}
        </div>
        {/* Info */}
        <div style={{ padding:'14px 16px' }}>
          <div style={{ fontFamily:SYNE, fontWeight:700, fontSize:16, marginBottom:4 }}>{g.name}</div>
          <div style={{ color:'#6B7280', fontSize:12, marginBottom:10 }}>📍 {g.area ? `${g.area}, ` : ''}{g.city}</div>
          {g.description && <div style={{ fontSize:12, color:C.text, marginBottom:12, opacity:0.85, lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, windowBoxOrient:'vertical', WebkitBoxOrient:'vertical', overflow:'hidden' }}>{g.description}</div>}
          {g.amenities?.length > 0 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
              {g.amenities.slice(0,3).map(a => (
                <span key={a} style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:'rgba(255,255,255,.05)', color:'#6B7280', border:`1px solid ${C.border}` }}>{a}</span>
              ))}
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <span style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize:18, color:C.lime }}>৳{g.pricePerHour}</span>
              <span style={{ fontSize:11, color:'#6B7280' }}>/hr</span>
            </div>
            <span style={{ background:C.lime, color:'#0D0D0D', padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:700 }}>Book Now</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function GroundsPage() {
  const [searchParams] = useSearchParams();
  const [grounds, setGrounds] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ sport: searchParams.get('sport')||'', city: searchParams.get('city')||'', area:'' });

  const search = async (f = filters) => {
    setLoading(true);
    try {
      const res = await groundAPI.getAll({ sport: f.sport||undefined, city: f.city||undefined, area: f.area||undefined });
      setGrounds(res.data.grounds);
      setTotal(res.data.total);
    } catch {}
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { search(); }, []);


  const setFilter = (k, v) => {
    const nf = { ...filters, [k]: v };
    setFilters(nf);
    search(nf);
  };

  const inp = { padding:'9px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:'#F3F4F6', fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none' };

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 24px' }}>
      <h1 style={{ fontFamily:SYNE, fontSize:28, fontWeight:800, marginBottom:24, marginTop:0 }}>
        Find Indoor Grounds <span style={{ color:C.muted, fontWeight:400, fontSize:16 }}>({total} available)</span>
      </h1>

      {/* Filters */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:32, padding:16, background:C.card, borderRadius:12, border:`1px solid ${C.border}` }}>
        <select style={inp} value={filters.sport} onChange={e => setFilter('sport', e.target.value)}>
          <option value="">All Sports</option>
          {SPORTS.map(s => <option key={s} value={s}>{SPORT_EMOJI[s]} {s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <select style={inp} value={filters.city} onChange={e => setFilter('city', e.target.value)}>
          <option value="">All Cities</option>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input style={{ ...inp, flex:1, minWidth:150 }} placeholder="Search by area..." value={filters.area} onChange={e => setFilter('area', e.target.value)} />
        <button onClick={() => { setFilters({ sport:'', city:'', area:'' }); search({ sport:'', city:'', area:'' }); }} style={{ ...inp, cursor:'pointer', color:C.muted }}>Clear</button>
      </div>

      {/* Sport pills */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:28 }}>
        {['',  ...SPORTS].map(s => (
          <button key={s||'all'} onClick={() => setFilter('sport', s)} style={{ padding:'6px 16px', borderRadius:100, border:`1px solid ${filters.sport===s ? C.lime : C.border}`, background: filters.sport===s ? 'rgba(200,245,0,.07)' : 'transparent', color: filters.sport===s ? C.lime : C.muted, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            {s ? `${SPORT_EMOJI[s]} ${s.charAt(0).toUpperCase()+s.slice(1)}` : 'All Sports'}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : grounds.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:C.muted }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🏟️</div>
          <div style={{ fontSize:18, marginBottom:8 }}>No grounds found</div>
          <div style={{ fontSize:14 }}>Try changing your filters</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:20 }}>
          {grounds.map(g => <GroundCard key={g._id} g={g} />)}
        </div>
      )}
    </div>
  );
}
