import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../store/authStore';
import { notifAPI } from '../services/api';
import { C, SYNE } from './ui';

export default function Navbar() {
  const { user, clearSession, notifications, unreadCount, markNotificationsRead, setNotifications } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const notifRef = useRef(null);

  // Fetch persisted notifications once on login
  useEffect(() => {
    if (!user) return;
    notifAPI.get()
      .then(r => setNotifications(r.data.notifications || []))
      .catch(() => {});
  }, [user?._id]); // eslint-disable-line

  // Close dropdowns on click outside
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); setShowNotifs(false); }, [location.pathname]);

  const handleLogout = async () => {
    await clearSession();
    navigate('/login');
  };

  const handleBellClick = async () => {
    if (!showNotifs && unreadCount > 0) {
      markNotificationsRead();
      notifAPI.readAll().catch(() => {});
    }
    setShowNotifs(v => !v);
  };

  const ownerLinks  = [
    { to: '/owner',           label: 'Dashboard' },
    { to: '/owner/grounds',   label: 'My Grounds' },
    { to: '/owner/bookings',  label: 'Bookings'   },
    { to: '/owner/analytics', label: 'Analytics'  },
  ];
  const adminLinks  = [
    { to: '/admin',           label: 'Dashboard' },
    { to: '/admin/owners',    label: 'Owners'    },
    { to: '/admin/grounds',   label: 'Grounds'   },
    { to: '/admin/users',     label: 'Players'   },
  ];
  const playerLinks = [
    { to: '/grounds',  label: 'Find Grounds' },
    { to: '/bookings', label: 'My Bookings'  },
  ];

  const navLinks = user?.role === 'owner' ? ownerLinks
    : user?.role === 'admin' ? adminLinks
    : playerLinks;

  const isActive = (to) => location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(13,13,13,.96)', backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${C.border}`,
      padding: '0 24px', height: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* Logo */}
      <Link to="/" style={{ fontFamily: SYNE, fontWeight: 800, fontSize: 20, color: C.lime, textDecoration: 'none', letterSpacing: -0.5 }}>
        PLAY<span style={{ color: C.text }}>POINT</span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {navLinks.map(l => (
          <Link key={l.to} to={l.to} style={{
            padding: '6px 13px', borderRadius: 8, fontSize: 13, fontWeight: isActive(l.to) ? 600 : 400,
            color: isActive(l.to) ? C.lime : C.sub, textDecoration: 'none',
            background: isActive(l.to) ? 'rgba(200,245,0,.07)' : 'transparent',
            transition: 'all .12s',
          }}>
            {l.label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user ? (
          <>
            {/* Notification bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={handleBellClick} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.sub, fontSize: 18, padding: '6px 8px', borderRadius: 8,
                position: 'relative', lineHeight: 1,
              }}>
                🔔
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2,
                    background: C.red, color: '#fff',
                    fontSize: 9, fontWeight: 700, borderRadius: '50%',
                    width: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 8,
                  width: 310, background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.6)',
                  zIndex: 200, maxHeight: 380, overflowY: 'auto',
                }}>
                  <div style={{ padding: '11px 16px', borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 13 }}>
                    Notifications
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px 16px', color: C.muted, fontSize: 13, textAlign: 'center' }}>
                      No notifications yet
                    </div>
                  ) : notifications.slice(0, 12).map(n => (
                    <div key={n._id} style={{
                      padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
                      background: n.isRead ? 'transparent' : 'rgba(200,245,0,.03)',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: C.border, marginTop: 4 }}>
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User menu */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '6px 11px', cursor: 'pointer',
                color: C.text, fontSize: 13, fontWeight: 500,
              }}>
                <span style={{
                  width: 26, height: 26, borderRadius: '50%', background: C.lime, color: '#0D0D0D',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 12, fontFamily: SYNE, flexShrink: 0,
                }}>
                  {user.name?.[0]?.toUpperCase()}
                </span>
                <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name?.split(' ')[0]}
                </span>
                <span style={{ color: C.muted, fontSize: 9 }}>▼</span>
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 8,
                  minWidth: 170, background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.5)',
                  zIndex: 200, overflow: 'hidden',
                }}>
                  <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: C.lime, textTransform: 'capitalize', marginTop: 2 }}>{user.role}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{user.email}</div>
                  </div>
                  <button onClick={handleLogout} style={{
                    width: '100%', padding: '10px 14px', background: 'none',
                    border: 'none', color: C.red, fontSize: 13, cursor: 'pointer',
                    textAlign: 'left', fontFamily: "'DM Sans', sans-serif",
                  }}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/login"    style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${C.border}`, color: C.sub, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>Login</Link>
            <Link to="/register" style={{ padding: '7px 16px', borderRadius: 8, background: C.lime, color: '#0D0D0D', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
