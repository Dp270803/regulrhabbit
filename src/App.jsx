import { Routes, Route, Navigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Landing from './screens/Landing';
import PlanBuilder from './screens/PlanBuilder';
import Dashboard from './screens/Dashboard';
import PlanView from './screens/PlanView';
import Profile from './screens/Profile';
import Tips from './screens/Tips';
import BottomNav from './components/BottomNav';
import { isOnboardingComplete } from './utils/storage';

const NAV_SCREENS = ['/dashboard', '/plan', '/profile'];

export default function App() {
  const location = useLocation();
  const showNav = NAV_SCREENS.some(path => location.pathname.startsWith(path));

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<PlanBuilder />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/plan" element={<PlanView />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/tips" element={<Tips />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  );
}
