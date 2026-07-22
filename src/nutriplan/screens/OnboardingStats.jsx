import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import SelectionCard from '../components/SelectionCard';
import { updateMultiple } from '../utils/storage';

const LB_PER_KG = 2.20462;
const CM_PER_FT = 30.48;
const CM_PER_IN = 2.54;

function cmToFtIn(cm) {
  const totalIn = cm / CM_PER_IN;
  const ft = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn % 12);
  return { ft, inches };
}

function ftInToCm(ft, inches) {
  return (ft * 12 + inches) * CM_PER_IN;
}

export default function OnboardingStats() {
  const navigate = useNavigate();

  const [sex, setSex] = useState(null);
  const [age, setAge] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [weightValue, setWeightValue] = useState('');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [heightValue, setHeightValue] = useState('');

  const getWeightKg = () => {
    const v = parseFloat(weightValue);
    if (isNaN(v)) return null;
    return weightUnit === 'kg' ? v : v / LB_PER_KG;
  };

  const getHeightCm = () => {
    const v = parseFloat(heightValue);
    if (isNaN(v)) return null;
    if (heightUnit === 'cm') return v;
    // When in ft mode, heightValue is stored as total inches equivalent via the input
    // We parse the displayed ft.in format
    const parts = heightValue.split('.');
    const ft = parseInt(parts[0]) || 0;
    const inches = parseInt(parts[1]) || 0;
    return ftInToCm(ft, inches);
  };

  const toggleWeightUnit = () => {
    const v = parseFloat(weightValue);
    if (weightUnit === 'kg') {
      setWeightUnit('lb');
      if (!isNaN(v)) setWeightValue(Math.round(v * LB_PER_KG).toString());
    } else {
      setWeightUnit('kg');
      if (!isNaN(v)) setWeightValue(Math.round(v / LB_PER_KG).toString());
    }
  };

  const toggleHeightUnit = () => {
    const v = parseFloat(heightValue);
    if (heightUnit === 'cm') {
      setHeightUnit('ft');
      if (!isNaN(v)) {
        const { ft, inches } = cmToFtIn(v);
        setHeightValue(`${ft}.${inches}`);
      }
    } else {
      setHeightUnit('cm');
      if (heightValue) {
        const parts = heightValue.split('.');
        const ft = parseInt(parts[0]) || 0;
        const inches = parseInt(parts[1]) || 0;
        const cm = Math.round(ftInToCm(ft, inches));
        setHeightValue(cm.toString());
      }
    }
  };

  const weightKg = getWeightKg();
  const heightCm = getHeightCm();
  const ageNum = parseInt(age);

  const isValid =
    sex !== null &&
    !isNaN(ageNum) && ageNum >= 13 && ageNum <= 100 &&
    weightKg !== null && weightKg >= 30 && weightKg <= 300 &&
    heightCm !== null && heightCm >= 100 && heightCm <= 250;

  const handleContinue = () => {
    if (!isValid) return;
    updateMultiple({
      'user.sex': sex,
      'user.age': ageNum,
      'user.height_cm': Math.round(heightCm),
      'user.weight_kg': Math.round(weightKg * 10) / 10,
      'settings.units.weight': weightUnit,
      'settings.units.height': heightUnit,
    });
    navigate('/nutriplan/onboarding/activity');
  };

  return (
    <div className="min-h-screen bg-surface-paper relative overflow-hidden">
      <ProgressBar step={2} total={5} />

      <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary-container/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-clay-accent/10 blur-3xl" />

      <main className="flex-grow flex flex-col max-w-xl mx-auto w-full px-container-margin pb-section-padding pt-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-display-lg text-display-lg text-primary mb-1">About you</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            We use this to calculate your daily metabolism.
          </p>
        </div>

        <div className="flex flex-col gap-6 flex-grow">
          {/* Sex */}
          <div>
            <h3 className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider mb-3">Sex</h3>
            <div className="grid grid-cols-2 gap-4">
              <SelectionCard
                title="Male"
                description=""
                icon="male"
                selected={sex === 'male'}
                onClick={() => setSex('male')}
              />
              <SelectionCard
                title="Female"
                description=""
                icon="female"
                selected={sex === 'female'}
                onClick={() => setSex('female')}
              />
            </div>
          </div>

          {/* Age */}
          <div className="bg-white border border-ink-muted/20 rounded-lg p-6">
            <h3 className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider mb-3">Age</h3>
            <input
              type="number"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="25"
              min={13}
              max={100}
              className="font-numeral-xl text-numeral-xl text-primary bg-transparent border-none focus:ring-0 focus:outline-none w-full"
            />
          </div>

          {/* Height */}
          <div className="bg-white border border-ink-muted/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">Height</h3>
              <button
                onClick={toggleHeightUnit}
                className="font-label-md text-label-md text-primary px-3 py-1 rounded-full bg-primary-container/30 hover:bg-primary-container/50 transition-colors"
              >
                {heightUnit === 'cm' ? 'CM' : 'FT'}
              </button>
            </div>
            <div className="flex items-baseline gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={heightValue}
                onChange={(e) => setHeightValue(e.target.value)}
                placeholder={heightUnit === 'cm' ? '170' : '5.7'}
                className="font-numeral-xl text-numeral-xl text-primary bg-transparent border-none focus:ring-0 focus:outline-none w-full"
              />
              <span className="font-body-md text-body-md text-on-surface-variant">
                {heightUnit === 'cm' ? 'cm' : 'ft.in'}
              </span>
            </div>
          </div>

          {/* Weight */}
          <div className="bg-white border border-ink-muted/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">Weight</h3>
              <button
                onClick={toggleWeightUnit}
                className="font-label-md text-label-md text-primary px-3 py-1 rounded-full bg-primary-container/30 hover:bg-primary-container/50 transition-colors"
              >
                {weightUnit === 'kg' ? 'KG' : 'LB'}
              </button>
            </div>
            <div className="flex items-baseline gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={weightValue}
                onChange={(e) => setWeightValue(e.target.value)}
                placeholder={weightUnit === 'kg' ? '70' : '154'}
                className="font-numeral-xl text-numeral-xl text-primary bg-transparent border-none focus:ring-0 focus:outline-none w-full"
              />
              <span className="font-body-md text-body-md text-on-surface-variant">
                {weightUnit}
              </span>
            </div>
          </div>
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!isValid}
          className={`w-full py-4 rounded-xl font-label-md text-label-md font-bold uppercase tracking-widest shadow-md transition-all duration-200 mt-8 ${
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
