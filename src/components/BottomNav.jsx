import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, User, Lightbulb } from 'lucide-react';

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4">
      <div
        className="w-full max-w-[480px] mb-3 rounded-2xl overflow-hidden"
        style={{
          background: 'var(--nav-bg, rgba(17,17,17,0.88))',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--color-border-strong)',
        }}
      >
        <div className="flex items-center justify-around px-2 py-1.5">
          {[
            { to: '/dashboard', icon: LayoutDashboard, label: 'Today' },
            { to: '/plan', icon: CalendarDays, label: 'Plan' },
            { to: '/tips', icon: Lightbulb, label: 'Tips' },
            { to: '/profile', icon: User, label: 'Profile' },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 px-4 rounded-xl transition-all duration-200 text-[var(--color-text-1)] ${
                  isActive ? 'opacity-100' : 'opacity-35 hover:opacity-60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-[var(--color-border-strong)]' : ''}`}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
