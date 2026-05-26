/**
 * performanceHistory.js
 *
 * Single source of truth for reading back what the user actually lifted.
 * Bridges the gap between how logs are stored (nested `workout_logs`) and
 * how the signal engine / UI need to consume them (flat per-exercise rows,
 * last-time lookups, progression suggestions, beginner starting weights).
 */

/** "8-12" -> 8 (lower bound for volume), "10" -> 10, 12 -> 12 */
export function parseRepsLow(reps) {
  if (reps == null) return null;
  const n = parseInt(String(reps).split('-')[0], 10);
  return Number.isFinite(n) ? n : null;
}

/** "8-12" -> 12 (top of range, used for "hit all your reps" checks) */
export function parseRepsHigh(reps) {
  if (reps == null) return null;
  const parts = String(reps).split('-');
  const n = parseInt(parts[parts.length - 1], 10);
  return Number.isFinite(n) ? n : null;
}

/** "3x8-12" -> 12; "4x8" -> 8 */
export function parseTopRepFromSets(sets) {
  if (!sets) return null;
  const m = String(sets).match(/^\d+\s*[x×]\s*(\d+(?:-\d+)?)/);
  return m ? parseRepsHigh(m[1]) : null;
}

/**
 * Flatten nested workout_logs into the flat shape the signal engine expects:
 * [{ exercise_name, date, completed_at, sets, reps (number), weight_kg, rir }]
 */
export function flattenWorkoutLogs(data) {
  const logs = data?.workout_logs || [];
  const flat = [];
  for (const log of logs) {
    const date = log.date || (log.logged_at || '').slice(0, 10);
    for (const ex of log.exercises || []) {
      flat.push({
        exercise_name: ex.exercise_name,
        date,
        completed_at: log.logged_at || date,
        sets: parseInt(ex.sets, 10) || null,
        reps: parseRepsLow(ex.reps),
        weight_kg: ex.weight_kg != null ? parseFloat(ex.weight_kg) : null,
        rir: typeof ex.rir === 'number' ? ex.rir : null,
      });
    }
  }
  return flat;
}

/**
 * Most recent logged performance for a given exercise.
 * Returns { weight_kg, reps, date } or null.
 */
export function getLastPerformance(workoutLogs, exerciseName) {
  const target = (exerciseName || '').toLowerCase();
  for (let i = (workoutLogs?.length || 0) - 1; i >= 0; i--) {
    const ex = (workoutLogs[i].exercises || []).find(
      e => e.exercise_name?.toLowerCase() === target && e.weight_kg
    );
    if (ex) {
      return { weight_kg: parseFloat(ex.weight_kg), reps: ex.reps, date: workoutLogs[i].date };
    }
  }
  return null;
}

const LOWER_BODY_KEYWORDS = ['squat', 'deadlift', 'leg press', 'lunge', 'hip thrust', 'rdl', 'romanian', 'leg curl', 'leg extension', 'calf', 'hack'];

function isLowerBody(name) {
  const n = (name || '').toLowerCase();
  return LOWER_BODY_KEYWORDS.some(k => n.includes(k));
}

/**
 * Progressive-overload nudge. If last session hit the top of the planned rep
 * range, suggest a small load increase (5kg lower body, 2.5kg upper).
 * Returns { from, to } or null.
 */
export function getProgressionSuggestion(workoutLogs, exerciseName, plannedSets) {
  const last = getLastPerformance(workoutLogs, exerciseName);
  if (!last || !last.weight_kg) return null;
  const topPlanned = parseTopRepFromSets(plannedSets);
  const lastReps = parseRepsHigh(last.reps);
  if (topPlanned == null || lastReps == null) return null;
  if (lastReps >= topPlanned) {
    const inc = isLowerBody(exerciseName) ? 5 : 2.5;
    return { from: last.weight_kg, to: last.weight_kg + inc };
  }
  return null;
}

/* ── Starting-weight guidance for users with no history ───────────────────────
 * Bodyweight-ratio heuristics for a beginner working weight (~8-12 reps).
 * Honest estimate only — UI must frame it as a starting point to adjust from.
 */

// male beginner working-weight as fraction of bodyweight
const BW_RATIO = [
  { kw: ['back squat', 'barbell squat'], ratio: 0.60 },
  { kw: ['front squat'], ratio: 0.45 },
  { kw: ['hack squat'], ratio: 0.70 },
  { kw: ['leg press'], ratio: 1.20 },
  { kw: ['deadlift'], ratio: 0.80 },
  { kw: ['romanian', 'rdl'], ratio: 0.55 },
  { kw: ['hip thrust'], ratio: 0.70 },
  { kw: ['bench press'], ratio: 0.45 },
  { kw: ['incline'], ratio: 0.38 },
  { kw: ['overhead press', 'shoulder press', 'ohp'], ratio: 0.30 },
  { kw: ['barbell row', 'bent-over row', 'pendlay'], ratio: 0.45 },
  { kw: ['lat pulldown', 'pulldown'], ratio: 0.45 },
  { kw: ['seated row', 'cable row'], ratio: 0.40 },
];

// fixed dumbbell/cable starting weight (kg) for isolations, male beginner
const FIXED_ISO = [
  { kw: ['lateral raise', 'front raise'], kg: 5 },
  { kw: ['bicep curl', 'hammer curl', 'barbell curl', 'curl'], kg: 10 },
  { kw: ['tricep', 'pushdown', 'skullcrusher'], kg: 12.5 },
  { kw: ['face pull'], kg: 15 },
  { kw: ['fly', 'flye', 'pec deck'], kg: 10 },
  { kw: ['calf'], kg: 30 },
  { kw: ['leg curl', 'leg extension'], kg: 25 },
];

const EXP_MULT = { Beginner: 1.0, Intermediate: 1.45, Advanced: 1.9 };

function roundToPlate(kg) {
  return Math.max(2.5, Math.round(kg / 2.5) * 2.5);
}

/**
 * Suggest a conservative starting weight for an exercise the user has never
 * logged. Returns a number (kg) or null if we can't make a sane guess.
 *
 * @param {string} exerciseName
 * @param {object} profile - { body_weight_kg, sex, experience_level }
 */
export function suggestStartingWeight(exerciseName, profile = {}) {
  const name = (exerciseName || '').toLowerCase();
  const bw = parseFloat(profile.body_weight_kg);
  const sexMult = (profile.sex === 'female') ? 0.65 : 1.0;
  const expMult = EXP_MULT[profile.experience_level] || 1.0;

  // Isolation / fixed-weight movements
  for (const { kw, kg } of FIXED_ISO) {
    if (kw.some(k => name.includes(k))) {
      return roundToPlate(kg * sexMult * expMult);
    }
  }

  // Bodyweight-ratio compound movements (needs bodyweight)
  if (bw && bw > 0) {
    for (const { kw, ratio } of BW_RATIO) {
      if (kw.some(k => name.includes(k))) {
        return roundToPlate(bw * ratio * sexMult * expMult);
      }
    }
  }

  return null;
}
