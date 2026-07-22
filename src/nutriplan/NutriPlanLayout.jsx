import { Outlet } from 'react-router-dom';

export default function NutriPlanLayout() {
  return (
    <div className="nutriplan">
      <Outlet />
    </div>
  );
}
