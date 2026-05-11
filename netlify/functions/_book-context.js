/**
 * Shared book-context helper for Netlify functions.
 *
 * Embeds a compact subset of the book chunks (Tier 2) and rule references
 * so server-side AI calls can inject grounded context without bundling
 * the full client JSON. Each chunk: ~250-400 tokens.
 *
 * Keep this file under ~12KB. If the client book-chunks.json grows, only
 * the most reusable cross-cutting chunks need duplication here.
 */

const CHUNKS = [
  {
    topic: 'hypertrophy',
    chapter: 'Ch. 2 — Hypertrophy Fundamentals',
    keywords: ['hypertrophy', 'tension', 'effective reps', 'rep range'],
    content: 'Muscle hypertrophy is driven primarily by mechanical tension. A set of 5-30 reps taken to within 0-3 RIR produces similar growth when weekly volume is matched. Lower reps suit compounds (joint cost); higher reps suit isolations. Only the last 3-5 reps of a hard set drive growth — those are the productive reps.'
  },
  {
    topic: 'progression',
    chapter: 'Ch. 3 — Progression Models',
    keywords: ['progression', 'double progression', 'load', 'reps', 'stalled', 'PR'],
    content: 'Double progression: pick a rep range (e.g. 8-12), add one rep per session until the top is hit on all sets, then add load (2.5kg compounds, 1.25kg isolations) and drop reps to the bottom. Beginners progress linearly. A stall is 2+ weeks without rep or load PR; first check recovery, then rep range, then exercise.'
  },
  {
    topic: 'volume_landmarks',
    chapter: 'Ch. 5 — Volume Landmarks',
    keywords: ['volume', 'MEV', 'MAV', 'MRV', 'sets per week', 'junk volume'],
    content: 'Weekly sets per muscle. MEV (floor): 6-10. MAV (sweet spot): 12-18. MRV (ceiling): 18-26. Past MRV adds fatigue without growth (junk volume). Back and shoulders tolerate more volume than chest; biceps/triceps get indirect work from compounds. Start at MEV, progress up week by week until plateau or fatigue forces a deload.'
  },
  {
    topic: 'frequency',
    chapter: 'Ch. 4 — Training Frequency',
    keywords: ['frequency', 'split', 'PPL', 'upper lower', 'bro split'],
    content: 'Train each muscle 2x/week minimum. Once-per-week bro splits deliver less growth than higher frequency when volume is matched. Splits achieving 2x: Upper/Lower (4 days), PPL twice (6 days), Full Body (3 days). 3-5 sessions/week hitting majors 2-3x is the sweet spot.'
  },
  {
    topic: 'exercise_selection',
    chapter: 'Ch. 6 — Exercise Selection',
    keywords: ['exercise selection', 'compound', 'isolation', 'stretch', 'ROM'],
    content: 'Good exercise selection balances stimulus magnitude, fatigue cost, skill demand, stability. Compounds: high stimulus, high fatigue. Machines: high stability, ideal late in session or for beginners. Stretch-mediated hypertrophy: loading a muscle in its lengthened position (RDL, incline curl) drives more growth. Full ROM beats partials. Order compounds first.'
  },
  {
    topic: 'fatigue_deload',
    chapter: 'Ch. 7 — Fatigue Management',
    keywords: ['fatigue', 'deload', 'stalled', 'overreach', 'RIR'],
    content: 'Fatigue accumulates and eventually masks fitness. Signals: stalled e1RM, persistent soreness, elevated RHR, motivation drop. Deload week = 40-50% volume drop + 40% load drop for 5-7 days. Programmed deloads every 4-6 weeks beat reactive ones. If RIR drifts down at the same load, fatigue is accumulating.'
  },
  {
    topic: 'injuries',
    chapter: 'Ch. 9 — Injury Adjustments',
    keywords: ['injury', 'pain', 'shoulder', 'knee', 'back', 'substitution'],
    content: 'Pain that persists after warmup or worsens through a session is a problem. Common substitutions: shoulder impingement → landmine press; lower-back issue → trap bar deadlift; knee discomfort → hack squat; wrist pain → dumbbell bench. Principle: same muscle, different angle.'
  },
  {
    topic: 'diet_basics',
    chapter: 'Ch. 10 — Diet Foundations',
    keywords: ['BMR', 'TDEE', 'protein', 'macros', 'Mifflin'],
    content: 'Mifflin-St Jeor BMR: men 10W + 6.25H - 5A + 5; women subtract 161 instead. TDEE = BMR × activity (1.4 sedentary → 1.75 active). Protein 1.6-2.2 g/kg, higher during cuts. Fat ≥0.6 g/kg, preferably 0.8. Carbs fill the rest. Protein distributed across 3-5 meals of 20-40g.'
  },
  {
    topic: 'cutting',
    chapter: 'Ch. 11 — Cutting',
    keywords: ['cut', 'fat loss', 'deficit', 'diet break', 'refeed'],
    content: 'Cutting: 10-20% deficit, target 0.5-1% bodyweight loss/week. Faster loses muscle; slower may not be a real deficit. TDEE drifts down 100-200 kcal/month into a cut. Diet break (1 week at maintenance every 8-12 weeks) restores leptin and adherence. Refeeds work similarly on shorter cycles.'
  },
  {
    topic: 'bulking',
    chapter: 'Ch. 12 — Lean Bulking',
    keywords: ['bulk', 'surplus', 'weight gain', 'lean mass'],
    content: 'Lean bulk: 5-15% surplus, target 0.25-0.5% bodyweight gain/week. Faster is mostly fat. Beginners can gain faster (newbie gains). Bulks run 3-6 months. Stay under 18-20% bodyfat to preserve insulin sensitivity for future cuts. Track weekly averages, not daily.'
  },
  {
    topic: 'adherence',
    chapter: 'Ch. 13 — Adherence',
    keywords: ['adherence', 'consistency', 'compliance', 'meal prep'],
    content: 'The best diet is the one you follow. 90/10 rule: 90% whole foods, 10% whatever you enjoy. Weekly adherence > per-meal logging — per-meal kills retention. Below 50% adherence for 2+ weeks means simplify the plan, not blame the lifter.'
  },
  {
    topic: 'mistakes',
    chapter: 'Ch. 14 — Common Mistakes',
    keywords: ['mistakes', 'ego', 'program hopping', 'cardio', 'legs'],
    content: 'Top mistakes: ego lifting (form breaks), program hopping (need 6-8 weeks min), excessive cardio in a bulk (cap at 2-3 short sessions), skipping legs, inconsistency. Small consistent stimuli beat occasional large ones.'
  },
  {
    topic: 'rir_failure',
    chapter: 'Ch. 7 — Fatigue Management',
    keywords: ['failure', 'RIR', 'intensity', 'AMRAP'],
    content: 'Training to failure (0 RIR) is more fatiguing than near-failure (1-3 RIR) but doesn\'t produce more growth per matched set. Keep compounds at 1-3 RIR most of the time; push isolations closer to 0. Reaching failure every set is a marker of poor programming.'
  }
];

