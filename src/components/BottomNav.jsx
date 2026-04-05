import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, User } from 'lucide-react';

export default function BottomNav() {
  const linkClass = ({ isActive }) =>
    `flex flex-col items-center gap-1 py-2 px-4 text-xs transition-colors ${
      isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] z-50 md:hidden">
      <div className="flex justify-around items-center max-w-[480px] mx-auto">
        <NavLink to="/dashboard" className={linkClass}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/plan" className={linkClass}>
          <CalendarDays size={20} />
          <span>Plan</span>
        </NavLink>
        <NavLink to="/profile" className={linkClass}>
          <User size={20} />
          <span>Profile</span>
        </NavLink>
      </div>
    </nav>
  );
}
