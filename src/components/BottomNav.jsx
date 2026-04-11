import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, User, Lightbulb } from 'lucide-react';

const C = {
  primary: '#e9c349',
  onPrimary: '#3c2f00',
};

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4">
      <div
        className="w-full max-w-[480px] mb-3 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(13,13,13,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/plan', icon: CalendarDays, label: 'Plan' },
            { to: '/tips', icon: Lightbulb, label: 'Tips' },
            { to: '/profile', icon: User, label: 'Profile' },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200"
              style={({ isActive }) => ({
                color: isActive ? C.primary : 'rgba(255,255,255,0.3)',
              })}
            >
              {({ isActive }) => (
                <>
                  <div style={{
                    padding: '6px',
                    borderRadius: '10px',
                    background: isActive ? `rgba(233,195,73,0.12)` : 'transparent',
                    transition: 'background 0.2s',
                  }}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
                  </div>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontFamily: 'Inter, sans-serif',
                  }}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
