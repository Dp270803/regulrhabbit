import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isOnboardingComplete, getData } from '../utils/storage';
import { trackPageView } from '../utils/analytics';
import { fetchLandingPage, sanityImageUrl } from '../utils/sanityClient';
import { useThemeColors } from '../hooks/useTheme';

const DEFAULTS = {
  heroHeading: 'Become a',
  heroAccent: 'regular.',
  heroSubtitle: 'Build the habit of showing up. No friction, just focus.',
  heroCtaText: 'Start for free',
  heroCtaNote: 'No account · 2 minutes',
  proofPoints: [
    { icon: 'calendar_today', tag: 'Structure',   title: '4-Week Progressive Plan' },
    { icon: 'rule',           tag: 'Philosophy',  title: 'The 2-Day Rule' },
    { icon: 'no_accounts',    tag: 'Access',      title: 'Zero signups required' },
    { icon: 'tips_and_updates', tag: 'Knowledge', title: '90+ Expert Tips' },
  ],
  scienceEyebrow: 'The Science',
  scienceHeading: 'The high cost of missing twice.',
  scienceBody: 'One miss is an accident. Two misses is the start of a new habit. Our system is built around the "2-Day Rule" — never let a lapse happen twice in a row. This prevents the spiral of failure and keeps your identity intact.',
  scienceBullets: [
    { title: 'Psychological Safety',  body: 'Eliminate the guilt that usually follows a missed day.' },
    { title: 'Momentum Retention',    body: 'Recover 90% of your habit strength by showing up the next day.' },
  ],
  scienceImage: null,
  ctaHeading: 'Ready to show up?',
  ctaSubtitle: 'Join 12,000+ others who stopped chasing hacks and started becoming regulars.',
  ctaButtonText: 'Start your first plan',
  footerLeft: '© 2026 Regulr. Built for focus.',
  footerRight: 'No tracking · No ads · No nonsense',
};

const IDENTITY_LEVELS = [
  { num: '01', title: 'The Visitor',   body: 'Just showing up once in a while. Testing the waters.',            active: false },
  { num: '02', title: 'The Builder',   body: 'Putting in the reps. Creating a 4-day weekly baseline.',          active: true  },
  { num: '03', title: 'The Architect', body: 'Systems in place. Optimizing for long-term consistency.',          active: false },
  { num: '04', title: 'The Regular',   body: 'Identity transformed. The habit is who you are.',                 active: false },
];

const PROTOCOL_STEPS = [
  { n: '1', title: 'Choose Your Anchor', body: 'Select one core habit that defines your progress.' },
  { n: '2', title: 'Mark the Win',       body: 'Open the app, tap once, close the app. Zero friction.' },
  { n: '3', title: 'Defend the Streak',  body: 'Use our expert tips to navigate the hard days.' },
];

function Icon({ name, style }) {
  return (
    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24", ...style }}>
      {name}
    </span>
  );
}


