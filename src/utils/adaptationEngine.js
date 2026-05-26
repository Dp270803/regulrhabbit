/**
 * adaptationEngine.js
 *
 * Applies AI-suggested plan and diet adjustments to the active plan.
 * Operates purely on data - no UI concerns.
 *
 * AI suggests; this engine applies.
 */

import { applyDietAdjustment } from './dietEngine';

// ─── Plan mutations ────────────────────────────────────────────────────────────

/**
 * Reduce volume: remove 1 set from each exercise in the main block
 * if the exercise has more than 3 sets.
 */
export function reduceVolume(plan) {
  const updated = deepClone(plan);
  for (const week of updated.weeks) {
    for (const session of week.sessions) {
      if (!session.blocks) continue;
      const mainBlock = session.blocks.find(b => b.type === 'main');
      if (!mainBlock) continue;
      for (const ex of mainBlock.exercises || []) {
        if (ex.sets && ex.sets > 3) ex.sets -= 1;
      }
    }
  }
  return updated;
}

/**
 * Add an exercise to the main block of future (uncompleted) sessions.
 * exercise: { name, sets, reps, rest_seconds }
 */
export function addExercise(plan, exercise) {
  const updated = deepClone(plan);
  for (const week of updated.weeks) {
    for (const session of week.sessions) {
      if (session.status === 'completed') continue;
      if (!session.blocks) continue;
      const mainBlock = session.blocks.find(b => b.type === 'main');
      if (mainBlock) {
        mainBlock.exercises = mainBlock.exercises || [];
        mainBlock.exercises.push({ ...exercise });
      }
    }
  }
  return updated;
}

/**
 * Replace an exercise in all future (uncompleted) sessions.
 * oldName: string to match (case-insensitive)
 * newExercise: { name, sets, reps, rest_seconds }
 */
export function replaceExercise(plan, oldName, newExercise) {
  const updated = deepClone(plan);
  const target = oldName.toLowerCase();
  for (const week of updated.weeks) {
    for (const session of week.sessions) {
      if (session.status === 'completed') continue;
      if (!session.blocks) continue;
      for (const block of session.blocks) {
        if (!block.exercises) continue;
        for (let i = 0; i < block.exercises.length; i++) {
          if ((block.exercises[i].name || '').toLowerCase() === target) {
            block.exercises[i] = { ...block.exercises[i], ...newExercise, name: newExercise.name };
          }
        }
      }
    }
  }
  return updated;
}

/**
 * Adjust session frequency: delta = +1 adds a rest day converted to training,
 * delta = -1 marks the nearest future session as rest.
 * Simple implementation: marks status for UI to respect.
 */
export function adjustFrequency(plan, delta) {
  if (delta === 0) return plan;
  const updated = deepClone(plan);
  // Find future sessions and mark them
  const futureSessions = [];
  for (const week of updated.weeks) {
    for (const session of week.sessions) {
      if (session.status !== 'completed') {
        futureSessions.push(session);
      }
    }
  }
  futureSessions.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  if (delta < 0 && futureSessions.length > 0) {
    // Remove the last future session
    futureSessions[futureSessions.length - 1].status = 'rest';
  }
  // delta > 0 (adding frequency) is complex without template data - skip for now
  return updated;
}

// ─── Skipped exercise detection ───────────────────────────────────────────────

/**
 * Detect exercises skipped 3+ times in the performance log.
 * "Skipped" = session was completed but exercise has no logged weight.
 *
 * @param {Array} performanceLogs  - from localStorage / Supabase
 * @param {Array} checkIns        - completed sessions
 * @param {object} plan           - active plan
 * @returns {string[]} exercise names skipped 3+ times
 */
export function detectSkippedExercises(performanceLogs = [], checkIns = [], plan = null) {
  if (!plan) return [];

  // Collect all exercises that should appear across completed sessions
  const plannedExercises = new Set();
  for (const week of plan.weeks || []) {
    for (const session of week.sessions) {
      if (session.status !== 'completed') continue;
      for (const block of session.blocks || []) {
        for (const ex of block.exercises || []) {
          if (ex.name) plannedExercises.add(ex.name.toLowerCase());
        }
      }
    }
  }

  // Count how many times each exercise was planned but not logged
  const loggedNames = new Set(performanceLogs.map(l => (l.exercise_name || '').toLowerCase()));
  const completedCount = checkIns.filter(c => c.completed).length;

  const skipped = [];
  for (const name of plannedExercises) {
    const logged = performanceLogs.filter(l => (l.exercise_name || '').toLowerCase() === name).length;
    const skippedCount = completedCount - logged;
    if (skippedCount >= 3) skipped.push(name);
  }

  return skipped;
}

/**
 * Detect progressive overload candidates: exercises where the weight
 * hasn't changed across 3+ recent sessions.
 *
 * @param {Array} performanceLogs
 * @returns {string[]} exercise names ready for overload
 */
export function detectOverloadCandidates(performanceLogs = []) {
  const byExercise = {};
  for (const log of performanceLogs) {
    const name = log.exercise_name || '';
    if (!name || !log.weight_kg) continue;
    if (!byExercise[name]) byExercise[name] = [];
    byExercise[name].push({ date: log.date, weight: parseFloat(log.weight_kg) });
  }

  const candidates = [];
  for (const [name, entries] of Object.entries(byExercise)) {
    const sorted = entries.sort((a, b) => a.date.localeCompare(b.date));
    const last3 = sorted.slice(-3);
    if (last3.length < 3) continue;
    const allSame = last3.every(e => e.weight === last3[0].weight);
    if (allSame) candidates.push(name);
  }

  return candidates;
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

/**
 * Apply a list of AI plan_adjustments to the given plan.
 *
 * @param {object} plan
 * @param {Array}  adjustments - [{ type, detail, exercise?, new_exercise? }]
 * @returns {object} updated plan
 */
export function applyPlanAdjustments(plan, adjustments = []) {
  let updated = plan;
  for (const adj of adjustments) {
    switch (adj.type) {
      case 'reduce_volume':
        updated = reduceVolume(updated);
        break;
      case 'add_exercise':
        if (adj.exercise) updated = addExercise(updated, adj.exercise);
        break;
      case 'replace_exercise':
        if (adj.old_exercise && adj.new_exercise) {
          updated = replaceExercise(updated, adj.old_exercise, adj.new_exercise);
        }
        break;
      case 'adjust_frequency':
        if (adj.delta != null) updated = adjustFrequency(updated, adj.delta);
        break;
    }
  }
  return updated;
}

/**
 * Apply AI diet_adjustments and return updated diet object.
 *
 * @param {object} diet        - { baseline_calories, current_calories, last_adjustment_reason }
 * @param {Array}  adjustments - [{ delta, reason }]
 * @returns {object} updated diet
 */
export function applyDietAdjustments(diet, adjustments = []) {
  if (!adjustments.length) return diet;
  const totalDelta = adjustments.reduce((sum, a) => sum + (a.delta || 0), 0);
  const lastReason = adjustments[adjustments.length - 1]?.reason || '';
  return {
    ...diet,
    current_calories: applyDietAdjustment(diet.current_calories || diet.baseline_calories || 2000, totalDelta),
    last_adjustment_reason: lastReason,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
