import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeColors } from '../hooks/useTheme';
import { getData, updateData } from '../utils/storage';
import { calculateDietTarget } from '../utils/dietEngine';

const W = { maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 64px)' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_TYPE_ORDER = { breakfast: 0, snack: 1, lunch: 2, dinner: 3 };

const ADHERENCE_OPTIONS = [
  { value: 0,   label: 'Off',   desc: 'Didn\'t track'      },
  { value: 25,  label: '25%',   desc: 'Mostly off'         },
  { value: 50,  label: '50%',   desc: 'Half the time'      },
  { value: 75,  label: '75%',   desc: 'Mostly on'          },
  { value: 100, label: '100%',  desc: 'Fully on plan'      },
];

function MacroBar({ label, current, target, color, C }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint }}>{label}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text }}>{current}<span style={{ color: C.faint, fontWeight: 500 }}> / {target}g</span></span>
      </div>
      <div style={{ height: '5px', borderRadius: '3px', background: C.separator, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

export default function Diet() {
  const C = useThemeColors();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [target, setTarget] = useState(null);
  const [mealPlan, setMealPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [weightInput, setWeightInput] = useState('');
  const [selectedAdherence, setSelectedAdherence] = useState(null);
  const [checkinSaved, setCheckinSaved] = useState(false);

  useEffect(() => {
    const d = getData();
    setData(d);

    // Compute deterministic target from profile
    const profile = {
      weight_kg: d.user?.body_weight_kg || d.user?.diet_profile?.weight_kg || 75,
      height_cm: d.user?.height_cm || d.user?.diet_profile?.height_cm || 175,
      age: d.user?.age || d.user?.diet_profile?.age || 25,
      sex: d.user?.sex || d.user?.diet_profile?.sex || 'male',
      activity_level: d.user?.diet_profile?.activity_level || d.user?.activity_level || 'moderate',
      goal: d.user?.goal || d.plans?.find(p => p.status === 'active')?.gym_goal || 'maintenance',
    };
    const t = calculateDietTarget(profile);
    setTarget(t);
    setMealPlan(d.diet?.meal_plan || null);
    setActiveDayIdx(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  }, []);

  async function handleGenerate() {
    if (!target) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/generate-meal-plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          target: {
            calories: target.baseline_calories,
            protein_g: target.macros.protein_g,
            fat_g: target.macros.fat_g,
            carb_g: target.macros.carb_g,
          },
          user: {
            goal: data.user?.goal || 'maintenance',
            sex: data.user?.sex || 'male',
            cuisine: data.user?.cuisine || '',
            dietary_preference: data.user?.dietary_preference || 'omnivore',
            eating_habits: data.user?.eating_habits || {},
          },
        }),
      });
      if (!res.ok) throw new Error('Network');
      const result = await res.json();
      if (!result.week_plan?.length) throw new Error('Empty plan');
      setMealPlan(result);
      updateData(d => {
        d.diet = d.diet || {};
        d.diet.meal_plan = result;
        d.diet.meal_plan_generated_at = new Date().toISOString();
        d.diet.baseline_calories = target.baseline_calories;
        d.diet.current_calories = target.baseline_calories;
        d.diet.macros = target.macros;
        return d;
      });
    } catch {
      setError('Couldn\'t generate plan. Try again in a moment.');
    } finally {
      setGenerating(false);
    }
  }

  function handleCheckin() {
    if (selectedAdherence === null) return;
    const weight = parseFloat(weightInput) || null;
    const today = new Date().toISOString().split('T')[0];

    updateData(d => {
      d.diet = d.diet || {};
      d.diet.weekly_checkins = d.diet.weekly_checkins || [];
      d.diet.weekly_checkins.push({
        date: today,
        weight_kg: weight,
        adherence_pct: selectedAdherence,
      });
      d.diet.last_weekly_adherence_pct = selectedAdherence;

      // Update body weight log if a weight was entered
      if (weight && weight >= 20 && weight <= 400) {
        d.user.body_weight_kg = weight;
        d.weight_log = d.weight_log || [];
        const existing = d.weight_log.find(w => w.date === today);
        if (existing) existing.weight_kg = weight;
        else d.weight_log.push({ date: today, weight_kg: weight });
      }

      // Track consecutive cut weeks if user is in a cut
      if ((d.user?.goal || '') === 'fat_loss' && selectedAdherence >= 50) {
        d.diet.consecutive_cut_weeks = (d.diet.consecutive_cut_weeks || 0) + 1;
      }

      return d;
    });

    setCheckinSaved(true);
    setWeightInput('');
    setSelectedAdherence(null);
    setTimeout(() => setCheckinSaved(false), 2500);
  }

  if (!data || !target) return null;

  const dayPlan = mealPlan?.week_plan?.find(d => d.day === DAYS[activeDayIdx]) || mealPlan?.week_plan?.[activeDayIdx];
  const dayTotals = dayPlan?.meals?.reduce(
    (acc, m) => ({
      kcal: acc.kcal + (m.kcal || 0),
      protein_g: acc.protein_g + (m.protein_g || 0),
      fat_g: acc.fat_g + (m.fat_g || 0),
      carb_g: acc.carb_g + (m.carb_g || 0),
    }),
    { kcal: 0, protein_g: 0, fat_g: 0, carb_g: 0 }
  );

  return (
    <div className="min-h-dvh pb-32 md:pb-12 md:pt-14" style={{ background: C.bg, color: C.text }}>
      <div style={{ ...W, paddingTop: 'clamp(28px, 4vw, 48px)' }}>

        <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>Your Diet</p>
        <h1 className="font-headline" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '2rem' }}>Diet Plan</h1>

        {/* Daily target card */}
        <div style={{
          background: C.low, borderRadius: '16px', padding: '24px',
          border: `1px solid ${C.border}`, marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: '4px' }}>Daily target</p>
              <h2 className="font-headline" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: C.text, lineHeight: 1 }}>
                {target.baseline_calories} <span style={{ fontSize: '0.7em', color: C.faint }}>kcal</span>
              </h2>
            </div>
            <p style={{ fontSize: '0.72rem', color: C.faint, maxWidth: '280px', lineHeight: 1.5 }}>
              BMR {target.bmr} × activity → TDEE {target.tdee}, adjusted for {data.user?.goal || 'maintenance'}.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <MacroBar label="Protein" current={dayTotals?.protein_g || 0} target={target.macros.protein_g} color={C.primary} C={C} />
            <MacroBar label="Fat"     current={dayTotals?.fat_g || 0}     target={target.macros.fat_g}     color="#ffbe00" C={C} />
            <MacroBar label="Carbs"   current={dayTotals?.carb_g || 0}    target={target.macros.carb_g}    color={C.green}  C={C} />
          </div>
        </div>

        {/* Meal plan generation / display */}
        {!mealPlan ? (
          <div style={{ background: C.low, borderRadius: '16px', padding: '24px', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
            <p style={{ fontSize: '0.95rem', color: C.muted, lineHeight: 1.6, marginBottom: '16px' }}>
              Generate a 7-day meal plan tailored to your macros, cuisine, and cooking style. Built on Jeff Nippard's diet framework.
            </p>
            {error && <p style={{ fontSize: '0.85rem', color: '#ff6b6b', marginBottom: '12px' }}>{error}</p>}
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                padding: '0.875rem 2rem', borderRadius: '100px',
                background: generating ? C.separator : C.text,
                color: generating ? C.faint : C.bg,
                border: 'none', fontSize: '0.95rem', fontWeight: 700,
                cursor: generating ? 'not-allowed' : 'pointer',
              }}
            >
              {generating ? 'Building your plan…' : 'Generate meal plan →'}
            </button>
          </div>
        ) : (
          <>
            {/* Day tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  onClick={() => setActiveDayIdx(i)}
                  style={{
                    padding: '7px 16px', borderRadius: '8px', minWidth: '52px',
                    background: activeDayIdx === i ? C.primary : C.high,
                    color: activeDayIdx === i ? C.onPrimary : C.text,
                    border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                  }}
                >{day}</button>
              ))}
            </div>

            {/* Meal list */}
            <div style={{ background: C.low, borderRadius: '16px', padding: '20px', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
              {dayPlan?.meals?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[...dayPlan.meals]
                    .sort((a, b) => (MEAL_TYPE_ORDER[a.type] ?? 99) - (MEAL_TYPE_ORDER[b.type] ?? 99))
                    .map((meal, i) => (
                    <div key={i} style={{
                      padding: '14px 16px', background: C.lowest, borderRadius: '10px',
                      borderLeft: `3px solid ${C.primary}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                        <div>
                          <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.primary, marginBottom: '2px' }}>{meal.type}</p>
                          <p style={{ fontSize: '0.92rem', fontWeight: 700, color: C.text, margin: 0 }}>{meal.name}</p>
                        </div>
                        <p style={{ fontSize: '0.85rem', fontFamily: 'Inter, monospace', fontWeight: 700, color: C.text, margin: 0 }}>
                          {meal.kcal || 0} <span style={{ color: C.faint, fontWeight: 500 }}>kcal</span>
                        </p>
                      </div>
                      {meal.items?.length > 0 && (
                        <p style={{ fontSize: '0.8rem', color: C.muted, margin: '0 0 6px', lineHeight: 1.5 }}>
                          {meal.items.join(' · ')}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '14px', fontSize: '0.7rem', color: C.faint }}>
                        <span>P {meal.protein_g || 0}g</span>
                        <span>F {meal.fat_g || 0}g</span>
                        <span>C {meal.carb_g || 0}g</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: C.faint, fontSize: '0.85rem' }}>No meals for this day.</p>
              )}
              {mealPlan.notes && (
                <p style={{ fontSize: '0.78rem', color: C.faint, marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${C.separator}`, lineHeight: 1.6 }}>
                  {mealPlan.notes}
                </p>
              )}
              {mealPlan.book_reference && (
                <p style={{ fontSize: '0.68rem', color: C.faint, marginTop: '6px', fontStyle: 'italic' }}>— {mealPlan.book_reference}</p>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                padding: '0.7rem 1.5rem', borderRadius: '100px',
                background: 'transparent', color: C.faint,
                border: `1px solid ${C.border}`, fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer', marginBottom: '20px',
              }}
            >
              {generating ? 'Regenerating…' : 'Regenerate plan'}
            </button>
          </>
        )}

        {/* Weekly check-in */}
        <div style={{ background: C.low, borderRadius: '16px', padding: '24px', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: '4px' }}>Weekly check-in</p>
          <h3 className="font-headline" style={{ fontSize: '1.2rem', fontWeight: 700, color: C.text, marginBottom: '14px' }}>How was this week?</h3>

          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>Diet adherence</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {ADHERENCE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedAdherence(opt.value)}
                style={{
                  padding: '10px 14px', borderRadius: '10px',
                  background: selectedAdherence === opt.value ? C.primary : C.high,
                  color: selectedAdherence === opt.value ? C.onPrimary : C.text,
                  border: 'none', cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: 700, minWidth: '64px',
                }}
              >
                <div>{opt.label}</div>
                <div style={{ fontSize: '0.62rem', fontWeight: 500, opacity: 0.75, marginTop: '2px' }}>{opt.desc}</div>
              </button>
            ))}
          </div>

          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>Weigh-in (optional)</p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="number"
              step="0.1"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              placeholder="kg"
              style={{
                padding: '10px 14px', borderRadius: '8px', width: '100px',
                background: C.bg, border: `1px solid ${C.border}`, color: C.text,
                fontSize: '0.95rem', outline: 'none',
              }}
            />
            <button
              onClick={handleCheckin}
              disabled={selectedAdherence === null}
              style={{
                padding: '10px 22px', borderRadius: '8px',
                background: selectedAdherence === null ? C.separator : C.text,
                color: selectedAdherence === null ? C.faint : C.bg,
                border: 'none', fontSize: '0.85rem', fontWeight: 700,
                cursor: selectedAdherence === null ? 'not-allowed' : 'pointer',
              }}
            >
              Save check-in
            </button>
            {checkinSaved && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: C.green }}>Saved ✓</span>
            )}
          </div>

          {data.diet?.weekly_checkins?.length > 0 && (
            <p style={{ fontSize: '0.72rem', color: C.faint, marginTop: '16px' }}>
              Last check-in: {data.diet.last_weekly_adherence_pct}% adherence · {data.diet.weekly_checkins.length} total
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
