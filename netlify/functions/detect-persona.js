/**
 * detect-persona — Netlify Function
 *
 * Recalculates a user's persona from behavior signals and updates Supabase.
 * Called server-side so the deterministic logic runs consistently.
 *
 * POST body: {
 *   userId: string,
 *   signals: {
 *     total_sessions: number,
 *     streak_break_rate: number,   // missed_scheduled / total_scheduled (0–1)
 *     has_custom_plan: boolean,
 *     consistency_score: number,   // completed / scheduled last 4 weeks (0–1)
 *     onboarding_persona: string,  // persona chosen during onboarding
 *   }
 * }
 *
 * Response: { persona: string }
 */

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

function detectPersona(signals) {
  const { has_custom_plan = false, onboarding_persona = 'guided' } = signals;
  if (has_custom_plan) return 'self_directed';
  return onboarding_persona === 'self_directed' ? 'self_directed' : 'guided';
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { userId, signals = {} } = body;
  const persona = detectPersona(signals);

  // Update Supabase if we have service role access
  if (userId && SUPABASE_URL && SUPABASE_SERVICE) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE,
          'Authorization': `Bearer ${SUPABASE_SERVICE}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ persona, updated_at: new Date().toISOString() }),
      });
    } catch (err) {
      console.error('Supabase update error:', err);
      // Non-fatal — return persona anyway
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona }),
  };
};
