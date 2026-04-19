/**
 * generate-coaching — Netlify Function
 *
 * Calls Claude Haiku to generate a short persona-aware coaching message
 * or a structured post-session insights response.
 *
 * Uses Anthropic prompt caching on system prompts.
 *
 * POST body:
 * {
 *   persona: 'starter' | 'follower' | 'optimizer' | 'struggler' | 'self_directed',
 *   trigger: 'session_complete' | 'session_start' | 'streak_milestone' | 'return' | 'weekly_summary' | 'post_session',
 *   context: {
 *     name, streak, goal, total_sessions,
 *     missed_days?, milestone?, exercise_trend?,
 *     // post_session only:
 *     session_calories?, total_volume?, exercises_completed?,
 *     fitness_state?, adherence_score?, baseline_calories?,
 *     skipped_exercises?, overload_candidates?,
 *     ai_memory?: { accepted_suggestions, rejected_suggestions },
 *     history?   // last 10 session summaries
 *   }
 * }
 *
 * Response:
 *   - trigger !== 'post_session': { message: string }
 *   - trigger === 'post_session': { state_update, suggestions, plan_adjustments, diet_adjustments }
 */

const PERSONA_SYSTEM_PROMPTS = {
  starter: `You are a supportive gym coaching assistant for a beginner who needs structure and direction.
Tone: warm, encouraging, simple. Never use jargon. Focus on consistency over performance.
Rules: max 2 sentences. No bullet points. No emojis. Celebrate small wins.
Context: This app tracks gym habits using a streak system and XP progression. The 2-Day Rule means never miss two days in a row.`,

  follower: `You are a no-nonsense gym coaching assistant for someone who follows plans without overthinking.
Tone: direct, minimal, confident. No fluff. One clear instruction.
Rules: max 1 sentence. No explanations. No emojis.
Context: This app tracks gym habits using a streak system and XP progression.`,

  optimizer: `You are an analytical gym coaching assistant for a performance-focused lifter who wants data-driven insights.
Tone: technical, precise, specific. Reference numbers and trends when available.
Rules: max 2 sentences. Be specific about what to improve. No motivational fluff.
Context: This app tracks gym habits, XP, streaks, and exercise performance logs.`,

  struggler: `You are a compassionate gym coaching assistant for someone who struggles with consistency.
Tone: empathetic, supportive, low-pressure. Reduce barriers. Focus on showing up, not performance.
Rules: max 2 sentences. Never guilt-trip. Frame everything as momentum, not failure.
Context: This app uses a 2-Day Rule — never miss two days in a row. Shorter sessions are always better than skipping.`,

  self_directed: `You are a minimal gym coaching assistant for an experienced, self-directed lifter who has their own system.
Tone: neutral, brief, non-intrusive. Offer observations, not advice. Never be prescriptive.
Rules: max 1 sentence. Only speak when you have something genuinely useful to say.
Context: This app tracks habits and performance logs. The user decides their own training.`,
};

const TRIGGER_TEMPLATES = {
  session_complete: (ctx) => `User ${ctx.name || 'just'} completed a session. Streak: ${ctx.streak} days. Total sessions: ${ctx.total_sessions}. Goal: ${ctx.goal || 'build muscle'}. Generate a post-session coaching message.`,
  session_start: (ctx) => `User ${ctx.name || ''} is about to start a session. Streak: ${ctx.streak} days. Generate a brief pre-session message.`,
  streak_milestone: (ctx) => `User ${ctx.name || ''} hit a ${ctx.milestone}-day streak milestone. Total sessions: ${ctx.total_sessions}. Generate a milestone message.`,
  return: (ctx) => `User ${ctx.name || ''} is returning after ${ctx.missed_days || 1} missed day(s). Streak: ${ctx.streak}. Generate a comeback message. Keep it short.`,
  weekly_summary: (ctx) => `User ${ctx.name || ''} completed their week. Streak: ${ctx.streak}. ${ctx.exercise_trend ? `Performance note: ${ctx.exercise_trend}.` : ''} Generate a weekly summary insight.`,
};

