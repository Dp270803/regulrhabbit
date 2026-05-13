/**
 * weeklyMutation.js
 *
 * Client-side trigger: on Dashboard mount, check if a week has passed since the
 * last weekly mutation. If so, compute signals + matched rules and POST to the
 * /weekly-mutation Netlify function. The returned changes are pushed into
 * `data.plan_updates` (unseen=true), which renders the PlanUpdatesBanner.
 *
 * Idempotent: runs at most once per ISO week per device.
 */

import { computeBookSignals, classifyTrainingState } from './signalEngine';
import { evaluateRules, rulesForPrompt } from './bookEngine';
import { getMemoryContext } from './aiMemory';
import { updateData, getData } from './storage';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isoWeekStamp(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / MS_PER_DAY + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Returns true if a weekly mutation should run now.
 *
 * Conditions:
 * - Onboarding complete
 * - Active plan exists
 * - At least 5 sessions completed total (avoid spamming new users)
 * - Last mutation was in a different ISO week, OR never run
 */
export function shouldRunWeeklyMutation(data) {
  if (!data?.onboarding_complete) return false;
  const activePlan = (data.plans || []).find(p => p.status === 'active');
  if (!activePlan) return false;
  const sessions = (data.check_ins || []).filter(c => c.completed).length;
  if (sessions < 5) return false;

  const last = data.last_weekly_mutation_week;
  const now = isoWeekStamp();
  return last !== now;
}

/**
 * Convert a /weekly-mutation response's changes array into the schema expected
 * by PlanUpdatesBanner (`data.plan_updates[].changes`).
 */
function normalizeChanges(changes = []) {
  return changes.map(c => ({
    type: c.type,
    exercise: c.exercise || c.new_exercise || c.old_exercise || '',
    old_exercise: c.old_exercise,
    new_exercise: c.new_exercise,
    muscle: c.muscle,
    delta_sets: c.delta_sets,
    detail: c.exercise || c.muscle || c.type,
    reason: c.reason || '',
    book_reference: c.book_reference || '',
  }));
}

/**
 * Build the POST body for /weekly-mutation from current localStorage state.
 */
function buildPayload(data) {
  const signals = computeBookSignals(data);
  const matched = evaluateRules(signals);
  const trainingState = classifyTrainingState(signals);
  const activePlan = (data.plans || []).find(p => p.status === 'active');
  const memory = getMemoryContext();

  return {
    user: {
      name: data.user?.name || null,
      sex: data.user?.sex || 'male',
      goal: data.user?.goal || 'maintenance',
      experience_level: data.user?.training_experience || activePlan?.experience_level || 'intermediate',
      injuries: data.user?.injuries || [],
    },
    signals: {
      avg_rir: signals.avg_rir,
      rir_zero_consecutive_sessions: signals.rir_zero_consecutive_sessions,
      stalled_weeks: signals.stalled_weeks,
      adherence_pct: signals.adherence_pct,
      muscle_weekly_sets: signals.muscle_weekly_sets,
      muscle_frequency_min: signals.muscle_frequency_min,
      weeks_since_deload: signals.weeks_since_deload,
      weekly_weight_change_pct: signals.weekly_weight_change_pct,
    },
    training_state: trainingState,
    matched_rules: rulesForPrompt(matched, 6),
    ai_memory: memory,
    plan_summary: {
      active_plan_name: activePlan?.name || activePlan?.activity || 'plan',
      sessions_per_week: activePlan?.sessions_per_week || activePlan?.scheduled_days?.length || 0,
      scheduled_days: activePlan?.scheduled_days || [],
      week_number: activePlan?.current_week || 1,
      total_weeks: activePlan?.total_weeks || activePlan?.weeks?.length || 0,
    },
  };
}

/**
 * Top-level entry point. Idempotent; safe to call on every Dashboard mount.
 * Returns the new plan_update entry (or null if nothing happened).
 */
export async function runWeeklyMutation() {
  const data = getData();
  if (!shouldRunWeeklyMutation(data)) return null;

  // Mark the attempt immediately so a network failure doesn't loop the call
  // every refresh; we'll still see fresh signals on the next ISO week.
  const weekStamp = isoWeekStamp();
  updateData(d => { d.last_weekly_mutation_week = weekStamp; return d; });

  const payload = buildPayload(data);

  try {
    const res = await fetch('/.netlify/functions/weekly-mutation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const result = await res.json();
    if (!result.changes?.length) return null;

    const update = {
      id: `wm_${Date.now()}`,
      date: new Date().toISOString(),
      week_stamp: weekStamp,
      source: 'weekly_mutation',
      summary: result.summary || 'Plan updated based on this week\'s data.',
      training_state: payload.training_state,
      changes: normalizeChanges(result.changes),
      seen: false,
    };

    updateData(d => {
      d.plan_updates = d.plan_updates || [];
      d.plan_updates.push(update);
      return d;
    });

    return update;
  } catch {
    return null;
  }
}
