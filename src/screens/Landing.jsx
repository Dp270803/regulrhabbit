import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isOnboardingComplete, getData } from '../utils/storage';
import { trackPageView } from '../utils/analytics';

/* ─── tiny reusable stat block ─── */
function Stat({ value, label }) {
  return (
    <div>
      <p
        className="font-mono"
        style={{ fontSize: '2.8rem', fontWeight: 700, lineHeight: 1, color: 'var(--color-text-1)', letterSpacing: '-0.02em' }}
      >
        {value}
      </p>
      <p style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--color-text-3)', letterSpacing: '0.04em' }}>{label}</p>
    </div>
  );
}

function getStreakMessage(streak) {
  if (streak === 0) return 'Ready to begin.';
  if (streak <= 2) return 'You started. That's everything.';
  if (streak <= 6) return 'The habit is forming.';
  if (streak <= 13) return 'One week in. Keep going.';
  if (streak <= 29) return 'This is becoming who you are.';
  return 'You\'re a regular.';
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ─── Returning user motivational screen ─── */
function WelcomeBack({ onContinue }) {
  const d = getData();
  const activePlan = d?.plans?.find(p => p.status === 'active');
  const streak = d?.streaks?.current || 0;
  const week = activePlan?.current_week || 1;
  const planLabel = activePlan?.plan_label || 'Gym Plan';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ background: 'var(--color-bg)', color: 'var(--color-text-1)', minHeight: '100dvh' }}>
      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 5vw', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(10,10,10,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid transparent',
        transition: 'background 0.3s, border-color 0.3s',
      }}>
        <span className="font-display" style={{ fontSize: '1.15rem', color: 'var(--color-text-1)' }}>Regulr</span>
        <button
          onClick={onContinue}
          style={{
            background: 'var(--color-text-1)', color: 'var(--color-bg)',
            border: 'none', borderRadius: '100px',
            padding: '0.5rem 1.3rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
          }}
        >
          My Plan →
        </button>
      </nav>

      {/* Hero — full viewport motivational */}
      <section style={{
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '80px 5vw 60px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* gold glow */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: '35%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60vw', height: '35vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,193,98,0.09) 0%, transparent 65%)',
          pointerEvents: 'none', filter: 'blur(60px)',
        }} />

        <p className="font-mono animate-fade-in" style={{
          fontSize: '0.72rem', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '1.5rem',
        }}>
          {getTimeGreeting()}
        </p>

        <h1 className="font-display animate-fade-in-up" style={{
          fontSize: 'clamp(3rem, 8vw, 7rem)',
          lineHeight: 1.0, letterSpacing: '-0.02em',
          marginBottom: '1.5rem', color: 'var(--color-text-1)',
        }}>
          {getStreakMessage(streak)}
        </h1>

        {/* Streak / plan info row */}
        <div className="animate-fade-in-up delay-100" style={{
          display: 'flex', gap: '2.5rem', alignItems: 'center',
          marginBottom: '3rem', opacity: 0, animationFillMode: 'forwards',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p className="font-mono" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-gold)', lineHeight: 1 }}>
              {streak}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-3)', marginTop: '0.3rem' }}>day streak</p>
          </div>
          <div style={{ width: '1px', height: '40px', background: 'var(--color-border)' }} />
          <div style={{ textAlign: 'center' }}>
            <p className="font-mono" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-1)', lineHeight: 1 }}>
              {week}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-3)', marginTop: '0.3rem' }}>of 4 weeks</p>
          </div>
          <div style={{ width: '1px', height: '40px', background: 'var(--color-border)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-1)', lineHeight: 1 }}>
              {planLabel}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-3)', marginTop: '0.3rem' }}>your program</p>
          </div>
        </div>

        <div className="animate-fade-in-up delay-200" style={{ opacity: 0, animationFillMode: 'forwards', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onContinue}
            style={{
              background: 'var(--color-text-1)', color: 'var(--color-bg)',
              border: 'none', borderRadius: '100px',
              padding: '1rem 2.8rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Go to today's session →
          </button>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-3)' }}>
            Your data is saved on this device
          </p>
        </div>
      </section>

      {/* Mini info section */}
      <section style={{ borderTop: '1px solid var(--color-border)', padding: '4rem 5vw', textAlign: 'center' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <p style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--color-text-3)' }}>
            No account. No login. Your plan lives on this device — private, fast, and always available.
            <br />Miss a day? The 2-Day Rule keeps your streak alive.
          </p>
        </div>
      </section>
    </div>
  );
}

/* ─── Main landing (new users) ─── */
export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    trackPageView('landing');
    setIsReturning(isOnboardingComplete());
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goToDashboard = () => navigate('/dashboard');
  const goToOnboarding = () => navigate('/onboarding');

  if (isReturning) {
    return <WelcomeBack onContinue={goToDashboard} />;
  }

  return (
    <div style={{ background: 'var(--color-bg)', color: 'var(--color-text-1)', minHeight: '100dvh' }}>

      {/* ── Sticky Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 5vw', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(10,10,10,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid transparent',
        transition: 'background 0.3s, border-color 0.3s',
      }}>
        <span className="font-display" style={{ fontSize: '1.15rem', color: 'var(--color-text-1)' }}>Regulr</span>
        <button
          onClick={goToOnboarding}
          style={{
            background: 'var(--color-text-1)', color: 'var(--color-bg)',
            border: 'none', borderRadius: '100px',
            padding: '0.5rem 1.3rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
          }}
        >
          Get Started
        </button>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '80px 5vw 60px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* background glow */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: '30%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '70vw', height: '40vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,193,98,0.07) 0%, transparent 65%)',
          pointerEvents: 'none', filter: 'blur(60px)',
        }} />

        <p className="font-mono animate-fade-in" style={{
          fontSize: '0.72rem', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '2rem',
        }}>
          Science-backed habit formation
        </p>

        <h1 className="font-display animate-fade-in-up" style={{
          fontSize: 'clamp(3.5rem, 9vw, 8rem)',
          lineHeight: 1.0, letterSpacing: '-0.02em',
          marginBottom: '2rem', maxWidth: '18ch',
          color: 'var(--color-text-1)', position: 'relative',
        }}>
          Become a<br />
          <em style={{ color: 'var(--color-text-1)' }}>regular.</em>
        </h1>

        <p className="animate-fade-in-up delay-100" style={{
          fontSize: '1.15rem', lineHeight: 1.7,
          maxWidth: '46ch', color: 'var(--color-text-2)',
          marginBottom: '3rem', opacity: 0, animationFillMode: 'forwards',
        }}>
          No login. No guilt. No excuses. Build a gym habit
          using the same science elite athletes use — right on your phone.
        </p>

        <div className="animate-fade-in-up delay-200" style={{
          display: 'flex', gap: '1rem', alignItems: 'center',
          flexWrap: 'wrap', justifyContent: 'center',
          opacity: 0, animationFillMode: 'forwards',
        }}>
          <button
            onClick={goToOnboarding}
            style={{
              background: 'var(--color-text-1)', color: 'var(--color-bg)',
              border: 'none', borderRadius: '100px',
              padding: '0.9rem 2.4rem', fontSize: '1rem', fontWeight: 600,
              cursor: 'pointer', transition: 'opacity 0.2s, transform 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Start for free
          </button>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-3)' }}>
            No account · 2 minutes
          </span>
        </div>

        {/* Stats row */}
        <div className="animate-fade-in-up delay-300" style={{
          display: 'flex', gap: '4rem', marginTop: '6rem',
          padding: '2.5rem 4rem', borderRadius: '16px',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          flexWrap: 'wrap', justifyContent: 'center',
          opacity: 0, animationFillMode: 'forwards',
        }}>
          <Stat value="4wk" label="Progressive Plan" />
          <div style={{ width: '1px', background: 'var(--color-border)', alignSelf: 'stretch' }} />
          <Stat value="2-Day" label="Rule — never lose a streak" />
          <div style={{ width: '1px', background: 'var(--color-border)', alignSelf: 'stretch' }} />
          <Stat value="0" label="Signups required" />
          <div style={{ width: '1px', background: 'var(--color-border)', alignSelf: 'stretch' }} />
          <Stat value="50+" label="Expert tips included" />
        </div>
      </section>

      {/* ── Section 1: The Science ── */}
      <section style={{ borderTop: '1px solid var(--color-border)', padding: '7rem 5vw' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6rem', alignItems: 'center' }}>
          <div>
            <p className="font-mono" style={{ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '1.5rem' }}>
              The Science
            </p>
            <h2 className="font-display" style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', lineHeight: 1.1, marginBottom: '1.5rem', color: 'var(--color-text-1)' }}>
              Miss once, human.<br />Miss twice, a pattern.
            </h2>
            <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--color-text-2)', marginBottom: '1rem' }}>
              Research shows a single missed day has almost zero impact on habit formation.
              The danger is the second miss — that's when habits break.
            </p>
            <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--color-text-2)', marginBottom: '1.5rem' }}>
              Regulr is built around the <strong style={{ color: 'var(--color-text-1)' }}>2-Day Rule</strong> — we don't punish you for being human.
              We just make sure you always come back.
            </p>
            <p className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>
              Based on Lally et al., 2010 — University College London
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Your week</p>
            {[
              { day: 'Mon', state: 'done' },
              { day: 'Tue', state: 'done' },
              { day: 'Wed', state: 'miss1' },
              { day: 'Thu', state: 'warning' },
              { day: 'Fri', state: 'done' },
              { day: 'Sat', state: 'rest' },
              { day: 'Sun', state: 'done' },
            ].map(({ day, state }) => {
              const cfg = {
                done: { label: 'Completed', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.3)', dot: '#4ADE80', text: 'var(--color-text-1)' },
                miss1: { label: 'Missed — 1 miss, still safe', bg: 'rgba(232,193,98,0.07)', border: 'rgba(232,193,98,0.25)', dot: '#E8C162', text: 'var(--color-text-1)' },
                warning: { label: 'Come back today!', bg: 'rgba(248,113,113,0.07)', border: 'rgba(248,113,113,0.25)', dot: '#F87171', text: 'var(--color-text-1)' },
                rest: { label: 'Rest day', bg: 'transparent', border: 'var(--color-border)', dot: 'var(--color-text-3)', text: 'var(--color-text-3)' },
              }[state];
              return (
                <div key={day} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.75rem 1.25rem', borderRadius: '10px',
                  background: cfg.bg, border: `1px solid ${cfg.border}`,
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                  <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', width: '2rem', flexShrink: 0 }}>{day}</span>
                  <span style={{ fontSize: '0.85rem', color: cfg.text }}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 2: Identity ── */}
      <section style={{ borderTop: '1px solid var(--color-border)', padding: '7rem 5vw' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Your identity evolves</p>
            {[
              { level: 1, title: 'Newcomer', xp: '0 XP', active: false },
              { level: 2, title: 'Committed', xp: '250 XP', active: false },
              { level: 3, title: 'Consistent', xp: '750 XP', active: true },
              { level: 4, title: 'Dedicated', xp: '1,500 XP', active: false },
              { level: 5, title: 'Regular', xp: '3,000 XP', active: false },
            ].map(({ level, title, xp, active }) => (
              <div key={level} style={{
                display: 'flex', alignItems: 'center', gap: '1.2rem',
                padding: '1rem 1.25rem', borderRadius: '12px',
                background: active ? 'rgba(232,193,98,0.08)' : 'var(--color-surface)',
                border: active ? '1px solid rgba(232,193,98,0.3)' : '1px solid var(--color-border)',
                boxShadow: active ? '0 0 24px rgba(232,193,98,0.06)' : 'none',
              }}>
                <span className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: active ? 'var(--color-gold)' : 'var(--color-text-3)', width: '2rem', lineHeight: 1 }}>
                  {level}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: active ? 600 : 400, color: active ? 'var(--color-text-1)' : 'var(--color-text-2)', fontSize: '0.95rem' }}>{title}</p>
                  <p className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--color-text-3)', marginTop: '2px' }}>{xp}</p>
                </div>
                {active && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-gold)', background: 'rgba(232,193,98,0.12)', padding: '0.2rem 0.6rem', borderRadius: '100px' }}>
                    You are here
                  </span>
                )}
              </div>
            ))}
          </div>

          <div>
            <p className="font-mono" style={{ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '1.5rem' }}>
              Identity
            </p>
            <h2 className="font-display" style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', lineHeight: 1.1, marginBottom: '1.5rem', color: 'var(--color-text-1)' }}>
              You don't build habits.<br />You become someone.
            </h2>
            <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--color-text-2)', marginBottom: '1rem' }}>
              Every great lifter started with an empty bar and no idea what they were doing.
              The difference? They kept showing up.
            </p>
            <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--color-text-2)' }}>
              Regulr doesn't just track what you do — it tracks who you're <strong style={{ color: 'var(--color-text-1)' }}>becoming</strong>.
              Level up through consistent action. Earn badges. Own the identity.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 3: How it works ── */}
      <section style={{ borderTop: '1px solid var(--color-border)', padding: '7rem 5vw' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4rem' }}>
            <h2 className="font-display" style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', lineHeight: 1.1, color: 'var(--color-text-1)' }}>
              Simple to start.<br />Hard to quit.
            </h2>
            <button
              onClick={goToOnboarding}
              style={{ background: 'none', border: '1px solid var(--color-border-strong)', borderRadius: '100px', padding: '0.6rem 1.5rem', fontSize: '0.875rem', color: 'var(--color-text-1)', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-text-1)'; e.currentTarget.style.color = 'var(--color-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--color-text-1)'; }}
            >
              Try it now →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {[
              {
                num: '01',
                title: 'Answer 5 questions',
                body: 'Goal, experience, days per week, schedule, equipment. No email, no account, no friction.',
                detail: '~90 seconds',
              },
              {
                num: '02',
                title: 'Get your 4-week plan',
                body: 'A progressive gym program — Full Body, Push/Pull/Legs, or Upper/Lower — built around your schedule.',
                detail: 'Built instantly',
              },
              {
                num: '03',
                title: 'Show up and level up',
                body: 'Check in daily. Earn XP and badges. The 2-Day Rule protects your streak when life gets in the way.',
                detail: '50+ expert tips included',
              },
            ].map(({ num, title, body, detail }) => (
              <div
                key={num}
                style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: '16px', padding: '2rem',
                  display: 'flex', flexDirection: 'column', gap: '1rem',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-border-strong)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>{num}</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-text-1)', lineHeight: 1.3 }}>{title}</h3>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--color-text-2)', flex: 1 }}>{body}</p>
                <p className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--color-text-3)', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ borderTop: '1px solid var(--color-border)', padding: '8rem 5vw', textAlign: 'center' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h2 className="font-display" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', lineHeight: 1.02, marginBottom: '1.5rem', color: 'var(--color-text-1)', letterSpacing: '-0.02em' }}>
            No email.<br />No account.<br />Start in 90 seconds.
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--color-text-2)', marginBottom: '2.5rem', lineHeight: 1.7 }}>
            Your data lives on your device. No servers, no logins, no ads.
            Just you and the habit.
          </p>
          <button
            onClick={goToOnboarding}
            style={{
              background: 'var(--color-text-1)', color: 'var(--color-bg)',
              border: 'none', borderRadius: '100px',
              padding: '1.1rem 3rem', fontSize: '1.05rem', fontWeight: 600,
              cursor: 'pointer', marginBottom: '1rem', display: 'inline-block',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Begin Your Journey
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--color-border)', padding: '2rem 5vw' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-display" style={{ color: 'var(--color-text-3)', fontSize: '0.95rem' }}>Regulr</span>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-3)' }}>
            Your data stays on your device. Always.
          </p>
        </div>
      </footer>
    </div>
  );
}
