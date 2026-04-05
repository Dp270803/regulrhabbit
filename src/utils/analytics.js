// PostHog analytics wrapper
// Replace YOUR_PROJECT_KEY with actual PostHog project key when deploying

function getPostHog() {
  if (typeof window !== 'undefined' && window.posthog) {
    return window.posthog;
  }
  return null;
}

export function trackEvent(eventName, properties = {}) {
  const ph = getPostHog();
  if (ph) {
    ph.capture(eventName, properties);
  }
}

export function trackPageView(screenName) {
  trackEvent('screen_viewed', { screen_name: screenName });
}

export function trackOnboardingStarted() {
  trackEvent('onboarding_started');
}

export function trackOnboardingStep(stepNumber, stepName, selectedOption) {
  trackEvent('onboarding_step_completed', {
    step_number: stepNumber,
    step_name: stepName,
    selected_option: selectedOption,
  });
}

export function trackPlanCreated(plan) {
  trackEvent('plan_created', {
    activity: plan.activity,
    experience_level: plan.experience_level,
    frequency: plan.frequency,
    persona: plan.persona,
    session_duration: plan.session_duration,
  });
}

export function trackSessionCompleted(context) {
  trackEvent('session_completed', {
    plan_id: context.planId,
    activity: context.activity,
    session_id: context.sessionId,
    week_number: context.weekNumber,
    xp_earned: context.xpEarned,
    streak_count: context.streakCount,
  });
}

export function trackReturnState(state, daysAbsent, messageShown) {
  trackEvent('return_state_shown', {
    state,
    days_absent: daysAbsent,
    message_shown: messageShown,
  });
}

export function trackBadgeEarned(badgeId, badgeName) {
  trackEvent('badge_earned', { badge_id: badgeId, badge_name: badgeName });
}

export function trackLevelUp(newLevel, totalXP) {
  trackEvent('level_up', { new_level: newLevel, total_xp: totalXP });
}

export function trackAppOpened(returnState, daysSinceLastVisit) {
  trackEvent('app_opened', {
    return_state: returnState,
    days_since_last_visit: daysSinceLastVisit,
    time_of_day: new Date().getHours(),
  });
}

export function optOut() {
  const ph = getPostHog();
  if (ph) ph.opt_out_capturing();
}

export function optIn() {
  const ph = getPostHog();
  if (ph) ph.opt_in_capturing();
}
