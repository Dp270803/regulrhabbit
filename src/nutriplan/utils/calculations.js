export function calculateTargets(profile) {
  const { weight_kg, height_cm, age, sex, activity_level, goal } = profile;

  let bmr;
  if (sex === 'male') {
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5;
  } else {
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161;
  }

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };
  const tdee = bmr * (activityMultipliers[activity_level] || 1.2);

  const goalAdjustments = {
    fat_loss: -0.20,
    muscle_gain: 0.10,
    maintenance: 0,
    recomp: -0.05
  };
  const target_calories = Math.round(tdee * (1 + (goalAdjustments[goal] || 0)));

  const protein_per_kg = (goal === 'fat_loss') ? 2.0 : 1.8;
  const protein_g = Math.round(protein_per_kg * weight_kg);
  const fat_g = Math.round(0.8 * weight_kg);

  const protein_calories = protein_g * 4;
  const fat_calories = fat_g * 9;
  const remaining_calories = target_calories - protein_calories - fat_calories;
  const carb_g = Math.round(remaining_calories / 4);

  const safe_carb_g = Math.max(carb_g, 50);
  const adjusted_calories = protein_calories + fat_calories + (safe_carb_g * 4);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target_calories: (carb_g < 50) ? adjusted_calories : target_calories,
    protein_g,
    fat_g,
    carb_g: safe_carb_g,
    deficit_or_surplus: Math.round(target_calories - tdee)
  };
}
