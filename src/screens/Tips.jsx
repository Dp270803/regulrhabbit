import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getData } from '../utils/storage';
import { selectTip } from '../utils/tipSelector';
import { selectBookTip } from '../utils/tipFromBook';
import { trackPageView } from '../utils/analytics';
import { fetchTipsPage, sanityImageUrl } from '../utils/sanityClient';
import { useThemeColors } from '../hooks/useTheme';

// ── Default content (matches HTML design; overridden by CMS) ─────────────────
const DEFAULT_HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD68CMbg3KNXfRMFfnZp0gsXPG21ZD6fzt4WviJGAcrvfPlXq5g9jCY6ppNmVSthfzJh-WaGO_9wuGzaL6xiS4aEZd-2w7ryo4RlE5rD3lpRqBruK3zEByMM0jpeyc3QbaMxgwEmFQw4WML4gkAyoVpw7gc25-RJDaa4NLQMVGF1pP6UU4kL67DoT1Klm2kwxMTPMkuszHaufmVC-NyQcTUUtGk2oBVJXkwrcmI5y-kvxqibuhSS4V9K1QEVB27wOBgNkn0tZSQNGsm';

const DEFAULT_COPY = {
  featuredEyebrow:       'Featured Tip of the Day',
  featuredHeadingPrefix: 'The Science of',
  featuredCtaLabel:      'Read Masterclass',
  heroImageUrl:          DEFAULT_HERO_IMAGE,
  footerQuote:           'Growth Is Nonlinear',
};

const DEFAULT_LABELS = {
  technique: 'Technique',
  recovery:  'Recovery',
  mindset:   'Mindset',
  progress:  'Progress',
};

const DEFAULT_CARDS = {
  technique: [
    { subcategoryLabel: 'Kinematics', title: 'Perfecting the Hinge',    body: 'Mastering the posterior chain engagement for maximum deadlift efficiency.'        },
    { subcategoryLabel: 'Stability',  title: 'Unilateral Load Balance', body: 'Eliminating strength imbalances through focused single-leg movements.'             },
  ],
  recovery: [
    { subcategoryLabel: 'Circadian',  title: 'The 10-3-2-1 Rule',       body: 'Architecting your evening for optimal growth hormone release during deep sleep.'  },
    { subcategoryLabel: 'Hydration',  title: 'Electrolyte Timing',      body: 'Beyond water: How sodium and magnesium influence muscle contraction.'             },
  ],
  mindset: [
    { subcategoryLabel: 'Psychology', title: 'Cognitive Reframing',     body: 'Converting physiological stress into performance-enhancing focus.'                },
    { subcategoryLabel: 'Focus',      title: 'Intrinsic Motivation',    body: 'Building habits that survive the dip in external validation.'                     },
  ],
  progress: [
    { subcategoryLabel: 'Metrics',    title: 'Beyond the Scale',        body: 'Tracking HRV, strength velocity, and metabolic flexibility.'                     },
    { subcategoryLabel: 'Strategy',   title: 'Linear vs Wave',          body: 'When to switch periodization models to avoid the 6-month plateau.'               },
  ],
};

const COLUMN_LAYOUT = [['technique', 'mindset'], ['recovery', 'progress']];

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildCategoryLabels(cmsCategories) {
  const labels = { ...DEFAULT_LABELS };
  if (Array.isArray(cmsCategories)) {
    for (const { key, label } of cmsCategories) {
      if (key && label && key in labels) labels[key] = label;
    }
  }
  return labels;
}

function buildCategoryCards(cmsCategoryCards) {
  if (!Array.isArray(cmsCategoryCards) || cmsCategoryCards.length === 0) return DEFAULT_CARDS;
  const cards = { technique: [], recovery: [], mindset: [], progress: [] };
  for (const card of cmsCategoryCards) {
    const { categoryKey, subcategoryLabel = '', title = '', body = '' } = card;
    if (categoryKey in cards) cards[categoryKey].push({ subcategoryLabel, title, body });
  }
  // Fall back to hardcoded defaults for any category that has no CMS cards
  for (const key of Object.keys(cards)) {
    if (cards[key].length === 0) cards[key] = DEFAULT_CARDS[key];
  }
  return cards;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function TipCard({ card, catStyle }) {
  const C = useThemeColors();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        background: hovered ? catStyle.hoverBg : catStyle.cardBg,
        borderRadius: '12px',
        padding: '24px',
        border: catStyle.border ? `1px solid ${C.border}` : 'none',
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p style={{
        fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: catStyle.color, marginBottom: '8px',
      }}>
        {card.subcategoryLabel}
      </p>
      <h3 style={{
        fontFamily: 'Manrope, sans-serif', fontSize: '1.15rem', fontWeight: 700,
        letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: '8px',
        color: hovered ? catStyle.color : C.text,
        transition: 'color 0.2s',
      }}>
        {card.title}
      </h3>
      <p style={{ fontSize: '0.83rem', color: C.faint, lineHeight: 1.65, margin: 0 }}>
        {card.body}
      </p>
    </div>
  );
}

