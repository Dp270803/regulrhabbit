import { addDays, getDayName } from './dateUtils.js';

const PLAN_LABELS = {
  '2x': 'Full Body A/B Split',
  '3x': 'Push / Pull / Legs',
  '4x': 'Upper / Lower Split',
};

export async function generatePlan(answers) {
  const {
    activity = 'gym',
    experience_level,
    frequency,
    session_duration,
    scheduled_days,
    equipment,
    gym_goal,
  } = answers;

  const mod = await import('../data/templates/gym.json');
  const templateData = mod.default || mod;

  const freqKey = frequency >= 4 ? '4x' : `${frequency}x`;
  const template = templateData.templates[freqKey];
  if (!template) throw new Error(`No template for frequency: ${freqKey}`);

  const modifiers = templateData.experience_modifiers?.[experience_level] || {
    sets_multiplier: 1.0,
    reps_multiplier: 1.0,
    duration_multiplier: 1.0,
  };

  const substitutions = equipment && templateData.equipment_variants?.[equipment]?.substitutions
    ? templateData.equipment_variants[equipment].substitutions
    : null;

  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilNextMonday = ((8 - dayOfWeek) % 7) || 7;
  const startDate = addDays(today.toISOString().split('T')[0], dayOfWeek === 1 ? 0 : daysUntilNextMonday);

  const sortedDays = sortScheduledDays(scheduled_days);
  const planWeeks = buildWeeks(template, sortedDays, startDate, modifiers, session_duration, substitutions);

  const planId = `plan_${Date.now()}`;

  return {
    id: planId,
    activity,
    experience_level,
    frequency: Math.min(frequency, sortedDays.length),
    session_duration: session_duration || null,
    scheduled_days: sortedDays,
    template_id: `gym_${experience_level}_${freqKey}`,
    plan_label: PLAN_LABELS[freqKey] || template.label,
    start_date: startDate,
    current_week: 1,
    status: 'active',
    gym_goal: gym_goal || null,
    equipment: equipment || 'full_gym',
    weeks: planWeeks,
  };
}

function sortScheduledDays(days) {
  const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function applySubstitutions(text, subs) {
  if (!subs) return text;
  let result = text;
  for (const [original, replacement] of Object.entries(subs)) {
    result = result.split(original).join(replacement);
  }
  return result;
}

function buildWeeks(template, scheduledDays, startDate, modifiers, targetDuration, substitutions) {
  const weeks = [];

  for (const weekData of template.weeks) {
    const weekNum = weekData.week_number;
    const weekStartDate = addDays(startDate, (weekNum - 1) * 7);
    const sessions = [];

    for (let dayIdx = 0; dayIdx < scheduledDays.length; dayIdx++) {
      const dayName = scheduledDays[dayIdx];
      const dayOffset = getDayOffset(dayName);
      const sessionDate = addDays(weekStartDate, dayOffset);

      const templateSession = weekData.sessions[dayIdx % weekData.sessions.length];
      if (!templateSession) continue;

      const adjustedDuration = Math.round(
        (templateSession.duration_minutes || targetDuration || 50) * modifiers.duration_multiplier
      );

      const session = {
        id: `session_w${weekNum}_${dayName.slice(0, 3)}`,
        day: dayName,
        date: sessionDate,
        title: templateSession.title,
        duration_minutes: adjustedDuration,
        type: 'scheduled',
        blocks: templateSession.blocks.map(block => ({
          ...block,
          detail: applySubstitutions(block.detail, substitutions),
          duration_minutes: block.duration_minutes
            ? Math.round(block.duration_minutes * modifiers.duration_multiplier)
            : undefined,
        })),
        status: 'upcoming',
        completed_at: null,
      };

      sessions.push(session);
    }

    weeks.push({
      week_number: weekNum,
      sessions,
    });
  }

  return weeks;
}

function getDayOffset(dayName) {
  const offsets = {
    monday: 0,
    tuesday: 1,
    wednesday: 2,
    thursday: 3,
    friday: 4,
    saturday: 5,
    sunday: 6,
  };
  return offsets[dayName] || 0;
}

export function getTodaySession(plan) {
  if (!plan) return null;

  const today = new Date().toISOString().split('T')[0];
  const todayDay = getDayName(today);

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.date === today || session.day === todayDay) {
        if (session.date <= today && session.status !== 'completed') {
          return { session, weekNumber: week.week_number };
        }
        if (session.date === today) {
          return { session, weekNumber: week.week_number };
        }
      }
    }
  }

  return null;
}

export function isRestDay(plan) {
  if (!plan) return false;
  const todayDay = getDayName(new Date().toISOString().split('T')[0]);
  return !plan.scheduled_days.includes(todayDay);
}
