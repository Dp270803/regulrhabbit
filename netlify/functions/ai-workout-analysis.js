/**
 * ai-workout-analysis - Netlify Function
 *
 * Receives pre-computed calorie estimates (base + adjusted) from the client-side
 * MET pipeline and returns a refinement multiplier. Never outputs absolute calorie
 * numbers - the client applies: final_calories = adjusted_calories × adjustment_factor.
 *
 * POST body:
 * {
 *   session: { title, duration_minutes, exercises: [{name, sets, reps, weight_kg}], workout_classification },
 *   calories: { base_calories, adjusted_calories },
 *   user: { body_weight_kg, level, goal },
 *   context: { name, streak, user_type, history_count }
 * }
 *
 * Response:
 * {
 *   adjustment_factor: float (0.85–1.20),
 *   reasoning: string,
 *   suggestions: [{type, text}],
 *   state_update: {},
 *   plan_adjustments: [],
 *   diet_adjustments: []
 * }
 */

const SYSTEM_PROMPT = `You are a workout analysis engine. You receive a pre-calculated calorie estimate alongside workout signals.

Return ONLY this JSON object - no prose, no markdown:
{
  "adjustment_factor": <float 0.85-1.20>,
  "reasoning": "<1 sentence, conversational, user-facing, e.g. 'High-volume compound session with heavy loading'>",
  "suggestions": [{ "type": "progressive_overload|exercise_suggestion|diet_tip|recovery", "text": "<actionable>" }],
  "state_update": {},
  "plan_adjustments": [],
  "diet_adjustments": []
}

Rules:
- adjustment_factor near 1.0 means the estimate is accurate. Use >1.0 if session intensity warrants more. Use <1.0 if lighter than calculated.
- Do NOT output absolute calorie numbers anywhere in your response.
- Max 3 suggestions. Only suggest progressive_overload if history_count > 0.
- reasoning must be conversational and suitable to display directly to the user.
- Return only the JSON object, nothing else.`;

const FALLBACK = {
  adjustment_factor: 1.0,
  reasoning: 'Analysis unavailable',
  suggestions: [],
  state_update: {},
  plan_adjustments: [],
  diet_adjustments: [],
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 200, body: JSON.stringify(FALLBACK) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 200, body: JSON.stringify(FALLBACK) };
  }

  const { session = {}, calories = {}, user = {}, context = {} } = body;

  const userMessage = JSON.stringify({
    session: {
      title: session.title,
      duration_minutes: session.duration_minutes,
      workout_classification: session.workout_classification,
      exercise_count: (session.exercises || []).length,
      exercises: (session.exercises || []).slice(0, 10),
    },
    calories: {
      base_calories: calories.base_calories,
      adjusted_calories: calories.adjusted_calories,
    },
    user: {
      body_weight_kg: user.body_weight_kg,
      level: user.level,
      goal: user.goal,
    },
    context: {
      name: context.name,
      streak: context.streak,
      user_type: context.user_type,
      history_count: context.history_count ?? 0,
    },
  });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      return { statusCode: 200, body: JSON.stringify(FALLBACK) };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    let result;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return { statusCode: 200, body: JSON.stringify(FALLBACK) };
    }

    // Enforce safe values - never trust AI to stay in bounds
    result.adjustment_factor = Math.max(0.85, Math.min(1.20, Number(result.adjustment_factor) || 1.0));
    result.reasoning = typeof result.reasoning === 'string' ? result.reasoning : 'Analysis complete';
    result.suggestions = Array.isArray(result.suggestions) ? result.suggestions.slice(0, 3) : [];
    // Phase 1 stubs - always override these
    result.state_update = {};
    result.plan_adjustments = [];
    result.diet_adjustments = [];

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch {
    return { statusCode: 200, body: JSON.stringify(FALLBACK) };
  }
};