const RULE_LIBRARY = [
  { id: 'prog_001', name: 'Double progression', book: 'Ch. 3', summary: 'Add reps before load within the chosen range; at top of range, add load and drop reps to bottom.' },
  { id: 'prog_004', name: 'High RIR → increase load', book: 'Ch. 3', summary: 'Avg RIR ≥ 3 means weight is too light — increase load 5%.' },
  { id: 'prog_005', name: 'Three 0-RIR sessions → reduce', book: 'Ch. 7', summary: '3 consecutive sessions to failure with form issues → drop 5%.' },
  { id: 'deload_001', name: 'Stall + low RIR triggers deload', book: 'Ch. 7', summary: '2+ stalled weeks + avg RIR ≤ 1 → deload (40% volume, 40% load).' },
  { id: 'deload_002', name: 'Adherence collapse → light week', book: 'Ch. 7', summary: 'Adherence < 50% for 2+ weeks → reduce volume 30%.' },
  { id: 'deload_003', name: 'Programmed deload 4-6 weeks', book: 'Ch. 7', summary: 'Scheduled deload every 4-6 weeks beats reactive deload.' },
  { id: 'vol_001', name: 'Chest volume landmarks', book: 'Ch. 5', summary: 'Chest weekly sets — MEV 8, MAV 14, MRV 22.' },
  { id: 'vol_002', name: 'Back volume landmarks', book: 'Ch. 5', summary: 'Back weekly sets — MEV 10, MAV 16, MRV 25.' },
  { id: 'vol_003', name: 'Legs volume landmarks', book: 'Ch. 5', summary: 'Legs (quad) weekly sets — MEV 8, MAV 14, MRV 20.' },
  { id: 'vol_006', name: 'Side delts high tolerance', book: 'Ch. 5', summary: 'Side delts — MEV 8, MAV 16, MRV 26 — nearly impossible to overtrain.' },
  { id: 'vol_007', name: 'Junk volume warning', book: 'Ch. 5', summary: 'Sets past MRV → reduce to MAV.' },
  { id: 'vol_008', name: 'Below MEV halts growth', book: 'Ch. 5', summary: 'Weekly sets below MEV → growth stops.' },
  { id: 'freq_001', name: '2x frequency minimum', book: 'Ch. 4', summary: 'Each muscle hit at least 2x/week for optimal hypertrophy.' },
  { id: 'exsel_001', name: 'Compound first ordering', book: 'Ch. 6', summary: 'Big lifts first; fresh muscles move heavy weight.' },
  { id: 'exsel_002', name: 'Stretch-mediated hypertrophy', book: 'Ch. 6', summary: 'Prefer exercises that load the muscle in stretched position.' },
  { id: 'rir_001', name: 'Compound RIR target', book: 'Ch. 7', summary: 'Compounds: 1-2 RIR (preserve recovery).' },
  { id: 'rir_002', name: 'Isolation RIR target', book: 'Ch. 7', summary: 'Isolations: 0 RIR is fine (low fatigue cost).' },
  { id: 'diet_001', name: 'BMR Mifflin (male)', book: 'Ch. 10', summary: 'BMR_m = 10W + 6.25H - 5A + 5' },
  { id: 'diet_002', name: 'BMR Mifflin (female)', book: 'Ch. 10', summary: 'BMR_f = 10W + 6.25H - 5A - 161' },
  { id: 'diet_003', name: 'Cut deficit range', book: 'Ch. 11', summary: 'Fat loss: 10-20% deficit, 0.5-1% bw/week.' },
  { id: 'diet_004', name: 'Lean bulk surplus', book: 'Ch. 12', summary: 'Build: 5-15% surplus, 0.25-0.5% bw/week.' },
  { id: 'diet_006', name: 'Protein target', book: 'Ch. 10', summary: 'Protein 1.6-2.2 g/kg.' },
  { id: 'diet_007', name: 'Fat target', book: 'Ch. 10', summary: 'Fat ≥ 0.6 g/kg, preferably 0.8.' },
];

