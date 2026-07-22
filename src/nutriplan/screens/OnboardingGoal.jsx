import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import SelectionCard from '../components/SelectionCard';
import { updateData, getData } from '../utils/storage';

const GOALS = [
  { value: 'fat_loss', title: 'Lose fat', description: 'Reduce body fat while preserving muscle', icon: 'fitness_center' },
  { value: 'muscle_gain', title: 'Build muscle', description: 'Gain lean mass with a caloric surplus', icon: 'trending_up' },
  { value: 'maintenance', title: 'Maintain weight', description: 'Stay right where you are', icon: 'balance' },
  { value: 'recomp', title: 'Body recomp', description: 'Lose fat and build muscle simultaneously', icon: 'auto_awesome' },
];

export default function OnboardingGoal() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const data = getData();
    if (!data.analytics.onboarding_started) {
      updateData('analytics.onboarding_started', new Date().toISOString());
    }
  }, []);

  const handleContinue = () => {
    if (!selected) return;
    updateData('user.goal', selected);
    navigate('/nutriplan/onboarding/stats');
  };

  return (
    <div className="min-h-screen bg-surface-paper relative overflow-hidden">
      <ProgressBar step={1} total={5} />

      {/* Organic background blobs */}
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary-container/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-clay-accent/10 blur-3xl" />

      <main className="flex-grow flex flex-col max-w-xl mx-auto w-full px-container-margin pb-section-padding pt-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-display-lg text-display-lg text-primary mb-1">NutriPlan</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Eat well for your goal.</p>
        </div>

        {/* Question */}
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">What's your goal?</h2>

        {/* Goal cards */}
        <div className="flex flex-col gap-4 flex-grow">
          {GOALS.map((goal) => (
            <SelectionCard
              key={goal.value}
              title={goal.title}
              description={goal.description}
              icon={goal.icon}
              selected={selected === goal.value}
              onClick={() => setSelected(goal.value)}
            />
          ))}
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!selected}
          className={`w-full py-4 rounded-xl font-label-md text-label-md font-bold uppercase tracking-widest shadow-md transition-all duration-200 mt-8 ${
            selected
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
