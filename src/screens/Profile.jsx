import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, Pencil, Check } from 'lucide-react';
import BadgeModal from '../components/BadgeModal';
import AuthModal from '../components/AuthModal';
import { getData, exportData, importData, resetData, updateData } from '../utils/storage';
import { getAllBadges } from '../utils/badgeChecker';
import { getLevelFromXP } from '../utils/xpCalculator';
import { trackPageView } from '../utils/analytics';
import { useTheme, useThemeColors } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { fetchProfilePage } from '../utils/sanityClient';
import { getToday } from '../utils/dateUtils';

const ACTIVITY_LABELS = {
  gym: 'Gym Regular', swimming: 'Swimmer', running: 'Runner',
  yoga: 'Yogi', dance: 'Dancer', singing: 'Vocalist', instrument: 'Musician',
};

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// ── Consistency dot grid (8 weeks × 7 days) ─────────────────────────────────
function ConsistencyMatrix({ checkIns, scheduledDays }) {
  const C = useThemeColors();
  const today = getToday();
  const WEEKS = 8;
  const days = [];
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayKey = DAY_KEYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
    const isScheduled = scheduledDays?.includes(dayKey);
    const done = checkIns?.some(c => c.date === dateStr && c.completed);
    const isPast = dateStr < today;
    const isToday = dateStr === today;

    let bg;
    if (done)                            bg = C.green;
    else if (isToday)                    bg = C.primary;
    else if (isPast && isScheduled)      bg = 'rgba(255,180,171,0.35)';
    else if (!isPast && isScheduled)     bg = `rgba(${C.primaryRgb},0.3)`;
    else                                 bg = C.highest;

    days.push({ dateStr, bg });
  }

  // reshape: 7 rows × 8 cols (days of week × weeks)
  const cols = [];
  for (let w = 0; w < WEEKS; w++) {
    cols.push(days.slice(w * 7, (w + 1) * 7));
  }

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {cols.map((col, wi) => (
        <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {col.map(({ dateStr, bg }) => (
            <div key={dateStr} style={{ width: '14px', height: '14px', borderRadius: '3px', background: bg }} title={dateStr} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Badge tile matching the reference ────────────────────────────────────────
function BadgeTile({ badge, onClick }) {
  const C = useThemeColors();
  const isEarned = badge.earned;
  const isGreen = badge.id?.includes('streak') || badge.id?.includes('comeback');

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        cursor: onClick ? 'pointer' : 'default',
        opacity: isEarned ? 1 : 0.38,
        filter: isEarned ? 'none' : 'grayscale(1)',
      }}
    >
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: '72px', height: '72px', borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px',
            background: isEarned
              ? isGreen ? 'rgba(47,248,1,0.12)' : `rgba(${C.primaryRgb},0.1)`
              : C.separator,
            border: isEarned
              ? isGreen ? '1px solid rgba(47,248,1,0.28)' : `1px solid rgba(${C.primaryRgb},0.22)`
              : `1px solid ${C.border}`,
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => { if (onClick) e.currentTarget.style.transform = 'scale(1.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {isEarned
            ? badge.icon || '🏆'
            : <span className="material-symbols-outlined" style={{ fontSize: '22px', color: C.faint }}>lock</span>
          }
        </div>
        {isEarned && (
          <div style={{
            position: 'absolute', bottom: '-5px', right: '-5px',
            background: C.primary, color: C.onPrimary,
            fontSize: '0.48rem', fontWeight: 800, letterSpacing: '0.05em',
            padding: '2px 5px', borderRadius: '4px', lineHeight: 1.4,
          }}>
            XP+
          </div>
        )}
      </div>
      <span style={{
        fontSize: '0.57rem', fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: isEarned ? C.muted : C.faint,
        textAlign: 'center', lineHeight: 1.4, maxWidth: '72px',
      }}>
        {badge.name}
      </span>
    </div>
  );
}

// ── Body weight history sparkline + table ────────────────────────────────────
function WeightHistory({ entries = [] }) {
  const C = useThemeColors();
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  if (!sorted.length) return null;

  const weights = sorted.map(e => e.weight_kg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const delta = prev ? (latest.weight_kg - prev.weight_kg).toFixed(1) : null;

  const W = 280, H = 60;
  const points = sorted.map((e, i) => {
    const x = (i / Math.max(sorted.length - 1, 1)) * W;
    const y = H - ((e.weight_kg - min) / range) * (H - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Current weight + delta */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
        <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: '2.2rem', fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>
          {latest.weight_kg} kg
        </span>
        {delta !== null && (
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: parseFloat(delta) < 0 ? C.green : C.muted }}>
            {parseFloat(delta) > 0 ? '+' : ''}{delta} kg from last session
          </span>
        )}
      </div>

      {/* Sparkline */}
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        <polyline
          points={points}
          fill="none"
          stroke={C.primary}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {sorted.map((e, i) => {
          const x = (i / Math.max(sorted.length - 1, 1)) * W;
          const y = H - ((e.weight_kg - min) / range) * (H - 8) - 4;
          return (
            <circle key={i} cx={x} cy={y} r={i === sorted.length - 1 ? 4 : 2.5}
              fill={i === sorted.length - 1 ? C.primary : C.bg}
              stroke={C.primary} strokeWidth="1.5"
            >
              <title>{e.date}: {e.weight_kg} kg</title>
            </circle>
          );
        })}
      </svg>

      {/* Min / max labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.65rem', color: C.faint }}>{sorted[0].date}</span>
        <span style={{ fontSize: '0.65rem', color: C.faint }}>{latest.date}</span>
      </div>

      {/* Recent entries table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {sorted.slice(-5).reverse().map(e => (
          <div key={e.date} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: C.container, borderRadius: '8px', border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: '0.82rem', color: C.muted }}>{e.date}</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text, fontFamily: 'Manrope, monospace' }}>{e.weight_kg} kg</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
export default function Profile() {
  const C = useThemeColors();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetText, setResetText] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const { toggle, isDark } = useTheme();
  const [cms, setCms] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const { user: authUser } = useAuth();
  const nameInputRef = useRef(null);

  useEffect(() => {
    trackPageView('profile');
    const d = getData();
    if (!d.onboarding_complete) { navigate('/'); return; }
    setData(d);
    setNameInput(d.user.name || '');
    fetchProfilePage().then(doc => { if (doc) setCms(doc); }).catch(() => {});
  }, [navigate]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  if (!data) return null;

  const activePlan = data.plans.find(p => p.status === 'active');
  const level = getLevelFromXP(data.user.total_xp);
  const totalSessions = data.check_ins.filter(c => c.completed).length;
  const daysSinceStart = data.created_at
    ? Math.floor((Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const allBadges = getAllBadges(data);
  const scheduledDays = activePlan?.scheduled_days || [];
  const ghostTag = cms?.ghostTag || 'Ghost Member';
  const namePrompt = cms?.namePrompt || 'Tap to add your name';

  function saveName() {
    const trimmed = nameInput.trim();
    const updated = updateData(d => { d.user.name = trimmed || null; return d; });
    setData(updated);
    setIsEditingName(false);
  }

  function handleNameKeyDown(e) {
    if (e.key === 'Enter') saveName();
    if (e.key === 'Escape') { setNameInput(data.user.name || ''); setIsEditingName(false); }
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try { await importData(file); setData(getData()); }
      catch (err) { alert('Failed to import: ' + err.message); }
    };
    input.click();
  }

  function handleReset() {
    if (resetText !== 'DELETE') return;
    resetData(); navigate('/');
  }

  const W = { maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 64px)' };

  const statCards = [
    { label: cms?.statSessionsLabel || 'Sessions',    value: totalSessions,                       suffix: 'TOTAL', accent: C.primary },
    { label: cms?.statDaysLabel    || 'Days Active',   value: daysSinceStart,                      suffix: 'DAYS',  accent: '#444748' },
    { label: cms?.statStreakLabel  || 'Best Streak',   value: data.streaks.best,                   suffix: 'DAYS',  accent: C.primary },
    { label: cms?.statXpLabel      || 'Total XP',      value: data.user.total_xp.toLocaleString(), suffix: 'PTS',   accent: C.green  },
  ];

  return (
    <div className="min-h-dvh pb-32 md:pb-12 md:pt-14" style={{ background: C.bg, color: C.text }}>
      {selectedBadge && <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <div style={{ ...W, display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: 'clamp(28px, 4vw, 48px)' }}>

        {/* ── Hero Card ── */}
        <div style={{ background: C.low, borderRadius: '12px', position: 'relative', overflow: 'hidden', padding: 'clamp(24px, 4vw, 48px)', boxShadow: C.cardShadow }}>
          {/* Decorative gradient */}
          {isDark && <div style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '100%', pointerEvents: 'none', background: 'radial-gradient(ellipse at 90% 30%, rgba(20,16,8,0.9) 0%, rgba(20,16,8,0.6) 50%, transparent 80%)', zIndex: 0 }} />}
          <div style={{ position: 'absolute', top: 0, right: 0, width: '38%', height: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', background: `repeating-linear-gradient(45deg, rgba(${C.primaryRgb},0.04) 0px, rgba(${C.primaryRgb},0.04) 1px, transparent 1px, transparent 12px)`, opacity: 0.6 }} />
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Eyebrow */}
            <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.primary, margin: '0 0 14px' }}>
              {cms?.personalVaultEyebrow || 'Personal Vault'}
            </p>

            {/* Name */}
            <div style={{ marginBottom: '28px' }}>
              {isEditingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onBlur={saveName}
                    onKeyDown={handleNameKeyDown}
                    maxLength={32}
                    placeholder={cms?.nameInputPlaceholder || 'Your name'}
                    style={{
                      fontFamily: 'Manrope, sans-serif',
                      fontSize: 'clamp(2rem, 5vw, 4rem)',
                      fontWeight: 800,
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                      color: C.text,
                      background: 'transparent',
                      border: 'none',
                      borderBottom: `2px solid ${C.primary}`,
                      outline: 'none',
                      padding: '4px 0',
                      maxWidth: '500px',
                    }}
                  />
                  <button
                    onMouseDown={e => { e.preventDefault(); saveName(); }}
                    style={{ color: C.primary, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                  >
                    <Check size={22} strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {data.user.name ? (
                    <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: C.text, margin: 0 }}>
                      {data.user.name}
                    </h1>
                  ) : (
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 16px', borderRadius: '6px', border: `1px dashed ${C.border}`, background: C.separator, marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(1.8rem, 4vw, 3.2rem)', fontWeight: 700, color: C.faint }}>
                          {ghostTag}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: C.faint, margin: 0 }}>{namePrompt}</p>
                    </div>
                  )}
                  <button
                    onClick={() => { setNameInput(data.user.name || ''); setIsEditingName(true); }}
                    title={data.user.name ? 'Edit name' : 'Add your name'}
                    style={{ color: C.faint, background: C.separator, border: 'none', cursor: 'pointer', padding: '7px', borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                  >
                    <Pencil size={14} strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>

            {/* Meta row */}
            <div className="profile-hero-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px, 4vw, 56px)', alignItems: 'flex-end' }}>
              <div>
                <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.faint, margin: '0 0 5px' }}>
                  {cms?.activePlanLabel || 'Active Plan'}
                </p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(1rem, 2vw, 1.5rem)', fontWeight: 700, color: C.text, margin: 0 }}>
                  {ACTIVITY_LABELS[activePlan?.activity] || activePlan?.activity || '—'}
                </p>
              </div>
              <div className="profile-hero-divider" style={{ width: '1px', height: '38px', background: C.separator, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.faint, margin: '0 0 5px' }}>
                  {cms?.currentLevelLabel || 'Current Level'}
                </p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(1rem, 2vw, 1.5rem)', fontWeight: 700, color: C.primary, margin: 0 }}>
                  Level {level.level}: {level.title}
                </p>
              </div>
              <div className="profile-hero-divider" style={{ width: '1px', height: '38px', background: C.separator, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.faint, margin: '0 0 5px' }}>
                  {cms?.membershipLabel || 'Membership'}
                </p>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(1rem, 2vw, 1.5rem)', fontWeight: 700, color: C.text, margin: 0 }}>
                  {daysSinceStart} Days Joined
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="profile-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {statCards.map(stat => (
            <div key={stat.label} style={{ background: C.lowest, borderRadius: '8px', padding: 'clamp(16px, 2vw, 24px)', borderLeft: `2px solid ${stat.accent}` }}>
              <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint, margin: '0 0 16px' }}>
                {stat.label}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
                <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: C.text, lineHeight: 1 }}>
                  {stat.value}
                </span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: C.faint, letterSpacing: '0.06em' }}>
                  {stat.suffix}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Weight History ── */}
        {(data.weight_log?.length > 0) && (
          <div style={{ background: C.low, borderRadius: '12px', padding: 'clamp(20px, 3vw, 32px)' }}>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em', color: C.text, margin: '0 0 20px' }}>
              Body Weight
            </h2>
            <WeightHistory entries={data.weight_log} />
          </div>
        )}

        {/* ── Consistency Matrix ── */}
        <div style={{ background: C.low, borderRadius: '12px', padding: 'clamp(20px, 3vw, 32px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em', color: C.text, margin: 0 }}>
              {cms?.consistencyMatrixLabel || 'Consistency Matrix'}
            </h2>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {[
                { bg: C.highest,                  label: 'Rest' },
                { bg: `rgba(${C.primaryRgb},0.3)`,  label: 'Planned' },
                { bg: C.primary,                  label: 'Today' },
                { bg: C.green,                    label: 'Done' },
              ].map(({ bg, label }) => (
                <div key={label} style={{ width: '12px', height: '12px', borderRadius: '3px', background: bg }} title={label} />
              ))}
            </div>
          </div>
          <ConsistencyMatrix checkIns={data.check_ins} scheduledDays={scheduledDays} />
        </div>

        {/* ── Achievements + Settings (two-column) ── */}
        <div className="profile-bottom-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

          {/* Achievements */}
          <div style={{ background: C.low, borderRadius: '12px', padding: 'clamp(20px, 3vw, 32px)' }}>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em', color: C.text, margin: '0 0 24px' }}>
              {cms?.badgesSectionLabel || 'Achievements'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {allBadges.map(badge => (
                <BadgeTile
                  key={badge.id}
                  badge={badge}
                  onClick={badge.earned ? () => setSelectedBadge(badge) : undefined}
                />
              ))}
            </div>
          </div>

          {/* Right: Account + Appearance + Data Vault */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Account — Save your progress (shown when signed out) */}
            {!authUser && (
              <div style={{ background: C.low, borderRadius: '12px', padding: 'clamp(20px, 3vw, 32px)' }}>
                <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em', color: C.text, margin: '0 0 8px' }}>
                  Save your progress
                </h2>
                <p style={{ fontSize: '0.82rem', color: C.muted, lineHeight: 1.6, margin: '0 0 16px' }}>
                  Create an account to sync your streaks, XP, and badges across devices.
                </p>
                <button
                  onClick={() => setShowAuth(true)}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: C.primary, color: C.onPrimary, fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Create account / Sign in
                </button>
              </div>
            )}

            {/* Account — signed in state */}
            {authUser && (
              <div style={{ background: C.low, borderRadius: '12px', padding: 'clamp(20px, 3vw, 32px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em', color: C.text, margin: '0 0 4px' }}>
                      Account
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: C.muted, margin: 0 }}>{authUser.email}</p>
                  </div>
                  <button
                    onClick={() => supabase?.auth.signOut()}
                    style={{ padding: '7px 14px', borderRadius: '8px', background: C.container, color: C.muted, fontWeight: 600, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: '0.78rem' }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}

            {/* Appearance */}
            <div style={{ background: C.low, borderRadius: '12px', padding: 'clamp(20px, 3vw, 32px)' }}>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em', color: C.text, margin: '0 0 20px' }}>
                {cms?.appearanceRowLabel || 'Appearance'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.lowest, borderRadius: '6px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ color: C.primary, fontSize: '20px' }}>
                    {isDark ? 'dark_mode' : 'light_mode'}
                  </span>
                  <div>
                    <p style={{ fontSize: '0.88rem', fontWeight: 700, color: C.text, margin: 0 }}>
                      {isDark ? 'Midnight Obsidian' : 'Daylight'}
                    </p>
                    <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, margin: 0 }}>
                      Active Theme
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggle}
                  style={{ background: C.primary, color: C.onPrimary, fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                >
                  Switch
                </button>
              </div>
            </div>

            {/* Data Vault */}
            <div style={{ background: C.low, borderRadius: '12px', padding: 'clamp(20px, 3vw, 32px)' }}>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em', color: C.text, margin: '0 0 20px' }}>
                {cms?.dataVaultLabel || 'Data Vault'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                {[
                  { label: cms?.exportRowLabel || 'Export JSON', icon: <Download size={20} color={C.faint} />, action: exportData },
                  { label: cms?.importRowLabel || 'Import Data', icon: <Upload size={20} color={C.faint} />, action: handleImport },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '22px 12px', background: C.lowest, border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.container}
                    onMouseLeave={e => e.currentTarget.style.background = C.lowest}
                  >
                    {btn.icon}
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text }}>
                      {btn.label}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowResetConfirm(v => !v)}
                style={{ width: '100%', padding: '14px', background: 'transparent', border: `1px solid rgba(255,180,171,0.2)`, borderRadius: '4px', color: C.red, fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,180,171,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {cms?.resetRowLabel || 'Reset Application State'}
              </button>

              {showResetConfirm && (
                <div style={{ marginTop: '14px', padding: '16px', borderRadius: '6px', background: C.lowest, border: '1px solid rgba(255,180,171,0.18)' }}>
                  <p style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '12px' }}>
                    Type <span style={{ color: C.red }}>DELETE</span> to confirm. This cannot be undone.
                  </p>
                  <input
                    type="text"
                    value={resetText}
                    onChange={e => setResetText(e.target.value)}
                    placeholder="Type DELETE"
                    style={{ width: '100%', padding: '10px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '4px', color: C.text, fontSize: '0.85rem', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => { setShowResetConfirm(false); setResetText(''); }}
                      style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '4px', color: C.muted, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={resetText !== 'DELETE'}
                      style={{ flex: 1, padding: '10px', background: resetText === 'DELETE' ? C.red : 'rgba(255,180,171,0.12)', border: 'none', borderRadius: '4px', color: resetText === 'DELETE' ? '#1a0000' : C.red, fontSize: '0.75rem', fontWeight: 700, cursor: resetText === 'DELETE' ? 'pointer' : 'default', opacity: resetText !== 'DELETE' ? 0.5 : 1, transition: 'opacity 0.15s' }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
