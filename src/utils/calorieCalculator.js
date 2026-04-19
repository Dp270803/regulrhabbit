const MET = {
  heavy_compound: 6.5,
  moderate: 5.0,
  machine: 4.75,
  light: 3.5,
};

function classifyExercise(name) {
  const n = (name || '').toLowerCase();
  if (
    n.includes('barbell') ||
    n.includes('deadlift') ||
    n.includes('squat') ||
    (n.includes('bench press') && !n.includes('dumbbell')) ||
    (n.includes('row') && n.includes('barbell'))
  ) return 'barbell';
  if (
    n.includes('machine') ||
    n.includes('cable') ||
    n.includes('leg press') ||
    n.includes('lat pulldown') ||
    n.includes('chest press')
  ) return 'machine';
  if (
    n.includes('bodyweight') ||
    n.includes('push-up') ||
    n.includes('pull-up') ||
    n.includes('chin-up') ||
    n.includes('dip')
  ) return 'bodyweight';
  return 'dumbbell';
}

export function classifyWorkout(exercises) {
  if (!exercises || exercises.length === 0) return 'moderate';
  const types = exercises.map(e => classifyExercise(e.exercise_name || e.name || ''));
  const total = types.length;
  const barbellRatio = types.filter(t => t === 'barbell').length / total;
  const machineRatio = types.filter(t => t === 'machine').length / total;
  if (barbellRatio > 0.5) return 'heavy_compound';
  if (machineRatio > 0.5) return 'machine';
  return 'moderate';
}

export function calculateBaseCalories({ duration_minutes, body_weight_kg, workout_classification }) {
  if (!duration_minutes || !body_weight_kg) return null;
  const met = MET[workout_classification] ?? MET.moderate;
  return Math.round(met * body_weight_kg * (duration_minutes / 60));
}

export function applySignalAdjustments(base_calories, { exercises, body_weight_kg }) {
  if (base_calories === null) return null;
  const filled = (exercises || []).filter(e => e.sets && e.reps && e.weight_kg);
  const total_volume = filled.reduce((sum, e) => sum + (e.sets * e.reps * e.weight_kg), 0);
  const relative_volume = body_weight_kg ? total_volume / body_weight_kg : 0;

  const types = filled.map(e => classifyExercise(e.exercise_name || e.name || ''));
  const barbellRatio = types.filter(t => t === 'barbell').length / (types.length || 1);
  const machineRatio = types.filter(t => t === 'machine').length / (types.length || 1);

  let factor = 1.0;
  if (relative_volume > 100) factor += 0.10;
  else if (relative_volume < 20 && filled.length > 0) factor -= 0.05;
  if (barbellRatio > 0.5) factor += 0.05;
  if (machineRatio > 0.5) factor -= 0.05;

  factor = Math.max(0.85, Math.min(1.15, factor));
  return Math.round(base_calories * factor);
}

export function estimateSessionCalories({ duration_minutes, body_weight_kg, exercises }) {
  const workout_classification = classifyWorkout(exercises);
  const base_calories = calculateBaseCalories({ duration_minutes, body_weight_kg, workout_classification });
  const adjusted_calories = applySignalAdjustments(base_calories, { exercises, body_weight_kg });
  return { base_calories, adjusted_calories, workout_classification };
}
