import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useThemeColors, useTheme } from '../hooks/useTheme';
import { getData, updateData } from '../utils/storage';
import exercisesData from '../data/exercises.json';
import ConfettiEffect from '../components/ConfettiEffect';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
const DAY_LETTERS = { monday: 'M', tuesday: 'T', wednesday: 'W', thursday: 'T', friday: 'F', saturday: 'S', sunday: 'S' };

// Templates: {name, days, sessions: {[day]: [{name, sets, reps}]}}
const TEMPLATES = {
  ppl: {
    name: 'Push / Pull / Legs',
    days: ['monday', 'tuesday', 'wednesday', 'friday', 'saturday', 'sunday'],
    sessions: {
      monday:    { title: 'Push A', exercises: [{ name: 'Flat Barbell Bench Press', sets: 4, reps: '6-8' }, { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12' }, { name: 'Overhead Press', sets: 3, reps: '8-10' }, { name: 'Dumbbell Lateral Raise', sets: 4, reps: '15-20' }, { name: 'Tricep Pushdown (Rope)', sets: 3, reps: '12-15' }] },
      tuesday:   { title: 'Pull A', exercises: [{ name: 'Barbell Deadlift', sets: 3, reps: '4-6' }, { name: 'Bent-Over Barbell Row', sets: 4, reps: '6-8' }, { name: 'Lat Pulldown', sets: 3, reps: '10-12' }, { name: 'Face Pull', sets: 4, reps: '15-20' }, { name: 'Dumbbell Bicep Curl', sets: 3, reps: '12-15' }] },
      wednesday: { title: 'Legs A', exercises: [{ name: 'Barbell Back Squat', sets: 4, reps: '6-8' }, { name: 'Romanian Deadlift', sets: 3, reps: '10-12' }, { name: 'Leg Press', sets: 3, reps: '12-15' }, { name: 'Leg Curl', sets: 3, reps: '10-12' }, { name: 'Standing Calf Raise', sets: 4, reps: '12-15' }] },
      friday:    { title: 'Push B', exercises: [{ name: 'Incline Barbell Bench Press', sets: 4, reps: '6-8' }, { name: 'Dumbbell Bench Press', sets: 3, reps: '10-12' }, { name: 'Dumbbell Shoulder Press', sets: 3, reps: '10-12' }, { name: 'Cable Lateral Raise', sets: 4, reps: '15-20' }, { name: 'Skullcrusher', sets: 3, reps: '10-12' }] },
      saturday:  { title: 'Pull B', exercises: [{ name: 'Pull-Up', sets: 3, reps: '6-10' }, { name: 'Seated Cable Row', sets: 4, reps: '8-10' }, { name: 'Neutral Grip Lat Pulldown', sets: 3, reps: '10-12' }, { name: 'Dumbbell Rear Delt Fly', sets: 4, reps: '15-20' }, { name: 'Hammer Curl', sets: 3, reps: '12-15' }] },
      sunday:    { title: 'Legs B', exercises: [{ name: 'Bulgarian Split Squat', sets: 4, reps: '8-10' }, { name: 'Hack Squat', sets: 3, reps: '10-12' }, { name: 'Leg Extension', sets: 3, reps: '12-15' }, { name: 'Lying Leg Curl', sets: 3, reps: '10-12' }, { name: 'Seated Calf Raise', sets: 4, reps: '15-20' }] },
    },
  },
  upper_lower: {
    name: 'Upper / Lower',
    days: ['monday', 'tuesday', 'thursday', 'friday'],
    sessions: {
      monday:   { title: 'Upper A', exercises: [{ name: 'Flat Barbell Bench Press', sets: 4, reps: '6-8' }, { name: 'Bent-Over Barbell Row', sets: 4, reps: '6-8' }, { name: 'Overhead Press', sets: 3, reps: '8-10' }, { name: 'Lat Pulldown', sets: 3, reps: '10-12' }, { name: 'Dumbbell Bicep Curl', sets: 3, reps: '12-15' }] },
      tuesday:  { title: 'Lower A', exercises: [{ name: 'Barbell Back Squat', sets: 4, reps: '6-8' }, { name: 'Romanian Deadlift', sets: 3, reps: '10-12' }, { name: 'Leg Press', sets: 3, reps: '12-15' }, { name: 'Leg Curl', sets: 3, reps: '10-12' }, { name: 'Standing Calf Raise', sets: 4, reps: '12-15' }] },
      thursday: { title: 'Upper B', exercises: [{ name: 'Incline Dumbbell Press', sets: 4, reps: '8-10' }, { name: 'Seated Cable Row', sets: 4, reps: '8-10' }, { name: 'Dumbbell Shoulder Press', sets: 3, reps: '10-12' }, { name: 'Neutral Grip Lat Pulldown', sets: 3, reps: '10-12' }, { name: 'Tricep Pushdown (Rope)', sets: 3, reps: '12-15' }] },
      friday:   { title: 'Lower B', exercises: [{ name: 'Barbell Deadlift', sets: 3, reps: '4-6' }, { name: 'Bulgarian Split Squat', sets: 3, reps: '8-10' }, { name: 'Leg Extension', sets: 3, reps: '12-15' }, { name: 'Lying Leg Curl', sets: 3, reps: '10-12' }, { name: 'Seated Calf Raise', sets: 3, reps: '15-20' }] },
    },
  },
  full_body: {
    name: 'Full Body',
    days: ['monday', 'wednesday', 'friday'],
    sessions: {
      monday:    { title: 'Full Body A', exercises: [{ name: 'Barbell Back Squat', sets: 3, reps: '6-8' }, { name: 'Flat Barbell Bench Press', sets: 3, reps: '6-8' }, { name: 'Bent-Over Barbell Row', sets: 3, reps: '6-8' }, { name: 'Overhead Press', sets: 2, reps: '8-10' }, { name: 'Romanian Deadlift', sets: 2, reps: '10-12' }] },
      wednesday: { title: 'Full Body B', exercises: [{ name: 'Barbell Deadlift', sets: 3, reps: '4-6' }, { name: 'Incline Dumbbell Press', sets: 3, reps: '8-10' }, { name: 'Lat Pulldown', sets: 3, reps: '10-12' }, { name: 'Dumbbell Shoulder Press', sets: 2, reps: '10-12' }, { name: 'Leg Press', sets: 3, reps: '12-15' }] },
      friday:    { title: 'Full Body C', exercises: [{ name: 'Bulgarian Split Squat', sets: 3, reps: '8-10' }, { name: 'Dumbbell Bench Press', sets: 3, reps: '10-12' }, { name: 'Seated Cable Row', sets: 3, reps: '10-12' }, { name: 'Face Pull', sets: 3, reps: '15-20' }, { name: 'Dumbbell Bicep Curl', sets: 2, reps: '12-15' }] },
    },
  },
};

// Exercise autocomplete input
function ExerciseInput({ onAdd, C }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const filtered = exercisesData
      .filter(e => e.name.toLowerCase().includes(q))
      .slice(0, 8);
    setResults(filtered);
  }, [query]);

  function pick(ex) {
    onAdd(ex.name);
    setQuery('');
    setResults([]);
    ref.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && query.trim()) {
      if (results.length > 0) pick(results[0]);
      else { onAdd(query.trim()); setQuery(''); setResults([]); }
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={ref}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Search or type exercise name…"
        style={{
          width: '100%', padding: '10px 14px', borderRadius: '8px',
          border: `1px solid ${focused ? C.primary : C.border}`,
          background: C.container, color: C.text, fontSize: '0.9rem',
          boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.15s',
        }}
      />
      {results.length > 0 && focused && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: C.low, border: `1px solid ${C.border}`, borderRadius: '8px',
          marginTop: '4px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {results.map(ex => (
            <button
              key={ex.name}
              onMouseDown={() => pick(ex)}
              style={{
                width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', background: 'none', border: 'none',
                cursor: 'pointer', color: C.text, textAlign: 'left',
                borderBottom: `1px solid ${C.separator}`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.separator}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{ex.name}</span>
              <span style={{ fontSize: '0.65rem', color: C.faint, letterSpacing: '0.06em' }}>{ex.group}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Single day exercise list
function DayExercises({ day, exercises, onChange, C }) {
  function removeEx(i) {
    onChange(exercises.filter((_, idx) => idx !== i));
  }
  function addEx(name) {
    onChange([...exercises, { name, sets: 3, reps: '8-12', load_kg: '' }]);
  }
  function updateEx(i, field, val) {
    const next = exercises.map((e, idx) => idx === i ? { ...e, [field]: val } : e);
    onChange(next);
  }

  return (
    <div>
      {exercises.length > 0 && (
        <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {exercises.map((ex, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 52px 72px 72px 28px', gap: '6px', alignItems: 'center',
            }}>
              <p style={{ fontSize: '0.85rem', color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={ex.name}>{ex.name}</p>
              {[
                { key: 'sets', placeholder: '3', type: 'number' },
                { key: 'reps', placeholder: '8-12', type: 'text' },
                { key: 'load_kg', placeholder: 'kg (opt)', type: 'number' },
              ].map(f => (
                <input
                  key={f.key}
                  type={f.type}
                  placeholder={f.placeholder}
                  value={ex[f.key] || ''}
                  onChange={e => updateEx(i, f.key, e.target.value)}
                  style={{
                    padding: '6px 8px', borderRadius: '6px', border: `1px solid ${C.border}`,
                    background: C.container, color: C.text, fontSize: '0.8rem',
                    width: '100%', boxSizing: 'border-box', outline: 'none', textAlign: 'center',
                  }}
                />
              ))}
              <button
                onClick={() => removeEx(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint, fontSize: '1rem', padding: '2px', lineHeight: 1 }}
              >×</button>
            </div>
          ))}
          {/* Column headers - shown once above */}
        </div>
      )}
      <ExerciseInput onAdd={addEx} C={C} />
    </div>
  );
}

export default function PlanImporter() {
  const C = useThemeColors();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isCritique = searchParams.get('critique') === '1';

  const [step, setStep] = useState('profile'); // 'profile' | 'days' | 'exercises' | 'saving'
  const [profile, setProfile] = useState({ goal: '', experience: '', name: '' });
  const [selectedDays, setSelectedDays] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [dayExercises, setDayExercises] = useState({}); // {day: [{name,sets,reps,load_kg}]}
  const [activeDay, setActiveDay] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  function applyTemplate(templateKey) {
    const t = TEMPLATES[templateKey];
    if (!t) return;
    setActiveTemplate(templateKey);
    setSelectedDays(t.days);
    const exMap = {};
    for (const [day, sess] of Object.entries(t.sessions)) {
      if (t.days.includes(day)) {
        exMap[day] = sess.exercises.map(e => ({ name: e.name, sets: e.sets, reps: e.reps, load_kg: '' }));
      }
    }
    setDayExercises(exMap);
    setActiveDay(t.days[0] || null);
  }

  function toggleDay(day) {
    setSelectedDays(prev => {
      const next = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
      return next;
    });
  }

  function buildPlan() {
    const today = new Date();
    const sessions = selectedDays.map((day, i) => {
      const exercises = dayExercises[day] || [];
      const exerciseStr = exercises
        .filter(e => e.name)
        .map(e => `${e.name} ${e.sets || 3}x${e.reps || '8-12'}`)
        .join(' | ');
      // Find the next occurrence of this day
      const dayIndex = DAY_KEYS.indexOf(day);
      const d = new Date(today);
      const currentDay = d.getDay() === 0 ? 6 : d.getDay() - 1; // 0=Mon
      let diff = dayIndex - currentDay;
      if (diff < 0) diff += 7;
      if (diff === 0) diff = 7;
      d.setDate(d.getDate() + diff + i * 0); // don't offset weeks, just use correct day
      const dateStr = d.toISOString().split('T')[0];

      return {
        id: crypto.randomUUID(),
        day: day.charAt(0).toUpperCase() + day.slice(1),
        date: dateStr,
        title: (TEMPLATES[activeTemplate]?.sessions[day]?.title) || `${day.charAt(0).toUpperCase() + day.slice(1)} Session`,
        duration_minutes: 60,
        status: 'pending',
        blocks: [
          { type: 'main', detail: exerciseStr },
        ],
      };
    });

    // Build 4 weeks
    const weeks = [];
    for (let w = 0; w < 4; w++) {
      weeks.push({
        week_number: w + 1,
        sessions: sessions.map(s => ({
          ...s,
          id: crypto.randomUUID(),
          date: (() => {
            const base = new Date(s.date);
            base.setDate(base.getDate() + w * 7);
            return base.toISOString().split('T')[0];
          })(),
          status: w === 0 ? 'pending' : 'locked',
        })),
      });
    }

    return {
      id: crypto.randomUUID(),
      status: 'active',
      source: isCritique ? 'B' : 'A',
      gym_goal: profile.goal || 'build_max',
      experience_level: profile.experience || 'Intermediate',
      scheduled_days: selectedDays,
      created_at: new Date().toISOString(),
      current_week: 1,
      weeks,
    };
  }

  async function handleSave() {
    if (selectedDays.length === 0) return;
    setSaving(true);
    const plan = buildPlan();

    if (isCritique) {
      // Store plan temporarily and go to critique screen
      sessionStorage.setItem('pending_plan', JSON.stringify(plan));
      navigate('/onboarding/critique');
      return;
    }

    // Persona A: save directly
    updateData(d => {
      d.onboarding_complete = true;
      d.user.user_type = 'self_directed';
      d.user.persona = d.user.persona || 'follower';
      if (profile.name) d.user.name = profile.name;
      if (profile.goal) d.user.goal = profile.goal;
      d.plans = d.plans.map(p => ({ ...p, status: 'archived' }));
      d.plans.push(plan);
      return d;
    });
    setShowConfetti(true);
    setTimeout(() => navigate('/dashboard'), 1800);
  }

  const W = { maxWidth: '680px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 32px)' };

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <ConfettiEffect trigger={showConfetti} />

      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: C.navBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => {
                if (step === 'exercises') setStep('days');
                else if (step === 'days') setStep('profile');
                else navigate('/onboarding');
              }}
              aria-label="Go back"
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: C.high, color: C.text, border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1,
              }}
            >←</button>
            <span className="font-headline" style={{ fontSize: '1.3rem', fontWeight: 800, color: C.primary, letterSpacing: '-0.03em', textTransform: 'uppercase' }}>Regulr</span>
          </div>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.faint }}>
            {isCritique ? 'Plan Review' : 'Import Plan'}
          </span>
        </div>
      </header>

      <main style={{ ...W, flex: 1, paddingTop: '7rem', paddingBottom: '10rem', width: '100%' }}>

        {/* ── Step: Profile ── */}
        {step === 'profile' && (
          <div>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.primary, marginBottom: '12px' }}>
              {isCritique ? 'Your Profile - for analysis' : 'Quick setup'}
            </p>
            <h2 className="font-headline" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '2rem', lineHeight: 1.1 }}>
              {isCritique ? 'Tell us about yourself' : 'A few quick questions'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '2rem' }}>
              <div>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>Your name (optional)</p>
                <input type="text" placeholder="e.g. Alex" value={profile.name}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.container, color: C.text, fontSize: '1rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>Primary goal</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[['build_max', 'Build Muscle'], ['fat_loss', 'Fat Loss'], ['recomp', 'Recomp'], ['maintenance', 'Maintenance']].map(([v, l]) => (
                    <button key={v} onClick={() => setProfile(p => ({ ...p, goal: v }))}
                      style={{ padding: '9px 18px', borderRadius: '8px', border: `1px solid ${profile.goal === v ? C.primary : C.border}`, background: profile.goal === v ? `rgba(${C.primaryRgb},0.1)` : C.container, color: profile.goal === v ? C.primary : C.text, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>Training experience</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[['Beginner', 'Beginner (<1 yr)'], ['Intermediate', 'Intermediate (1–3 yrs)'], ['Advanced', 'Advanced (3+ yrs)']].map(([v, l]) => (
                    <button key={v} onClick={() => setProfile(p => ({ ...p, experience: v }))}
                      style={{ padding: '9px 18px', borderRadius: '8px', border: `1px solid ${profile.experience === v ? C.primary : C.border}`, background: profile.experience === v ? `rgba(${C.primaryRgb},0.1)` : C.container, color: profile.experience === v ? C.primary : C.text, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => setStep('days')}
              style={{ width: '100%', padding: '1.1rem', borderRadius: '100px', background: C.text, color: C.bg, border: 'none', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
              Continue →
            </button>
          </div>
        )}

        {/* ── Step: Days + Template ── */}
        {step === 'days' && (
          <div>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.primary, marginBottom: '12px' }}>Training days</p>
            <h2 className="font-headline" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem', lineHeight: 1.1 }}>
              When do you train?
            </h2>
            <p style={{ fontSize: '0.9rem', color: C.faint, marginBottom: '1.75rem', lineHeight: 1.6 }}>
              Select your days - or pick a template to pre-fill exercises.
            </p>

            {/* Day grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '2rem' }}>
              {DAY_KEYS.map(day => {
                const sel = selectedDays.includes(day);
                return (
                  <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => toggleDay(day)}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: '12px',
                        background: sel ? C.primary : C.high,
                        color: sel ? C.onPrimary : C.text,
                        border: sel ? `2px solid ${C.primary}` : '2px solid transparent',
                        fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '1.1rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: sel ? `0 0 0 4px rgba(${C.primaryRgb},0.2)` : 'none',
                        transition: 'all 0.12s',
                      }}
                    >{DAY_LETTERS[day]}</button>
                    <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: sel ? C.primary : C.faint }}>{DAY_LABELS[day]}</span>
                  </div>
                );
              })}
            </div>

            {/* Templates */}
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint, marginBottom: '10px' }}>
              Start from a template
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '2rem' }}>
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <button key={key} onClick={() => applyTemplate(key)}
                  style={{
                    padding: '14px 18px', borderRadius: '10px', textAlign: 'left',
                    border: `1px solid ${activeTemplate === key ? C.primary : C.border}`,
                    background: activeTemplate === key ? `rgba(${C.primaryRgb},0.06)` : C.lowest,
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: activeTemplate === key ? C.primary : C.text, margin: '0 0 2px' }}>{t.name}</p>
                  <p style={{ fontSize: '0.72rem', color: C.faint, margin: 0 }}>{t.days.length} days/week</p>
                </button>
              ))}
              <button onClick={() => { setActiveTemplate(null); }}
                style={{ padding: '14px 18px', borderRadius: '10px', textAlign: 'left', border: `1px solid ${activeTemplate === null && selectedDays.length > 0 ? C.primary : C.border}`, background: C.lowest, cursor: 'pointer' }}>
                <p style={{ fontSize: '0.88rem', fontWeight: 700, color: C.text, margin: '0 0 2px' }}>Custom</p>
                <p style={{ fontSize: '0.72rem', color: C.faint, margin: 0 }}>Choose your own days and build from scratch</p>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep('profile')}
                style={{ flex: '0 0 auto', padding: '1rem 1.5rem', borderRadius: '100px', background: C.high, color: C.text, border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                ←
              </button>
              <button onClick={() => { if (selectedDays.length > 0) { setActiveDay(selectedDays[0]); setStep('exercises'); } }}
                disabled={selectedDays.length === 0}
                style={{ flex: 1, padding: '1rem', borderRadius: '100px', background: selectedDays.length > 0 ? C.text : C.separator, color: selectedDays.length > 0 ? C.bg : C.faint, border: 'none', fontSize: '1rem', fontWeight: 700, cursor: selectedDays.length > 0 ? 'pointer' : 'not-allowed' }}>
                Build exercises →
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Exercises per day ── */}
        {step === 'exercises' && (
          <div>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.primary, marginBottom: '12px' }}>Exercises</p>
            <h2 className="font-headline" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '1.5rem', lineHeight: 1.1 }}>
              Add your exercises
            </h2>

            {/* Day tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {selectedDays.map(day => {
                const exCount = dayExercises[day]?.length || 0;
                const isActive = activeDay === day;
                return (
                  <button key={day} onClick={() => setActiveDay(day)}
                    style={{
                      padding: '7px 16px', borderRadius: '8px',
                      background: isActive ? C.primary : C.high,
                      color: isActive ? C.onPrimary : C.text,
                      border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                      position: 'relative',
                    }}>
                    {DAY_LABELS[day]}
                    {exCount > 0 && (
                      <span style={{
                        position: 'absolute', top: '-5px', right: '-5px',
                        background: isActive ? C.text : C.primary, color: isActive ? C.bg : C.onPrimary,
                        fontSize: '0.52rem', fontWeight: 800, padding: '1px 5px', borderRadius: '10px',
                      }}>{exCount}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {activeDay && (
              <div style={{ background: C.low, borderRadius: '14px', padding: '20px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: C.text, margin: 0, textTransform: 'capitalize' }}>
                    {activeDay} - {(dayExercises[activeDay]?.length || 0)} exercises
                  </p>
                  {dayExercises[activeDay]?.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 72px 72px 28px', gap: '6px', width: '100%', maxWidth: '480px' }}>
                      {['Exercise', 'Sets', 'Reps', 'Load (kg)', ''].map((h, i) => (
                        <p key={i} style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, margin: 0, textAlign: i > 0 ? 'center' : 'left' }}>{h}</p>
                      ))}
                    </div>
                  )}
                </div>
                <DayExercises
                  day={activeDay}
                  exercises={dayExercises[activeDay] || []}
                  onChange={exs => setDayExercises(prev => ({ ...prev, [activeDay]: exs }))}
                  C={C}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep('days')}
                style={{ flex: '0 0 auto', padding: '1rem 1.5rem', borderRadius: '100px', background: C.high, color: C.text, border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                ←
              </button>
              <button
                onClick={handleSave}
                disabled={saving || selectedDays.length === 0}
                style={{
                  flex: 1, padding: '1rem', borderRadius: '100px',
                  background: saving ? C.separator : C.text,
                  color: saving ? C.faint : C.bg,
                  border: 'none', fontSize: '1rem', fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : isCritique ? 'Analyse my plan →' : 'Create my plan →'}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
