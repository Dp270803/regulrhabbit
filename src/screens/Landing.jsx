import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Calendar, TrendingUp } from 'lucide-react';
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
    <div className="min-h-dvh bg-[var(--color-bg)]">
      {showWelcomeBack && (
        <div
          className="bg-[var(--color-text-primary)] text-[var(--color-surface)] text-center py-3 px-4 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => navigate('/dashboard')}
        >
          <p className="text-sm">Welcome back &rarr;</p>
        </div>
      )}

      {/* Hero */}
      <section className="max-w-[480px] mx-auto px-6 pt-24 pb-20 text-center">
        <h1
          className="font-display text-[3.5rem] leading-[1.05] text-[var(--color-text-primary)] mb-6"
          style={{ animationDelay: '0.1s' }}
        >
          Become a regular.
        </h1>
        <p
          className="text-[var(--color-text-secondary)] text-lg leading-relaxed mb-10 animate-fade-in-up"
          style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}
        >
          A science-backed system for building habits that actually stick.
          No login. No guilt. Just show up.
        </p>
        <button
          onClick={handleBegin}
          className="bg-[var(--color-text-primary)] text-[var(--color-surface)] px-8 py-3.5 rounded-full text-base font-medium hover:scale-[1.02] transition-transform animate-fade-in-up cursor-pointer"
          style={{ animationDelay: '0.5s', opacity: 0, animationFillMode: 'forwards' }}
        >
          Begin Your Journey &rarr;
        </button>
      </section>

      {/* Philosophy */}
      <section className="border-t border-[var(--color-border)]">
        <div className="max-w-[480px] mx-auto px-6 py-20">
          <h2 className="font-display text-3xl text-[var(--color-text-primary)] mb-4 leading-tight">
            Miss once, human.<br />Miss twice, a pattern.
          </h2>
          <p className="text-[var(--color-text-secondary)] leading-relaxed mb-3">
            Research shows a single missed day has almost zero impact on habit formation.
            The danger is the second miss. Regulr is built around the 2-Day Rule — we
            don&apos;t punish you for being human. We help you come back.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Based on Lally et al., 2010
          </p>
        </div>
      </section>

      {/* Identity */}
      <section className="border-t border-[var(--color-border)]">
        <div className="max-w-[480px] mx-auto px-6 py-20">
          <h2 className="font-display text-3xl text-[var(--color-text-primary)] mb-4 leading-tight">
            You don&apos;t build habits.<br />You become someone.
          </h2>
          <p className="text-[var(--color-text-secondary)] leading-relaxed">
            Every swimmer started as someone who just showed up to the pool.
            Every musician started with a terrible first note. Regulr doesn&apos;t
            track what you do — it tracks who you&apos;re becoming.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-[var(--color-border)]">
        <div className="max-w-[480px] mx-auto px-6 py-20">
          <div className="space-y-8">
            {[
              { icon: MessageSquare, num: '1', text: 'Tell us what you want to build' },
              { icon: Calendar, num: '2', text: 'Get a plan backed by science' },
              { icon: TrendingUp, num: '3', text: 'Show up, track, level up' },
            ].map(({ icon: Icon, num, text }) => (
              <div key={num} className="flex items-center gap-4">
                <div className="w-12 h-12 border border-[var(--color-border)] rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-[var(--color-text-primary)]" />
                </div>
                <div>
                  <span className="font-mono text-xs text-[var(--color-text-muted)]">{num}.</span>
                  <p className="text-[var(--color-text-primary)] font-medium">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-[var(--color-border)]">
        <div className="max-w-[480px] mx-auto px-6 py-20 text-center">
          <h2 className="font-display text-3xl text-[var(--color-text-primary)] mb-6 leading-tight">
            No email. No account.<br />Start in 30 seconds.
          </h2>
          <button
            onClick={handleBegin}
            className="bg-[var(--color-text-primary)] text-[var(--color-surface)] px-8 py-3.5 rounded-full text-base font-medium hover:scale-[1.02] transition-transform cursor-pointer"
          >
            Begin Your Journey &rarr;
          </button>
          <p className="text-xs text-[var(--color-text-muted)] mt-4">
            Your data stays on your device. We don&apos;t track you — you track yourself.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-6 text-center">
        <p className="text-xs text-[var(--color-text-muted)]">
          We use privacy-friendly analytics to improve the app. No personal data is collected.
        </p>
      </footer>
    </div>
  );
}
