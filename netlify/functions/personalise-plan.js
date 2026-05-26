/**
 * personalise-plan - Netlify Function
 *
 * Persona C entry point: after the user selects a pre-built evidence-based program,
 * this function returns a list of exercise substitutions tailored to their
 * body stats, training experience, and injuries - grounded in The Muscle Ladder.
 *
 * The function does NOT rewrite the plan structure (days, sets, reps); it only
 * proposes 1-1 exercise swaps that the client applies via the existing
 * adaptationEngine.replaceExercise helper. This keeps the change auditable
 * and reversible.
 *
 * POST body:
 * {
 *   plan_name:   string,
 *   exercises:   string[],        // unique exercise names in the plan
 *   profile: {
 *     sex, goal, body_weight_kg, height_cm, age, experience_level,
 *     injuries: string[],          // ['lower_back', 'knee', 'shoulder', ...]
 *     dietary_preference?, cuisine?, equipment_available?,
 *   }
 * }
 *
 * Response:
 * {
 *   summary: string,
 *   substitutions: [
 *     { old_exercise, new_exercise, reason, book_reference }
 *   ],
 *   notes: string                 // free-text guidance about the personalised plan
 * }
 */

import { buildBookSystemBlock } from './_book-context.js';

const SYSTEM_PROMPT_TASK = `You are a strength coach personalising a pre-built evidence-based program for a real user. Use The Muscle Ladder (provided in the book context) as your primary reference. When the book covers an exercise or principle, cite it. When it doesn't, use general evidence-based training science and set book_reference to "General evidence-based practice".

Your job: given the plan's exercise list and the user's profile (especially injuries), recommend AT MOST 4 exercise substitutions that:
1. Train the same primary muscle as the original
2. Avoid the user's injuries (e.g., lower-back issue → swap conventional deadlift for trap-bar; knee issue → swap back squat for hack squat or leg press)
3. Match the user's experience level - beginners get simpler/safer variations
4. Cite a book_reference (chapter OR "General evidence-based practice")

If the user has no injuries and is intermediate or advanced, you may return zero substitutions and just include a short "notes" field about how the plan suits them.

Output ONLY valid JSON, no markdown:
{
  "summary": "<one short sentence>",
  "substitutions": [
    {
      "old_exercise": "<exact name from input>",
      "new_exercise": "<replacement>",
      "reason": "<1 sentence>",
      "book_reference": "<chapter OR 'General evidence-based practice'>"
    }
  ],
  "notes": "<1-2 sentences of personalised guidance, optional>"
}

Hard rules:
- Never suggest an exercise that's likely to aggravate the listed injuries.
- Never invent new exercises - stay within standard barbell/dumbbell/machine vocabulary.
- Cap substitutions at 4.
- If the input exercise list is empty, return empty substitutions.`;

const FALLBACK = {
  summary: 'Plan kept as-is.',
  substitutions: [],
  notes: '',
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

  const exercises = Array.isArray(body.exercises) ? body.exercises : [];
  const profile = body.profile || {};

  if (exercises.length === 0) {
    return { statusCode: 200, body: JSON.stringify(FALLBACK) };
  }

  const retrievalQuery = [
    'exercise substitution selection injury',
    profile.experience_level || '',
    (profile.injuries || []).join(' '),
  ].filter(Boolean).join(' ');

  const bookBlock = buildBookSystemBlock(retrievalQuery, 4);

  const userTurn = JSON.stringify({
    plan_name: body.plan_name || 'pre-built plan',
    exercises,
    profile: {
      sex: profile.sex || 'male',
      goal: profile.goal || 'maintenance',
      body_weight_kg: profile.body_weight_kg,
      height_cm: profile.height_cm,
      age: profile.age,
      experience_level: profile.experience_level || 'intermediate',
      injuries: profile.injuries || [],
      equipment_available: profile.equipment_available || 'full gym',
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
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: [
          { type: 'text', text: bookBlock, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: SYSTEM_PROMPT_TASK, cache_control: { type: 'ephemeral' } },
        ],
        messages: [{ role: 'user', content: userTurn }],
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

    if (!Array.isArray(result.substitutions)) result.substitutions = [];
    result.substitutions = result.substitutions.slice(0, 4);
    if (typeof result.summary !== 'string') result.summary = FALLBACK.summary;
    if (typeof result.notes !== 'string') result.notes = '';

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch {
    return { statusCode: 200, body: JSON.stringify(FALLBACK) };
  }
};
