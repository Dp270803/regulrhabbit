/**
 * aiMemory.js
 *
 * Tracks accepted and rejected AI suggestions in localStorage.
 * Used to personalize future AI context - avoid repeating rejected ideas,
 * build on accepted ones.
 */

import { getData, updateData } from './storage';

const MAX_MEMORY = 20; // keep last 20 of each type

/**
 * Record that the user accepted a suggestion.
 * @param {{ text: string, category: string }} suggestion
 */
export function recordAccepted(suggestion) {
  updateData(data => {
    data.ai_memory = data.ai_memory || { accepted_suggestions: [], rejected_suggestions: [] };
    data.ai_memory.accepted_suggestions.push({
      text: suggestion.text,
      category: suggestion.category,
      date: new Date().toISOString().split('T')[0],
    });
    // Trim to max
    data.ai_memory.accepted_suggestions = data.ai_memory.accepted_suggestions.slice(-MAX_MEMORY);
    return data;
  });
}

/**
 * Record that the user dismissed/rejected a suggestion.
 * @param {{ text: string, category: string }} suggestion
 */
export function recordRejected(suggestion) {
  updateData(data => {
    data.ai_memory = data.ai_memory || { accepted_suggestions: [], rejected_suggestions: [] };
    data.ai_memory.rejected_suggestions.push({
      text: suggestion.text,
      category: suggestion.category,
      date: new Date().toISOString().split('T')[0],
    });
    data.ai_memory.rejected_suggestions = data.ai_memory.rejected_suggestions.slice(-MAX_MEMORY);
    return data;
  });
}

/**
 * Get a summarised memory context object for AI prompts.
 * Keeps only the last 5 of each type to control token count.
 */
export function getMemoryContext() {
  const data = getData();
  const mem = data.ai_memory || { accepted_suggestions: [], rejected_suggestions: [] };
  return {
    accepted_suggestions: mem.accepted_suggestions.slice(-5),
    rejected_suggestions: mem.rejected_suggestions.slice(-5),
  };
}

/**
 * Return the raw ai_memory object (for full access).
 */
export function getMemory() {
  const data = getData();
  return data.ai_memory || { accepted_suggestions: [], rejected_suggestions: [] };
}