function CategorySection({ catKey, label, cards, catStyle }) {
  const C = useThemeColors();
  return (
    <section>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: '8px', marginBottom: '24px',
        borderBottom: `1px solid ${C.separator}`,
      }}>
        <h2 style={{
          fontFamily: 'Manrope, sans-serif', fontSize: '1.4rem',
          fontWeight: 700, letterSpacing: '-0.02em', color: C.text, margin: 0,
        }}>
          {label}
        </h2>
        <span
          className="material-symbols-outlined"
          style={{ color: catStyle.color, fontSize: '20px', opacity: 0.75 }}
        >
          {catStyle.icon}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {cards.slice(0, 2).map((card, i) => (
          <TipCard key={i} card={card} catStyle={catStyle} />
        ))}
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Tips() {
  const C = useThemeColors();
  const navigate = useNavigate();

  const CATEGORY_STYLE = {
    technique: { color: C.primary, icon: 'fitness_center', cardBg: C.low,    hoverBg: C.high,   border: false },
    recovery:  { color: C.green,   icon: 'self_care',      cardBg: C.lowest, hoverBg: C.low,    border: true  },
    mindset:   { color: C.primary, icon: 'psychology',     cardBg: C.low,    hoverBg: C.high,   border: false },
    progress:  { color: C.amber,   icon: 'trending_up',    cardBg: C.lowest, hoverBg: C.low,    border: true  },
  };
  const FOOTER_DOTS = [C.primary, C.primary, C.green, C.highest, C.highest, C.primary, C.primary, C.green, C.primary, C.highest];

  const [todayTip, setTodayTip]         = useState(null);
  const [bookTip, setBookTip]           = useState(null);
  const [copy, setCopy]                 = useState(DEFAULT_COPY);
  const [categoryLabels, setLabels]     = useState(DEFAULT_LABELS);
  const [categoryCards, setCards]       = useState(DEFAULT_CARDS);
  const [heroHovered, setHeroHovered]   = useState(false);

  useEffect(() => {
    trackPageView('tips');
    const d = getData();
    if (!d.onboarding_complete) { navigate('/'); return; }

    const loadAll = async () => {
      const [tip, cmsData] = await Promise.all([selectTip(d), fetchTipsPage()]);
      setTodayTip(tip);
      // Book-grounded tip — only useful for gym users where the book applies
      const activePlan = d.plans?.find(p => p.status === 'active');
      if (activePlan?.activity === 'gym') {
        try { setBookTip(selectBookTip(d)); } catch { /* keep null */ }
      }

      if (cmsData) {
        setCopy({
          featuredEyebrow:       cmsData.featuredEyebrow       || DEFAULT_COPY.featuredEyebrow,
          featuredHeadingPrefix: cmsData.featuredHeadingPrefix || DEFAULT_COPY.featuredHeadingPrefix,
          featuredCtaLabel:      cmsData.featuredCtaLabel      || DEFAULT_COPY.featuredCtaLabel,
          heroImageUrl:          sanityImageUrl(cmsData.heroImage, { width: 1400 }) || cmsData.heroImageUrl || DEFAULT_COPY.heroImageUrl,
          footerQuote:           cmsData.footerQuote           || DEFAULT_COPY.footerQuote,
        });
        setLabels(buildCategoryLabels(cmsData.categories));
        setCards(buildCategoryCards(cmsData.categoryCards));
      }
    };
    loadAll();
  }, [navigate]);

  const featuredStyle = todayTip ? CATEGORY_STYLE[todayTip.category] : CATEGORY_STYLE.recovery;
  const featuredLabel = todayTip ? (categoryLabels[todayTip.category] || 'Recovery') : 'Recovery';

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, paddingTop: '56px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px clamp(24px, 5vw, 48px) 8rem' }}>

        {/* ── Book-grounded Coach Insight (gym users only) ───────────────── */}
        {bookTip && (
          <section style={{ marginBottom: '40px' }}>
            <p style={{
              fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: C.faint, marginBottom: '14px',
            }}>
              Coach Insight — From The Muscle Ladder
            </p>
            <div style={{
              background: `rgba(${C.primaryRgb},0.04)`,
              border: `1px solid rgba(${C.primaryRgb},0.18)`,
              borderRadius: '14px', padding: 'clamp(24px, 4vw, 36px)',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: C.primary, background: `rgba(${C.primaryRgb},0.14)`,
                  padding: '3px 9px', borderRadius: '4px',
                }}>
                  {bookTip.chapter || 'The Muscle Ladder'}
                </span>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: C.faint,
                }}>
                  State: {bookTip.training_state || 'fresh'}
                </span>
              </div>
              <h2 style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15,
                color: C.text, margin: 0,
              }}>
                {bookTip.topic.charAt(0).toUpperCase() + bookTip.topic.slice(1)}
              </h2>
              <p style={{
                fontSize: '0.92rem', color: C.muted, lineHeight: 1.65, margin: 0,
              }}>
                {bookTip.content}
              </p>
            </div>
          </section>
        )}

        {/* ── Featured Hero ─────────────────────────────────────────────── */}
        <section style={{ marginBottom: '64px' }}>
          <p style={{
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: C.faint, marginBottom: '16px',
          }}>
            {copy.featuredEyebrow}
          </p>

          <div
            style={{
              position: 'relative', overflow: 'hidden',
              borderRadius: '12px', minHeight: '400px',
              display: 'flex', alignItems: 'flex-end',
              padding: 'clamp(32px, 5vw, 48px)',
              background: C.low,
            }}
            onMouseEnter={() => setHeroHovered(true)}
            onMouseLeave={() => setHeroHovered(false)}
          >
            {/* Background image with zoom-on-hover */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url('${copy.heroImageUrl}')`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              transform: heroHovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.7s ease',
            }} />

            {/* Dark gradient scrim — bottom-heavy so text stays legible */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(to top, ${C.bg} 0%, ${C.bg}70 50%, transparent 100%)`,
            }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px' }}>
              <h1 style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1,
                color: C.text, margin: '0 0 24px',
              }}>
                {copy.featuredHeadingPrefix}{' '}
                <span style={{ color: featuredStyle.color }}>{featuredLabel}</span>
              </h1>

              <p style={{
                fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)', color: C.muted,
                lineHeight: 1.75, margin: '0 0 32px', maxWidth: '500px',
              }}>
                {todayTip
                  ? todayTip.text
                  : 'Learn how 90-second breathing protocols between sets can optimize central nervous system recovery and boost output by 12%.'}
              </p>

              <button
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: C.primary, color: C.onPrimary,
                  padding: '12px 32px', borderRadius: '6px', border: 'none',
                  fontFamily: 'Manrope, sans-serif', fontWeight: 700,
                  fontSize: '0.78rem', letterSpacing: '0.1em',
                  textTransform: 'uppercase', cursor: 'pointer',
                  boxShadow: `0 8px 32px rgba(${C.primaryRgb},0.25)`,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 40px rgba(${C.primaryRgb},0.4)`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 8px 32px rgba(${C.primaryRgb},0.25)`; }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {copy.featuredCtaLabel}
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── Category Grid ──────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
          gap: '48px',
        }}>
          {COLUMN_LAYOUT.map((colKeys, ci) => (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
              {colKeys.map(catKey => (
                <CategorySection
                  key={catKey}
                  catKey={catKey}
                  label={categoryLabels[catKey]}
                  cards={categoryCards[catKey]}
                  catStyle={CATEGORY_STYLE[catKey]}
                />
              ))}
            </div>
          ))}
        </div>

        {/* ── Footer dot grid ─────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '12px', padding: '6rem 0 2rem',
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {FOOTER_DOTS.map((color, i) => (
              <div key={i} style={{ width: '8px', height: '8px', borderRadius: '3px', background: color }} />
            ))}
          </div>
          <p style={{
            fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: C.faint, margin: 0,
          }}>
            {copy.footerQuote}
          </p>
        </div>

      </div>
    </div>
  );
}
