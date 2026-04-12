import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfettiEffect from '../components/ConfettiEffect';
import { generatePlan } from '../utils/planGenerator';
import { getData, updateData } from '../utils/storage';
import { trackOnboardingStarted, trackOnboardingStep, trackPlanCreated } from '../utils/analytics';
import chatbotFlow from '../data/chatbot-flow.json';

const C = {
  bg: '#131313', low: '#1c1b1b', container: '#201f1f',
  high: '#2a2a2a', highest: '#353534', lowest: '#0e0e0e',
  primary: '#e9c349', onPrimary: '#3c2f00', green: '#2ff801',
  text: '#e5e2e1', muted: '#c4c7c7', faint: '#7b7c7c',
};

const STEP_ORDER = ['welcome', 'experience', 'days', 'schedule', 'equipment'];

const STEP_LABELS = {
  welcome: 'What is your main goal?',
  experience: 'Your experience level?',
  days: 'How many days per week?',
  schedule: 'Which specific days work for you?',
  equipment: 'What equipment do you have?',
};

const STEP_SUBTITLES = {
  schedule: "We'll optimize your recovery based on your availability.",
  equipment: "We'll only program what you can actually use.",
  days: "Pick what's sustainable, not what sounds impressive.",
};

const GOAL_LABELS = {
  muscle: 'Muscle', fat_loss: 'Fat Loss',
  strength: 'Strength', general: 'General Fitness',
};
const EQUIPMENT_LABELS = {
  full_gym: 'Full Gym', home_dumbbells: 'Home Gym (Dumbbells)', bodyweight: 'Bodyweight Only',
};
const PLAN_TYPE_LABELS = { 2: 'Full Body A/B', 3: 'Push / Pull / Legs', 4: 'Upper / Lower', 5: 'Upper / Lower' };

