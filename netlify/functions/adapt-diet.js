/**
 * adapt-diet — Netlify Function
 *
 * Weekly diet adaptation. Reads the user's recent weight trend, adherence,
 * and current target, and returns a calorie/macro adjustment proposal
 * grounded in the book.
 *
 * Deterministic rules apply first (large weight-loss → reduce deficit;
 * stalled loss in deficit → increase deficit slightly). AI fills the
 * narrative + handles edge cases.
 *
 * POST body:
 * {
 *   profile: { sex, goal, weight_kg, current_calories },
 *   trend:   { weekly_weight_change_pct, weeks_in_phase, last_adherence_pct },
 * }
 *
 * Response:
 * {
 *   recommendation: 'maintain'|'increase'|'decrease'|'diet_break'|'simplify',
 *   delta_kcal: integer,
 *   new_calories: integer,
 *   reason: string,
 *   book_reference: string
 * }
 */

import { buildBookSystemBlock } from './_book-context.js';

const TASK_PROMPT = `You are a weekly diet adaptation engine grounded in The Muscle Ladder by Jeff Nippard.

Deterministic rules to apply first (don't deviate):
- Cut (goal=fat_loss) + weekly weight loss > 1% bw → +150 kcal (too aggressive, risks muscle loss)
- Cut + weekly weight loss < 0.1% bw for 2+ weeks → -200 kcal (TDEE adapted)
- Cut + 12+ consecutive weeks in deficit → recommend diet_break (week at maintenance)
- Bulk (goal=build_max) + weekly weight gain > 0.5% bw → -200 kcal (mostly fat)
- Bulk + weight stalled for 2+ weeks → +150 kcal
- Recomp (goal=recomp) → keep calories stable; protein focus
- Any goal + adherence < 50% for 2+ weeks → recommend "simplify" not a calorie change

Return ONLY this JSON — no prose, no markdown:
{
  "recommendation": "maintain|increase|decrease|diet_break|simplify",
  "delta_kcal": <integer, can be 0>,
  "new_calories": <integer, current + delta>,
  "reason": "<1-2 sentence human-readable explanation>",
  "book_reference": "<chapter, e.g. 'Ch. 11 — Cutting'>"
}

Rules:
- delta_kcal must be in [-300, 300]; book caps single adjustments
- For diet_break: delta_kcal = (maintenance - current_calories), recommendation = 'diet_break'
- For simplify: delta_kcal = 0
- Always include book_reference`;

const FALLBACK = {
  recommendation: 'maintain',
  delta_kcal: 0,
  new_calories: 0,
  reason: 'No adjustment needed this week.',
  book_reference: 'Ch. 10 — Diet Foundations',
};

export const handler = async (event) => {
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

  const { profile = {}, trend = {} } = body;

  const userMessage = JSON.stringify({
    profile: {
      sex: profile.sex,
      goal: profile.goal,
      weight_kg: profile.weight_kg,
      current_calories: profile.current_calories,
    },
    trend: {
      weekly_weight_change_pct: trend.weekly_weight_change_pct,
      weeks_in_phase: trend.weeks_in_phase,
      last_adherence_pct: trend.last_adherence_pct,
    },
  });

  const bookBlock = buildBookSystemBlock('cut bulk diet break refeed adherence calorie adjustment', 3);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: [
          { type: 'text', text: bookBlock, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: TASK_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      return { statusCode: 200, body: JSON.stringify({ ...FALLBACK, new_calories: profile.current_calories || 0 }) };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    let result;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return { statusCode: 200, body: JSON.stringify({ ...FALLBACK, new_calories: profile.current_calories || 0 }) };
    }

    // Sanitize
    const validRecs = ['maintain', 'increase', 'decrease', 'diet_break', 'simplify'];
    if (!validRecs.includes(result.recommendation)) result.recommendation = 'maintain';
    result.delta_kcal = Math.max(-300, Math.min(300, parseInt(result.delta_kcal) || 0));
    if (result.recommendation === 'simplify') result.delta_kcal = 0;
    result.new_calories = (profile.current_calories || 0) + result.delta_kcal;
    if (typeof result.reason !== 'string') result.reason = FALLBACK.reason;
    if (typeof result.book_reference !== 'string') result.book_reference = FALLBACK.book_reference;

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch {
    return { statusCode: 200, body: JSON.stringify({ ...FALLBACK, new_calories: profile.current_calories || 0 }) };
  }
};
