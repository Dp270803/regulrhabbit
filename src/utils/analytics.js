/**
 * Analytics — Supabase-backed event tracking.
 *
 * All data stays in your Supabase project (India region if configured there).
 * No third-party analytics services; no data leaves your infrastructure.
 *
 * Usage:
 *   import { analytics } from './analytics';
 *   analytics.workoutLogged({ exercises_count: 5, sets_logged: 20 });
 *
 * To view data: Supabase dashboard -> SQL editor -> query analytics_events
 * (requires service_role key; anon users cannot SELECT this table).
 */

import { supabase } from './supabaseClient.js';

// ── Identity helpers ──────────────────────────────────────────────────────────

function getAnonId() {
  try {
    let id = localStorage.getItem('regulr_anon_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('regulr_anon_id', id);
    }
    return id;
  } catch { return 'unknown'; }
}

function getSessionId() {
  try {
    let id = sessionStorage.getItem('regulr_session_id');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('regulr_session_id', id);
    }
    return id;
  } catch { return 'unknown'; }
}

let _userId = null;

export function identify(userId, _traits = {}) {
  _userId = userId ? String(userId) : null;
}

export function resetIdentity() {
  _userId = null;
}

// ── Core track function ───────────────────────────────────────────────────────

export function track(event, props = {}) {
  if (!supabase) return;
  supabase.from('analytics_events').insert({
    event_name:   event,
    properties:   props,
    anonymous_id: getAnonId(),
    session_id:   getSessionId(),
    user_id:      _userId,
    path:         typeof window !== 'undefined' ? window.location.pathname : null,
  }).then(({ error }) => {
    if (error) console.debug('[analytics] insert error:', error.message);
  });
}

export function trackPage(path) {
  track('$pageview', { path });
}

// ── Backward-compat named exports (used by existing screens) ──────────────────

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

// ── Named events ──────────────────────────────────────────────────────────────

export const analytics = {
  // Onboarding
  onboardingStarted:    ()     => track('onboarding_started'),
  onboardingCompleted:  (p)    => track('onboarding_completed', p),
  planTypeChosen:       (type) => track('plan_type_chosen', { plan_type: type }),

  // Workout
  workoutLogged:        (p) => track('workout_logged', p),
  sessionCompleted:     (p) => track('session_completed', p),

  // Diet
  mealPlanGenerated:       (p)  => track('meal_plan_generated', p),
  dietAdaptationAccepted:  (p)  => track('diet_adaptation_accepted', p),
  dietAdaptationDismissed: ()   => track('diet_adaptation_dismissed'),
  dietCheckinLogged:       (v)  => track('diet_checkin_logged', { adherence: v }),

  // Plan
  planCritiqueRequested: ()      => track('plan_critique_requested'),
  planCritiqueViewed:    (score) => track('plan_critique_viewed', { overall_score: score }),
  weeklyMutationAccepted:  (n)   => track('weekly_mutation_accepted', { changes_count: n }),
  weeklyMutationDismissed: ()    => track('weekly_mutation_dismissed'),

  // Coach
  askCoachQuestion: (p) => track('ask_coach_question', p),

  // Profile
  profileSaved:  (p)     => track('profile_saved', p),
  weightLogged:  ()      => track('weight_logged'),
  badgeEarned:   (p)     => track('badge_earned', p),
  levelUp:       (l, xp) => track('level_up', { new_level: l, total_xp: xp }),
  themeToggled:  (t)     => track('theme_toggled', { theme: t }),

  // Auth
  signedUp:  () => track('signed_up'),
  signedIn:  () => track('signed_in'),
  signedOut: () => track('signed_out'),

  // App lifecycle
  appOpened:     (p)    => track('app_opened', p),
  screenViewed:  (name) => track('screen_viewed', { screen_name: name }),
};
