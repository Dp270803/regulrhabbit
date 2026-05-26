/**
 * CoachMessage
 *
 * Displays a persona-aware coaching message above the session card.
 * Fetches from /.netlify/functions/generate-coaching when shouldCallAI() is true,
 * otherwise renders a template message from TEMPLATE_MESSAGES.
 *
 * Props:
 *   persona  - current user persona string
 *   trigger  - 'session_complete' | 'session_start' | 'return' | etc.
 *   context  - { name, streak, goal, total_sessions, missed_days, milestone }
 *   visible  - boolean, whether to show at all
 */

import { useState, useEffect, useRef } from 'react';
import { useThemeColors } from '../hooks/useTheme';
import { fetchCoachingMessage, shouldCallAI, PERSONA_META } from '../utils/personaEngine';

// Template messages for non-AI interactions (covers ~95% of cases)
const TEMPLATE_MESSAGES = {
  session_start: {
    starter:      'Today counts. Just show up.',
    follower:     "Time for your session. Same plan - let's go.",
    optimizer:    'Focus on form and progressive overload today.',
    struggler:    "Just start. Five minutes in, you'll be glad you did.",
    self_directed: 'Your session is ready when you are.',
  },
  session_complete: {
    starter:      "You did it. That's what building a habit looks like.",
    follower:     'Session logged. See you next time.',
    optimizer:    'Session complete. Log your weights to track progress.',
    struggler:    "You showed up. That's the whole game.",
    self_directed: 'Logged.',
  },
  return: {
    starter:      "You're back. That's what the 2-Day Rule is for.",
    follower:     "Let's keep it moving - short session today.",
    optimizer:    'Returning after a gap. Reduce load by 10-15% today.',
    struggler:    "Welcome back. One session at a time.",
    self_directed: "Back at it.",
  },
};

export default function CoachMessage({ persona, trigger, context, visible }) {
  const C = useThemeColors();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const hasFetched = useRef(false);

  const meta = PERSONA_META[persona] || PERSONA_META.follower;

  useEffect(() => {
    if (!visible || hasFetched.current) return;
    hasFetched.current = true;

    const template = TEMPLATE_MESSAGES[trigger]?.[persona]
      || TEMPLATE_MESSAGES.session_start[persona]
      || "Time to train.";

    setMessage(template);

    // Upgrade to AI message if warranted (async, non-blocking)
    if (shouldCallAI(trigger, persona, { check_ins: Array(context?.total_sessions || 0), streaks: { current: context?.streak || 0 } })) {
      setIsLoading(true);
      fetchCoachingMessage(persona, trigger, context)
        .then(aiMsg => {
          if (aiMsg) setMessage(aiMsg);
        })
        .finally(() => setIsLoading(false));
    }
  }, [visible, persona, trigger]);

  if (!visible || !message) return null;

  return (
    <div
      style={{
        background: C.low,
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: C.cardShadow,
        borderLeft: `3px solid ${meta.color}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}
    >
      <div
        style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: meta.color, flexShrink: 0, marginTop: '6px',
          opacity: isLoading ? 0.4 : 1,
          transition: 'opacity 0.3s',
        }}
      />
      <p
        style={{
          fontSize: '0.9rem', color: C.text, lineHeight: 1.6,
          margin: 0, flex: 1,
          opacity: isLoading ? 0.6 : 1,
          transition: 'opacity 0.3s',
        }}
      >
        {message}
      </p>
    </div>
  );
}
