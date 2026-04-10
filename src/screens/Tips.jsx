import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lightbulb, ChevronRight } from 'lucide-react';
import { getData } from '../utils/storage';
import { selectTip } from '../utils/tipSelector';
import { trackPageView } from '../utils/analytics';

const CATEGORIES = ['technique', 'recovery', 'mindset', 'progress'];
const CATEGORY_CONFIG = {
  technique: { label: 'Technique', desc: 'Form, movement, and execution', color: '#60A5FA', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
  recovery: { label: 'Recovery', desc: 'Sleep, rest, and adaptation', color: '#4ADE80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' },
  mindset: { label: 'Mindset', desc: 'Motivation and mental edge', color: '#E8C162', bg: 'rgba(232,193,98,0.08)', border: 'rgba(232,193,98,0.2)' },
  progress: { label: 'Progress', desc: 'Gains, tracking, and plateaus', color: '#C084FC', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)' },
};

const W = { maxWidth: '860px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 40px)' };

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
    <div style={{ minHeight: '100dvh', background: '#080808', color: '#fff', paddingBottom: '7rem' }}>

      {/* Header */}
      <div style={{ ...W, paddingTop: '3rem', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <button onClick={() => navigate(-1)} style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} strokeWidth={1.8} />
          </button>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>
            Tips & Insights
          </p>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '-0.01em', paddingLeft: '32px' }}>
          {selectedCategory ? CATEGORY_CONFIG[selectedCategory]?.label : 'Learn'}
        </h1>
      </div>

      <div style={{ ...W, display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Today's featured tip */}
        {todayTip && !selectedCategory && (
          <div style={{
            padding: '24px',
            borderRadius: '20px',
            background: 'rgba(232,193,98,0.06)',
            border: '1px solid rgba(232,193,98,0.18)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(232,193,98,0.12)', border: '1px solid rgba(232,193,98,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lightbulb size={15} style={{ color: '#E8C162' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#E8C162', marginBottom: '8px' }}>
                  Today's Tip
                </p>
                <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>
                  {todayTip.text || todayTip.tip}
                </p>
                <p style={{ fontSize: '0.65rem', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(232,193,98,0.5)', fontWeight: 600 }}>
                  {todayTip.category}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Category grid — shown when no category selected */}
        {!selectedCategory && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {CATEGORIES.map(cat => {
              const cfg = CATEGORY_CONFIG[cat];
              const tips = tipsByCategory[cat];
              return (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setShowMore(false); }}
                  style={{
                    padding: '20px',
                    borderRadius: '16px',
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.3)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                    <ChevronRight size={14} style={{ color: cfg.color, opacity: 0.6 }} />
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: '12px' }}>{cfg.desc}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: cfg.color, opacity: 0.7 }}>
                    {tips.length} tips
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Selected category tips */}
        {selectedCategory && (
          <>
            {/* Back button */}
            <button
              onClick={() => setSelectedCategory(null)}
              style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: '0' }}
            >
              <ArrowLeft size={14} />
              All categories
            </button>

            {/* Tips list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {displayedTips.map((tip, i) => {
                const cfg = CATEGORY_CONFIG[selectedCategory];
                return (
                  <div key={tip.id || i} style={{
                    padding: '20px 22px',
                    borderRadius: '16px',
                    background: 'linear-gradient(145deg, #1a1a1a, #111)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
                  }}>
                    <p style={{ fontSize: '0.95rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.82)' }}>
                      {tip.text || tip.tip}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.color, opacity: 0.7 }} />
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: cfg.color, opacity: 0.6 }}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show more */}
            {!showMore && tipsByCategory[selectedCategory].length > 5 && (
              <button
                onClick={() => setShowMore(true)}
                style={{ padding: '13px', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
              >
                Show {tipsByCategory[selectedCategory].length - 5} more tips
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
