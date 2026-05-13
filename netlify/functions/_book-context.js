/**
 * Shared book-context helper for Netlify functions.
 *
 * Imports the full 40-chunk `book-chunks.json` (v2.0) from the client `src/data`
 * folder. esbuild (Netlify's function bundler) inlines the JSON at build time.
 *
 * Retrieves a small, relevant subset per AI call (default 3 chunks) and prefixes
 * it with the CORE_PRINCIPLES summary, wrapped in <book> tags for prompt
 * clarity. Designed to fit in a cached Anthropic system block.
 */

import bookChunksJson from '../../src/data/book-chunks.json';
import bookRulesJson  from '../../src/data/book-rules.json';

const CHUNKS = (bookChunksJson?.chunks || []).map(c => ({
  id: c.id,
  topic: c.topic,
  chapter: c.chapter,
  keywords: Array.isArray(c.keywords) ? c.keywords : [],
  applies_to: Array.isArray(c.applies_to) ? c.applies_to : [],
  content: c.content || '',
}));

const RULE_LIBRARY = (bookRulesJson?.rules || []).map(r => ({
  id: r.id,
  name: r.name,
  domain: r.domain,
  book: r.book_reference?.chapter || '',
  summary: r.rationale || r.action?.detail || '',
}));

const CORE_PRINCIPLES = `Core principles from The Muscle Ladder (Jeff Nippard):
- Hypertrophy = mechanical tension × proximity to failure × frequency × volume in the productive zone
- Weekly sets per muscle (MEV/MAV/MRV): chest 8/14/22; back 10/16/25; quads 8/14/20; hams 8/12/15; glutes 10/16/22; biceps 8/14/22; triceps 6/12/18; side delts 8/16/26
- Each muscle hit 2x/week minimum for optimal hypertrophy
- Double progression: add reps inside range, then add load and reset to bottom
- Primary compounds RPE 6-8; secondary compounds RPE 8-10; isolations RPE 9-10
- Deload triggers: stalled e1RM 2+ weeks with avg RIR ≤ 1, OR adherence < 50% for 2+ weeks, OR every 4-8 weeks preventively
- BMR (Mifflin-St Jeor) × activity factor → TDEE
- Cut: 10-20% deficit, 0.5-1% bw/week | Bulk: 5-15% surplus, 0.25-0.5% bw/week | Recomp: maintenance + high protein
- Protein 1.6-2.2 g/kg (higher during cuts); fat ≥0.6 g/kg, preferably 0.8; carbs fill the rest
- Adherence > optimization. The "perfect" plan at 60% adherence loses to the "imperfect" one at 95%.
If the book is silent on a topic, say so — don't speculate.`;

/**
 * Retrieve top-N chunks by keyword overlap with the query string.
 * Falls back to the first few chunks if the query yields no matches.
 */
function retrieveChunks(query, limit = 3) {
  const qTerms = String(query || '').toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (qTerms.length === 0) return CHUNKS.slice(0, limit);
  const scored = CHUNKS.map(c => {
    let score = 0;
    for (const kw of c.keywords) {
      const k = kw.toLowerCase();
      if (qTerms.some(t => k.includes(t) || t.includes(k))) score += 3;
    }
    if (qTerms.some(t => c.topic.toLowerCase().includes(t))) score += 4;
    if (score === 0) {
      const lower = c.content.toLowerCase();
      for (const t of qTerms) if (lower.includes(t)) score += 1;
    }
    return { c, score };
  });
  const hits = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.c);
  return hits.length ? hits : CHUNKS.slice(0, limit);
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
