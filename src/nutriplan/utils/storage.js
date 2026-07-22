const STORAGE_KEY = 'nutriplan_data';

const DEFAULT_DATA = {
  onboarding_complete: false,
  user: {
    weight_kg: null, height_cm: null, age: null, sex: null,
    goal: null, activity_level: null, dietary_preference: null,
    cuisine: null, allergies: [], meals_per_day: null
  },
  targets: {
    bmr: null, tdee: null, target_calories: null,
    protein_g: null, fat_g: null, carb_g: null, deficit_or_surplus: null
  },
  current_plan: null,
  plan_history: [],
  purchases: {
    plan_generations_remaining: 0,
    total_purchased: 0,
    purchase_history: []
  },
  settings: { theme: 'light', units: { weight: 'kg', height: 'cm' } },
  analytics: {
    first_open: null, onboarding_started: null, onboarding_completed: null,
    plans_generated: 0, last_plan_generated: null
  }
};

export function getData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
      return { ...DEFAULT_DATA, user: { ...DEFAULT_DATA.user, allergies: [] }, targets: { ...DEFAULT_DATA.targets }, purchases: { ...DEFAULT_DATA.purchases, purchase_history: [] }, settings: { ...DEFAULT_DATA.settings, units: { ...DEFAULT_DATA.settings.units } }, analytics: { ...DEFAULT_DATA.analytics } };
    }
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export function updateData(path, value) {
  const data = getData();
  const keys = path.split('.');
  let obj = data;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!obj[keys[i]]) obj[keys[i]] = {};
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

export function updateMultiple(updates) {
  const data = getData();
  for (const [path, value] of Object.entries(updates)) {
    const keys = path.split('.');
    let obj = data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

export function isOnboarded() {
  return getData().onboarding_complete;
}

export function getUser() {
  return getData().user;
}

export function getTargets() {
  return getData().targets;
}

export function getCurrentPlan() {
  return getData().current_plan;
}

export function saveMealPlan(plan) {
  const data = getData();
  if (data.current_plan) {
    data.plan_history.unshift(data.current_plan);
    if (data.plan_history.length > 3) data.plan_history.pop();
  }
  data.current_plan = plan;
  data.purchases.plan_generations_remaining -= 1;
  data.analytics.plans_generated += 1;
  data.analytics.last_plan_generated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

export function getCredits() {
  return getData().purchases.plan_generations_remaining;
}

export function addCredits(count, productId) {
  const data = getData();
  data.purchases.plan_generations_remaining += count;
  data.purchases.total_purchased += count;
  data.purchases.purchase_history.push({
    date: new Date().toISOString(),
    product_id: productId,
    generations_added: count
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

export function resetData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
}
