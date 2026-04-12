import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom';
import Landing from './screens/Landing';
import PlanBuilder from './screens/PlanBuilder';
import Dashboard from './screens/Dashboard';
import PlanView from './screens/PlanView';
import Profile from './screens/Profile';
import Tips from './screens/Tips';
import SanityStudio from './screens/SanityStudio';
import BottomNav from './components/BottomNav';

const NAV_SCREENS = ['/dashboard', '/plan', '/profile', '/tips'];
const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/plan', label: 'Plan' },
  { to: '/tips', label: 'Tips' },
  { to: '/profile', label: 'Profile' },
];

function TopNav() {
  return (
    <nav
      className="hidden md:flex"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '56px', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(24px, 5vw, 64px)',
        background: 'rgba(19,19,19,0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <NavLink
        to="/dashboard"
        style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#e9c349', letterSpacing: '0.12em', textDecoration: 'none' }}
      >
        REGULR
      </NavLink>
      <div style={{ display: 'flex', gap: '2px' }}>
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              padding: '6px 16px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.03em',
              textDecoration: 'none',
              color: isActive ? '#e9c349' : 'rgba(255,255,255,0.4)',
              borderBottom: isActive ? '2px solid #e9c349' : '2px solid transparent',
              transition: 'color 0.15s',
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default function App() {
  const location = useLocation();
  const showNav = NAV_SCREENS.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    try {
      const stored = localStorage.getItem('regulr_theme') || 'dark';
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(stored);
    } catch {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <>
      {showNav && <TopNav />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<PlanBuilder />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/plan" element={<PlanView />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/tips" element={<Tips />} />
        <Route path="/studio/*" element={<SanityStudio />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Bottom nav: mobile only */}
      {showNav && (
        <div className="md:hidden">
          <BottomNav />
        </div>
      )}
    </>
  );
}
