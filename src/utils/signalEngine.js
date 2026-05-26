/**
 * signalEngine.js
 *
 * Extracts objective behavior signals from stored workout data.
 * Non-AI - all calculations are deterministic.
 *
 * Returns:
 *   adherence_score   - completed / planned sessions (last 28 days)
 *   total_volume      - Σ(sets × reps × weight) across recent sessions
 *   strength_trend    - linear regression slope on max weight per exercise
 *   weight_trend      - slope of body_weight_kg history
 *   fatigue_proxy     - recent 7d volume / avg 28d daily volume
 */

import { computeTotalVolume } from './calorieEngine';

const MS_PER_DAY = 86400000;

function daysBetween(dateStrA, dateStrB) {
  return (new Date(dateStrA) - new Date(dateStrB)) / MS_PER_DAY;
}

/**
 * Simple linear regression - returns slope (dy/dx).
 * points: [{ x, y }]
 */
function linearSlope(points) {
  const n = points.length;
  if (n < 2) return 0;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Compute adherence: completed / scheduled in last 28 days.
 * Reuses the same logic as personaEngine.computeSignals consistency_score.
 */
function computeAdherence(checkIns = [], plans = []) {
  const activePlan = plans.find(p => p.status === 'active') || plans[0];
  const cutoff = new Date(Date.now() - 28 * MS_PER_DAY);
  const recent = checkIns.filter(c => new Date(c.date) >= cutoff);
  let recentScheduled = 0;
  if (activePlan?.weeks) {
    const now = new Date();
    for (const week of activePlan.weeks) {
      for (const session of week.sessions) {
        const d = new Date(session.date);
        if (d >= cutoff && d <= now) recentScheduled++;
      }
    }
  }
  return recentScheduled > 0 ? parseFloat((recent.length / recentScheduled).toFixed(2)) : 0;
}

/**
 * Compute total volume across all performance_log entries in the last 28 days.
 */
function computeRecentVolume(performanceLogs = [], days = 28) {
  const cutoff = new Date(Date.now() - days * MS_PER_DAY);
  const recent = performanceLogs.filter(l => new Date(l.date) >= cutoff);
  return computeTotalVolume(recent.map(l => ({
    sets: l.sets,
    reps: l.reps,
    weight_kg: l.weight_kg,
  })));
}

/**
 * Compute strength trend: average regression slope across top exercises.
 * Returns slope in kg/session.
 */
function computeStrengthTrend(performanceLogs = []) {
  if (!performanceLogs.length) return 0;

  // Group by exercise name, sort each by date, compute max weight per session
  const byExercise = {};
  for (const log of performanceLogs) {
    const name = log.exercise_name || '';
    if (!name || !log.weight_kg) continue;
    if (!byExercise[name]) byExercise[name] = {};
    const d = log.date;
    if (!byExercise[name][d] || log.weight_kg > byExercise[name][d]) {
      byExercise[name][d] = parseFloat(log.weight_kg);
    }
  }

  const slopes = [];
  for (const [, dateMap] of Object.entries(byExercise)) {
    const sorted = Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b));
    if (sorted.length < 2) continue;
    const first = sorted[0][0];
    const points = sorted.map(([date, weight]) => ({
      x: daysBetween(date, first),
      y: weight,
    }));
    slopes.push(linearSlope(points));
  }

  if (!slopes.length) return 0;
  return parseFloat((slopes.reduce((s, v) => s + v, 0) / slopes.length).toFixed(3));
}

/**
 * Compute weight trend: slope of body_weight_kg over time (kg/day).
 * Uses check_ins that include a body_weight_kg field.
 */
function computeWeightTrend(checkIns = []) {
  const withWeight = checkIns
    .filter(c => c.body_weight_kg)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (withWeight.length < 2) return 0;
  const first = withWeight[0].date;
  const points = withWeight.map(c => ({
    x: daysBetween(c.date, first),
    y: parseFloat(c.body_weight_kg),
  }));
  return parseFloat(linearSlope(points).toFixed(3));
}

/**
 * Fatigue proxy: ratio of last 7d volume to average daily volume over 28d.
 * > 1.4 = high fatigue risk, > 1.1 = moderate.
 */
