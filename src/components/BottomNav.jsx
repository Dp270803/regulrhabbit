import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, User, Lightbulb, TrendingUp } from 'lucide-react';
import { useThemeColors } from '../hooks/useTheme';

export default function BottomNav() {
  const C = useThemeColors();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4">
      <div
        className="w-full max-w-[480px] mb-3 rounded-2xl overflow-hidden"
        style={{
          background: C.navBg,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: `0 -10px 40px rgba(0,0,0,0.25)`,
          border: `1px solid ${C.separator}`,
        }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
            { to: '/plan', icon: CalendarDays, label: 'Plan' },
            { to: '/progress', icon: TrendingUp, label: 'Progress' },
            { to: '/tips', icon: Lightbulb, label: 'Tips' },
            { to: '/profile', icon: User, label: 'Profile' },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all duration-200"
              style={({ isActive }) => ({
                color: isActive ? C.primary : C.faint,
              })}
            >
              {({ isActive }) => (
                <>
                  <div style={{
                    padding: '6px',
                    borderRadius: '10px',
                    background: isActive ? `rgba(${C.primaryRgb},0.12)` : 'transparent',
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
