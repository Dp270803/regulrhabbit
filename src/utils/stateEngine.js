/**
 * stateEngine.js
 *
 * Converts raw fitness signals into a structured fitness_state object.
 * Non-AI — all rules are deterministic.
 *
 * Input:  signals from signalEngine.computeFitnessSignals()
 * Output: fitness_state
 */

/**
 * Derive fitness phase from session count and strength trend.
 * - "early"       : fewer than 5 logged sessions
 * - "progressing" : strength is trending upward
 * - "plateau"     : strength flat and 5+ sessions logged
 */
function derivePhase(signals, totalSessions) {
  if (totalSessions < 5) return 'early';
  if (signals.strength_trend > 0.5) return 'progressing';
  return 'plateau';
}

/**
 * Classify fatigue from the volume spike proxy.
 * > 1.4 = high, > 1.1 = moderate, else low.
 */
function deriveFatigue(fatigueProxy) {
  if (fatigueProxy > 1.4) return 'high';
  if (fatigueProxy > 1.1) return 'moderate';
  return 'low';
}

/**
 * Classify strength trend from slope (kg/day across all tracked exercises).
 * > 0.5 = increasing, < 0 = declining, else flat.
 */
function deriveStrengthTrend(slope) {
  if (slope > 0.5) return 'increasing';
  if (slope < 0) return 'declining';
  return 'flat';
}

/**
 * Classify weight trend from slope (kg/day of body weight).
 * < -0.02 kg/day = losing (~0.5 kg/week threshold)
 * > +0.02 kg/day = gaining
 * else stable
 */
function deriveWeightTrend(slope) {
  if (slope < -0.02) return 'losing';
  if (slope > 0.02) return 'gaining';
  return 'stable';
}

/**
 * Compute fitness_state from signals.
 *
 * @param {object} signals     - from computeFitnessSignals()
 * @param {number} totalSessions - total completed sessions (data.check_ins.length)
 * @returns {object} fitness_state
 */
export function computeFitnessState(signals, totalSessions = 0) {
  return {
    phase: derivePhase(signals, totalSessions),
    fatigue_level: deriveFatigue(signals.fatigue_proxy),
    adherence: signals.adherence_score,
    strength_trend: deriveStrengthTrend(signals.strength_trend),
    weight_trend: deriveWeightTrend(signals.weight_trend),
  };
}