function computeFatigueProxy(performanceLogs = []) {
  const recent7dVolume = computeRecentVolume(performanceLogs, 7);
  const recent28dVolume = computeRecentVolume(performanceLogs, 28);
  const avg28dDaily = recent28dVolume / 28;
  const avg7dDaily = recent7dVolume / 7;
  if (avg28dDaily === 0) return 1.0;
  return parseFloat((avg7dDaily / avg28dDaily).toFixed(2));
}

/**
 * Main export: compute all signals from stored app data.
 *
 * @param {object} data - full localStorage data object
 * @param {Array}  performanceLogs - from Supabase or localStorage performance_log
 * @returns {object} signals
 */
export function computeFitnessSignals(data, performanceLogs = []) {
  const checkIns = data.check_ins || [];
  const plans = data.plans || [];

  return {
    adherence_score: computeAdherence(checkIns, plans),
    total_volume: computeRecentVolume(performanceLogs, 28),
    strength_trend: computeStrengthTrend(performanceLogs),
    weight_trend: computeWeightTrend(checkIns),
    fatigue_proxy: computeFatigueProxy(performanceLogs),
  };
}

/* ─────────────────────────────────────────────────────────────
 * Book-aligned signals (PRD §5.4 Step A)
 * Feeds bookEngine.evaluateRules - keys match rule trigger schema.
 * ───────────────────────────────────────────────────────────── */

const MUSCLE_KEYWORDS = {
  Chest:     ['bench', 'chest', 'fly', 'push-up', 'pushup', 'dip', 'pec'],
  Back:      ['row', 'pulldown', 'pull-up', 'pullup', 'chin-up', 'chinup', 'deadlift', 'rack pull', 'lat'],
  Legs:      ['squat', 'leg press', 'lunge', 'split squat', 'leg extension', 'leg curl', 'hack', 'rdl', 'romanian'],
  Shoulders: ['shoulder press', 'overhead', 'lateral raise', 'front raise', 'arnold', 'landmine press'],
  Biceps:    ['curl'],
  Triceps:   ['tricep', 'skullcrusher', 'pushdown', 'close-grip'],
  Glutes:    ['hip thrust', 'glute bridge'],
  Calves:    ['calf'],
};

