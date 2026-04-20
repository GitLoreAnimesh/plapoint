import React from 'react';

export default function BicycleKickAnimation() {
  return (
    <div className="bicycle-container">
      <svg className="bicycle-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="ballGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(200, 245, 0, 1)" />
            <stop offset="60%" stopColor="rgba(200, 245, 0, 0.4)" />
            <stop offset="100%" stopColor="rgba(200, 245, 0, 0)" />
          </radialGradient>
          <linearGradient id="netGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.02)" />
          </linearGradient>
          
          <filter id="neon" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Stadium Grid */}
        <g className="stadium-grid">
          <path d="M0,600 L1200,600" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <path d="M0,650 L1200,650" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <path d="M0,700 L1200,700" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <path d="M0,750 L1200,750" stroke="rgba(255,255,255,0.01)" strokeWidth="1" />
          
          <path d="M200,600 L100,800" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <path d="M400,600 L300,800" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <path d="M600,600 L600,800" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <path d="M800,600 L900,800" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <path d="M1000,600 L1100,800" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </g>

        {/* The Goal Net (Right far side) */}
        <g className="goal-net" transform="translate(1000, 350)">
          <path d="M0,250 L0,0 L80,50 L80,250 Z" fill="url(#netGlow)" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
          <path d="M0,0 L80,50" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
          <path d="M0,250 L80,250" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
          <path d="M0,0 L0,250" stroke="#C8F500" strokeWidth="4" filter="url(#neon)" />
        </g>

        {/* The Player Silhouette */}
        <g className="player-group" transform="translate(450, 400)">
          {/* Rotating Torso & Head */}
          <g className="torso-group">
            <circle cx="0" cy="-60" r="14" fill="#E5E7EB" />
            <path d="M-8,-40 C10,-45 20,-20 15,10 C10,30 -5,25 -8,-40 Z" fill="#D1D5DB" />
            {/* Left Arm */}
            <path d="M-5,-35 Q-30,-20 -20,10" fill="none" stroke="#9CA3AF" strokeWidth="9" strokeLinecap="round" />
            {/* Right Arm */}
            <path d="M10,-35 Q40,-20 30,5" fill="none" stroke="#E5E7EB" strokeWidth="11" strokeLinecap="round" />
          </g>
          
          {/* Left Leg (Planted/Jumping) */}
          <g className="leg-left">
            <path d="M-2,10 Q-15,40 -5,80" fill="none" stroke="#9CA3AF" strokeWidth="13" strokeLinecap="round" />
          </g>
          
          {/* Right Leg (The Kick) */}
          <g className="leg-right">
            <path d="M5,10 Q30,15 50,-20" fill="none" stroke="#F3F4F6" strokeWidth="15" strokeLinecap="round" />
          </g>
        </g>

        {/* The Ball and Trail */}
        <g className="ball-group">
          {/* Glowing Trail */}
          <path className="ball-trail" d="M500,380 Q750,200 1000,450" fill="none" stroke="rgba(200, 245, 0, 0.4)" strokeWidth="4" strokeDasharray="15, 10" filter="url(#neon)" />
          
          {/* The Soccer Ball */}
          <circle className="soccer-ball" cx="500" cy="380" r="12" fill="#fff" />
          <circle className="soccer-ball-glow" cx="500" cy="380" r="24" fill="url(#ballGlow)" />
        </g>
      </svg>
    </div>
  );
}
