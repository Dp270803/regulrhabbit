/**
 * personaEngine.js
 *
 * Client-side persona detection and coaching message fetching.
 *
 * Persona is determined by:
 *   1. Onboarding answer (training_style field) - used for first 10 sessions
 *   2. Behavior signals - takes over after 10+ sessions
 *
 * The server-side /detect-persona function mirrors this logic and also
 * persists the result to Supabase.
 */

// ─── Detection ────────────────────────────────────────────────────────────────

/**
 * Compute behavior signals from stored app data.
 */
export function computeSignals(data) {
  const checkIns    = data.check_ins || [];
  const plans       = data.plans || [];
  const activePlan  = plans.find(p => p.status === 'active') || plans[0];
  const totalSessions = checkIns.length;

  // streak_break_rate: proportion of scheduled days that were missed over the plan lifetime
  let scheduled = 0;
  let missed    = 0;
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

  // consistency_score: sessions completed / sessions scheduled in last 4 weeks
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const recent = checkIns.filter(c => new Date(c.date) >= fourWeeksAgo);
  let recentScheduled = 0;
  if (activePlan?.weeks) {
    for (const week of activePlan.weeks) {
      for (const session of week.sessions) {
        const sessionDate = new Date(session.date);
        if (sessionDate >= fourWeeksAgo && sessionDate <= new Date()) {
          recentScheduled++;
        }
      }
    }
  }
  const consistencyScore = recentScheduled > 0 ? recent.length / recentScheduled : 0;

  return {
    total_sessions: totalSessions,
    streak_break_rate: parseFloat(streakBreakRate.toFixed(2)),
    has_custom_plan: activePlan?.persona === 'self_directed' || data.user?.user_type === 'self_directed',
    consistency_score: parseFloat(consistencyScore.toFixed(2)),
    onboarding_persona: data.user?.persona || 'follower',
  };
}

/**
 * Detect persona locally (same logic as the server-side function).
 * Used for immediate UI updates before the server responds.
 */
export function detectPersona(signals) {
  const {
    total_sessions = 0,
    streak_break_rate = 0,
    has_custom_plan = false,
    consistency_score = 0,
    onboarding_persona = 'follower',
  } = signals;

  if (total_sessions < 10) return onboarding_persona;
  if (has_custom_plan)         return 'self_directed';
  if (streak_break_rate > 0.4) return 'struggler';
  if (consistency_score > 0.8) return 'optimizer';
  if (consistency_score > 0.5) return 'follower';
  return 'starter';
}

/**
 * Run full persona update: compute signals, detect, persist to localStorage,
 * and call the server to update Supabase.
 */
export function updatePersona(data, userId = null) {
  const signals = computeSignals(data);
  const persona = detectPersona(signals);

  // Update localStorage immediately
  const updated = { ...data, user: { ...data.user, persona } };

  // Fire-and-forget server update for Supabase persistence
  if (userId) {
    fetch('/.netlify/functions/detect-persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, signals }),
    }).catch(() => {});
  }

  return { updated, persona };
}

// ─── Coaching message fetching ────────────────────────────────────────────────

/**
 * Determines if this event should trigger an AI coaching call (vs template).
 * Goal: ~5-8% of interactions use AI.
 */
export function shouldCallAI(trigger, persona, data) {
  const totalSessions = (data.check_ins || []).length;
  const streak = data.streaks?.current || 0;

  switch (trigger) {
    case 'session_complete':
      if (totalSessions === 1) return true;              // Very first session ever
      if (persona === 'struggler') return true;          // Strugglers always get AI
      if ([7, 14, 30, 60, 100].includes(streak)) return true; // Milestones
      return false;
    case 'return':
      return true; // Always AI for return events
    case 'weekly_summary':
      return persona === 'optimizer'; // Only optimizers get weekly AI summaries
    default:
      return false;
  }
}

/**
 * Fetch a coaching message from the Netlify Function.
 * Falls back silently to null if the function is unavailable.
 */
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

// ─── Persona metadata (for UI) ────────────────────────────────────────────────

export const PERSONA_META = {
  starter: {
    label: 'Starter',
    color: '#22c55e',
    description: 'Building the habit',
  },
  follower: {
    label: 'Follower',
    color: '#3b82f6',
    description: 'Staying consistent',
  },
  optimizer: {
    label: 'Optimizer',
    color: '#eab308',
    description: 'Chasing performance',
  },
  struggler: {
    label: 'Struggler',
    color: '#ef4444',
    description: 'Fighting for momentum',
  },
  self_directed: {
    label: 'Self-Directed',
    color: '#a855f7',
    description: 'Running your own system',
  },
};
