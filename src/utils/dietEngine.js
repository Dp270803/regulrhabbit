/**
 * dietEngine.js
 *
 * Mifflin-St Jeor BMR + TDEE + goal-based calorie baseline.
 * Non-AI — all calculations are deterministic.
 *
 * AI is only allowed to suggest delta adjustments on top of this baseline.
 */

// Activity multipliers (Harris-Benedict scale)
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,        // desk job, no exercise
  light: 1.375,          // 1–3 days/week
  moderate: 1.55,        // 3–5 days/week
  active: 1.725,         // 6–7 days/week
  very_active: 1.9,      // twice/day or physical job
};

// Goal calorie adjustments relative to TDEE
const GOAL_ADJUSTMENTS = {
  fat_loss: -300,
  recomp: -150,
  build_efficient: +200,
  build_max: +300,
  maintenance: 0,
};

/**
 * Mifflin-St Jeor BMR.
 *
 * @param {number} weight_kg
 * @param {number} height_cm
 * @param {number} age        - years
 * @param {string} sex        - 'male' | 'female'
 * @returns {number} BMR in kcal/day
 */
export function calculateBMR(weight_kg, height_cm, age, sex) {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return Math.round(sex === 'female' ? base - 161 : base + 5);
}

/**
 * Total Daily Energy Expenditure.
 *
 * @param {number} bmr
 * @param {string} activity_level - key of ACTIVITY_MULTIPLIERS
 * @returns {number} TDEE in kcal/day
 */
export function calculateTDEE(bmr, activity_level = 'moderate') {
  const multiplier = ACTIVITY_MULTIPLIERS[activity_level] || ACTIVITY_MULTIPLIERS.moderate;
  return Math.round(bmr * multiplier);
}

/**
 * Compute baseline calories for a user.
 *
 * @param {object} profile
 *   - weight_kg, height_cm, age, sex, activity_level, goal
 * @returns {{ bmr, tdee, baseline_calories }}
 */
export function calculateBaseline(profile = {}) {
  const {
    weight_kg = 75,
    height_cm = 175,
    age = 25,
    sex = 'male',
    activity_level = 'moderate',
    goal = 'maintenance',
  } = profile;

  const bmr = calculateBMR(weight_kg, height_cm, age, sex);
  const tdee = calculateTDEE(bmr, activity_level);
  const adjustment = GOAL_ADJUSTMENTS[goal] ?? 0;
  const baseline_calories = tdee + adjustment;

  return { bmr, tdee, baseline_calories };
}

/**
 * Apply an AI-suggested delta to the current calorie target.
 *
 * @param {number} current_calories - current daily calorie target
 * @param {number} delta            - adjustment in kcal (can be negative)
 * @returns {number} new calorie target
 */
export function applyDietAdjustment(current_calories, delta) {
  // Guard: never adjust by more than 500 kcal in one step
  const safeD = Math.max(-500, Math.min(500, delta));
  return Math.round(current_calories + safeD);
}
