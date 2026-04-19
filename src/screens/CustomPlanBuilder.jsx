import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generatePlan } from '../utils/planGenerator';
import { updateData } from '../utils/storage';
import { useThemeColors } from '../hooks/useTheme';

const DAYS = [
  { label: 'Mon', value: 'monday', letter: 'M' },
  { label: 'Tue', value: 'tuesday', letter: 'T' },
  { label: 'Wed', value: 'wednesday', letter: 'W' },
  { label: 'Thu', value: 'thursday', letter: 'T' },
  { label: 'Fri', value: 'friday', letter: 'F' },
  { label: 'Sat', value: 'saturday', letter: 'S' },
  { label: 'Sun', value: 'sunday', letter: 'S' },
];

export default function CustomPlanBuilder() {
  const C = useThemeColors();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedDays, setSelectedDays] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  function toggleDay(value) {
    setSelectedDays(prev =>
      prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value]
    );
  }

  async function handleComplete() {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const plan = await generatePlan({
        activity: 'gym',
        gym_goal: 'build_max',
        experience_level: 'Intermediate',
        frequency: selectedDays.length,
        equipment: 'Full Gym',
        split_preference: 'none',
        training_style: 'self_directed',
        scheduled_days: selectedDays,
      });
      plan.type = 'custom';
      updateData(d => {
        d.onboarding_complete = true;
        d.user.user_type = 'self_directed';
        d.user.persona = 'self_directed';
        d.plans.push(plan);
        return d;
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('CustomPlanBuilder error:', err);
      setIsCreating(false);
    }
  }

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: C.navBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem' }}>
          <span className="font-headline" style={{ fontSize: '1.3rem', fontWeight: 800, color: C.primary, letterSpacing: '-0.03em', textTransform: 'uppercase' }}>Regulr</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.faint }}>
            {step === 1 ? 'Step 1 / 2' : 'Step 2 / 2'}
          </span>
        </div>
      </header>

      <main style={{ flex: 1, padding: '7rem 2rem 8rem', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        {step === 1 && (
          <div>
            <h2 className="font-headline" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: C.primary, marginBottom: '0.75rem' }}>
              Which days will you train?
            </h2>
            <p style={{ fontSize: '1rem', color: C.faint, marginBottom: '2rem', lineHeight: 1.6 }}>
              Pick the days that work for your schedule. You can log any session on any day.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', maxWidth: '480px', marginBottom: '2rem' }}>
              {DAYS.map(d => {
                const isSelected = selectedDays.includes(d.value);
                return (
                  <div key={d.value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => toggleDay(d.value)}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: '12px',
                        background: isSelected ? C.primary : C.high,
                        color: isSelected ? C.onPrimary : C.text,
                        border: isSelected ? `2px solid ${C.primary}` : '2px solid transparent',
                        fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '1.1rem',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.12s',
                        boxShadow: isSelected ? `0 0 0 4px rgba(${C.primaryRgb},0.2)` : 'none',
                      }}
                    >
                      {d.letter}
                    </button>
                    <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isSelected ? C.primary : C.faint }}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={selectedDays.length === 0}
              style={{
                padding: '0.875rem 2.5rem', borderRadius: '100px',
                fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Manrope, sans-serif',
                cursor: selectedDays.length > 0 ? 'pointer' : 'not-allowed',
                background: selectedDays.length > 0 ? C.text : C.separator,
                color: selectedDays.length > 0 ? C.bg : C.faint,
                border: 'none', transition: 'opacity 0.2s',
                opacity: selectedDays.length > 0 ? 1 : 0.5,
              }}
            >
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-headline" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: C.primary, marginBottom: '0.75rem' }}>
              Ready to track.
            </h2>
            <p style={{ fontSize: '1rem', color: C.faint, marginBottom: '2rem', lineHeight: 1.6 }}>
              You'll train <strong style={{ color: C.text }}>{selectedDays.length} day{selectedDays.length !== 1 ? 's' : ''}</strong> per week. Log sessions, track calories, and get AI insights after every workout.
            </p>

            <div style={{ background: C.low, borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', maxWidth: '480px' }}>
              <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.faint, marginBottom: '1rem' }}>Your Schedule</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedDays.map(d => (
                  <span key={d} style={{ padding: '6px 14px', borderRadius: '8px', background: C.highest, color: C.text, fontSize: '0.88rem', fontWeight: 700 }}>
                    {d.charAt(0).toUpperCase() + d.slice(1, 3)}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={handleComplete}
                disabled={isCreating}
                style={{
                  padding: '1rem 2.5rem', borderRadius: '100px',
                  fontSize: '1rem', fontWeight: 700, fontFamily: 'Manrope, sans-serif',
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  background: C.text, color: C.bg,
                  border: 'none', opacity: isCreating ? 0.6 : 1,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
              >
                {isCreating ? 'Creating…' : 'Start tracking →'}
              </button>
              <button
                onClick={() => setStep(1)}
                style={{ background: 'none', border: 'none', color: C.faint, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}
              >
                ← Back
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
