import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuth from './store/authStore';
import { useBootstrap } from './hooks/useApi';
import Navbar from './components/Navbar';

// Pages
import Home           from './pages/Home';
import Auth           from './pages/Auth';
import Grounds        from './pages/Grounds';
import GroundDetail   from './pages/GroundDetail';
import PlayerBookings from './pages/PlayerBookings';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';

import { C } from './components/ui';

// ── Protected Route ───────────────────────────────────
function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

// ── Loading screen shown while bootstrap checks auth ──
function BootScreen() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.lime, animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ color: C.muted, fontSize: 14 }}>Loading PlayPoint…</span>
      </div>
    </div>
  );
}

export default function App() {
  const ready = useBootstrap(); // restores session from refresh cookie

  if (!ready) return <BootScreen />;

  return (
    <BrowserRouter>
      {/* Toast notifications — positioned top-right with dark theme */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { background: '#1A1A1A', color: '#F5F5F5', border: '1px solid #2A2A2A', fontSize: 14 },
          success: { iconTheme: { primary: '#C8F500', secondary: '#0D0D0D' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
      <Navbar />
      <Routes>
        <Route path="/"            element={<Home />} />
        <Route path="/login"       element={<Auth mode="login" />} />
        <Route path="/register"    element={<Auth mode="register" />} />
        <Route path="/grounds"     element={<Grounds />} />
        <Route path="/grounds/:id" element={<GroundDetail />} />
        <Route path="/bookings"    element={<ProtectedRoute roles={['player']}><PlayerBookings /></ProtectedRoute>} />
        <Route path="/owner/*"     element={<ProtectedRoute roles={['owner']}><OwnerDashboard /></ProtectedRoute>} />
        <Route path="/admin/*"     element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
