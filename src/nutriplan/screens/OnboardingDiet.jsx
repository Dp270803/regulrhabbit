import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import ChipSelector from '../components/ChipSelector';
import { updateMultiple } from '../utils/storage';

const DIET_OPTIONS = [
  { value: 'omnivore', label: 'Omnivore' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'keto', label: 'Keto' },
];

const CUISINE_OPTIONS = [
  { value: 'indian', label: 'Indian' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'american', label: 'American' },
  { value: 'east_asian', label: 'East Asian' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'mixed', label: 'Mixed' },
];

const ALLERGY_OPTIONS = [
  { value: 'dairy', label: 'Dairy' },
  { value: 'nuts', label: 'Nuts' },
  { value: 'gluten', label: 'Gluten' },
  { value: 'soy', label: 'Soy' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'none', label: 'None' },
];

export default function OnboardingDiet() {
  const navigate = useNavigate();

  const [diet, setDiet] = useState(null);
  const [cuisine, setCuisine] = useState(null);
  const [allergies, setAllergies] = useState([]);

  const isValid = diet !== null && cuisine !== null;

  const handleContinue = () => {
    if (!isValid) return;
    const cleanAllergies = allergies.filter((a) => a !== 'none');
    updateMultiple({
      'user.dietary_preference': diet,
      'user.cuisine': cuisine,
      'user.allergies': cleanAllergies,
    });
    navigate('/nutriplan/onboarding/meals');
  };

  return (
    <div className="min-h-screen bg-surface-paper relative overflow-hidden">
      <ProgressBar step={4} total={5} />

      <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary-container/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-clay-accent/10 blur-3xl" />

      <main className="flex-grow flex flex-col max-w-xl mx-auto w-full px-container-margin pb-section-padding pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-headline-lg text-primary mb-0.5">How do you eat?</h1>
          <p className="font-body-md text-on-surface-variant">
            This helps us tailor your meal plans.
          </p>
        </div>

        <div className="flex flex-col gap-5 flex-grow">
          {/* Diet */}
          <div>
            <h3 className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider mb-2">Diet</h3>
            <ChipSelector
              options={DIET_OPTIONS}
              selected={diet}
              onSelect={setDiet}
            />
          </div>

          {/* Cuisine */}
          <div>
            <h3 className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider mb-2">Cuisine</h3>
            <ChipSelector
              options={CUISINE_OPTIONS}
              selected={cuisine}
              onSelect={setCuisine}
            />
          </div>

          {/* Allergies */}
          <div>
            <h3 className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider mb-2">Allergies</h3>
            <ChipSelector
              options={ALLERGY_OPTIONS}
              selected={allergies}
              onSelect={setAllergies}
              multi
            />
          </div>
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!isValid}
          className={`w-full py-3.5 rounded-xl font-label-md font-bold uppercase tracking-widest shadow-md transition-all duration-200 mt-6 ${
            isValid
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
