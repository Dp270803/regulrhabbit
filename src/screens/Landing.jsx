import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasExistingData, isOnboardingComplete } from '../utils/storage';
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

  const handleBegin = () => {
    navigate('/onboarding');
  };

  return (
    <div className="min-h-dvh" style={{ background: 'var(--color-bg)', color: 'var(--color-text-1)' }}>
      {/* Welcome back bar */}
      {showWelcomeBack && (
        <div
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center gap-2 py-3 px-4 cursor-pointer transition-opacity hover:opacity-80 text-center"
          style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
        >
          <span className="text-sm" style={{ color: 'var(--color-text-2)' }}>Welcome back —</span>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-1)' }}>Continue →</span>
        </div>
      )}

      {/* Wordmark */}
      <header className="max-w-[560px] mx-auto px-6 pt-12 pb-0">
        <p className="font-display text-lg" style={{ color: 'var(--color-text-3)' }}>Regulr</p>
      </header>

      {/* Hero */}
      <section
        className="max-w-[560px] mx-auto px-6 pt-16 pb-24 animate-fade-in-up"
        style={{ position: 'relative' }}
      >
        {/* Subtle radial glow behind headline */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: '340px',
            height: '340px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,193,98,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
            filter: 'blur(40px)',
          }}
        />
        <h1
          className="font-display leading-[1.02] mb-8 animate-fade-in-up"
          style={{ fontSize: 'clamp(3rem, 10vw, 4.5rem)', color: 'var(--color-text-1)', position: 'relative' }}
        >
          Become a<br />
          <em>regular.</em>
        </h1>
        <p
          className="text-lg leading-relaxed mb-10 animate-fade-in-up delay-100"
          style={{ color: 'var(--color-text-2)', maxWidth: '36ch', opacity: 0, animationFillMode: 'forwards' }}
        >
          A science-backed system for building habits that actually stick. No login. No guilt. Just show up.
        </p>
        <div
          className="flex items-center gap-4 animate-fade-in-up delay-200"
          style={{ opacity: 0, animationFillMode: 'forwards' }}
        >
          <button
            onClick={handleBegin}
            className="px-8 py-3.5 rounded-full text-sm font-medium transition-all duration-200 hover:opacity-90 active:scale-[0.97] cursor-pointer"
            style={{ background: 'var(--color-text-1)', color: 'var(--color-bg)' }}
          >
            Begin Your Journey
          </button>
          <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>30 seconds to start</span>
        </div>
      </section>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* Philosophy */}
      <section className="max-w-[560px] mx-auto px-6 py-20">
        <p className="text-xs font-medium uppercase tracking-[0.15em] mb-6" style={{ color: 'var(--color-text-3)' }}>
          The Science
        </p>
        <h2 className="font-display text-3xl leading-tight mb-6" style={{ color: 'var(--color-text-1)' }}>
          Miss once, human.<br />Miss twice, a pattern.
        </h2>
        <p className="text-base leading-relaxed mb-3" style={{ color: 'var(--color-text-2)' }}>
          Research shows a single missed day has almost zero impact on habit formation. The danger is the second miss. Regulr is built around the 2-Day Rule — we don't punish you for being human. We help you come back.
        </p>
        <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>Based on Lally et al., 2010</p>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* Identity */}
      <section className="max-w-[560px] mx-auto px-6 py-20">
        <p className="text-xs font-medium uppercase tracking-[0.15em] mb-6" style={{ color: 'var(--color-text-3)' }}>
          Identity
        </p>
        <h2 className="font-display text-3xl leading-tight mb-6" style={{ color: 'var(--color-text-1)' }}>
          You don't build habits.<br />You become someone.
        </h2>
        <p className="text-base leading-relaxed" style={{ color: 'var(--color-text-2)' }}>
          Every swimmer started as someone who just showed up to the pool. Every musician started with a terrible first note. Regulr doesn't track what you do — it tracks who you're becoming.
        </p>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* How it works */}
      <section className="max-w-[560px] mx-auto px-6 py-20">
        <p className="text-xs font-medium uppercase tracking-[0.15em] mb-8" style={{ color: 'var(--color-text-3)' }}>
          How It Works
        </p>
        <div className="space-y-0">
          {[
            { num: '01', title: 'Tell us what you want to build', body: 'A 2-minute chatbot asks the right questions — your activity, experience, schedule, and mindset.' },
            { num: '02', title: 'Get a plan backed by science', body: 'We generate a progressive 4-week plan tailored to you — not a generic template.' },
            { num: '03', title: 'Show up, track, level up', body: 'Check in daily. Earn XP and badges. The 2-Day Rule protects your streak if life happens.' },
          ].map(({ num, title, body }, i) => (
            <div
              key={num}
              className="py-8 flex gap-6"
              style={{ borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none' }}
            >
              <span className="font-mono text-xs pt-1 shrink-0 w-6" style={{ color: 'var(--color-text-3)' }}>{num}</span>
              <div>
                <h3 className="font-medium mb-2" style={{ color: 'var(--color-text-1)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)' }} />

      {/* Final CTA */}
      <section className="max-w-[560px] mx-auto px-6 py-24 text-center">
        <h2 className="font-display text-4xl leading-tight mb-8" style={{ color: 'var(--color-text-1)' }}>
          No email.<br />No account.<br />Start now.
        </h2>
        <button
          onClick={handleBegin}
          className="px-10 py-4 rounded-full text-base font-medium transition-all hover:opacity-90 active:scale-[0.97] cursor-pointer mb-4"
          style={{ background: 'var(--color-text-1)', color: 'var(--color-bg)' }}
        >
          Begin Your Journey
        </button>
        <p className="text-xs mt-4" style={{ color: 'var(--color-text-3)' }}>
          Your data stays on your device.
        </p>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="max-w-[560px] mx-auto px-6 py-6 flex items-center justify-between">
          <p className="font-display text-sm" style={{ color: 'var(--color-text-3)' }}>Regulr</p>
          <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>
            Privacy-friendly analytics. No personal data.
          </p>
        </div>
      </footer>
    </div>
  );
}
