/**
 * personaEngine.js
 *
 * Two user types per the PRD:
 *   - guided      : follows a structured Nippard-based plan, system adapts it over time
 *   - self_directed: creates their own plan, system analyzes and optimizes it
 *
 * Detection: if user has a custom plan → self_directed, else → guided.
 */

export function computeSignals(data) {
  const checkIns   = data.check_ins || [];
  const plans      = data.plans || [];
  const activePlan = plans.find(p => p.status === 'active') || plans[0];
  const totalSessions = checkIns.length;

  let scheduled = 0;
  let missed = 0;
  if (activePlan?.weeks) {
    for (const week of activePlan.weeks) {
      for (const session of week.sessions) {
        if (session.status === 'scheduled' || session.status === 'completed' || session.status === 'missed') {
          scheduled++;
          if (session.status === 'missed') missed++;
        }
      }
    }
  }
  const streakBreakRate = scheduled > 0 ? missed / scheduled : 0;

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const recent = checkIns.filter(c => new Date(c.date) >= fourWeeksAgo);
  let recentScheduled = 0;
  if (activePlan?.weeks) {
    const now = new Date();
    for (const week of activePlan.weeks) {
      for (const session of week.sessions) {
        const d = new Date(session.date);
        if (d >= fourWeeksAgo && d <= now) recentScheduled++;
      }
    }
  }
  const consistencyScore = recentScheduled > 0 ? recent.length / recentScheduled : 0;

  return {
    total_sessions: totalSessions,
    streak_break_rate: parseFloat(streakBreakRate.toFixed(2)),
    has_custom_plan: activePlan?.user_type === 'self_directed' || data.user?.user_type === 'self_directed',
    consistency_score: parseFloat(consistencyScore.toFixed(2)),
    onboarding_persona: data.user?.persona || 'guided',
  };
}

export function detectPersona(signals) {
  const { has_custom_plan = false, onboarding_persona = 'guided' } = signals;
  if (has_custom_plan) return 'self_directed';
  return onboarding_persona === 'self_directed' ? 'self_directed' : 'guided';
}

export function updatePersona(data, userId = null) {
  const signals = computeSignals(data);
  const persona = detectPersona(signals);
  const updated = { ...data, user: { ...data.user, persona } };

  if (userId) {
    fetch('/.netlify/functions/detect-persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, signals }),
    }).catch(() => {});
  }

  return { updated, persona };
}

export function shouldCallAI(trigger, persona, data) {
  const totalSessions = (data.check_ins || []).length;
  const streak = data.streaks?.current || 0;
  switch (trigger) {
    case 'session_complete':
      if (totalSessions === 1) return true;
      if ([7, 14, 30, 60, 100].includes(streak)) return true;
      return false;
    case 'return':
      return true;
    case 'weekly_summary':
      return true;
    default:
      return false;
  }
}

export async function fetchCoachingMessage(persona, trigger, context) {
  try {
    const res = await fetch('/.netlify/functions/generate-coaching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona, trigger, context }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.message || null;
  } catch {
    return null;
  }
}

export const PERSONA_META = {
  guided: {
    label: 'Guided',
    color: '#3b82f6',
    description: 'Following a structured plan',
  },
  self_directed: {
    label: 'Self-Directed',
    color: '#a855f7',
    description: 'Running your own system',
  },
};
