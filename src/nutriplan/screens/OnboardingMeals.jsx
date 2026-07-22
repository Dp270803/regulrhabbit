import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import SelectionCard from '../components/SelectionCard';
import { updateData, updateMultiple, getData } from '../utils/storage';
import { calculateTargets } from '../utils/calculations';

const MEAL_OPTIONS = [
  {
    value: 3,
    title: '3 meals',
    description: 'Breakfast, lunch, dinner',
    icon: 'restaurant',
  },
  {
    value: 4,
    title: '4 meals',
    description: 'Breakfast, lunch, snack, dinner',
    icon: 'brunch_dining',
  },
  {
    value: 5,
    title: '5 meals',
    description: 'Breakfast, snack, lunch, snack, dinner',
    icon: 'tapas',
  },
];

export default function OnboardingMeals() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const handleContinue = () => {
    if (selected === null) return;

    // 1. Save meals_per_day
    updateData('user.meals_per_day', selected);

    // 2. Read full user profile
    const data = getData();
    const user = data.user;

    // 3. Calculate targets
    const targets = calculateTargets(user);

    // 4-6. Save targets, mark complete, record analytics
    updateMultiple({
      'targets.bmr': targets.bmr,
      'targets.tdee': targets.tdee,
      'targets.target_calories': targets.target_calories,
      'targets.protein_g': targets.protein_g,
      'targets.fat_g': targets.fat_g,
      'targets.carb_g': targets.carb_g,
      'targets.deficit_or_surplus': targets.deficit_or_surplus,
      'onboarding_complete': true,
      'analytics.onboarding_completed': new Date().toISOString(),
    });

    // 7. Navigate to dashboard
    navigate('/nutriplan/dashboard');
  };

  return (
    <div className="min-h-screen bg-surface-paper relative overflow-hidden">
      <ProgressBar step={5} total={5} />

      <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary-container/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-clay-accent/10 blur-3xl" />

      <main className="flex-grow flex flex-col max-w-xl mx-auto w-full px-container-margin pb-section-padding pt-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-display-lg text-display-lg text-primary mb-1">How many meals a day?</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            We'll split your calories across your meals.
          </p>
        </div>

        {/* Meal cards */}
        <div className="flex flex-col gap-4 flex-grow">
          {MEAL_OPTIONS.map((option) => (
            <SelectionCard
              key={option.value}
              title={option.title}
              description={option.description}
              icon={option.icon}
              selected={selected === option.value}
              onClick={() => setSelected(option.value)}
            />
          ))}
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={selected === null}
          className={`w-full py-4 rounded-xl font-label-md text-label-md font-bold uppercase tracking-widest shadow-md transition-all duration-200 mt-8 ${
            selected !== null
              ? 'bg-primary-container text-on-primary-container hover:opacity-90 active:scale-[0.98]'
              : 'bg-ink-muted text-white opacity-50 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </main>
    </div>
  );
}
