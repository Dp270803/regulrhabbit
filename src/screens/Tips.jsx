import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getData } from '../utils/storage';
import { selectTip } from '../utils/tipSelector';
import { trackPageView } from '../utils/analytics';

const C = {
  bg: '#131313', low: '#1c1b1b', container: '#201f1f',
  high: '#2a2a2a', highest: '#353534', lowest: '#0e0e0e',
  primary: '#e9c349', onPrimary: '#3c2f00', green: '#2ff801',
  text: '#e5e2e1', muted: '#c4c7c7', faint: '#7b7c7c',
};

const CATEGORIES = ['technique', 'recovery', 'mindset', 'progress'];
const CATEGORY_CONFIG = {
  technique: {
    label: 'Technique',
    desc: 'Form, movement, and execution',
    color: C.primary,
    bg: `rgba(233,195,73,0.06)`,
    icon: '◎',
  },
  recovery: {
    label: 'Recovery',
    desc: 'Sleep, rest, and adaptation',
    color: C.green,
    bg: `rgba(47,248,1,0.06)`,
    icon: '◑',
  },
  mindset: {
    label: 'Mindset',
    desc: 'Motivation and mental edge',
    color: C.muted,
    bg: `rgba(196,199,199,0.06)`,
    icon: '◐',
  },
  progress: {
    label: 'Progress',
    desc: 'Gains, tracking, and plateaus',
    color: C.primary,
    bg: `rgba(233,195,73,0.06)`,
    icon: '●',
  },
};

const W = { maxWidth: '860px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 48px)' };

export default function Tips() {
  const navigate = useNavigate();
  const [todayTip, setTodayTip] = useState(null);
  const [allTips, setAllTips] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    trackPageView('tips');
    const d = getData();
    const loadTips = async () => {
      const tip = await selectTip(d);
      setTodayTip(tip);
      const activePlan = d.plans.find(p => p.status === 'active');
      if (activePlan) {
        const loaders = {
          gym: () => import('../data/tips/gym-tips.json'),
          swimming: () => import('../data/tips/swimming-tips.json'),
          running: () => import('../data/tips/running-tips.json'),
          yoga: () => import('../data/tips/yoga-tips.json'),
          dance: () => import('../data/tips/dance-tips.json'),
          singing: () => import('../data/tips/singing-tips.json'),
          instrument: () => import('../data/tips/instrument-tips.json'),
        };
        try {
          const loader = loaders[activePlan.activity];
          if (loader) { const mod = await loader(); setAllTips((mod.default || mod).tips || []); }
        } catch { /* ok */ }
      }
    };
    loadTips();
  }, []);

  const tipsByCategory = {};
  for (const cat of CATEGORIES) {
    tipsByCategory[cat] = allTips.filter(t => t.category === cat);
  }

  const displayedTips = selectedCategory
    ? (showMore ? tipsByCategory[selectedCategory] : tipsByCategory[selectedCategory].slice(0, 5))
    : [];

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, paddingBottom: '7rem' }}>

      {/* ── Header ── */}
      <div style={{ ...W, paddingTop: '3rem', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          {selectedCategory && (
            <button onClick={() => setSelectedCategory(null)} style={{ color: C.faint, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={20} strokeWidth={1.8} />
            </button>
          )}
          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint }}>
            {selectedCategory ? CATEGORY_CONFIG[selectedCategory]?.label : 'Tips & Insights'}
          </p>
        </div>
        <h1 className="font-headline" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, paddingLeft: selectedCategory ? '32px' : '0' }}>
          {selectedCategory ? CATEGORY_CONFIG[selectedCategory]?.label : 'Learn'}
        </h1>
      </div>

      <div style={{ ...W, display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── Featured tip (masterclass card) ── */}
        {todayTip && !selectedCategory && (
          <div style={{
            position: 'relative',
            borderRadius: '16px',
            overflow: 'hidden',
            minHeight: '280px',
            display: 'flex',
            alignItems: 'flex-end',
            background: `linear-gradient(135deg, ${C.low} 0%, ${C.lowest} 100%)`,
          }}>
            {/* Decorative glow blob */}
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: `rgba(233,195,73,0.08)`, borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-40px', left: '-20px', width: '160px', height: '160px', background: `rgba(47,248,1,0.05)`, borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1, padding: '36px 32px' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.primary, marginBottom: '12px' }}>
                Featured Tip of the Day
              </p>
              <h2 className="font-headline" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '16px', maxWidth: '560px' }}>
                {todayTip.title || 'Today\'s Insight'}
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, color: C.muted, maxWidth: '520px', marginBottom: '20px' }}>
                {todayTip.text || todayTip.tip}
              </p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.primary, opacity: 0.7 }}>
                {todayTip.category}
              </span>
            </div>
          </div>
        )}

        {/* ── Category grid ── */}
        {!selectedCategory && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {CATEGORIES.map(cat => {
              const cfg = CATEGORY_CONFIG[cat];
              const tips = tipsByCategory[cat];
              return (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setShowMore(false); }}
                  style={{
                    padding: '24px 20px',
                    borderRadius: '12px',
                    background: C.low,
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.container}
                  onMouseLeave={e => e.currentTarget.style.background = C.low}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span className="font-headline" style={{ fontSize: '1.1rem', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                    <ChevronRight size={16} style={{ color: cfg.color, opacity: 0.5 }} />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: C.faint, lineHeight: 1.5, marginBottom: '14px' }}>{cfg.desc}</p>
                  <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: cfg.color, opacity: 0.6 }}>
                    {tips.length} tips
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Selected category tips ── */}
        {selectedCategory && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {displayedTips.map((tip, i) => {
                const cfg = CATEGORY_CONFIG[selectedCategory];
                return (
                  <div key={tip.id || i} style={{
                    padding: '24px',
                    borderRadius: '12px',
                    background: C.low,
                  }}>
                    <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: cfg.color, marginBottom: '10px', opacity: 0.8 }}>
                      {cfg.label}
                    </p>
                    <p style={{ fontSize: '1rem', lineHeight: 1.75, color: C.muted }}>
                      {tip.text || tip.tip}
                    </p>
                  </div>
                );
              })}
            </div>

            {!showMore && tipsByCategory[selectedCategory].length > 5 && (
              <button
                onClick={() => setShowMore(true)}
                style={{ padding: '13px', borderRadius: '12px', border: `1px dashed rgba(255,255,255,0.12)`, background: 'transparent', color: C.faint, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'; e.currentTarget.style.color = C.text; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = C.faint; }}
              >
                Show {tipsByCategory[selectedCategory].length - 5} more tips
              </button>
            )}
          </>
        )}

        {/* ── Dot decoration ── */}
        {!selectedCategory && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px 0 8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '6px' }}>
              {[C.primary, C.primary, C.green, C.highest, C.highest, C.primary, C.primary, C.green, C.primary, C.highest].map((col, i) => (
                <div key={i} style={{ width: '8px', height: '8px', borderRadius: '2px', background: col }} />
              ))}
            </div>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.faint }}>Growth Is Nonlinear</p>
          </div>
        )}
      </div>
    </div>
  );
}
