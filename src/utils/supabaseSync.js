/**
 * supabaseSync.js
 *
 * Syncs localStorage data to/from Supabase.
 * Called after sign-in (pull from Supabase) and after each data mutation
 * (push to Supabase). The app always reads from localStorage first - Supabase
 * is the cloud backup, not the primary read layer.
 *
 * Strategy:
 *   anonymous user → localStorage only (no Supabase calls)
 *   signed-in user → write localStorage AND Supabase; on sign-in pull Supabase down
 */

import { supabase } from './supabaseClient';

// ─── Push: localStorage → Supabase ───────────────────────────────────────────

export async function pushProfileToSupabase(userId, userData) {
  if (!supabase) return;
  await supabase.from('profiles').upsert({
    id: userId,
    name: userData.name,
    persona: userData.persona || 'follower',
    user_type: userData.user_type || null,
    level: userData.level || 1,
    total_xp: userData.total_xp || 0,
    updated_at: new Date().toISOString(),
  });
}

export async function pushStreaksToSupabase(userId, streaks) {
  if (!supabase) return;
  await supabase.from('streaks').upsert({
    user_id: userId,
    current: streaks.current || 0,
    best: streaks.best || 0,
    last_check_in_date: streaks.last_check_in_date || null,
    last_scheduled_date: streaks.last_scheduled_date || null,
    consecutive_misses: streaks.consecutive_misses || 0,
    updated_at: new Date().toISOString(),
  });
}

export async function pushCheckInToSupabase(userId, checkIn, planId) {
  if (!supabase) return;
  await supabase.from('check_ins').insert({
    user_id: userId,
    plan_id: planId || null,
    date: checkIn.date,
    session_id: checkIn.session_id || null,
    xp_earned: checkIn.xp_earned || 0,
    bonus_xp: checkIn.bonus_xp || 0,
    completed_at: checkIn.completed_at || new Date().toISOString(),
  });
}

export async function pushBadgeToSupabase(userId, badge) {
  if (!supabase) return;
  // Upsert - ignore if already exists (UNIQUE constraint handles it)
  await supabase.from('badges').upsert({
    user_id: userId,
    badge_id: badge.id,
    earned_at: badge.earned_at || new Date().toISOString(),
  }, { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
}

export async function pushPlanToSupabase(userId, plan) {
  if (!supabase) return;
  await supabase.from('plans').upsert({
    id: plan.id,
    user_id: userId,
    config: plan,
  });
}

export async function pushSettingsToSupabase(userId, settings) {
  if (!supabase) return;
  await supabase.from('settings').upsert({
    user_id: userId,
    theme: settings.theme || 'dark',
    notifications_enabled: settings.notifications_enabled || false,
  });
}

// ─── Pull: Supabase → localStorage format ────────────────────────────────────

/**
 * Called once after sign-in. Pulls all Supabase data and merges it into
 * the localStorage data structure. Supabase wins on conflicts.
 */
export async function pullFromSupabase(userId) {
  if (!supabase) return null;

  const [profileRes, streaksRes, checkInsRes, badgesRes, plansRes, settingsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('streaks').select('*').eq('user_id', userId).single(),
    supabase.from('check_ins').select('*').eq('user_id', userId).order('completed_at', { ascending: false }),
    supabase.from('badges').select('*').eq('user_id', userId),
    supabase.from('plans').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('settings').select('*').eq('user_id', userId).single(),
  ]);

  const profile  = profileRes.data;
  const streaks  = streaksRes.data;
  const checkIns = checkInsRes.data || [];
  const badges   = badgesRes.data || [];
  const plans    = plansRes.data || [];
  const settings = settingsRes.data;

  if (!profile) return null; // No cloud data yet

  return {
    user: {
      name: profile.name,
      persona: profile.persona || 'follower',
      level: profile.level || 1,
      total_xp: profile.total_xp || 0,
    },
    streaks: streaks ? {
      current: streaks.current,
      best: streaks.best,
      last_check_in_date: streaks.last_check_in_date,
      last_scheduled_date: streaks.last_scheduled_date,
      consecutive_misses: streaks.consecutive_misses,
    } : null,
    check_ins: checkIns.map(c => ({
      date: c.date,
      session_id: c.session_id,
      xp_earned: c.xp_earned,
      bonus_xp: c.bonus_xp,
      completed_at: c.completed_at,
    })),
    badges: badges.map(b => ({ id: b.badge_id, earned_at: b.earned_at })),
    plans: plans.map(p => p.config),
    settings: settings ? { theme: settings.theme, notifications_enabled: settings.notifications_enabled } : null,
  };
}

// ─── Performance log ─────────────────────────────────────────────────────────

export async function logPerformanceToSupabase(userId, sessionId, date, exercises) {
  if (!supabase || !exercises?.length) return;
  const rows = exercises
    .filter(e => e.exercise_name && (e.sets || e.reps || e.weight_kg))
    .map(e => ({
      user_id: userId,
      session_id: sessionId,
      date,
      exercise_name: e.exercise_name,
      sets: e.sets || null,
      reps: e.reps || null,
      weight_kg: e.weight_kg || null,
      rpe: e.rpe || null,
      notes: e.notes || null,
    }));
  if (rows.length) await supabase.from('performance_log').insert(rows);
}

export async function getExerciseTrend(userId, exerciseName, weeks = 8) {
  if (!supabase) return [];
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  const { data } = await supabase
    .from('performance_log')
    .select('date, sets, reps, weight_kg, rpe')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: true });
  return data || [];
}
