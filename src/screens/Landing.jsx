import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isOnboardingComplete, getData } from '../utils/storage';
import { trackPageView } from '../utils/analytics';

const C = {
  bg: '#131313', low: '#1c1b1b', container: '#201f1f',
  high: '#2a2a2a', highest: '#353534', lowest: '#0e0e0e',
  primary: '#e9c349', onPrimary: '#3c2f00', green: '#2ff801',
  text: '#e5e2e1', muted: '#c4c7c7', faint: '#7b7c7c',
};

function WelcomeBack({ onContinue }) {
  const d = getData();
  const activePlan = d?.plans?.find(p => p.status === 'active');
  const streak = d?.streaks?.current || 0;
  const planLabel = activePlan?.plan_label || 'Your Plan';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100dvh' }}>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 clamp(1.5rem,5vw,3rem)', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(19,19,19,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        transition: 'background 0.3s',
      }}>
        <span className="font-headline" style={{ fontSize: '1.4rem', fontWeight: 800, color: C.primary, letterSpacing: '-0.03em', textTransform: 'uppercase' }}>Regular</span>
        <button onClick={onContinue} style={{ background: C.primary, color: C.onPrimary, border: 'none', borderRadius: '4px', padding: '0.5rem 1.4rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
          My Plan →
        </button>
      </nav>
      <section style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 5vw 60px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: '60vw', height: '35vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,195,73,0.08) 0%, transparent 65%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <p className="font-headline" style={{ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, marginBottom: '1.5rem' }}>
          {streak > 0 ? `${streak}-Day Streak` : 'Welcome back'}
        </p>
        <h1 className="font-headline" style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>
          Keep going,<br /><span style={{ color: C.primary }}>regular.</span>
        </h1>
        <p style={{ fontSize: '1.1rem', color: C.muted, marginBottom: '3rem', maxWidth: '40ch', lineHeight: 1.7 }}>
          {planLabel} is waiting. The habit only counts if you show up.
        </p>
        <button onClick={onContinue} style={{ background: C.primary, color: C.onPrimary, border: 'none', borderRadius: '4px', padding: '1rem 2.8rem', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
          Continue training
        </button>
      </section>
    </div>
  );
}

// Demo dot-track for bento section
function DotTrack() {
  const dots = [
    C.green, C.green, C.green, C.green, C.green,
    C.green, C.green, C.green, C.green, C.green,
    C.green, C.green, C.primary,
    C.highest, C.highest, C.highest, C.highest,
    C.highest, C.highest, C.highest,
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '280px' }}>
      {dots.map((bg, i) => (
        <div key={i} style={{ width: '10px', height: '10px', borderRadius: '2px', background: bg }} />
      ))}
    </div>
  );
}

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

  const goToOnboarding = () => navigate('/onboarding');
  const goToDashboard = () => navigate('/dashboard');

  if (isReturning) return <WelcomeBack onContinue={goToDashboard} />;

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100dvh', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 clamp(1.5rem, 5vw, 3rem)', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(19,19,19,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        transition: 'background 0.3s',
      }}>
        <span className="font-headline" style={{ fontSize: '1.4rem', fontWeight: 800, color: C.primary, letterSpacing: '-0.03em', textTransform: 'uppercase' }}>Regular</span>
        {/* Desktop nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }} className="landing-hide-mobile">
          {['Dashboard', 'Plan', 'Tips'].map(label => (
            <button key={label} onClick={goToDashboard} style={{ background: 'none', border: 'none', color: C.faint, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', letterSpacing: '-0.01em', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = C.muted}
              onMouseLeave={e => e.currentTarget.style.color = C.faint}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={goToOnboarding} style={{ background: C.primary, color: C.onPrimary, border: 'none', borderRadius: '4px', padding: '0.5rem 1.4rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}
          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
          onMouseLeave={e => e.currentTarget.style.filter = 'none'}
        >
          Get Started
        </button>
      </nav>

      {/* ── Hero ── */}
      <section style={{ minHeight: 'calc(100dvh - 120px)', display: 'flex', alignItems: 'center', padding: '80px clamp(1.5rem,6vw,4rem) 3rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div className="landing-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-end', gap: '4rem', width: '100%' }}>
          {/* Left: headline */}
          <div>
            <h1 className="font-headline animate-fade-in-up" style={{ fontSize: 'clamp(4rem, 9vw, 8rem)', fontWeight: 800, lineHeight: 0.88, letterSpacing: '-0.03em', marginBottom: '2rem' }}>
              Become a <span style={{ color: C.primary }}>regular.</span>
            </h1>
            <p className="animate-fade-in-up delay-100" style={{ fontSize: '1.2rem', color: C.muted, lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: '44ch', opacity: 0, animationFillMode: 'forwards' }}>
              Build the habit of showing up. No friction, just focus.
            </p>
            <div className="animate-fade-in-up delay-200" style={{ opacity: 0, animationFillMode: 'forwards' }}>
              <button onClick={goToOnboarding}
                style={{ background: C.primary, color: C.onPrimary, border: 'none', borderRadius: '4px', padding: '1.1rem 2.8rem', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'none'}
              >
                Start for free →
              </button>
              <p style={{ fontSize: '0.78rem', color: C.faint, marginTop: '0.75rem' }}>No account · 2 minutes</p>
            </div>
          </div>

          {/* Right: proof-point grid */}
          <div className="animate-fade-in-up delay-300" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', minWidth: '320px', maxWidth: '420px', opacity: 0, animationFillMode: 'forwards' }}>
            {[
              { icon: '◫', tag: 'Structure', title: '4-Week Progressive Plan' },
              { icon: '⟳', tag: 'Philosophy', title: 'The 2-Day Rule' },
              { icon: '◉', tag: 'Access', title: 'Zero signups required' },
              { icon: '◈', tag: 'Knowledge', title: '90+ Expert Tips' },
            ].map(({ icon, tag, title }) => (
              <div key={tag} style={{ background: C.low, borderRadius: '12px', padding: '1.4rem' }}>
                <span style={{ fontSize: '1.2rem', color: C.primary, display: 'block', marginBottom: '0.75rem', lineHeight: 1 }}>{icon}</span>
                <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint, marginBottom: '4px' }}>{tag}</p>
                <p className="font-headline" style={{ fontSize: '0.9rem', fontWeight: 700, color: C.text }}>{title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bento: Habit Visualization ── */}
      <section style={{ padding: '0 clamp(1.5rem,6vw,4rem) 6rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div className="landing-grid-2col" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          {/* Main habit card */}
          <div style={{ background: C.container, borderRadius: '24px', padding: '2.5rem', overflow: 'hidden', position: 'relative' }}>
            {/* Decorative bg glow */}
            <div style={{ position: 'absolute', bottom: '-40px', right: '-40px', width: '240px', height: '240px', background: 'rgba(47,248,1,0.04)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                <div>
                  <h2 className="font-headline" style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>Deep Work</h2>
                  <p style={{ fontSize: '0.9rem', color: C.faint }}>Daily Session · 90min</p>
                </div>
                <span style={{ background: C.green, color: '#053900', padding: '4px 12px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Active Streak: 12
                </span>
              </div>
              <DotTrack />
            </div>
          </div>

          {/* Stats card */}
          <div style={{ background: C.lowest, borderRadius: '24px', padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint }}>Level 04 — Architect</p>
            <div>
              <p className="font-headline" style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1, color: C.primary, letterSpacing: '-0.03em' }}>88%</p>
              <p style={{ fontSize: '0.9rem', color: C.muted, marginTop: '4px' }}>Consistency Score</p>
            </div>
            <div>
              <div style={{ height: '3px', background: C.highest, borderRadius: '2px', overflow: 'hidden', marginBottom: '14px' }}>
                <div style={{ height: '100%', background: C.primary, width: '88%', boxShadow: `0 0 8px rgba(233,195,73,0.4)` }} />
              </div>
              <p style={{ fontSize: '0.8rem', color: C.faint, lineHeight: 1.6, fontStyle: 'italic' }}>
                "Success is the sum of small efforts repeated day in and day out."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Science Section ── */}
      <section style={{ background: C.lowest, padding: '6rem clamp(1.5rem,6vw,4rem)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="landing-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>
            <div>
              <p className="font-headline" style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.primary, marginBottom: '1.5rem' }}>The Science</p>
              <h2 className="font-headline" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>
                The high cost of<br />missing twice.
              </h2>
              <p style={{ fontSize: '1rem', color: C.muted, lineHeight: 1.8, marginBottom: '2rem' }}>
                One miss is an accident. Two misses is the start of a new habit. Our system is built around the "2-Day Rule" — never let a lapse happen twice in a row. This prevents the spiral of failure and keeps your identity intact.
              </p>
              {[
                { title: 'Psychological Safety', body: 'Eliminate the guilt that usually follows a missed day.' },
                { title: 'Momentum Retention', body: 'Recover 90% of your habit strength by showing up the next day.' },
              ].map(({ title, body }) => (
                <div key={title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <span style={{ color: C.green, fontSize: '1rem', lineHeight: 1.6, flexShrink: 0 }}>●</span>
                  <div>
                    <p style={{ fontWeight: 600, color: C.text, marginBottom: '2px' }}>{title}</p>
                    <p style={{ fontSize: '0.88rem', color: C.faint }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Obsidian visual */}
            <div style={{ aspectRatio: '1', borderRadius: '2rem', background: `radial-gradient(circle at 35% 35%, ${C.container} 0%, ${C.lowest} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '20%', left: '20%', width: '60%', height: '60%', borderRadius: '50%', background: `radial-gradient(circle, rgba(233,195,73,0.06) 0%, transparent 70%)`, filter: 'blur(20px)' }} />
              <div style={{ width: '65%', height: '65%', borderRadius: '50%', background: `radial-gradient(circle at 40% 35%, ${C.high} 0%, ${C.lowest} 100%)`, boxShadow: `inset -8px -12px 24px rgba(0,0,0,0.7), inset 4px 4px 12px rgba(233,195,73,0.04)` }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Identity Evolution ── */}
      <section style={{ padding: '6rem clamp(1.5rem,6vw,4rem)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 className="font-headline" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '4rem' }}>Identity Evolution</h2>
          <div className="landing-cards-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { num: '01', title: 'The Visitor', body: 'Just showing up once in a while. Testing the waters.', active: false },
              { num: '02', title: 'The Builder', body: 'Putting in the reps. Creating a weekly baseline.', active: true },
              { num: '03', title: 'The Architect', body: 'Systems in place. Optimizing for consistency.', active: false },
              { num: '04', title: 'The Regular', body: 'Identity transformed. The habit is who you are.', active: false },
            ].map(({ num, title, body, active }) => (
              <div key={num} style={{
                background: C.low, borderRadius: '16px', padding: '2rem',
                borderTop: active ? `2px solid ${C.primary}` : `2px solid transparent`,
              }}>
                <p className="font-headline" style={{ fontSize: '2.5rem', fontWeight: 800, color: active ? `${C.primary}55` : C.highest, marginBottom: '1rem' }}>{num}</p>
                <p className="font-headline" style={{ fontSize: '1.05rem', fontWeight: 700, color: active ? C.primary : C.text, marginBottom: '0.5rem' }}>{title}</p>
                <p style={{ fontSize: '0.85rem', color: C.faint, lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Protocol ── */}
      <section style={{ padding: '5rem clamp(1.5rem,6vw,4rem)', textAlign: 'center' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.faint, marginBottom: '4rem' }}>The Protocol</p>
          <div className="landing-grid-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4rem' }}>
            {[
              { n: '1', title: 'Chase Your Anchor', body: 'Select one core habit that defines your progress.' },
              { n: '2', title: 'Mark the Win', body: 'Open the app, tap once, close the app. Zero friction.' },
              { n: '3', title: 'Defend the Break', body: 'Use expert tips to navigate the hard days.' },
            ].map(({ n, title, body }) => (
              <div key={n}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: C.highest, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: C.primary, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Manrope, sans-serif' }}>{n}</div>
                <p className="font-headline" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</p>
                <p style={{ fontSize: '0.85rem', color: C.faint, lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ padding: '3rem clamp(1.5rem,6vw,4rem) 8rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', background: C.primary, borderRadius: '3rem', padding: 'clamp(3rem,6vw,6rem)', textAlign: 'center' }}>
          <h2 className="font-headline" style={{ fontSize: 'clamp(2.5rem, 6vw, 5.5rem)', fontWeight: 800, color: C.onPrimary, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>
            Ready to show up?
          </h2>
          <p style={{ fontSize: '1.1rem', color: `${C.onPrimary}bb`, maxWidth: '40ch', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
            Join 12,000+ others who stopped chasing hacks and started becoming regulars.
          </p>
          <button onClick={goToOnboarding}
            style={{ background: C.onPrimary, color: C.primary, border: 'none', borderRadius: '4px', padding: '1.2rem 3.2rem', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', transition: 'transform 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Start your first plan
          </button>
        </div>
      </section>

      <footer className="landing-footer-row" style={{ borderTop: `1px solid rgba(53,53,52,0.6)`, padding: '2rem clamp(1.5rem,5vw,3rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint }}>
        <span>© 2024 Regular. Built for focus.</span>
        <span>No tracking · No ads · No nonsense</span>
      </footer>
    </div>
  );
}
