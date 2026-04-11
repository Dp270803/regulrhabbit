import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Landing from './screens/Landing';
import PlanBuilder from './screens/PlanBuilder';
import Dashboard from './screens/Dashboard';
import PlanView from './screens/PlanView';
import Profile from './screens/Profile';
import Tips from './screens/Tips';
import SanityStudio from './screens/SanityStudio';
import BottomNav from './components/BottomNav';

const NAV_SCREENS = ['/dashboard', '/plan', '/profile', '/tips'];

export default function App() {
  const location = useLocation();
  const showNav = NAV_SCREENS.some(path => location.pathname.startsWith(path));

  // Initialize theme on first load
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
      {showNav && <BottomNav />}
    </>
  );
}