function classifyMuscle(name) {
  const n = String(name || '').toLowerCase();
  for (const [muscle, kws] of Object.entries(MUSCLE_KEYWORDS)) {
    if (kws.some(k => n.includes(k))) return muscle;
  }
  return null;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Returns the book-rule-trigger-compatible signal object.
 * Reads from full localStorage data (plans, performance_log, weight_log, etc.).
 */
export function computeBookSignals(data) {
  const user = data?.user || {};
  const activePlan = (data?.plans || []).find(p => p.status === 'active');
  const logs = data?.performance_log || data?.performance_logs || [];
  const weightLog = data?.weight_log || [];

  const cutoff14 = Date.now() - 14 * MS_PER_DAY;
  const recentLogs = logs.filter(l => new Date(l.date || l.completed_at).getTime() >= cutoff14);

  // RIR aggregates - recent 14 days, all logged exercises
  const allRir = logs
    .filter(l => new Date(l.date || l.completed_at).getTime() >= cutoff14)
    .map(l => typeof l.rir === 'number' ? l.rir : null)
    .filter(v => v !== null);
  const avgRir = allRir.length ? mean(allRir) : null;

  // Consecutive sessions ending at 0 RIR
  const sortedByDate = [...recentLogs].sort((a, b) => new Date(b.date || b.completed_at) - new Date(a.date || a.completed_at));
  let rirZeroStreak = 0;
  for (const l of sortedByDate) {
    if (l.rir === 0) rirZeroStreak += 1;
    else break;
  }

  // e1RM per exercise (Epley) → stalled weeks
  const byExercise = {};
  for (const l of logs) {
    if (!l.weight_kg || !l.reps || !l.exercise_name) continue;
    const e1rm = l.weight_kg * (1 + l.reps / 30);
    (byExercise[l.exercise_name] ||= []).push({ date: l.date || l.completed_at, e1rm });
  }
  let maxStalled = 0;
  for (const arr of Object.values(byExercise)) {
    if (arr.length < 3) continue;
    arr.sort((a, b) => new Date(a.date) - new Date(b.date));
    const recent = arr.slice(-4);
    const slope = linearSlope(recent.map((p, i) => ({ x: i, y: p.e1rm })));
    if (Math.abs(slope) < 0.5) {
      const weeks = Math.floor((Date.now() - new Date(recent[0].date)) / (7 * MS_PER_DAY));
      if (weeks > maxStalled) maxStalled = weeks;
    }
  }

  // Adherence - sessions completed / scheduled in last 14 days
  let scheduled14 = 0;
  if (activePlan?.weeks) {
    for (const week of activePlan.weeks) {
      for (const s of week.sessions || []) {
        const t = new Date(s.date).getTime();
        if (t >= cutoff14 && t <= Date.now()) scheduled14 += 1;
      }
    }
  }
  const completed14 = recentLogs.length;
  const adherencePct = scheduled14 > 0 ? Math.round((completed14 / scheduled14) * 100) : 100;

  // Weekly muscle volume + frequency
  const muscleSets = {};
  const muscleDays = {};
  for (const l of recentLogs) {
    const m = classifyMuscle(l.exercise_name);
    if (!m) continue;
    muscleSets[m] = (muscleSets[m] || 0) + (l.sets || 0);
    const day = (l.date || l.completed_at || '').slice(0, 10);
    (muscleDays[m] ||= new Set()).add(day);
  }
  const muscleFreq = Object.fromEntries(
    Object.entries(muscleDays).map(([k, v]) => [k, v.size])
  );
  const muscleFreqMin = Object.keys(muscleFreq).length
    ? Math.min(...Object.values(muscleFreq))
    : 0;

  // Weight trend
  const weightTrend = computeWeightTrendPct(weightLog);

  return {
    avg_rir:                          avgRir,
    rir_zero_consecutive_sessions:    rirZeroStreak,
    rir_negative_pattern:             rirZeroStreak >= 3,

    stalled_weeks:                    maxStalled,
    e1rm_by_exercise:                 byExercise,

    adherence_pct:                    adherencePct,
    sessions_completed_last_14d:      completed14,
    sessions_scheduled_last_14d:      scheduled14,

    muscle_weekly_sets:               muscleSets,
    muscle_frequency_min:             muscleFreqMin,

    weekly_weight_change_pct:         weightTrend,
    weekly_weight_drop_pct:           weightTrend < 0 ? Math.abs(weightTrend) : 0,
    weekly_weight_gain_pct:           weightTrend > 0 ? weightTrend : 0,

    experience_level:                 activePlan?.experience_level || user.experience_level || 'Intermediate',
    goal:                             activePlan?.gym_goal || user.goal || 'build_max',
    sex:                              user?.diet_profile?.sex || 'male',
    activity_level:                   user?.diet_profile?.activity_level || 'moderate',
    injuries:                         user?.injuries || [],
    diet_adherence_pct:               data?.diet?.last_weekly_adherence_pct ?? 100,
    consecutive_cut_weeks:            data?.diet?.consecutive_cut_weeks ?? 0,
    consecutive_deficit_weeks:        data?.diet?.consecutive_cut_weeks ?? 0,
    weeks_since_deload:               data?.plan_state?.weeks_since_deload ?? 0,
    plan_changes_per_month:           (data?.plan_updates || []).length,
  };
}

/**
 * Classifies the lifter's training state from book signals.
 * Returns: 'progressing' | 'stalled' | 'under_recovering' | 'under_loading' | 'fresh'.
 */
export function classifyTrainingState(signals) {
  if (signals.avg_rir === null) return 'fresh';
  if (signals.stalled_weeks >= 2 && signals.avg_rir <= 1) return 'stalled';
  if (signals.rir_zero_consecutive_sessions >= 3) return 'under_recovering';
  if (signals.adherence_pct < 50) return 'under_recovering';
  if (signals.avg_rir >= 3) return 'under_loading';
  if (signals.avg_rir <= 2 && signals.stalled_weeks === 0) return 'progressing';
  return 'fresh';
}

function computeWeightTrendPct(weightLog) {
  if (!weightLog || weightLog.length < 2) return 0;
  const sorted = [...weightLog].sort((a, b) => new Date(a.date) - new Date(b.date));
  const last4 = sorted.filter(w => new Date(w.date).getTime() >= Date.now() - 28 * MS_PER_DAY);
  if (last4.length < 2) return 0;
  const first = last4[0].weight_kg;
  const last = last4[last4.length - 1].weight_kg;
  const daysSpan = Math.max(1, (new Date(last4[last4.length - 1].date) - new Date(last4[0].date)) / MS_PER_DAY);
  return parseFloat((((last - first) / first) * 100 * (7 / daysSpan)).toFixed(2));
}
