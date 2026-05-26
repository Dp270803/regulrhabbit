/**
 * tipFromBook.js
 *
 * Picks a daily evidence-based tip for the Tips feed.
 * - Computes the user's training state from signals.
 * - Retrieves the most relevant book chunk for that state.
 * - Returns a card-shaped object: { id, topic, chapter, content, applies_to }.
 */

import { retrieveBookChunks } from './bookEngine';
import { computeBookSignals, classifyTrainingState } from './signalEngine';

const STATE_QUERIES = {
  progressing:     'progressive overload double progression load increase',
  stalled:         'stalled plateau exercise variation deload rep range',
  under_recovering:'fatigue management deload recovery sleep MRV',
  under_loading:   'effort RIR proximity to failure stimulus tension',
  fresh:           'hypertrophy fundamentals mechanical tension volume frequency',
};

/**
 * Returns a tip card derived from the book, or null if no chunk could be matched.
 * Deterministic by current date so the tip stays stable across reloads.
 */
export function selectBookTip(data) {
  const signals = computeBookSignals(data);
  const state = classifyTrainingState(signals);
  const query = STATE_QUERIES[state] || STATE_QUERIES.fresh;

  // Retrieve top 3, pick by date hash to keep the same tip stable for the day
  const candidates = retrieveBookChunks(query, 'tips_feed', 3);
  if (!candidates.length) return null;

  const today = new Date().toISOString().split('T')[0];
  const dateNum = parseInt(today.replace(/-/g, ''), 10);
  const idx = dateNum % candidates.length;
  const chunk = candidates[idx];

  return {
    id: chunk.id,
    topic: chunk.topic,
    chapter: chunk.chapter,
    content: chunk.content,
    keywords: chunk.keywords || [],
    training_state: state,
  };
}
