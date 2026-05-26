import posthog from 'posthog-js';

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    capture_pageview: false,  // manual via trackPage()
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    autocapture: false,       // we instrument manually for clean data
  });
}

export function trackPage(path) {
  posthog.capture('$pageview', { path });
}

export function identify(userId, traits = {}) {
  posthog.identify(userId, traits);
}

export function resetIdentity() {
  posthog.reset();
}

export function track(event, props = {}) {
  posthog.capture(event, props);
}

export function optOut() {
  posthog.opt_out_capturing();
}

export function optIn() {
  posthog.opt_in_capturing();
}

// ── Backward-compat named exports (used by existing screens) ─────────────────

export const trackPageView = (screenName) => track('screen_viewed', { screen_name: screenName });
export const trackOnboardingStarted = () => track('onboarding_started');
export const trackOnboardingStep = (stepNumber, stepName, selectedOption) =>
  track('onboarding_step_completed', { step_number: stepNumber, step_name: stepName, selected_option: selectedOption });
export const trackPlanCreated = (props) => track('onboarding_completed', props);
export const trackSessionCompleted = (props) => track('session_completed', props);
export const trackReturnState = (state, daysAbsent, messageShown) =>
  track('return_state_shown', { state, days_absent: daysAbsent, message_shown: messageShown });
export const trackBadgeEarned = (badgeId, badgeName) => track('badge_earned', { badge_id: badgeId, badge_name: badgeName });
export const trackLevelUp = (newLevel, totalXP) => track('level_up', { new_level: newLevel, total_xp: totalXP });
export const trackAppOpened = (returnState, daysSinceLastVisit) =>
  track('app_opened', { return_state: returnState, days_since_last_visit: daysSinceLastVisit, time_of_day: new Date().getHours() });

// ── Named events (single source of truth for all event names) ─────────────────

export const analytics = {
  // Onboarding
  onboardingStarted: () => track('onboarding_started'),
  onboardingCompleted: (props) => track('onboarding_completed', props),
  // props: { activity_type, experience_level, goal, plan_type: 'generated'|'imported'|'custom' }

  planTypeChosen: (planType) => track('plan_type_chosen', { plan_type: planType }),

  // Workout
  workoutLogged: (props) => track('workout_logged', props),
  // props: { session_day, exercises_count, sets_logged }

  sessionCompleted: (props) => track('session_completed', props),
  // props: { plan_id, activity, week_number, xp_earned, streak_count }

  // Diet
  mealPlanGenerated: (props) => track('meal_plan_generated', props),
  // props: { calories, goal, cuisine, dietary_preference }

  dietAdaptationAccepted: (props) => track('diet_adaptation_accepted', props),
  // props: { recommendation, delta_kcal }

  dietAdaptationDismissed: () => track('diet_adaptation_dismissed'),

  dietCheckinLogged: (adherence) => track('diet_checkin_logged', { adherence }),

  // Plan
  planCritiqueRequested: () => track('plan_critique_requested'),
  planCritiqueViewed: (score) => track('plan_critique_viewed', { overall_score: score }),

  weeklyMutationAccepted: (changesCount) => track('weekly_mutation_accepted', { changes_count: changesCount }),
  weeklyMutationDismissed: () => track('weekly_mutation_dismissed'),

  // Coach / Q&A
  askCoachQuestion: (props) => track('ask_coach_question', props),
  // props: { has_substitution_request }

  // Profile
  profileSaved: (props) => track('profile_saved', props),
  // props: { goal, experience_level, has_injuries }

  weightLogged: () => track('weight_logged'),

  badgeEarned: (props) => track('badge_earned', props),
  levelUp: (newLevel, totalXP) => track('level_up', { new_level: newLevel, total_xp: totalXP }),

  themeToggled: (theme) => track('theme_toggled', { theme }),

  // Auth
  signedUp: () => track('signed_up'),
  signedIn: () => track('signed_in'),
  signedOut: () => track('signed_out'),

  // App open / return
  appOpened: (props) => track('app_opened', props),
  // props: { return_state, days_since_last_visit, time_of_day }

  // Engagement
  tipViewed: (props) => track('tip_viewed', props),
  // props: { activity_type, tip_index }

  progressTabViewed: () => track('progress_tab_viewed'),

  screenViewed: (screenName) => track('screen_viewed', { screen_name: screenName }),
};