const CORE_PRINCIPLES = `Core principles from The Muscle Ladder (Jeff Nippard):
- Hypertrophy = mechanical tension × proximity to failure × frequency × volume in the productive zone
- Weekly sets per muscle: MEV/MAV/MRV (chest 8/14/22; back 10/16/25; legs 8/14/20; biceps 8/14/22; triceps 6/12/18; shoulders 8/16/26)
- Each muscle hit 2x/week minimum for optimal hypertrophy
- Double progression: add reps within range, then add load and reset
- Compounds 1-3 RIR; isolations 0-1 RIR
- Deload triggers: stalled e1RM 2+ weeks with avg RIR ≤ 1, OR adherence < 50% for 2+ weeks, OR every 4-6 weeks preventively
- BMR (Mifflin-St Jeor) × activity factor → TDEE
- Cut: 10-20% deficit, 0.5-1% bw/week | Bulk: 5-15% surplus, 0.25-0.5% bw/week | Recomp: at maintenance with high protein
- Protein 1.6-2.2 g/kg; fat ≥0.6 g/kg; carbs fill the rest
- Adherence > optimization: 90/10 rule, weekly tracking
If the book is silent on a topic, say so — don't speculate.`;

/**
 * Retrieve top-N chunks by keyword overlap with the query string.
 */
function retrieveChunks(query, limit = 3) {
  const qTerms = String(query || '').toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (qTerms.length === 0) return CHUNKS.slice(0, limit);
  const scored = CHUNKS.map(c => {
    let score = 0;
    for (const kw of c.keywords) {
      if (qTerms.some(t => kw.includes(t) || t.includes(kw))) score += 3;
    }
    if (qTerms.some(t => c.topic.includes(t))) score += 4;
    if (score === 0) {
      const lower = c.content.toLowerCase();
      for (const t of qTerms) if (lower.includes(t)) score += 1;
    }
    return { c, score };
  });
  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.c);
}

/**
 * Build the system prompt prefix containing core principles + retrieved chunks.
 * Wrapped in <book> tags so the AI knows what is canonical context.
 */
function buildBookSystemBlock(query, limit = 3) {
  const chunks = retrieveChunks(query, limit);
  const chunkText = chunks.map(c => `[${c.chapter}] ${c.content}`).join('\n\n');
  return `${CORE_PRINCIPLES}\n\n<book>\n${chunkText}\n</book>`;
}

export {
  CHUNKS,
  RULE_LIBRARY,
  CORE_PRINCIPLES,
  retrieveChunks,
  buildBookSystemBlock,
};
