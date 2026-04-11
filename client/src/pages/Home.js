import React from 'react';
import { Link } from 'react-router-dom';
import { C, SYNE } from '../components/ui';

const SPORTS = [
  { icon:'🏸', name:'Badminton', color:'#C8F500' },
  { icon:'⚽', name:'Futsal',    color:'#3B82F6' },
  { icon:'🏀', name:'Basketball', color:'#F59E0B' },
  { icon:'🎾', name:'Tennis',    color:'#22C55E' },
  { icon:'🏐', name:'Volleyball', color:'#EF4444' },
];

export default function HomePage() {
  return (
    <div style={{ background:C.bg, minHeight:'100vh' }}>
      {/* Hero */}
      <section style={{ padding:'80px 24px 60px', maxWidth:900, margin:'0 auto', textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(200,245,0,.08)', border:'1px solid rgba(200,245,0,.2)', borderRadius:100, padding:'5px 16px', marginBottom:24, fontSize:12, color:C.lime, fontWeight:600 }}>
          🏟️ INDIA'S SPORTS BOOKING PLATFORM
        </div>
        <h1 style={{ fontFamily:SYNE, fontSize:'clamp(36px, 6vw, 64px)', fontWeight:800, lineHeight:1.1, margin:'0 0 20px', letterSpacing:-1 }}>
          Book Indoor Sports<br /><span style={{ color:C.lime }}>Facilities Near You</span>
        </h1>
        <p style={{ fontSize:18, color:'#9CA3AF', marginBottom:36, maxWidth:520, margin:'0 auto 36px', lineHeight:1.6 }}>
          Find and book badminton courts, futsal arenas, basketball courts and more. Instant confirmation, no calls needed.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <Link to="/grounds" style={{ padding:'14px 32px', background:C.lime, color:'#0D0D0D', borderRadius:10, fontWeight:800, textDecoration:'none', fontSize:16, fontFamily:SYNE }}>
            Find Grounds →
          </Link>
          <Link to="/register" style={{ padding:'14px 32px', background:'transparent', color:C.text, border:`1px solid ${C.border}`, borderRadius:10, fontWeight:600, textDecoration:'none', fontSize:15 }}>
            List Your Facility
          </Link>
        </div>
      </section>

      {/* Sports */}
      <section style={{ padding:'0 24px 60px', maxWidth:900, margin:'0 auto' }}>
        <h2 style={{ fontFamily:SYNE, fontWeight:700, marginBottom:20, textAlign:'center', color:'#6B7280', letterSpacing:2, textTransform:'uppercase', fontSize:12 }}>Browse by Sport</h2>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          {SPORTS.map(s => (
            <Link key={s.name} to={`/grounds?sport=${s.name.toLowerCase()}`}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'20px 24px', background:C.card, border:`1px solid ${C.border}`, borderRadius:14, textDecoration:'none', minWidth:110, transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.background = `${s.color}0D`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}>
              <span style={{ fontSize:32 }}>{s.icon}</span>
              <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{s.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding:'40px 24px 80px', maxWidth:900, margin:'0 auto' }}>
        <h2 style={{ fontFamily:SYNE, fontSize:28, fontWeight:800, textAlign:'center', marginBottom:40 }}>How It Works</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:20 }}>
          {[
            { n:'01', title:'Search',  desc:'Find facilities near you by sport, city, or area.' },
            { n:'02', title:'Choose',  desc:'Pick your date and available time slot.' },
            { n:'03', title:'Book',    desc:'Confirm booking instantly. Pay online or at venue.' },
            { n:'04', title:'Play',    desc:'Show up and play. Owner gets notified automatically.' },
          ].map(s => (
            <div key={s.n} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:24 }}>
              <div style={{ fontFamily:SYNE, fontSize:36, fontWeight:800, color:C.lime, opacity:.3, lineHeight:1, marginBottom:12 }}>{s.n}</div>
              <div style={{ fontFamily:SYNE, fontSize:16, fontWeight:700, marginBottom:8 }}>{s.title}</div>
              <div style={{ fontSize:13, color:'#6B7280', lineHeight:1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
