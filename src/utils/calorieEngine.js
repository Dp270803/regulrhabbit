/**
 * calorieEngine.js
 *
 * MET-based session calorie estimation with signal-based adjustments.
 * Non-AI — all calculations are deterministic.
 *
 * Formula: calories = MET × body_weight_kg × duration_hours
 */

// MET values by exercise classification
const MET_VALUES = {
  compound: 6.0,   // squats, deadlifts, bench press, rows, overhead press
  strength: 5.0,   // general strength training (default)
  machine: 3.5,    // machine-based isolation work
  bodyweight: 4.0, // push-ups, pull-ups, dips
  cardio: 7.0,     // running, cycling (if ever used)
};

// Keywords that classify an exercise as compound
const COMPOUND_KEYWORDS = [
  'squat', 'deadlift', 'bench press', 'overhead press', 'ohp',
  'barbell row', 'bent-over row', 'pull-up', 'chin-up',
  'hip thrust', 'romanian deadlift', 'rdl', 'lunge', 'power clean',
];

// Keywords that classify an exercise as machine-based
const MACHINE_KEYWORDS = [
  'machine', 'cable', 'leg press', 'leg extension', 'leg curl',
  'chest fly', 'pec deck', 'lat pulldown', 'seated row',
  'tricep pushdown', 'bicep curl machine', 'smith machine',
];

function classifyExercise(name = '') {
  const lower = name.toLowerCase();
  if (COMPOUND_KEYWORDS.some(k => lower.includes(k))) return 'compound';
  if (MACHINE_KEYWORDS.some(k => lower.includes(k))) return 'machine';
  return 'strength';
}

/**
 * Compute total volume (kg) from a list of logged exercises.
 * Each exercise: { sets, reps, weight_kg }
 * reps may be a range string like "8-12" — use the lower bound.
 */
export function computeTotalVolume(exercises = []) {
  return exercises.reduce((total, ex) => {
    const sets = parseInt(ex.sets) || 0;
    const repsStr = String(ex.reps || '0');
    const reps = parseInt(repsStr.split('-')[0]) || 0;
    const weight = parseFloat(ex.weight_kg) || 0;
    return total + sets * reps * weight;
  }, 0);
}

/**
 * Classify session composition and return the dominant MET.
 * Returns { met, compoundRatio, machineRatio }
 */
function analyzeSessionComposition(exercises = []) {
  if (!exercises.length) return { met: MET_VALUES.strength, compoundRatio: 0, machineRatio: 0 };

  let compound = 0;
  let machine = 0;

  for (const ex of exercises) {
    const type = classifyExercise(ex.exercise_name || ex.name || '');
    if (type === 'compound') compound++;
    else if (type === 'machine') machine++;
  }

  const total = exercises.length;
  const compoundRatio = compound / total;
  const machineRatio = machine / total;

  // Dominant type determines base MET
  let met = MET_VALUES.strength;
  if (compoundRatio > 0.5) met = MET_VALUES.compound;
  else if (machineRatio > 0.7) met = MET_VALUES.machine;

  return { met, compoundRatio, machineRatio };
}

/**
 * Calculate session calorie burn.
 *
 * @param {Array}  exercises        - logged exercise objects (sets/reps/weight_kg/exercise_name)
 * @param {number} body_weight_kg   - user's body weight
 * @param {number} duration_minutes - total session duration
 * @returns {{ base_calories, adjusted_calories, calorie_reasoning }}
 */
export function calculateSessionCalories(exercises = [], body_weight_kg = 75, duration_minutes = 45) {
  const durationHours = Math.max(duration_minutes, 1) / 60;
  const weight = Math.max(body_weight_kg, 30);

  const { met, compoundRatio, machineRatio } = analyzeSessionComposition(exercises);
  const base_calories = Math.round(met * weight * durationHours);

  const totalVolume = computeTotalVolume(exercises);

  let adjustment = 1.0;
  const reasons = [];

  // Volume spike: high volume sessions burn more
  if (totalVolume > 10000) {
    adjustment += 0.10;
    reasons.push('high volume session (+10%)');
  } else if (totalVolume > 5000) {
    adjustment += 0.05;
    reasons.push('moderate volume (+5%)');
  }

  // Compound-heavy: elevates metabolic cost
  if (compoundRatio > 0.5) {
    adjustment += 0.08;
    reasons.push('compound-heavy session (+8%)');
  }

  // Machine-heavy: lower metabolic demand
  if (machineRatio > 0.7) {
    adjustment -= 0.10;
    reasons.push('machine-heavy session (-10%)');
  }

  const adjusted_calories = Math.round(base_calories * adjustment);
  const calorie_reasoning = reasons.length
    ? `Base: ${base_calories} kcal. Adjustments: ${reasons.join(', ')}.`
    : `Base: ${base_calories} kcal. No volume adjustments applied.`;

  return {
    base_calories,
    adjusted_calories,
    final_calories: adjusted_calories,
    calorie_reasoning,
  };
}
