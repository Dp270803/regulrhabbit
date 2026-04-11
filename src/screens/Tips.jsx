import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, Zap, Lightbulb, TrendingUp } from 'lucide-react';
import { getData } from '../utils/storage';
import { selectTip } from '../utils/tipSelector';
import { trackPageView } from '../utils/analytics';

const C = {
  bg: '#131313', low: '#1c1b1b', container: '#201f1f',
  high: '#2a2a2a', highest: '#353534', lowest: '#0e0e0e',
  primary: '#e9c349', onPrimary: '#3c2f00', green: '#2ff801',
  text: '#e5e2e1', muted: '#c4c7c7', faint: '#7b7c7c',
};

const W = { maxWidth: '1000px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 48px)' };

const CATEGORY_CONFIG = {
  technique: { label: 'Technique', color: C.primary, Icon: Crosshair },
  recovery:  { label: 'Recovery',  color: C.green,   Icon: Zap       },
  mindset:   { label: 'Mindset',   color: C.muted,   Icon: Lightbulb },
  progress:  { label: 'Progress',  color: C.primary, Icon: TrendingUp },
};

// Left col then right col — matches screenshot layout
const COLUMN_LAYOUT = [
  ['technique', 'mindset'],
  ['recovery',  'progress'],
];

function extractTitle(text) {
  // First clause before first comma, dash, or period — capped at 38 chars
  const chunk = text.split(/[,\.—]/)[0].trim();
  return chunk.length > 38 ? chunk.slice(0, 36) + '…' : chunk;
}

function extractBody(text) {
  // First full sentence
  const m = text.match(/^[^.!?]+[.!?]/);
  const s = m ? m[0] : text;
  return s.length > 120 ? s.slice(0, 118) + '…' : s;
}

function TipCard({ tip, category }) {
  const cfg = CATEGORY_CONFIG[category];
  return (
    <div style={{
      background: C.low, borderRadius: '12px',
      padding: '20px 22px', marginBottom: '8px',
    }}>
      <p style={{
        fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: cfg.color, marginBottom: '8px', opacity: 0.85,
      }}>
        {cfg.label}
      </p>
      <p className="font-headline" style={{
        fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em',
        color: C.text, lineHeight: 1.25, marginBottom: '8px',
      }}>
        {extractTitle(tip.text)}
      </p>
      <p style={{ fontSize: '0.82rem', color: C.faint, lineHeight: 1.65 }}>
        {extractBody(tip.text)}
      </p>
    </div>
  );
}

export default function Tips() {
  const navigate = useNavigate();
  const [todayTip, setTodayTip] = useState(null);
  const [tipsByCategory, setTipsByCategory] = useState({});

  useEffect(() => {
    trackPageView('tips');
    const d = getData();
    if (!d.onboarding_complete) { navigate('/'); return; }

    const loadTips = async () => {
      const tip = await selectTip(d);
      setTodayTip(tip);
      const activePlan = d.plans.find(p => p.status === 'active');
      if (!activePlan) return;
      const loaders = {
        gym:        () => import('../data/tips/gym-tips.json'),
        swimming:   () => import('../data/tips/swimming-tips.json'),
        running:    () => import('../data/tips/running-tips.json'),
        yoga:       () => import('../data/tips/yoga-tips.json'),
        dance:      () => import('../data/tips/dance-tips.json'),
        singing:    () => import('../data/tips/singing-tips.json'),
        instrument: () => import('../data/tips/instrument-tips.json'),
      };
      try {
        const loader = loaders[activePlan.activity];
        if (!loader) return;
        const mod = await loader();
        const allTips = (mod.default || mod).tips || [];
        const byCat = {};
        for (const key of Object.keys(CATEGORY_CONFIG)) {
          byCat[key] = allTips.filter(t => t.category === key);
        }
        setTipsByCategory(byCat);
      } catch { /* ok */ }
    };
    loadTips();
  }, [navigate]);

  const featuredCfg = todayTip ? CATEGORY_CONFIG[todayTip.category] : null;

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, paddingBottom: '7rem' }}>

      {/* ── Featured tip hero ── */}
      <div style={{ ...W, paddingTop: '3rem' }}>
        {todayTip && (
          <div style={{
            position: 'relative', overflow: 'hidden',
            borderRadius: '20px', minHeight: '320px',
            background: C.lowest,
            display: 'flex', alignItems: 'flex-end',
            marginBottom: '2.5rem',
          }}>
            {/* Glow blobs */}
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '320px', height: '320px', background: `rgba(233,195,73,0.12)`, borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-40px', left: '-30px', width: '220px', height: '220px', background: `rgba(47,248,1,0.06)`, borderRadius: '50%', filter: 'blur(70px)', pointerEvents: 'none' }} />
            {/* Radial vignette */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 30%, rgba(233,195,73,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1, padding: '2.5rem 2.5rem 2.75rem' }}>
              <p style={{
                fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: C.primary, marginBottom: '1.25rem', opacity: 0.85,
              }}>
                Featured Tip of the Day
              </p>
              <h2 className="font-headline" style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 800,
                letterSpacing: '-0.03em', lineHeight: 1.15,
                marginBottom: '1.2rem', maxWidth: '580px',
              }}>
                {featuredCfg ? (
                  <>
                    <span style={{ color: C.text }}>The Science of </span>
                    <span style={{ color: C.primary }}>{featuredCfg.label}</span>
                  </>
                ) : 'Today\'s Insight'}
              </h2>
              <p style={{
                fontSize: '0.95rem', lineHeight: 1.75, color: C.muted,
                maxWidth: '540px', marginBottom: '1.75rem',
              }}>
                {todayTip.text}
              </p>
              <button
                style={{
                  padding: '12px 24px', borderRadius: '8px',
                  background: 'transparent',
                  border: `1.5px solid ${C.primary}`,
                  color: C.primary,
                  fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontFamily: 'Manrope, sans-serif',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `rgba(233,195,73,0.1)`; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                Read Masterclass →
              </button>
            </div>
          </div>
        )}

        {/* ── 2-column category grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '32px',
        }}>
          {COLUMN_LAYOUT.map((colKeys, ci) => (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
              {colKeys.map(catKey => {
                const cfg = CATEGORY_CONFIG[catKey];
                const tips = (tipsByCategory[catKey] || []).slice(0, 2);
                return (
                  <div key={catKey}>
                    {/* Category heading */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', marginBottom: '16px',
                    }}>
                      <h2 className="font-headline" style={{
                        fontSize: '1.4rem', fontWeight: 700,
                        letterSpacing: '-0.02em', color: C.text,
                      }}>
                        {cfg.label}
                      </h2>
                      <cfg.Icon size={18} strokeWidth={1.8} style={{ color: cfg.color, opacity: 0.7 }} />
                    </div>

                    {/* Tip cards */}
                    {tips.length > 0 ? (
                      tips.map((tip, i) => <TipCard key={tip.id || i} tip={tip} category={catKey} />)
                    ) : (
                      /* Skeleton placeholders while loading */
                      [0, 1].map(i => (
                        <div key={i} style={{ background: C.low, borderRadius: '12px', padding: '20px 22px', marginBottom: '8px', height: '100px', opacity: 0.3 }} />
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Footer dots ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '3rem 0 1rem' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[C.primary, C.primary, C.green, C.highest, C.highest, C.primary, C.green, C.primary, C.highest].map((col, i) => (
              <div key={i} style={{ width: '8px', height: '8px', borderRadius: '2px', background: col }} />
            ))}
          </div>
          <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.faint }}>
            Growth Is Nonlinear
          </p>
        </div>
      </div>
    </div>
  );
}