export default function PlanBuilder() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(chatbotFlow.initial_step);
  const [answers, setAnswers] = useState({});
  const [stepIndex, setStepIndex] = useState(0);
  const [completedPairs, setCompletedPairs] = useState([]); // {stepKey, selectedLabel}
  const [multiSelect, setMultiSelect] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => { trackOnboardingStarted(); }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [completedPairs, currentStep]);

  function advanceStep(newAnswers, selectedLabel, nextStep) {
    setCompletedPairs(prev => [...prev, { stepKey: currentStep, selectedLabel }]);
    setAnswers(newAnswers);
    setStepIndex(prev => prev + 1);
    setCurrentStep(nextStep);
  }

  function handleOptionSelect(option) {
    const stepData = chatbotFlow.steps[currentStep];
    const newAnswers = { ...answers };
    if (stepData.field) newAnswers[stepData.field] = option.value;

    trackOnboardingStep(stepIndex + 1, currentStep, option.label);

    if (option.next === 'complete') {
      setCompletedPairs(prev => [...prev, { stepKey: currentStep, selectedLabel: option.label }]);
      setAnswers(newAnswers);
      handleComplete(newAnswers);
    } else if (currentStep === 'confirm') {
      // Confirm step — go to complete
      setCompletedPairs(prev => [...prev, { stepKey: currentStep, selectedLabel: option.label }]);
      setAnswers(newAnswers);
      handleComplete(newAnswers);
    } else {
      advanceStep(newAnswers, option.label, option.next || 'summary');
    }
  }

  function handleMultiSelectConfirm() {
    if (multiSelect.length === 0) return;
    const stepData = chatbotFlow.steps[currentStep];
    const newAnswers = { ...answers };
    if (stepData.field) newAnswers[stepData.field] = multiSelect;
    const label = multiSelect.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
    trackOnboardingStep(stepIndex + 1, currentStep, label);
    setMultiSelect([]);
    advanceStep(newAnswers, label, stepData.next || 'equipment');
  }

  async function handleComplete(finalAnswers) {
    setIsGenerating(true);
    const enrichedAnswers = { ...finalAnswers, activity: 'gym' };
    try {
      const plan = await generatePlan(enrichedAnswers);
      setShowConfetti(true);
      updateData(data => {
        data.onboarding_complete = true;
        data.user.persona = 'neutral';
        data.plans.push(plan);
        return data;
      });
      trackPlanCreated({
        activity: 'gym',
        experience_level: enrichedAnswers.experience_level,
        frequency: enrichedAnswers.frequency,
        persona: 'neutral',
        session_duration: enrichedAnswers.session_duration,
      });
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error('Plan generation failed:', err);
      setIsGenerating(false);
    }
  }

  const visibleStepIndex = STEP_ORDER.indexOf(currentStep);
  const isSummaryOrConfirm = currentStep === 'summary' || currentStep === 'confirm';
  const upcomingStepIndex = visibleStepIndex + 1;
  const upcomingStep = upcomingStepIndex < STEP_ORDER.length ? STEP_ORDER[upcomingStepIndex] : null;

  function renderOptions() {
    const step = chatbotFlow.steps[currentStep];
    if (!step) return null;

    // Summary / confirm step
    if (currentStep === 'summary' || currentStep === 'confirm') {
      const confirmStep = chatbotFlow.steps['confirm'];
      const opt = confirmStep?.options?.[0];
      return (
        <div>
          {/* Plan summary card */}
          <div style={{ background: C.low, borderRadius: '16px', padding: '2rem', marginBottom: '2rem', maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <p className="font-headline" style={{ fontSize: '1.1rem', fontWeight: 700 }}>Plan Summary</p>
              <span style={{ color: C.primary, fontSize: '1.2rem' }}>◎</span>
            </div>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {[
                { icon: '◉', label: 'Target Goal', value: GOAL_LABELS[answers.gym_goal] || answers.gym_goal },
                { icon: '▦', label: 'Frequency', value: answers.frequency ? `${answers.frequency} Day${answers.frequency > 1 ? 's' : ''} / Week` : null,
                  sub: answers.scheduled_days?.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', '),
                  dots: answers.frequency,
                },
                { icon: '◈', label: 'Equipment Level', value: EQUIPMENT_LABELS[answers.equipment] || answers.equipment },
              ].filter(r => r.value).map(({ icon, label, value, sub, dots }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '44px', height: '44px', background: C.highest, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.primary, fontSize: '1.1rem' }}>{icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint, marginBottom: '4px' }}>{label}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <p className="font-headline" style={{ fontSize: '1.1rem', fontWeight: 700 }}>{value}</p>
                      {dots && (
                        <div style={{ display: 'flex', gap: '3px' }}>
                          {[1,2,3,4,5].map(i => (
                            <div key={i} style={{ width: '7px', height: '7px', borderRadius: '2px', background: i <= dots ? C.primary : C.highest }} />
                          ))}
                        </div>
                      )}
                    </div>
                    {sub && <p style={{ fontSize: '0.78rem', color: C.faint, marginTop: '2px' }}>{sub}</p>}
                  </div>
                </div>
              ))}
            </div>
            {/* Info box */}
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: C.lowest, borderRadius: '10px', borderLeft: `2px solid rgba(233,195,73,0.3)`, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ color: C.primary, flexShrink: 0, marginTop: '1px' }}>ⓘ</span>
              <p style={{ fontSize: '0.8rem', color: C.faint, lineHeight: 1.6 }}>Your plan has been optimized based on your inputs. You can adjust frequency at any time from settings.</p>
            </div>
          </div>

          {/* CTA */}
          {opt && (
            <button
              onClick={() => handleOptionSelect(opt)}
              style={{ width: '100%', maxWidth: '520px', padding: '1.2rem 2rem', borderRadius: '100px', background: C.text, color: C.bg, border: 'none', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.15s', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Create my dashboard →
            </button>
          )}
          <button style={{ marginTop: '1rem', background: 'none', border: 'none', color: C.faint, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer', display: 'block' }}
            onClick={() => { setCurrentStep('welcome'); setCompletedPairs([]); setAnswers({}); setStepIndex(0); }}
          >
            Edit plan details
          </button>
        </div>
      );
    }

    if (step.type === 'multi_select') {
      const limit = answers.frequency || 7;
      const DAY_LETTERS = { monday: 'M', tuesday: 'T', wednesday: 'W', thursday: 'T', friday: 'F', saturday: 'S', sunday: 'S' };
      return (
        <div>
          <p style={{ fontSize: '0.82rem', color: C.faint, marginBottom: '1.25rem' }}>
            Select <strong style={{ color: C.text }}>{limit}</strong> day{limit > 1 ? 's' : ''}
            {multiSelect.length > 0 && (
              <span style={{ color: multiSelect.length === limit ? C.green : C.primary }}> · {multiSelect.length}/{limit} chosen</span>
            )}
          </p>
          {/* Square day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', maxWidth: '480px' }}>
            {step.options.map(opt => {
              const isSelected = multiSelect.includes(opt.value);
              const isDisabled = !isSelected && multiSelect.length >= limit;
              return (
                <div key={opt.value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => {
                      if (isDisabled) return;
                      setMultiSelect(prev =>
                        prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value]
                      );
                    }}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: '12px',
                      background: isSelected ? C.primary : C.high,
                      color: isSelected ? C.onPrimary : C.text,
                      border: isSelected ? `2px solid ${C.primary}` : '2px solid transparent',
                      fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '1.1rem',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.3 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.12s',
                      boxShadow: isSelected ? `0 0 0 4px rgba(233,195,73,0.15)` : 'none',
                    }}
                  >
                    {DAY_LETTERS[opt.value] || opt.label[0]}
                  </button>
                  <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isSelected ? C.primary : C.faint }}>
                    {opt.label}
                  </span>
                </div>
              );
            })}
          </div>

          {multiSelect.length > 0 && (
            <button
              onClick={handleMultiSelectConfirm}
              disabled={multiSelect.length !== limit}
              style={{
                marginTop: '2rem', padding: '0.875rem 2.5rem', borderRadius: '100px',
                fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Manrope, sans-serif',
                cursor: multiSelect.length === limit ? 'pointer' : 'not-allowed',
                background: multiSelect.length === limit ? C.text : 'rgba(255,255,255,0.08)',
                color: multiSelect.length === limit ? C.bg : 'rgba(255,255,255,0.28)',
                border: 'none', transition: 'opacity 0.2s',
                opacity: multiSelect.length === limit ? 1 : 0.6,
              }}
            >
              {multiSelect.length === limit
                ? `Confirm — ${multiSelect.slice(0, 3).map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}${multiSelect.length > 3 ? '…' : ''}`
                : `Pick ${limit - multiSelect.length} more`}
            </button>
          )}
        </div>
      );
    }

    if (!step.options) return null;

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {step.options.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleOptionSelect(opt)}
            style={{
              padding: '10px 22px', borderRadius: '8px',
              background: C.high, border: `1px solid rgba(255,255,255,0.1)`,
              color: C.text, fontFamily: 'Manrope, sans-serif',
              fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.color = C.onPrimary; e.currentTarget.style.borderColor = C.primary; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.high; e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <ConfettiEffect trigger={showConfetti} />

      {/* ── Fixed header ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 2rem',
        background: 'rgba(19,19,19,0.88)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <span className="font-headline" style={{ fontSize: '1.4rem', fontWeight: 800, color: C.primary, letterSpacing: '-0.03em', textTransform: 'uppercase' }}>Regulr</span>
        {visibleStepIndex >= 0 && (
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.faint }}>
            Onboarding {String(Math.min(visibleStepIndex + 1, STEP_ORDER.length)).padStart(2, '0')}/{String(STEP_ORDER.length).padStart(2, '0')}
          </span>
        )}
      </header>

      {/* ── Side progress dots (desktop) ── */}
      <div style={{ position: 'fixed', left: '3rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '14px', zIndex: 40 }}>
        {STEP_ORDER.map((step, i) => {
          const isDone = i < visibleStepIndex || (isSummaryOrConfirm && i < STEP_ORDER.length);
          const isActive = i === visibleStepIndex;
          return (
            <div key={step} style={{
              width: isActive ? '8px' : '6px', height: isActive ? '8px' : '6px',
              borderRadius: '50%',
              background: isDone ? C.green : isActive ? C.primary : C.highest,
              transition: 'all 0.3s',
              boxShadow: isActive ? `0 0 8px rgba(233,195,73,0.5)` : 'none',
            }} />
          );
        })}
      </div>

      {/* ── Scrollable content ── */}
      <main
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '7rem 2rem 12rem', maxWidth: '680px', margin: '0 auto', width: '100%' }}
      >
        {/* Past Q&A pairs */}
        {completedPairs.map((pair, i) => (
          <div key={i} style={{ marginBottom: '3.5rem', opacity: 0.4, pointerEvents: 'none' }}>
            <h2 className="font-headline" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.02em', color: C.text, lineHeight: 1.1, marginBottom: '1rem' }}>
              {STEP_LABELS[pair.stepKey] || pair.stepKey}
            </h2>
            <span style={{
              display: 'inline-flex', padding: '8px 20px', borderRadius: '8px',
              background: C.primary, color: C.onPrimary,
              fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '0.95rem',
            }}>
              {pair.selectedLabel}
            </span>
          </div>
        ))}

        {/* Active question */}
        {!isGenerating && (
          <div style={{ marginBottom: '2rem' }}>
            {isSummaryOrConfirm ? (
              <div>
                <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.primary, marginBottom: '1rem' }}>Onboarding Complete</p>
                <h2 className="font-headline" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: '1rem', fontStyle: 'italic' }}>
                  Ready for <span style={{ color: C.primary }}>Regulr.</span>
                </h2>
                <p style={{ fontSize: '1rem', color: C.faint, marginBottom: '2rem', lineHeight: 1.6 }}>
                  Your blueprint for consistent progress is locked and loaded.
                </p>
                {renderOptions()}
              </div>
            ) : (
              <div>
                <h2 className="font-headline" style={{
                  fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800,
                  letterSpacing: '-0.02em', lineHeight: 1.1,
                  color: C.primary, marginBottom: '0.75rem',
                }}>
                  {STEP_LABELS[currentStep] || chatbotFlow.steps[currentStep]?.bot_message}
                </h2>
                {STEP_SUBTITLES[currentStep] && (
                  <p style={{ fontSize: '1rem', color: C.faint, marginBottom: '1.75rem', lineHeight: 1.6 }}>
                    {STEP_SUBTITLES[currentStep]}
                  </p>
                )}
                <div style={{ marginTop: STEP_SUBTITLES[currentStep] ? 0 : '1.5rem' }}>
                  {renderOptions()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upcoming peek */}
        {upcomingStep && !isSummaryOrConfirm && !isGenerating && (
          <div style={{ opacity: 0.18, pointerEvents: 'none', marginTop: '3.5rem' }}>
            <h2 className="font-headline" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, letterSpacing: '-0.02em', color: C.text, lineHeight: 1.1 }}>
              {STEP_LABELS[upcomingStep]}
            </h2>
          </div>
        )}

        {/* Generating */}
        {isGenerating && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div style={{ display: 'inline-flex', gap: '8px', marginBottom: '1rem' }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="animate-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.primary, animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <p style={{ fontSize: '0.9rem', color: C.faint }}>Building your plan…</p>
          </div>
        )}
      </main>

      {/* ── Floating bottom bar (decorative / ambient) ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '0 1.5rem 2rem', background: `linear-gradient(to top, ${C.bg} 55%, transparent 100%)`, pointerEvents: 'none', zIndex: 30 }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px', background: C.high, borderRadius: '100px', padding: '0.875rem 1.25rem 0.875rem 1.5rem', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
          <span style={{ color: C.faint, fontSize: '1.1rem', flexShrink: 0 }}>◉</span>
          <span style={{ flex: 1, fontSize: '0.88rem', color: C.faint }}>Type or select an option…</span>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: C.onPrimary, fontWeight: 800, fontSize: '1.1rem', lineHeight: 1 }}>↑</span>
          </div>
        </div>
      </div>
    </div>
  );
}
