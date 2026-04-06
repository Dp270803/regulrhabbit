import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isOnboardingComplete } from '../utils/storage';
import { trackPageView } from '../utils/analytics';

export default function Landing() {
  const navigate = useNavigate();
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  useEffect(() => {
    trackPageView('landing');
    if (isOnboardingComplete()) {
      setShowWelcomeBack(true);
    }
  }, []);

  return (
    <div className="min-h-dvh" style={{ background: 'var(--color-bg)', color: 'var(--color-text-1)' }}>
      {/* Welcome back bar */}
      {showWelcomeBack && (
        <div
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center gap-2 py-3 px-6 cursor-pointer hover:opacity-80 transition-opacity"
          style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
        >
          <span className="text-sm" style={{ color: 'var(--color-text-2)' }}>Welcome back —</span>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-1)' }}>Continue →</span>
        </div>
      )}

      {/* Wordmark */}
      <header style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 3rem 0' }}>
        <p className="font-display text-xl" style={{ color: 'var(--color-text-3)' }}>Regulr</p>
      </header>

      {/* Hero */}
      <section
        className="animate-fade-in-up"
        style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 3rem 6rem', position: 'relative' }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '0',
            left: '-10%',
            width: '600px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,193,98,0.05) 0%, transparent 70%)',
            pointerEvents: 'none',
            filter: 'blur(60px)',
          }}
        />
        <h1
          className="font-display animate-fade-in-up"
          style={{
            fontSize: 'clamp(3.5rem, 8vw, 7rem)',
            lineHeight: '1.0',
            marginBottom: '2rem',
            maxWidth: '14ch',
            position: 'relative',
            color: 'var(--color-text-1)',
          }}
        >
          Become a<br />
          <em>regular.</em>
        </h1>
        <p
          className="animate-fade-in-up delay-100"
          style={{
            fontSize: '1.2rem',
            lineHeight: '1.7',
            maxWidth: '44ch',
            marginBottom: '2.5rem',
            color: 'var(--color-text-2)',
            opacity: 0,
            animationFillMode: 'forwards',
          }}
        >
          A science-backed system for building habits that actually stick.
          No login. No guilt. Just show up.
        </p>
        <div
          className="flex items-center gap-5 animate-fade-in-up delay-200"
          style={{ opacity: 0, animationFillMode: 'forwards' }}
        >
          <button
            onClick={() => navigate('/onboarding')}
            className="rounded-full font-medium transition-all hover:opacity-90 active:scale-[0.97] cursor-pointer"
            style={{
              background: 'var(--color-text-1)',
              color: 'var(--color-bg)',
              padding: '0.9rem 2.2rem',
              fontSize: '0.95rem',
            }}
          >
            Begin Your Journey
          </button>
          <span className="text-sm" style={{ color: 'var(--color-text-3)' }}>30 seconds to start</span>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* Philosophy */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '5rem 3rem' }}>
        <div style={{ maxWidth: '620px' }}>
          <p
            className="font-mono"
            style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.5rem', color: 'var(--color-text-3)' }}
          >
            The Science
          </p>
          <h2 className="font-display" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: '1.15', marginBottom: '1.5rem', color: 'var(--color-text-1)' }}>
            Miss once, human.<br />Miss twice, a pattern.
          </h2>
          <p style={{ fontSize: '1rem', lineHeight: '1.75', marginBottom: '1rem', color: 'var(--color-text-2)' }}>
            Research shows a single missed day has almost zero impact on habit formation. The danger is the second miss. Regulr is built around the 2-Day Rule — we don't punish you for being human. We help you come back.
          </p>
          <p className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>Based on Lally et al., 2010</p>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* Identity */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '5rem 3rem' }}>
        <div style={{ maxWidth: '620px' }}>
          <p
            className="font-mono"
            style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.5rem', color: 'var(--color-text-3)' }}
          >
            Identity
          </p>
          <h2 className="font-display" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: '1.15', marginBottom: '1.5rem', color: 'var(--color-text-1)' }}>
            You don't build habits.<br />You become someone.
          </h2>
          <p style={{ fontSize: '1rem', lineHeight: '1.75', color: 'var(--color-text-2)' }}>
            Every swimmer started as someone who just showed up to the pool. Every musician started with a terrible first note. Regulr doesn't track what you do — it tracks who you're becoming.
          </p>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* How It Works */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '5rem 3rem' }}>
        <p
          className="font-mono"
          style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '3rem', color: 'var(--color-text-3)' }}
        >
          How It Works
        </p>
        <div>
          {[
            { num: '01', title: 'Tell us what you want to build', body: 'A 2-minute chatbot asks the right questions — your activity, experience, schedule, and mindset.' },
            { num: '02', title: 'Get a plan backed by science', body: 'We generate a progressive 4-week plan tailored to you — not a generic template.' },
            { num: '03', title: 'Show up, track, level up', body: 'Check in daily. Earn XP and badges. The 2-Day Rule protects your streak if life happens.' },
          ].map(({ num, title, body }, i) => (
            <div
              key={num}
              style={{
                display: 'flex',
                gap: '2rem',
                padding: '2rem 0',
                borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <span className="font-mono" style={{ fontSize: '0.75rem', paddingTop: '2px', flexShrink: 0, width: '2rem', color: 'var(--color-text-3)' }}>{num}</span>
              <div>
                <h3 style={{ fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text-1)', fontSize: '1rem' }}>{title}</h3>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.7', color: 'var(--color-text-2)' }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* Final CTA */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '6rem 3rem', textAlign: 'center' }}>
        <h2 className="font-display" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: '1.05', marginBottom: '2.5rem', color: 'var(--color-text-1)' }}>
          No email.<br />No account.<br />Start now.
        </h2>
        <button
          onClick={() => navigate('/onboarding')}
          className="rounded-full font-medium transition-all hover:opacity-90 active:scale-[0.97] cursor-pointer"
          style={{
            background: 'var(--color-text-1)',
            color: 'var(--color-bg)',
            padding: '1rem 2.5rem',
            fontSize: '1rem',
            display: 'inline-block',
            marginBottom: '1rem',
          }}
        >
          Begin Your Journey
        </button>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-3)' }}>
          Your data stays on your device.
        </p>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--color-border)' }}>
        <div
          style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <p className="font-display text-sm" style={{ color: 'var(--color-text-3)' }}>Regulr</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>
            Privacy-friendly analytics. No personal data.
          </p>
        </div>
      </footer>
    </div>
  );
}
