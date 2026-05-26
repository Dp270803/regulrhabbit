/**
 * generate-meal-plan - Netlify Function
 *
 * Generates a 7-day meal template adapted to the user's macros, cuisine,
 * cooking style, and dietary preferences. Macro math is deterministic
 * (passed in); AI only handles meal realism.
 *
 * POST body:
 * {
 *   target: { calories, protein_g, fat_g, carb_g },
 *   user: { sex, goal, cuisine?, dietary_preference?, eating_habits? }
 * }
 *
 * Response:
 * {
 *   week_plan: [{ day, meals: [{ type, name, items, kcal, protein, fat, carbs, book_reference? }] }],
 *   notes: string
 * }
 */

import { buildBookSystemBlock } from './_book-context.js';

const TASK_PROMPT = `You are a professional nutritionist building a realistic 7-day meal plan. Use the book context (The Muscle Ladder) for macro distribution and meal timing principles. For actual meal construction - ingredients, cuisine, recipes - use your general nutrition knowledge freely.

Your job is realism, not novelty. Match the user's actual culture, cuisine, and cooking style. Avoid generic chicken-and-broccoli unless the user has indicated that preference.

Return ONLY this JSON - no prose, no markdown:
{
  "week_plan": [
    {
      "day": "Mon|Tue|Wed|Thu|Fri|Sat|Sun",
      "meals": [
        {
          "type": "breakfast|lunch|dinner|snack",
          "name": "<short meal name>",
          "items": ["item 1", "item 2"],
          "kcal": <integer>,
          "protein_g": <integer>,
          "fat_g": <integer>,
          "carb_g": <integer>
        }
      ]
    }
  ],
  "notes": "<1-2 sentences on adherence / prep / culture fit>",
  "book_reference": "Ch. 10 - Diet Foundations"
}

Rules:
- 3-5 meals per day. Daily total must come within ±5% of the target calories and ±10% of each macro.
- Repeat 2-3 staple meals across the week - real people don't cook 21 unique meals.
- All 7 days must be present (Mon through Sun).
- Protein distributed roughly evenly across meals (3-5 meals, 20-40g protein each).
- Include simple item lists (e.g. "100g chicken breast", "1 cup rice"), not recipes.
- If cuisine is unspecified, default to a globally-neutral pantry mix.
- Return only the JSON object. Do not truncate - all 7 days must be complete.`;

const FALLBACK = {
  week_plan: [],
  notes: 'Meal plan generation unavailable. Try again in a moment.',
  book_reference: '',
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

  const { target = {}, user = {} } = body;

  const userMessage = JSON.stringify({
    target: {
      calories: target.calories,
      protein_g: target.protein_g,
      fat_g: target.fat_g,
      carb_g: target.carb_g,
    },
    user: {
      goal: user.goal || 'maintenance',
      cuisine: user.cuisine || 'globally neutral',
      dietary_preference: user.dietary_preference || 'omnivore',
      eating_habits: user.eating_habits || {},
      sex: user.sex,
    },
  });

  const bookBlock = buildBookSystemBlock('diet macros meal timing protein adherence', 3);

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
        max_tokens: 4096,
        system: [
          { type: 'text', text: bookBlock, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: TASK_PROMPT, cache_control: { type: 'ephemeral' } },
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

    // Sanitize
    if (!Array.isArray(result.week_plan)) result.week_plan = [];
    result.week_plan = result.week_plan.slice(0, 7).map(d => ({
      day: typeof d.day === 'string' ? d.day : '',
      meals: Array.isArray(d.meals) ? d.meals.slice(0, 5) : [],
    }));
    if (typeof result.notes !== 'string') result.notes = '';
    if (typeof result.book_reference !== 'string') result.book_reference = 'Ch. 10 - Diet Foundations';

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch {
    return { statusCode: 200, body: JSON.stringify(FALLBACK) };
  }
};
