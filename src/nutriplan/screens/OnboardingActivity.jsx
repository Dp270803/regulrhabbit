import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import SelectionCard from '../components/SelectionCard';
import { updateData } from '../utils/storage';

const LEVELS = [
  { value: 'sedentary', title: 'Sedentary', description: 'Desk job, little to no exercise', icon: 'weekend' },
  { value: 'light', title: 'Lightly active', description: 'Light exercise 1-3 days/week', icon: 'directions_walk' },
  { value: 'moderate', title: 'Moderately active', description: 'Moderate exercise 3-5 days/week', icon: 'directions_run' },
  { value: 'active', title: 'Active', description: 'Hard exercise 6-7 days/week', icon: 'exercise' },
  { value: 'very_active', title: 'Very active', description: 'Intense daily training or physical job', icon: 'local_fire_department' },
];

export default function OnboardingActivity() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const handleContinue = () => {
    if (!selected) return;
    updateData('user.activity_level', selected);
    navigate('/nutriplan/onboarding/diet');
  };

  return (
    <div className="min-h-screen bg-surface-paper relative overflow-hidden">
      <ProgressBar step={3} total={5} />

      <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary-container/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-clay-accent/10 blur-3xl" />

      <main className="flex-grow flex flex-col max-w-xl mx-auto w-full px-container-margin pb-section-padding pt-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-display-lg text-display-lg text-primary mb-1">How active are you?</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Be honest — this changes your numbers significantly.
          </p>
        </div>

        {/* Activity cards */}
        <div className="flex flex-col gap-4 flex-grow">
          {LEVELS.map((level) => (
            <SelectionCard
              key={level.value}
              title={level.title}
              description={level.description}
              icon={level.icon}
              selected={selected === level.value}
              onClick={() => setSelected(level.value)}
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
