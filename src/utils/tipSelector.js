import { getToday } from './dateUtils.js';

const tipModules = {
  gym: () => import('../data/tips/gym-tips.json'),
  swimming: () => import('../data/tips/swimming-tips.json'),
  running: () => import('../data/tips/running-tips.json'),
  yoga: () => import('../data/tips/yoga-tips.json'),
  dance: () => import('../data/tips/dance-tips.json'),
  singing: () => import('../data/tips/singing-tips.json'),
  instrument: () => import('../data/tips/instrument-tips.json'),
};

let tipCache = {};

async function loadTips(activity) {
  if (tipCache[activity]) return tipCache[activity];
  try {
    const loader = tipModules[activity];
    if (!loader) return { tips: [] };
    const mod = await loader();
    tipCache[activity] = mod.default || mod;
    return tipCache[activity];
  } catch {
    return { tips: [] };
  }
}

export async function selectTip(data) {
  const activePlan = data.plans.find(p => p.status === 'active');
  if (!activePlan) return null;

  const activity = activePlan.activity;
  const tipsData = await loadTips(activity);
  const tips = tipsData.tips || [];
  if (tips.length === 0) return null;

  const today = getToday();
  const seenIds = new Set(data.tips.seen_tip_ids || []);
  const currentWeek = activePlan.current_week || 1;
  const missedCount = data.streaks.consecutive_misses || 0;

  let candidates = tips.filter(t => !seenIds.has(t.id));

  if (candidates.length === 0) {
    candidates = tips;
  }

  if (missedCount >= 2) {
    const mindsetTips = candidates.filter(t => t.category === 'mindset');
    if (mindsetTips.length > 0) {
      candidates = mindsetTips;
    }
  } else {
    const weekTips = candidates.filter(t =>
      t.week_relevance && t.week_relevance.includes(Math.min(currentWeek, 4))
    );
    if (weekTips.length > 0) {
      candidates = weekTips;
    }
  }

  const dateNum = parseInt(today.replace(/-/g, ''), 10);
  const index = dateNum % candidates.length;
  return candidates[index];
}

export function markTipSeen(data, tipId) {
  const today = getToday();
  return {
    ...data,
    tips: {
      ...data.tips,
      seen_tip_ids: [...(data.tips.seen_tip_ids || []), tipId],
      last_tip_date: today,
      last_tip_id: tipId,
    },
  };
}
