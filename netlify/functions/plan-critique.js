/**
 * plan-critique — Netlify Function
 *
 * Receives a training plan + user profile, returns a structured critique
 * grounded in evidence-based hypertrophy principles.
 *
 * POST body: { plan, user }
 * Response:  { overall_score, verdict, strengths, issues, proposed_edits }
 */

import { buildBookSystemBlock } from './_book-context.js';

const SYSTEM_PROMPT_TASK = `You are an evidence-based strength training coach. Use The Muscle Ladder by Jeff Nippard (provided in the book context) as your primary reference. When the book covers a principle, cite it. When it doesn't, use general evidence-based training science and set book_reference to "General evidence-based practice" — never leave a field blank or say "the book doesn't cover this".

Analyze the submitted plan and return ONLY this JSON object — no prose, no markdown:
{
  "overall_score": <integer 0-100>,
  "verdict": "<2-3 sentence overall assessment, honest and direct, no fluff>",
  "strengths": [
    {
      "observation": "<specific strength in the plan>",
      "principle": "<why this is effective>",
      "book_reference": "<chapter OR 'General evidence-based practice'>"
    }
  ],
  "issues": [
    {
      "issue": "<specific problem>",
      "severity": "low|medium|high",
      "explanation": "<why this matters for results>",
      "book_reference": "<chapter OR 'General evidence-based practice'>"
    }
  ],
  "proposed_edits": [
    {
      "exercise": "<exercise name, or 'Structure' for session-level changes>",
      "change_type": "add|remove|swap|adjust_volume",
      "from": "<current value or null>",
      "to": "<proposed value — for add/swap: exercise name; for adjust_volume: 'NxRep-Range' e.g. '4x8-12'>",
      "rationale": "<one-sentence reason>",
      "book_reference": "<chapter OR 'General evidence-based practice'>",
      "session_day": "<day name this applies to, or null for all sessions>"
    }
  ]
}

Rules:
- overall_score: 40-60 = needs work, 60-75 = decent, 75-85 = good, 85+ = excellent
- Max 3 strengths, max 4 issues, max 5 proposed_edits
- Every entry MUST include a book_reference (chapter or "General evidence-based practice")
- Be specific and actionable — reference actual exercise names from the plan
- Return ONLY the JSON object, nothing else`;

const FALLBACK = {
  overall_score: 70,
  verdict: 'Your plan looks solid. Analysis is temporarily unavailable — try again in a moment.',
  strengths: [{ observation: 'Plan structure submitted successfully', principle: 'Ready for detailed review' }],
  issues: [],
  proposed_edits: [],
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

  const { plan = {}, user = {} } = body;

  const planSummary = {
    goal: plan.gym_goal || user.goal || 'build muscle',
    experience: plan.experience_level || user.experience_level || 'Intermediate',
    days_per_week: (plan.scheduled_days || []).length,
    scheduled_days: plan.scheduled_days || [],
    sessions: (plan.weeks?.[0]?.sessions || []).map(s => ({
      day: s.day,
      title: s.title,
      exercises: s.blocks?.find(b => b.type === 'main')?.detail || '',
    })),
  };

  const userMessage = JSON.stringify({
    plan: planSummary,
    user: {
      goal: user.goal || plan.gym_goal,
      experience_level: user.experience_level || plan.experience_level,
      body_weight_kg: user.body_weight_kg,
    },
  });

  const bookContextQuery = `plan critique ${planSummary.goal} ${planSummary.experience} volume frequency exercise selection`;
  const bookBlock = buildBookSystemBlock(bookContextQuery, 4);

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
        max_tokens: 1400,
        system: [
          {
            type: 'text',
            text: bookBlock,
            cache_control: { type: 'ephemeral' },
          },
          {
            type: 'text',
            text: SYSTEM_PROMPT_TASK,
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

    result.overall_score = Math.max(0, Math.min(100, parseInt(result.overall_score) || 70));
    result.verdict = typeof result.verdict === 'string' ? result.verdict : FALLBACK.verdict;
    result.strengths = Array.isArray(result.strengths) ? result.strengths.slice(0, 3) : [];
    result.issues = Array.isArray(result.issues) ? result.issues.slice(0, 4) : [];
    result.proposed_edits = Array.isArray(result.proposed_edits) ? result.proposed_edits.slice(0, 5) : [];

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch {
    return { statusCode: 200, body: JSON.stringify(FALLBACK) };
  }
};
