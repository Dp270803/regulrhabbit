import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isOnboarded, getTargets, getUser, getCurrentPlan, getCredits } from '../utils/storage';
import BottomNav from '../components/BottomNav';

const ACTIVITY_LABELS = {
  sedentary: 'Sedentary (1.2x)',
  light: 'Lightly active (1.375x)',
  moderate: 'Moderately active (1.55x)',
  active: 'Active (1.725x)',
  very_active: 'Very active (1.9x)',
};

const GOAL_LABELS = {
  fat_loss: 'Fat loss (-20%)',
  muscle_gain: 'Muscle gain (+10%)',
  maintenance: 'Maintenance (0%)',
  recomp: 'Body recomp (-5%)',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [targets, setTargets] = useState(null);
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState(null);
  const [accordionOpen, setAccordionOpen] = useState(false);

  useEffect(() => {
    if (!isOnboarded()) {
      navigate('/nutriplan', { replace: true });
      return;
    }
    setTargets(getTargets());
    setUser(getUser());
    setPlan(getCurrentPlan());
  }, [navigate]);

  if (!targets || !user) return null;

  const { target_calories, protein_g, fat_g, carb_g, bmr, tdee, deficit_or_surplus } = targets;

  const handleGenerate = () => {
    if (getCredits() > 0) {
      navigate('/nutriplan/loading');
    } else {
      navigate('/nutriplan/paywall');
    }
  };

  const planTargetsMismatch = plan && plan.targets && (
    plan.targets.target_calories !== target_calories ||
    plan.targets.protein_g !== protein_g ||
    plan.targets.fat_g !== fat_g ||
    plan.targets.carb_g !== carb_g
  );

  return (
    <div className="min-h-screen bg-surface-paper relative overflow-hidden">
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary-container/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-clay-accent/10 blur-3xl" />

      <header className="flex items-center justify-between max-w-xl mx-auto w-full px-container-margin pt-4 pb-2">
        <h1 className="font-headline-md text-primary">NutriPlan</h1>
        <button
          onClick={() => navigate('/nutriplan/profile')}
          className="w-9 h-9 rounded-full bg-surface-cream flex items-center justify-center text-on-surface-variant hover:bg-primary-container/30 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person</span>
        </button>
      </header>

      <main className="flex flex-col max-w-xl mx-auto w-full px-container-margin pb-24">
        {/* Hero card */}
        <div className="bg-surface-cream rounded-2xl px-6 py-6 text-center mb-4">
          <p className="font-label-md uppercase tracking-widest text-on-surface-variant mb-2">
            Target Daily Intake
          </p>
          <p className="font-numeral-xl text-primary">
            {target_calories} <span className="text-[18px] text-on-surface-variant font-medium">kcal</span>
          </p>
          <div className="w-10 h-0.5 bg-clay-accent/40 mx-auto mt-3" />
        </div>

        {/* Macro cards */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="border-2 border-primary-container rounded-xl px-2 py-3 text-center relative">
            <span className="absolute top-1.5 right-1.5 bg-primary-container text-on-primary-container text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
              Priority
            </span>
            <span className="material-symbols-outlined text-primary mb-1" style={{ fontSize: 18 }}>
              fitness_center
            </span>
            <p className="font-numeral-xl text-[26px] text-primary leading-tight">{protein_g}g</p>
            <p className="font-label-md text-on-surface-variant mt-0.5">Protein</p>
          </div>

          <div className="border border-outline-variant/30 rounded-xl px-2 py-3 text-center">
            <span className="material-symbols-outlined text-clay-accent mb-1" style={{ fontSize: 18 }}>
              water_drop
            </span>
            <p className="font-numeral-xl text-[26px] text-primary leading-tight">{fat_g}g</p>
            <p className="font-label-md text-on-surface-variant mt-0.5">Fats</p>
          </div>

          <div className="border border-outline-variant/30 rounded-xl px-2 py-3 text-center">
            <span className="material-symbols-outlined text-secondary mb-1" style={{ fontSize: 18 }}>
              eco
            </span>
            <p className="font-numeral-xl text-[26px] text-primary leading-tight">{carb_g}g</p>
            <p className="font-label-md text-on-surface-variant mt-0.5">Carbs</p>
          </div>
        </div>

        {/* Generate CTA */}
        <button
          onClick={handleGenerate}
          className="w-full py-4 rounded-xl bg-primary-container text-on-primary-container font-label-md font-bold uppercase tracking-widest shadow-md hover:opacity-90 active:scale-[0.98] transition-all duration-200 mb-3"
        >
          Generate my meal plan
          <span className="block font-body-md font-normal normal-case tracking-normal mt-0.5 opacity-80">
            7 days &middot; matched to your macros
          </span>
        </button>

        {/* View current plan link */}
        {plan && (
          <div className="text-center mb-4">
            <button
              onClick={() => navigate('/nutriplan/plan')}
              className="font-label-md text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
            >
              View your current plan
            </button>
            {planTargetsMismatch && (
              <p className="font-body-md text-clay-accent mt-1">
                <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 14 }}>info</span>
                Plan was generated with different targets
              </p>
            )}
          </div>
        )}

        {/* How we calculated this */}
        <div className="border border-outline-variant/30 rounded-xl overflow-hidden">
          <button
            onClick={() => setAccordionOpen(!accordionOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-cream/50 transition-colors"
          >
            <span className="font-label-md text-on-surface-variant uppercase tracking-wider">
              How we calculated this
            </span>
            <span
              className="material-symbols-outlined text-on-surface-variant transition-transform duration-300"
              style={{ transform: accordionOpen ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: 20 }}
            >
              expand_more
            </span>
          </button>

          {accordionOpen && (
            <div className="px-4 pb-4 pt-1 flex flex-col gap-2 animate-fade-in">
              <div className="flex justify-between items-center">
                <span className="font-body-md text-on-surface-variant">BMR</span>
                <span className="font-headline-md text-[15px] text-primary">{bmr} kcal</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body-md text-on-surface-variant">Activity</span>
                <span className="font-body-md text-primary">
                  {ACTIVITY_LABELS[user.activity_level] || user.activity_level}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body-md text-on-surface-variant">TDEE</span>
                <span className="font-headline-md text-[15px] text-primary">{tdee} kcal</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body-md text-on-surface-variant">Goal</span>
                <span className="font-body-md text-primary">
                  {GOAL_LABELS[user.goal] || user.goal}
                </span>
              </div>
              <div className="w-full h-px bg-outline-variant/30 my-0.5" />
              <div className="flex justify-between items-center">
                <span className="font-label-md text-on-surface font-bold">Final target</span>
                <span className="font-headline-md text-[16px] text-primary font-bold">{target_calories} kcal</span>
              </div>
              {deficit_or_surplus !== 0 && (
                <p className="font-body-md text-on-surface-variant">
                  {deficit_or_surplus > 0 ? '+' : ''}{deficit_or_surplus} kcal from maintenance
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
