/**
 * signalEngine.js
 *
 * Extracts objective behavior signals from stored workout data.
 * Non-AI — all calculations are deterministic.
 *
 * Returns:
 *   adherence_score   — completed / planned sessions (last 28 days)
 *   total_volume      — Σ(sets × reps × weight) across recent sessions
 *   strength_trend    — linear regression slope on max weight per exercise
 *   weight_trend      — slope of body_weight_kg history
 *   fatigue_proxy     — recent 7d volume / avg 28d daily volume
 */

import { computeTotalVolume } from './calorieEngine';

const MS_PER_DAY = 86400000;

function daysBetween(dateStrA, dateStrB) {
  return (new Date(dateStrA) - new Date(dateStrB)) / MS_PER_DAY;
}

/**
 * Simple linear regression — returns slope (dy/dx).
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
