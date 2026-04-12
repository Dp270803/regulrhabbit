const STORAGE_KEY = 'regulr_data';

const DEFAULT_DATA = {
  version: '1.0',
  created_at: null,
  last_opened: null,
  onboarding_complete: false,
  user: {
    name: null,
    persona: null,
    preferred_time: null,
    level: 1,
    total_xp: 0,
    xp_to_next_level: 200,
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
};

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
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
    return true;
  } catch {
    return false;
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
