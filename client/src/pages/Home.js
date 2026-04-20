import React from 'react';
import { Link } from 'react-router-dom';
import { C, SYNE } from '../components/ui';
import BicycleKickAnimation from '../components/BicycleKickAnimation';

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
      <section style={{ position: 'relative', padding:'120px 24px 100px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'75vh', textAlign:'center', borderBottom:`1px solid ${C.border}`, marginBottom: 60 }}>
        
        {/* Animated Premium Background */}
        <BicycleKickAnimation />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: 900, width: '100%', margin: '0 auto', animation: 'fadeInSlideUp 0.8s ease-out' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(200,245,0,.15)', border:'1px solid rgba(200,245,0,.3)', borderRadius:100, padding:'6px 20px', marginBottom:28, fontSize:13, color:C.lime, fontWeight:700, letterSpacing:1 }}>
            🏟️ BANGLADESH'S SPORTS BOOKING PLATFORM
          </div>
          <h1 style={{ fontFamily:SYNE, fontSize:'clamp(42px, 7vw, 76px)', fontWeight:800, lineHeight:1.05, margin:'0 0 24px', letterSpacing:-1.5, textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
            Book Indoor Sports<br /><span style={{ color:C.lime }}>Facilities Near You</span>
          </h1>
          <p style={{ fontSize:20, color:'#D1D5DB', marginBottom:40, maxWidth:580, margin:'0 auto 40px', lineHeight:1.6, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
            Find and book badminton courts, futsal arenas, basketball courts and more. Instant confirmation, no calls needed.
          </p>
          <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/grounds" className="btn-premium" style={{ padding:'16px 36px', background:C.lime, color:'#0D0D0D', borderRadius:12, fontWeight:800, textDecoration:'none', fontSize:16, fontFamily:SYNE, boxShadow: '0 8px 25px rgba(200,245,0,0.25)' }}>
              Find Grounds →
            </Link>
            <Link to="/register" className="card-glass" style={{ padding:'16px 36px', color:'#FFF', border:`1px solid rgba(255,255,255,0.2)`, borderRadius:12, fontWeight:700, textDecoration:'none', fontSize:16 }}>
              List Your Facility
            </Link>
          </div>
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
