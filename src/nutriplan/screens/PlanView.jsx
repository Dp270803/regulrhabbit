import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentPlan, getCredits } from '../utils/storage';
import BottomNav from '../components/BottomNav';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PlanView() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [expandedMeals, setExpandedMeals] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const currentPlan = getCurrentPlan();
    if (!currentPlan) {
      navigate('/nutriplan/dashboard', { replace: true });
      return;
    }
    setPlan(currentPlan);
  }, [navigate]);

  if (!plan) return null;

  const days = plan.days || [];
  const dayData = days[selectedDay] || {};
  const meals = dayData.meals || [];

  // Context line from plan preferences
  const contextParts = [
    plan.targets?.target_calories ? `${plan.targets.target_calories} kcal` : null,
    plan.preferences?.dietary_preference
      ? plan.preferences.dietary_preference.charAt(0).toUpperCase() + plan.preferences.dietary_preference.slice(1)
      : null,
    plan.preferences?.cuisine
      ? plan.preferences.cuisine.charAt(0).toUpperCase() + plan.preferences.cuisine.slice(1)
      : null,
  ].filter(Boolean);

  // Daily macro summary
  const dayCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const dayProtein = meals.reduce((sum, m) => sum + (m.protein_g || 0), 0);
  const dayFat = meals.reduce((sum, m) => sum + (m.fat_g || 0), 0);
  const dayCarbs = meals.reduce((sum, m) => sum + (m.carb_g || 0), 0);

  const toggleMeal = (index) => {
    setExpandedMeals((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleRegenerate = () => {
    if (getCredits() > 0) {
      navigate('/nutriplan/loading');
    } else {
      navigate('/nutriplan/paywall');
    }
  };

  const credits = getCredits();

  return (
    <div className="min-h-screen bg-surface-paper relative overflow-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary-container/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-clay-accent/10 blur-3xl" />

      {/* Top bar */}
      <header className="flex items-center justify-between max-w-xl mx-auto w-full px-container-margin pt-4 pb-2">
        <h1 className="font-display-lg text-display-lg text-primary">NutriPlan</h1>
        <button
          onClick={() => navigate('/nutriplan/profile')}
          className="w-10 h-10 rounded-full bg-surface-cream flex items-center justify-center text-on-surface-variant hover:bg-primary-container/30 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>person</span>
        </button>
      </header>

      <main className="flex flex-col max-w-xl mx-auto w-full px-container-margin pb-24">
        {/* Context line */}
        {contextParts.length > 0 && (
          <p className="font-body-md text-body-md text-on-surface-variant mb-4">
            {contextParts.join(' · ')}
          </p>
        )}

        {/* Day selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 scrollbar-hide">
          {DAY_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => {
                setSelectedDay(i);
                setExpandedMeals({});
              }}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-label-md text-label-md font-bold transition-all duration-200 ${
                selectedDay === i
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-cream text-on-surface-variant hover:bg-primary-container/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Daily macro summary */}
        <div className="bg-surface-cream rounded-xl p-5 mb-4">
          <div className="flex items-baseline justify-between mb-3">
            <span className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
              Day {selectedDay + 1} Total
            </span>
            <span className="font-numeral-xl text-[20px] text-primary">{dayCalories} kcal</span>
          </div>
          <div className="flex gap-3">
            <span className="font-body-md text-body-md text-on-surface-variant">
              P: <span className="text-primary font-bold">{dayProtein}g</span>
            </span>
            <span className="font-body-md text-body-md text-on-surface-variant">
              F: <span className="text-primary font-bold">{dayFat}g</span>
            </span>
            <span className="font-body-md text-body-md text-on-surface-variant">
              C: <span className="text-primary font-bold">{dayCarbs}g</span>
            </span>
          </div>
        </div>

        {/* Meal cards */}
        <div className="flex flex-col gap-3 mb-5">
          {meals.map((meal, index) => {
            const isExpanded = expandedMeals[index];
            return (
              <div
                key={index}
                className="bg-surface-paper rounded-xl border border-surface-cream overflow-hidden"
              >
                <button
                  onClick={() => toggleMeal(index)}
                  className="w-full text-left p-5 hover:bg-surface-cream/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-label-md text-label-md uppercase tracking-wider text-clay-accent mb-1">
                        {meal.meal_type || `Meal ${index + 1}`}
                      </p>
                      <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                        {meal.name || 'Untitled meal'}
                      </h3>
                      <div className="flex flex-wrap gap-2 text-on-surface-variant">
                        <span className="font-body-md text-body-md">
                          {meal.calories || 0} kcal
                        </span>
                        <span className="font-body-md text-body-md">
                          P {meal.protein_g || 0}g &middot; F {meal.fat_g || 0}g &middot; C {meal.carb_g || 0}g
                        </span>
                        {meal.prep_time && (
                          <span className="font-body-md text-body-md flex items-center gap-1">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>timer</span>
                            {meal.prep_time}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="material-symbols-outlined text-on-surface-variant ml-3 mt-1 transition-transform duration-300 flex-shrink-0"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                      expand_more
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-surface-cream animate-fade-in">
                    {/* Ingredients */}
                    {meal.ingredients && meal.ingredients.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant mb-2">
                          Ingredients
                        </h4>
                        <ul className="flex flex-col gap-1.5">
                          {meal.ingredients.map((ing, j) => (
                            <li key={j} className="font-body-md text-body-md text-on-surface flex items-start gap-2">
                              <span className="text-clay-accent mt-0.5">&bull;</span>
                              <span>
                                {ing.name}
                                {ing.quantity ? ` — ${ing.quantity} ${ing.unit || ''}` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Instructions */}
                    {meal.instructions && (
                      <div>
                        <h4 className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant mb-2">
                          Instructions
                        </h4>
                        <p className="font-body-md text-body-md text-on-surface whitespace-pre-line">
                          {meal.instructions}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {meals.length === 0 && (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-on-surface-variant mb-3" style={{ fontSize: 48 }}>
                restaurant
              </span>
              <p className="font-body-lg text-body-lg text-on-surface-variant">No meals for this day</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-4 rounded-xl bg-primary-container text-on-primary-container font-label-md text-label-md font-bold uppercase tracking-widest shadow-md hover:opacity-90 active:scale-[0.98] transition-all duration-200"
          >
            Regenerate plan
            <span className="block font-body-md text-body-md font-normal normal-case tracking-normal mt-0.5 opacity-80">
              {credits} credit{credits !== 1 ? 's' : ''} remaining
            </span>
          </button>

          <button
            onClick={() => navigate('/nutriplan/grocery')}
            className="w-full py-4 rounded-xl bg-transparent border-2 border-clay-accent text-clay-accent font-label-md text-label-md font-bold uppercase tracking-widest hover:bg-clay-accent/10 active:scale-[0.98] transition-all duration-200"
          >
            <span className="material-symbols-outlined align-middle mr-2" style={{ fontSize: 18 }}>
              shopping_cart
            </span>
            Grocery list
          </button>
        </div>
      </main>

      {/* Confirm regenerate dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-paper rounded-2xl p-6 mx-6 max-w-sm w-full shadow-xl animate-scale-in">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Regenerate plan?</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-4">
              This will replace your current meal plan with a new one.
              {credits > 0
                ? ` You have ${credits} credit${credits !== 1 ? 's' : ''} remaining.`
                : ' You have no credits remaining.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-outline-variant/30 font-label-md text-label-md text-on-surface-variant hover:bg-surface-cream transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  handleRegenerate();
                }}
                className="flex-1 py-3 rounded-xl bg-primary-container text-on-primary-container font-label-md text-label-md font-bold hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