function WelcomeBack({ onContinue }) {
  const C = useThemeColors();
  const d = getData();
  const streak = d?.streaks?.current || 0;
  const planLabel = d?.plans?.find(p => p.status === 'active')?.plan_label || 'Your Plan';
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
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
        <span className="font-headline" style={{ fontSize: '1.4rem', fontWeight: 800, color: C.primary, letterSpacing: '-0.03em', textTransform: 'uppercase' }}>Regulr</span>
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

export default function Landing() {
  const C = useThemeColors();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [cms, setCms] = useState(null);

  useEffect(() => {
    trackPageView('landing');
    setIsReturning(isOnboardingComplete());
    fetchLandingPage().then(d => { if (d) setCms(d); }).catch(() => {});
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const go = () => navigate('/onboarding');
  const d = key => (cms?.[key] != null && cms[key] !== '') ? cms[key] : DEFAULTS[key];

  if (isReturning) return <WelcomeBack onContinue={() => navigate('/dashboard')} />;

  const proofPoints  = (cms?.proofPoints?.length  ? cms.proofPoints  : DEFAULTS.proofPoints);
  const scienceBullets = (cms?.scienceBullets?.length ? cms.scienceBullets : DEFAULTS.scienceBullets);
  const scienceImgUrl = cms?.scienceImage ? sanityImageUrl(cms.scienceImage, { width: 800 }) : null;

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100dvh', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 clamp(1.5rem,5vw,3rem)', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(19,19,19,0.88)' : 'rgba(19,19,19,0.6)',
        backdropFilter: 'blur(20px)',
        transition: 'background 0.3s',
      }}>
        <span className="font-headline" style={{ fontSize: '1.1rem', fontWeight: 800, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Regulr</span>
        <button onClick={go}
          style={{ background: C.primary, color: C.onPrimary, border: 'none', borderRadius: '4px', padding: '0.5rem 1.4rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}
          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
          onMouseLeave={e => e.currentTarget.style.filter = 'none'}
        >
          Get Started
        </button>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: '120px clamp(1.5rem,6vw,4rem) 5rem', maxWidth: '1300px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'flex-end', gap: '3rem', width: '100%' }} className="landing-hero-grid">
          {/* Left */}
          <div>
            <h1 className="font-headline animate-fade-in-up" style={{ fontSize: 'clamp(4rem, 9vw, 8.5rem)', fontWeight: 800, lineHeight: 0.88, letterSpacing: '-0.03em', marginBottom: '1.75rem' }}>
              {d('heroHeading')}<br /><span style={{ color: C.primary }}>{d('heroAccent')}</span>
            </h1>
            <p style={{ fontSize: 'clamp(1rem,2vw,1.2rem)', color: C.muted, lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: '42ch' }}>
              {d('heroSubtitle')}
            </p>
            <button onClick={go}
              style={{ background: C.primary, color: C.onPrimary, border: 'none', borderRadius: '6px', padding: '1rem 2.5rem', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseLeave={e => e.currentTarget.style.filter = 'none'}
            >
              {d('heroCtaText')}
              <Icon name="arrow_forward" style={{ fontSize: '1.1rem' }} />
            </button>
            <p style={{ fontSize: '0.78rem', color: C.faint }}>{d('heroCtaNote')}</p>
          </div>

          {/* Right: proof points */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', width: 'min(360px, 100%)', flexShrink: 0 }}>
            {proofPoints.map((pt, i) => (
              <div key={i} style={{ background: C.low, borderRadius: '12px', padding: '1.4rem' }}>
                <Icon name={pt.icon || 'star'} style={{ fontSize: '1.4rem', color: C.primary, display: 'block', marginBottom: '0.75rem' }} />
                <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint, marginBottom: '5px' }}>{pt.tag}</p>
                <p className="font-headline" style={{ fontSize: '0.88rem', fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{pt.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Science ── */}
      <section style={{ background: C.lowest, padding: '6rem clamp(1.5rem,6vw,4rem)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }} className="landing-science-grid">
            <div>
              <p className="font-headline" style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.primary, marginBottom: '1.5rem' }}>
                {d('scienceEyebrow')}
              </p>
              <h2 className="font-headline" style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>
                {d('scienceHeading')}
              </h2>
              <p style={{ fontSize: '1rem', color: C.muted, lineHeight: 1.8, marginBottom: '2rem' }}>
                {d('scienceBody')}
              </p>
              {scienceBullets.map(({ title, body }, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <Icon name="check_circle" style={{ color: C.green, fontSize: '1.1rem', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontWeight: 600, color: C.text, marginBottom: '2px' }}>{title}</p>
                    <p style={{ fontSize: '0.88rem', color: C.faint }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Image or CSS fallback */}
            <div style={{ aspectRatio: '1', borderRadius: '2rem', overflow: 'hidden', position: 'relative', background: scienceImgUrl ? C.lowest : `radial-gradient(circle at 35% 35%, ${C.container} 0%, ${C.lowest} 100%)` }}>
              {scienceImgUrl ? (
                <img src={scienceImgUrl} alt="Science visual" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
              ) : (
                <>
                  <div style={{ position: 'absolute', top: '20%', left: '20%', width: '60%', height: '60%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,195,73,0.06) 0%, transparent 70%)', filter: 'blur(20px)' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '65%', height: '65%', borderRadius: '50%', background: `radial-gradient(circle at 40% 35%, ${C.high} 0%, ${C.lowest} 100%)`, boxShadow: 'inset -8px -12px 24px rgba(0,0,0,0.7), inset 4px 4px 12px rgba(233,195,73,0.04)' }} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Identity Evolution ── */}
      <section style={{ padding: '6rem clamp(1.5rem,6vw,4rem)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 className="font-headline" style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '3.5rem' }}>
            Identity Evolution
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }} className="landing-levels-grid">
            {IDENTITY_LEVELS.map(({ num, title, body, active }) => (
              <div key={num} style={{ background: C.low, borderRadius: '16px', padding: '2rem', borderTop: active ? `2px solid ${C.primary}` : '2px solid transparent', transition: 'background 0.2s' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.high; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = C.low; }}
              >
                <p className="font-headline" style={{ fontSize: '2.2rem', fontWeight: 800, color: active ? `${C.primary}55` : C.highest, marginBottom: '1rem' }}>{num}</p>
                <p className="font-headline" style={{ fontSize: '1rem', fontWeight: 700, color: active ? C.primary : C.text, marginBottom: '0.5rem' }}>{title}</p>
                <p style={{ fontSize: '0.85rem', color: C.faint, lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Protocol ── */}
      <section style={{ padding: '4rem clamp(1.5rem,6vw,4rem) 6rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.faint, marginBottom: '4rem' }}>The Protocol</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3.5rem' }} className="landing-protocol-grid">
            {PROTOCOL_STEPS.map(({ n, title, body }) => (
              <div key={n}>
                <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: C.highest, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: C.primary, fontSize: '1rem', fontWeight: 800, fontFamily: 'Manrope, sans-serif' }}>{n}</div>
                <p className="font-headline" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</p>
                <p style={{ fontSize: '0.85rem', color: C.faint, lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ padding: '0 clamp(1.5rem,6vw,4rem) 7rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', background: C.primary, borderRadius: '3rem', padding: 'clamp(3rem,6vw,6rem)', textAlign: 'center' }}>
          <h2 className="font-headline" style={{ fontSize: 'clamp(2.5rem,6vw,5.5rem)', fontWeight: 800, color: C.onPrimary, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>
            {d('ctaHeading')}
          </h2>
          <p style={{ fontSize: '1.1rem', color: `${C.onPrimary}bb`, maxWidth: '40ch', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
            {d('ctaSubtitle')}
          </p>
          <button onClick={go}
            style={{ background: C.onPrimary, color: C.primary, border: 'none', borderRadius: '6px', padding: '1.2rem 3rem', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', transition: 'transform 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {d('ctaButtonText')}
          </button>
        </div>
      </section>

      <footer style={{ borderTop: `1px solid rgba(53,53,52,0.6)`, padding: '2rem clamp(1.5rem,5vw,3rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, flexWrap: 'wrap', gap: '8px' }}>
        <span>{d('footerLeft')}</span>
        <span>{d('footerRight')}</span>
      </footer>
    </div>
  );
}
