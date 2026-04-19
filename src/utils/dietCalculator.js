const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
};

const GOAL_ADJUSTMENTS = {
  fat_loss: -500,
  muscle_gain: 300,
  maintenance: 0,
};

export function calculateBMR({ body_weight_kg, height_cm, age, sex }) {
  if (!body_weight_kg || !height_cm || !age || !sex) return null;
  const base = (10 * body_weight_kg) + (6.25 * height_cm) - (5 * age);
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

export function calculateTDEE(user) {
  const bmr = calculateBMR(user);
  if (bmr === null) return null;
  const multiplier = ACTIVITY_MULTIPLIERS[user.activity_level];
  if (!multiplier) return null;
  return Math.round(bmr * multiplier);
}

// Phase 2: call after Profile save and store result to data.diet
export function calculateBaselineCalories(user) {
  const tdee = calculateTDEE(user);
  if (tdee === null) return null;
  const adjustment = GOAL_ADJUSTMENTS[user.goal] ?? 0;
  return tdee + adjustment;
}
