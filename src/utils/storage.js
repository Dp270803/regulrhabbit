import { supabase } from './supabaseClient';
import {
  pushProfileToSupabase,
  pushStreaksToSupabase,
  pushSettingsToSupabase,
  pushPlanToSupabase,
  pullFromSupabase,
} from './supabaseSync';

const STORAGE_KEY = 'regulr_data';

const DEFAULT_DATA = {
  version: '1.3',
  created_at: null,
  last_opened: null,
  onboarding_complete: false,
  user: {
    name: null,
    persona: null,
    user_type: null,
    preferred_time: null,
    level: 1,
    total_xp: 0,
    xp_to_next_level: 200,
    body_weight_kg: null,
    height_cm: null,
    age: null,
    sex: null,
    goal: null,
    activity_level: null,
    preferred_unit: 'kg',
  },
  plans: [],
  streaks: {
    current: 0,
    best: 0,
    last_check_in_date: null,
    last_scheduled_date: null,
    consecutive_misses: 0,
  },
  check_ins: [],
  badges: [],
  tips: {
    seen_tip_ids: [],
    last_tip_date: null,
    last_tip_id: null,
  },
  settings: {
    theme: 'light',
    notifications_enabled: false,
  },
  workout_logs: [],
  fitness_state: {
    phase: null,
    fatigue_level: null,
    adherence: null,
    strength_trend: null,
    weight_trend: null,
    last_updated: null,
  },
  diet: {
    baseline_calories: null,
    current_calories: null,
    last_adjustment_reason: null,
    last_updated: null,
    macros: null,                   // { protein_g, fat_g, carb_g }
    meal_plan: null,                // { week_plan: [...], notes, book_reference }
    meal_plan_generated_at: null,
    weekly_checkins: [],            // [{ date, weight_kg, adherence_pct }]
    last_weekly_adherence_pct: null,
    consecutive_cut_weeks: 0,
    adaptations: [],                // [{ id, date, delta_kcal, reason, book_reference, accepted }]
  },
  ai_insights: [],
  ai_memory: {
    accepted_suggestions: [],
    rejected_suggestions: [],
  },
  plan_updates: [],
  weight_log: [],
};

function migrateData(data) {
  if (!data.version || data.version === '1.0') {
    data.version = '1.1';
    data.user = { ...DEFAULT_DATA.user, ...data.user };
    for (const key of ['workout_logs', 'fitness_state', 'diet', 'ai_insights', 'ai_memory']) {
      if (data[key] === undefined) data[key] = DEFAULT_DATA[key];
    }
  }
  if (data.version === '1.1') {
    data.version = '1.2';
    if (!data.plan_updates) data.plan_updates = [];
    if (!data.weight_log) data.weight_log = [];
    saveData(data);
  }
  if (data.version === '1.2') {
    data.version = '1.3';
    data.diet = { ...DEFAULT_DATA.diet, ...(data.diet || {}) };
    saveData(data);
  }
  return data;
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    migrateData(data);
    data.last_opened = new Date().toISOString();
    saveData(data);
    return data;
  } catch {
    return null;
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Background sync to Supabase when signed in (fire-and-forget)
    syncToSupabase(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fire-and-forget Supabase sync. Syncs profile, streaks, and settings.
 * Heavy data (check_ins, badges, plans) is synced at the point of mutation
 * via supabaseSync.js helpers called directly by feature code.
 */
async function syncToSupabase(data) {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await Promise.all([
      pushProfileToSupabase(user.id, data.user),
      pushStreaksToSupabase(user.id, data.streaks),
      pushSettingsToSupabase(user.id, data.settings),
    ]);
  } catch {
    // Silent — local data is always the source of truth
  }
}

/**
 * Called once after sign-in. Pulls cloud data and merges it into localStorage.
 * Supabase wins on all fields (cloud is authoritative for signed-in users).
 */
export async function loadFromSupabase() {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const cloudData = await pullFromSupabase(user.id);
    if (!cloudData) return null;

    const local = getData();
    const merged = {
      ...local,
      user: { ...local.user, ...cloudData.user },
      streaks: cloudData.streaks || local.streaks,
      check_ins: cloudData.check_ins.length ? cloudData.check_ins : local.check_ins,
      badges: cloudData.badges.length ? cloudData.badges : local.badges,
      plans: cloudData.plans.length ? cloudData.plans : local.plans,
      settings: cloudData.settings || local.settings,
      onboarding_complete: cloudData.plans.length > 0 || local.onboarding_complete,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return null;
  }
}

export function initializeData() {
  const now = new Date().toISOString();
  const data = {
    ...DEFAULT_DATA,
    created_at: now,
    last_opened: now,
  };
  saveData(data);
  return data;
}

export function getData() {
  return loadData() || initializeData();
}

export function updateData(updater) {
  const data = getData();
  const updated = updater(data);
  saveData(updated);
  return updated;
}

export function hasExistingData() {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function isOnboardingComplete() {
  const data = loadData();
  return data?.onboarding_complete === true;
}

export function exportData() {
  const data = loadData();
  if (!data) return null;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `regulr-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version) {
          reject(new Error('Invalid backup file'));
          return;
        }
        saveData(data);
        resolve(data);
      } catch {
        reject(new Error('Failed to parse backup file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function resetData() {
  localStorage.removeItem(STORAGE_KEY);
}
