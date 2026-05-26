import bookRules from '../data/book-rules.json';
import bookChunks from '../data/book-chunks.json';

const RULES = bookRules.rules;
const CHUNKS = bookChunks.chunks;

/**
 * Tier 1 - Rule evaluation.
 * Returns rules whose `trigger` conditions match the provided signals/state.
 *
 * Signals shape:
 * {
 *   avg_rir: number, stalled_weeks: number, adherence_pct: number,
 *   experience_level: 'Beginner' | 'Intermediate' | 'Advanced',
 *   weeks_since_deload: number, goal: 'fat_loss' | 'build_max' | 'recomp' | 'strength',
 *   sex: 'male' | 'female', activity_level: 'sedentary'|'light'|'moderate'|'active',
 *   injuries: string[], session_duration_min: number,
 *   muscle_weekly_sets: { [muscle]: number },
 *   weekly_weight_change_pct: number, diet_adherence_pct: number,
 *   consecutive_cut_weeks: number, consecutive_deficit_weeks: number,
 *   rir_zero_consecutive_sessions: number, plan_changes_per_month: number,
 * }
 */
export function evaluateRules(signals) {
  return RULES.filter(rule => matchesTrigger(rule.trigger, signals));
}

/**
 * Get rules by domain - e.g. only diet rules, or only progression rules.
 */
export function rulesByDomain(domain) {
  return RULES.filter(r => r.domain === domain);
}

/**
 * Get a single rule by id.
 */
export function getRule(id) {
  return RULES.find(r => r.id === id);
}

/**
 * Tier 2 - Topic chunk retrieval.
 * Returns the top N chunks ranked by keyword overlap with the query terms
 * and `applies_to` tag matching the context.
 *
 * @param {string|string[]} query  Plain query string or keyword array.
 * @param {string|string[]} context  e.g. 'plan_critique', 'weekly_mutation'.
 * @param {number} limit  Number of chunks to return (default 4).
 */
export function retrieveBookChunks(query, context = 'general', limit = 4) {
  const queryTerms = Array.isArray(query)
    ? query.map(t => t.toLowerCase())
    : String(query || '').toLowerCase().split(/\s+/).filter(t => t.length > 2);

  const contextTags = Array.isArray(context) ? context : [context];

  const scored = CHUNKS.map(chunk => {
    let score = 0;
    // Keyword match (highest weight)
    for (const kw of chunk.keywords) {
      if (queryTerms.some(t => kw.toLowerCase().includes(t) || t.includes(kw.toLowerCase()))) {
        score += 3;
      }
    }
    // Topic match
    if (queryTerms.some(t => chunk.topic.toLowerCase().includes(t))) {
      score += 4;
    }
    // applies_to match
    for (const tag of contextTags) {
      if (chunk.applies_to.includes(tag)) score += 2;
    }
    // Soft fallback: content substring match
    if (score === 0 && queryTerms.length > 0) {
      const contentLower = chunk.content.toLowerCase();
      for (const t of queryTerms) {
        if (contentLower.includes(t)) score += 1;
      }
    }
    return { chunk, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.chunk);
}

/**
 * Build the book-grounded context block injected into an AI system prompt.
 * Includes 3-5 retrieved chunks formatted with chapter references.
 */
export function buildBookContext(query, context, limit = 4) {
  const chunks = retrieveBookChunks(query, context, limit);
  if (chunks.length === 0) return '';

  const sections = chunks.map(c =>
    `[${c.chapter}] ${c.content}`
  ).join('\n\n');

  return `--- Relevant context from The Muscle Ladder ( ---\n${sections}\n--- end context ---`;
}

/**
 * Trigger matching - handles the variety of comparison shapes the rules use.
 * Supported keys:
 *   - direct equality:        { goal: 'fat_loss' }
 *   - numeric comparisons:    foo_lt, foo_lte, foo_gt, foo_gte, foo_eq
 *   - membership:             foo_contains: 'bar'  → checks signals.foo.includes('bar')
 *   - array length checks:    same as above with array
 *   - special composite keys: muscle_weekly_sets_gt_mrv, muscle_weekly_sets_lt_mev, etc.
 *   - { any: true } → always matches (use sparingly)
 */
function matchesTrigger(trigger, signals) {
  if (!trigger || typeof trigger !== 'object') return false;
  if (trigger.any === true) return true;

  for (const [key, expected] of Object.entries(trigger)) {
    if (key === 'any') continue;
    if (!matchClause(key, expected, signals)) return false;
  }
  return true;
}

function matchClause(key, expected, signals) {
  // Composite/special clauses
  if (key === 'muscle_weekly_sets_gt_mrv' && expected === true) {
    return Object.entries(signals.muscle_weekly_sets || {}).some(([muscle, sets]) => {
      const landmark = RULES.find(r => r.action?.type === 'volume_landmark' && r.trigger?.muscle === muscle);
      return landmark && sets > landmark.action.mrv_sets;
    });
  }
  if (key === 'muscle_weekly_sets_lt_mev' && expected === true) {
    return Object.entries(signals.muscle_weekly_sets || {}).some(([muscle, sets]) => {
      const landmark = RULES.find(r => r.action?.type === 'volume_landmark' && r.trigger?.muscle === muscle);
      return landmark && sets < landmark.action.mev_sets;
    });
  }
  if (key === 'leg_weekly_sets_lt_mev' && expected === true) {
    const legSets = signals.muscle_weekly_sets?.Legs ?? 99;
    return legSets < 8;
  }
  if (key === 'muscle_freq_lt') {
    return (signals.muscle_frequency_min || 99) < expected;
  }
  if (key === 'injuries_contains') {
    const inj = signals.injuries || [];
    return inj.some(i => String(i).toLowerCase().includes(String(expected).toLowerCase()));
  }
  if (key === 'session_starts_with') {
    return signals.session_first_exercise_type === expected;
  }
  if (key === 'session_imbalance') {
    return signals.push_pull_ratio_off === expected;
  }
  if (key === 'rir_negative_pattern') {
    return signals.rir_negative_pattern === expected;
  }
  if (key === 'same_muscle_consecutive_days') {
    return signals.same_muscle_consecutive_days === expected;
  }

  // Suffix-based numeric comparisons
  if (key.endsWith('_lt'))  return numCompare(signals[key.slice(0, -3)],  '<',  expected);
  if (key.endsWith('_lte')) return numCompare(signals[key.slice(0, -4)],  '<=', expected);
  if (key.endsWith('_gt'))  return numCompare(signals[key.slice(0, -3)],  '>',  expected);
  if (key.endsWith('_gte')) return numCompare(signals[key.slice(0, -4)],  '>=', expected);
  if (key.endsWith('_eq'))  return signals[key.slice(0, -3)] === expected;

  // Direct equality fallback
  return signals[key] === expected;
}

function numCompare(value, op, target) {
  if (value === undefined || value === null) return false;
  const v = Number(value);
  const t = Number(target);
  if (Number.isNaN(v) || Number.isNaN(t)) return false;
  switch (op) {
    case '<':  return v < t;
    case '<=': return v <= t;
    case '>':  return v > t;
    case '>=': return v >= t;
    default:   return false;
  }
}

/**
 * Compress matched rules into a short prompt-friendly summary
 * with rule id, action, and book reference.
 */
export function rulesForPrompt(rules, limit = 8) {
  return rules.slice(0, limit).map(r => ({
    id: r.id,
    domain: r.domain,
    name: r.name,
    action: r.action,
    rationale: r.rationale,
    book_reference: r.book_reference,
  }));
}
