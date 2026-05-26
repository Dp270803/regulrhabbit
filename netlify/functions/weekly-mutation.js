/**
 * weekly-mutation - Netlify Function
 *
 * Runs once a week (client-triggered) to propose plan mutations grounded in
 * The Muscle Ladder by Jeff Nippard. Reads training signals + matched rules
 * and returns a structured plan_update with concrete changes.
 *
 * POST body:
 * {
 *   user:          { name, sex, goal, experience_level, injuries },
 *   signals:       { avg_rir, stalled_weeks, adherence_pct, muscle_weekly_sets, muscle_frequency_min,
 *                    rir_zero_consecutive_sessions, weeks_since_deload, ... },
 *   training_state:'progressing'|'stalled'|'under_recovering'|'under_loading'|'fresh',
 *   matched_rules: [{ id, domain, name, action: {type, params}, book_reference }],
 *   ai_memory:     { accepted_suggestions, rejected_suggestions },
 *   plan_summary:  { active_plan_name, sessions_per_week, scheduled_days, week_number, total_weeks }
 * }
 *
 * Response:
 * {
 *   summary: string,
 *   changes: [
 *     {
 *       type: 'reduce_volume'|'add_exercise'|'replace_exercise'|'adjust_frequency'|'increase_load'|'deload'|'swap',
 *       exercise?: string,
 *       old_exercise?: string,
 *       new_exercise?: string,
 *       muscle?: string,
 *       delta_sets?: number,
 *       reason: string,
 *       book_reference: string,
 *     }
 *   ]
 * }
 */

import { buildBookSystemBlock } from './_book-context.js';

const SYSTEM_PROMPT_TASK = `You are a weekly training-plan adaptation coach. Use The Muscle Ladder by Jeff Nippard (provided in the book context) as your primary reference. When the book covers a principle, cite it. When it doesn't, use general evidence-based training science and set book_reference to "General evidence-based practice".

Your task: given the user's current training signals, recommend AT MOST 3 concrete plan changes for the next training week. No changes is a valid output if the user is progressing well.

Rules:
- Be conservative: cap changes at 3.
- Prefer the smallest viable change (e.g. drop 2 sets before swapping an exercise).
- Never recommend a change that contradicts the user's injuries.
- Never repeat a recently rejected suggestion (see ai_memory.rejected_suggestions).
- Every change MUST cite a book_reference (chapter OR "General evidence-based practice").
- If matched_rules contains deterministic triggers (e.g. MRV exceeded, stalled 2+ weeks), reflect those in the changes.

Map training_state to default action:
- 'progressing' → 0–1 minor changes (small load bump or volume nudge)
- 'stalled'     → up to 2 changes (rep range shift, exercise swap, or deload candidate)
- 'under_recovering' → recommend a deload or reduce_volume
- 'under_loading'    → small load increase or add ~2 sets to lagging muscle
- 'fresh'       → 0 changes (insufficient data)

Output ONLY valid JSON, no prose:
{
  "summary": "<one short sentence describing the week's theme>",
  "changes": [
    {
      "type": "reduce_volume|add_exercise|replace_exercise|adjust_frequency|increase_load|deload|swap",
      "exercise": "<name>",
      "old_exercise": "<optional, for swap/replace>",
      "new_exercise": "<optional, for swap/replace>",
      "muscle": "<optional>",
      "delta_sets": <integer optional>,
      "reason": "<1 sentence>",
      "book_reference": "<chapter, e.g. 'Ch. 8 - Volume'>"
    }
  ]
}`;

const FALLBACK = {
  summary: 'No automated changes this week.',
  changes: [],
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

  const userPayload = JSON.stringify({
    user: body.user || {},
    signals: body.signals || {},
    training_state: body.training_state || 'fresh',
    matched_rules: body.matched_rules || [],
    ai_memory: body.ai_memory || {},
    plan_summary: body.plan_summary || {},
  });

  // Retrieve book context tuned to the training state
  const bookQuery = [
    body.training_state || '',
    'volume MRV deload progression frequency overload',
    (body.matched_rules || []).map(r => r.domain).join(' '),
  ].filter(Boolean).join(' ');

  const bookBlock = buildBookSystemBlock(bookQuery, 4);

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
        max_tokens: 1200,
        system: [
          { type: 'text', text: bookBlock, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: SYSTEM_PROMPT_TASK, cache_control: { type: 'ephemeral' } },
        ],
        messages: [{ role: 'user', content: userPayload }],
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

    if (!Array.isArray(result.changes)) result.changes = [];
    result.changes = result.changes.slice(0, 3); // hard cap
    if (typeof result.summary !== 'string') result.summary = FALLBACK.summary;

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch {
    return { statusCode: 200, body: JSON.stringify(FALLBACK) };
  }
};
