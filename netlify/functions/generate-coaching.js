/**
 * generate-coaching — Netlify Function
 *
 * Calls Claude Haiku to generate a short persona-aware coaching message.
 * Uses Anthropic prompt caching on the system prompt — each persona has one
 * cached system block (~400 tokens). After the first call per persona, cached
 * reads cost ~90% less than uncached input tokens.
 *
 * POST body:
 * {
 *   persona: 'starter' | 'follower' | 'optimizer' | 'struggler' | 'self_directed',
 *   trigger: 'session_complete' | 'session_start' | 'streak_milestone' | 'return' | 'weekly_summary',
 *   context: {
 *     name: string,
 *     streak: number,
 *     goal: string,
 *     total_sessions: number,
 *     missed_days?: number,
 *     milestone?: number,
 *     exercise_trend?: string,   // Optimizer only
 *   }
 * }
 *
 * Response: { message: string }
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
  const systemPrompt = PERSONA_SYSTEM_PROMPTS[persona] || PERSONA_SYSTEM_PROMPTS.follower;
  const triggerFn = TRIGGER_TEMPLATES[trigger] || TRIGGER_TEMPLATES.session_complete;
  const userMessage = triggerFn(context);

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
        max_tokens: 120,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' }, // Cache the system prompt per persona
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
    const message = data.content?.[0]?.text?.trim() || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    };
  } catch (err) {
    console.error('generate-coaching error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
