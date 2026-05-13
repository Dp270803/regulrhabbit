import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeColors } from '../hooks/useTheme';
import { getData, updateData } from '../utils/storage';
import { calculateDietTarget, calculateMacros } from '../utils/dietEngine';
import { recordAccepted, recordRejected } from '../utils/aiMemory';

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
  const [adaptation, setAdaptation] = useState(null);
  const [adapting, setAdapting] = useState(false);
  const [adaptError, setAdaptError] = useState(null);

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

  function computeTrend(d) {
    const checkins = (d.diet?.weekly_checkins || []).slice(-6);
    if (checkins.length < 2) return null;
    const withWeight = checkins.filter(c => c.weight_kg);
    let weekly_weight_change_pct = 0;
    if (withWeight.length >= 2) {
      const first = withWeight[0].weight_kg;
      const last = withWeight[withWeight.length - 1].weight_kg;
      const weeks = withWeight.length - 1;
      weekly_weight_change_pct = ((last - first) / first / weeks) * 100;
    }
    const lastAdh = d.diet?.last_weekly_adherence_pct ?? 0;
    return {
      weekly_weight_change_pct: +weekly_weight_change_pct.toFixed(2),
      weeks_in_phase: checkins.length,
      last_adherence_pct: lastAdh,
    };
  }

  async function handleRunAdaptation() {
    setAdapting(true);
    setAdaptError(null);
    setAdaptation(null);
    const d = getData();
    const trend = computeTrend(d);
    if (!trend) {
      setAdaptError('Need at least 2 weekly check-ins to assess your trend.');
      setAdapting(false);
      return;
    }
    try {
      const res = await fetch('/.netlify/functions/adapt-diet', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          profile: {
            sex: d.user?.sex || 'male',
            goal: d.user?.goal || 'maintenance',
            weight_kg: d.user?.body_weight_kg || target?.tdee && (target.tdee / 30) || 75,
            current_calories: d.diet?.current_calories || target.baseline_calories,
          },
          trend,
        }),
      });
      if (!res.ok) throw new Error('Network');
      const result = await res.json();
      setAdaptation(result);
    } catch {
      setAdaptError('Couldn\'t reach the coach. Try again in a moment.');
    } finally {
      setAdapting(false);
    }
  }

  function acceptAdaptation() {
    if (!adaptation) return;
    const newCals = adaptation.new_calories;
    recordAccepted({ text: `${adaptation.recommendation}: ${adaptation.reason}`, category: 'diet_adaptation' });
    const profile = {
      weight_kg: data.user?.body_weight_kg || 75,
      goal: data.user?.goal || 'maintenance',
    };
    const newMacros = calculateMacros(profile, newCals);
    const next = updateData(dd => {
      dd.diet = dd.diet || {};
      dd.diet.current_calories = newCals;
      dd.diet.macros = { protein_g: newMacros.protein_g, fat_g: newMacros.fat_g, carb_g: newMacros.carb_g };
      dd.diet.last_adjustment_reason = adaptation.reason;
      dd.diet.last_updated = new Date().toISOString();
      dd.diet.adaptations = dd.diet.adaptations || [];
      dd.diet.adaptations.push({
        id: `adapt_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        delta_kcal: adaptation.delta_kcal,
        reason: adaptation.reason,
        book_reference: adaptation.book_reference,
        accepted: true,
      });
      return dd;
    });
    setData(next);
    setTarget({ ...target, baseline_calories: newCals, macros: { ...newMacros } });
    setAdaptation(null);
  }

  function dismissAdaptation() {
    if (adaptation) {
      recordRejected({ text: `${adaptation.recommendation}: ${adaptation.reason}`, category: 'diet_adaptation' });
      updateData(d => {
        d.diet = d.diet || {};
        d.diet.adaptations = d.diet.adaptations || [];
        d.diet.adaptations.push({
          id: `adapt_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          delta_kcal: adaptation.delta_kcal,
          reason: adaptation.reason,
          book_reference: adaptation.book_reference,
          accepted: false,
        });
        return d;
      });
    }
    setAdaptation(null);
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

        {/* Weekly adaptation */}
        <div style={{ background: C.low, borderRadius: '16px', padding: '24px', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: '4px' }}>Weekly coach</p>
              <h3 className="font-headline" style={{ fontSize: '1.2rem', fontWeight: 700, color: C.text, margin: 0 }}>Calorie adaptation</h3>
            </div>
            <button
              onClick={handleRunAdaptation}
              disabled={adapting}
              style={{
                padding: '8px 18px', borderRadius: '8px',
                background: adapting ? C.separator : C.primary,
                color: adapting ? C.faint : C.onPrimary,
                border: 'none', fontWeight: 700, fontSize: '0.78rem',
                cursor: adapting ? 'not-allowed' : 'pointer',
              }}
            >
              {adapting ? 'Analysing…' : 'Run weekly review'}
            </button>
          </div>
          <p style={{ fontSize: '0.78rem', color: C.muted, lineHeight: 1.5, margin: '0 0 12px' }}>
            Pulls your last weeks of check-ins and weight to recommend a calorie adjustment based on Nippard's protocols.
          </p>
          {adaptError && (
            <p style={{ fontSize: '0.78rem', color: '#ff6b6b', margin: '0 0 12px' }}>{adaptError}</p>
          )}
          {adaptation && (
            <div style={{
              background: `rgba(${C.primaryRgb},0.06)`, borderRadius: '12px',
              padding: '16px', border: `1px solid rgba(${C.primaryRgb},0.18)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: C.primary, background: `rgba(${C.primaryRgb},0.14)`,
                  padding: '3px 8px', borderRadius: '4px',
                }}>{adaptation.recommendation}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: C.text }}>
                  {adaptation.delta_kcal === 0 ? 'No calorie change' :
                    `${adaptation.delta_kcal > 0 ? '+' : ''}${adaptation.delta_kcal} kcal → ${adaptation.new_calories}`}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: C.muted, lineHeight: 1.55, margin: '0 0 6px' }}>
                {adaptation.reason}
              </p>
              {adaptation.book_reference && (
                <p style={{ fontSize: '0.68rem', color: C.faint, fontStyle: 'italic', margin: '0 0 12px' }}>
                  — {adaptation.book_reference}
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={acceptAdaptation}
                  disabled={adaptation.delta_kcal === 0}
                  style={{
                    flex: 1, padding: '9px', borderRadius: '8px',
                    background: adaptation.delta_kcal === 0 ? C.separator : C.primary,
                    color: adaptation.delta_kcal === 0 ? C.faint : C.onPrimary,
                    border: 'none', fontWeight: 700, fontSize: '0.78rem',
                    cursor: adaptation.delta_kcal === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Apply
                </button>
                <button
                  onClick={dismissAdaptation}
                  style={{
                    flex: 1, padding: '9px', borderRadius: '8px',
                    background: 'transparent', color: C.muted,
                    border: `1px solid ${C.border}`, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          {data.diet?.adaptations?.length > 0 && !adaptation && (
            <p style={{ fontSize: '0.72rem', color: C.faint, marginTop: '12px' }}>
              {data.diet.adaptations.length} adaptation{data.diet.adaptations.length !== 1 ? 's' : ''} on record.
              Last: {data.diet.adaptations[data.diet.adaptations.length - 1].reason}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