const POST_SESSION_SYSTEM = `You are an intelligent fitness advisor that analyses user workout data and returns structured JSON recommendations.
You ONLY suggest — never override system logic or compute calorie baselines.
Rules: Be specific. No fluff. Output valid JSON only. No markdown code blocks.`;

function buildPostSessionPrompt(ctx) {
  const state = ctx.fitness_state || {};
  const memory = ctx.ai_memory || {};
  const lines = [
    `Goal: ${ctx.goal || 'build muscle'}`,
    `Adherence (last 28d): ${ctx.adherence_score ?? 'unknown'}`,
    `Session calories burned: ${ctx.session_calories ?? 'unknown'} kcal`,
    `Total volume this session: ${ctx.total_volume ?? 'unknown'} kg`,
    `Exercises completed: ${Array.isArray(ctx.exercises_completed) ? ctx.exercises_completed.join(', ') : 'unknown'}`,
    `Fitness phase: ${state.phase || 'unknown'}`,
    `Fatigue level: ${state.fatigue_level || 'unknown'}`,
    `Strength trend: ${state.strength_trend || 'unknown'}`,
    `Weight trend: ${state.weight_trend || 'unknown'}`,
    `Baseline calories: ${ctx.baseline_calories ?? 'unknown'} kcal/day`,
  ];
  if (ctx.skipped_exercises?.length) lines.push(`Exercises often skipped: ${ctx.skipped_exercises.join(', ')}`);
  if (ctx.overload_candidates?.length) lines.push(`Ready for progressive overload: ${ctx.overload_candidates.join(', ')}`);
  if (memory.accepted_suggestions?.length) lines.push(`Previously accepted suggestions: ${memory.accepted_suggestions.map(s => s.text).join('; ')}`);
  if (memory.rejected_suggestions?.length) lines.push(`Previously rejected (don't repeat): ${memory.rejected_suggestions.map(s => s.text).join('; ')}`);

  return `${lines.join('\n')}

Return a JSON object with exactly these keys:
{
  "state_update": {},
  "suggestions": [{ "category": "exercise"|"diet"|"recovery", "text": "..." }],
  "plan_adjustments": [{ "type": "reduce_volume"|"add_exercise"|"replace_exercise"|"adjust_frequency", "detail": "...", "old_exercise": "...", "new_exercise": { "name": "...", "sets": 3, "reps": "8-12" }, "exercise": { "name": "...", "sets": 3, "reps": "8-12" }, "delta": 0 }],
  "diet_adjustments": [{ "delta": 0, "reason": "..." }]
}
Provide 1-3 suggestions. Only include plan_adjustments or diet_adjustments if genuinely warranted. Keep suggestion text under 20 words.`;

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'AI not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { persona = 'follower', trigger = 'session_complete', context = {} } = body;
  const isPostSession = trigger === 'post_session';

  const systemPrompt = isPostSession
    ? POST_SESSION_SYSTEM
    : (PERSONA_SYSTEM_PROMPTS[persona] || PERSONA_SYSTEM_PROMPTS.follower);

  const userMessage = isPostSession
    ? buildPostSessionPrompt(context)
    : (TRIGGER_TEMPLATES[trigger] || TRIGGER_TEMPLATES.session_complete)(context);

  const maxTokens = isPostSession ? 600 : 120;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: maxTokens,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return { statusCode: 502, body: JSON.stringify({ error: 'AI request failed' }) };
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text?.trim() || '';

    if (isPostSession) {
      try {
        const parsed = JSON.parse(raw);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        };
      } catch {
        // If JSON parse fails, return empty structure so client handles gracefully
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state_update: {}, suggestions: [], plan_adjustments: [], diet_adjustments: [] }),
        };
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: raw }),
    };
  } catch (err) {
    console.error('generate-coaching error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
