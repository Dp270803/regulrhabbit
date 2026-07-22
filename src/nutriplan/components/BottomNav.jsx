import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/nutriplan/dashboard', label: 'Home', icon: 'dashboard' },
  { to: '/nutriplan/plan', label: 'Plan', icon: 'restaurant_menu' },
  { to: '/nutriplan/profile', label: 'Profile', icon: 'person' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface-cream shadow-[0px_-4px_20px_rgba(26,21,18,0.04)] flex justify-around items-center px-4 pb-6 pt-3">
      {TABS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center transition-all duration-200 active:scale-[0.98] ${
              isActive
                ? 'bg-primary-container text-on-primary-container px-6 py-1 rounded-xl'
                : 'text-on-surface-variant hover:text-primary'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className="material-symbols-outlined mb-0.5"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {icon}
              </span>
              <span className="font-label-md text-label-md">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
