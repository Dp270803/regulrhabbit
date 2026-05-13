/**
 * qa-chat — Netlify Function
 *
 * On-demand Q&A grounded in The Muscle Ladder by Jeff Nippard. Powered by
 * Claude Haiku 4.5 for fast, cheap responses. Used by the Dashboard
 * "Ask Coach" widget for form questions, substitution requests, and
 * general training queries.
 *
 * POST body:
 * {
 *   question: string,
 *   context?: {
 *     active_plan?: string,
 *     current_exercise?: string,
 *     injuries?: string[],
 *     goal?: string,
 *     experience_level?: string,
 *   },
 *   history?: [{ role: 'user'|'assistant', content: string }]   // optional last 6 turns
 * }
 *
 * Response:
 * {
 *   answer: string,
 *   book_reference?: string,
 *   suggested_substitutions?: [{ name, reason }]
 * }
 */

import { buildBookSystemBlock } from './_book-context.js';

const SYSTEM_PROMPT_TASK = `You are a fitness coach grounded in The Muscle Ladder by Jeff Nippard. Answer the user's question in 2-4 short sentences. Be direct, specific, and grounded in the book's principles.

Rules:
- If the question is about exercise form, give 1-3 bullet-style coaching cues (still in plain prose).
- If asked for a substitution, suggest 1-3 named exercises that hit the same muscle with comparable stimulus, considering the user's injuries.
- If the question is outside the book's scope (e.g. supplements not covered, medical advice, specific gear), say so briefly and suggest a safer next step.
- Always cite a book_reference (chapter) when your answer is book-derived.
- Never speculate. Never invent science. Never recommend banned substances.
- Output ONLY valid JSON, no markdown:

{
  "answer": "<2-4 sentences>",
  "book_reference": "<chapter, e.g. 'Ch. 5 — Exercise Selection'>",
  "suggested_substitutions": [
    { "name": "<exercise name>", "reason": "<1 sentence>" }
  ]
}

If no substitutions are relevant, omit the field or return an empty array.`;

const FALLBACK = {
  answer: 'The coach is offline right now. Try again in a moment.',
  book_reference: null,
  suggested_substitutions: [],
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

  const { question = '', context = {}, history = [] } = body;
  if (!question.trim()) {
    return { statusCode: 200, body: JSON.stringify({ ...FALLBACK, answer: 'Ask me anything about training, form, or substitutions.' }) };
  }

  // Retrieve targeted chunks based on the question and current exercise
  const retrievalQuery = [
    question,
    context.current_exercise || '',
    (context.injuries || []).join(' '),
  ].filter(Boolean).join(' ');

  const bookBlock = buildBookSystemBlock(retrievalQuery, 3);

  const userTurn = JSON.stringify({
    question,
    context: {
      active_plan: context.active_plan || null,
      current_exercise: context.current_exercise || null,
      injuries: context.injuries || [],
      goal: context.goal || null,
      experience_level: context.experience_level || 'intermediate',
    },
  });

  // Compose message history (last 6 turns max)
  const messages = [];
  for (const turn of (history || []).slice(-6)) {
    if (!turn?.role || !turn?.content) continue;
    if (turn.role === 'user' || turn.role === 'assistant') {
      messages.push({ role: turn.role, content: String(turn.content).slice(0, 1000) });
    }
  }
  messages.push({ role: 'user', content: userTurn });

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
        max_tokens: 600,
        system: [
          { type: 'text', text: bookBlock, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: SYSTEM_PROMPT_TASK, cache_control: { type: 'ephemeral' } },
        ],
        messages,
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
      // If the model returned plain prose, salvage it
      return {
        statusCode: 200,
        body: JSON.stringify({ ...FALLBACK, answer: text.trim() || FALLBACK.answer }),
      };
    }

    if (typeof result.answer !== 'string') result.answer = FALLBACK.answer;
    if (!Array.isArray(result.suggested_substitutions)) result.suggested_substitutions = [];
    result.suggested_substitutions = result.suggested_substitutions.slice(0, 3);

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch {
    return { statusCode: 200, body: JSON.stringify(FALLBACK) };
  }
};
