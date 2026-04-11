import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SessionCard from '../components/SessionCard';
import WeeklyGrid from '../components/WeeklyGrid';
import TipCard from '../components/TipCard';
import BadgeCard from '../components/BadgeCard';
import ReturnBanner from '../components/ReturnBanner';
import LevelUpModal from '../components/LevelUpModal';
import BadgeModal from '../components/BadgeModal';
import ConfettiEffect from '../components/ConfettiEffect';
import { getData, updateData } from '../utils/storage';
import { fetchHeroImage, sanityImageUrl } from '../utils/sanityClient';
import { getTodaySession, isRestDay } from '../utils/planGenerator';
import { detectReturnState, getReturnMessage, getTimeMessage, getReducedSession, getCelebrationMessage } from '../utils/returnState';
import { updateStreak, getConsecutiveMisses, getStreakMilestone } from '../utils/streakTracker';
import { calculateSessionXP, checkLevelUp, getLevelFromXP, getXPToNextLevel } from '../utils/xpCalculator';
import { checkBadges } from '../utils/badgeChecker';
import { selectTip, markTipSeen } from '../utils/tipSelector';
import { getToday, formatDate, getWeekDates } from '../utils/dateUtils';
import { trackPageView, trackSessionCompleted, trackReturnState, trackBadgeEarned, trackLevelUp } from '../utils/analytics';
import messagesData from '../data/messages.json';
import levelsData from '../data/levels.json';

const ALL_LEVELS = levelsData.levels;
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const C = {
  bg: '#131313', low: '#1c1b1b', container: '#201f1f',
  high: '#2a2a2a', highest: '#353534', lowest: '#0e0e0e',
  primary: '#e9c349', onPrimary: '#3c2f00', green: '#2ff801',
  text: '#e5e2e1', muted: '#c4c7c7', faint: '#7b7c7c',
};

function getMotivationalNote(streak, sessionsLeft, isCompleted) {
  if (isCompleted) return 'Session done. Recovery starts now.';
  if (streak >= 14) return `${streak}-day streak — elite consistency.`;
  if (streak >= 7) return `${streak} days straight — momentum is everything.`;
  if (streak >= 3) return `${streak} days in a row — the habit is forming.`;
  if (sessionsLeft === 1) return 'One session left this week — finish strong.';
  if (sessionsLeft > 1) return `${sessionsLeft} sessions remaining this week.`;
  return 'New day, new opportunity to build.';
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getNextSession(plan) {
  if (!plan) return null;
  const today = getToday();
  for (const week of plan.weeks) {
    for (const session of [...week.sessions].sort((a, b) => a.date?.localeCompare(b.date))) {
      if (session.date > today && session.status !== 'completed') {
        return { session, weekNumber: week.week_number };
      }
    }
  }
  return null;
}

// Consistency dot grid — last 20 days mapped to green/gold/grey
function ConsistencyDots({ checkIns, scheduledDays, plan }) {
  const today = getToday();
  const days = [];
  for (let i = 19; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayKey = DAY_KEYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
    const isScheduled = scheduledDays?.includes(dayKey);
    const done = checkIns?.some(c => c.date === dateStr && c.completed);
    const isPast = dateStr < today;
    const isToday = dateStr === today;
    days.push({ dateStr, isScheduled, done, isPast, isToday });
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px' }}>
      {days.map(({ dateStr, isScheduled, done, isPast, isToday }) => {
        let bg;
        if (done) bg = C.green;
        else if (isToday) bg = C.primary;
        else if (isPast && isScheduled) bg = 'rgba(255,180,171,0.4)'; // missed — muted red
        else bg = C.highest;
        return (
          <div key={dateStr} style={{
            width: '8px', height: '8px', borderRadius: '2px',
            background: bg,
          }} />
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [tip, setTip] = useState(null);
  const [returnMessage, setReturnMessage] = useState(null);
  const [timeMessage, setTimeMessage] = useState(null);
  const [returnStateNum, setReturnStateNum] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState(null);
  const [newBadge, setNewBadge] = useState(null);
  const [recentXP, setRecentXP] = useState(0);
  const [celebrationMsg, setCelebrationMsg] = useState(null);
  const [showBanner, setShowBanner] = useState(true);
  const [xpFlash, setXpFlash] = useState(false);
  const [heroImg, setHeroImg] = useState(null);

  const loadDashboard = useCallback(async () => {
    const d = getData();
    if (!d.onboarding_complete) { navigate('/'); return; }
    setData(d);
    const { state, missedCount } = detectReturnState(d);
    setReturnStateNum(state);
    const activePlan = d.plans.find(p => p.status === 'active');
    const todayInfo = activePlan ? getTodaySession(activePlan) : null;
    if (state >= 2) {
      const duration = todayInfo?.session?.duration_minutes || 30;
      const msg = getReturnMessage(messagesData, state, { duration: `${duration}`, days: missedCount, reducedDuration: `${Math.round(duration * 0.6)}` });
      setReturnMessage(msg);
      setTimeMessage(getTimeMessage(messagesData));
      trackReturnState(state, missedCount, msg);
    }
    const t = await selectTip(d);
    if (t) { setTip(t); updateData(() => markTipSeen(d, t.id)); }
  }, [navigate]);

  useEffect(() => { trackPageView('dashboard'); loadDashboard(); }, [loadDashboard]);
  useEffect(() => { fetchHeroImage().then(setHeroImg).catch(() => {}); }, []);

  if (!data) return null;

  const activePlan = data.plans.find(p => p.status === 'active');
  const todayInfo = activePlan ? getTodaySession(activePlan) : null;
  const todaySession = todayInfo?.session;
  const rest = activePlan ? isRestDay(activePlan) : true;
  const today = getToday();
  const isCompleted = data.check_ins.some(c => c.date === today && c.completed);
  const missedCount = getConsecutiveMisses(data);
  const displaySession = todaySession && returnStateNum >= 4 && !isCompleted
    ? getReducedSession(todaySession, returnStateNum) : todaySession;

  const nextInfo = !displaySession && activePlan ? getNextSession(activePlan) : null;
  const sessionForCard = displaySession || nextInfo?.session;
  const isNextSession = !displaySession && !!nextInfo;
  const nextLabel = nextInfo ? `Up Next — ${formatDate(nextInfo.session.date)}` : null;

  const weekDates = getWeekDates(today);
  const scheduledDays = activePlan?.scheduled_days || [];
  const completedThisWeek = weekDates.filter(date => data.check_ins.some(c => c.date === date && c.completed)).length;
  const scheduledThisWeek = weekDates.filter((_, i) => scheduledDays.includes(DAY_KEYS[i])).length;

  const level = getLevelFromXP(data.user.total_xp);
  const { needed, progress, nextLevel } = getXPToNextLevel(data.user.total_xp);
  const xpPct = Math.min((progress || 0) * 100, 100);

  function handleComplete() {
    const d = getData();
    const oldXP = d.user.total_xp;
    const isComeback = missedCount > 0;
    const newStreaks = updateStreak(d);
    const xpResult = calculateSessionXP(newStreaks.current, false, isComeback);
    const checkIn = { date: today, plan_id: activePlan?.id, session_id: todaySession?.id, completed: true, completed_at: new Date().toISOString(), xp_earned: xpResult.total, bonus_xp: xpResult.comebackBonus };
    const updated = updateData(data => {
      data.streaks = newStreaks; data.user.total_xp += xpResult.total; data.check_ins.push(checkIn);
      if (activePlan) {
        const plan = data.plans.find(p => p.id === activePlan.id);
        if (plan) { for (const week of plan.weeks) for (const s of week.sessions) if (s.id === todaySession?.id || s.date === today) { s.status = 'completed'; s.completed_at = new Date().toISOString(); } }
      }
      const badges = checkBadges(data);
      for (const b of badges) { const ex = data.badges.findIndex(x => x.id === b.id); if (ex >= 0) data.badges[ex] = b; else data.badges.push(b); }
      const li = checkLevelUp(oldXP, data.user.total_xp);
      if (li) data.user.level = li.level;
      return data;
    });
    setData(updated); setRecentXP(xpResult.total); setXpFlash(true);
    setTimeout(() => setXpFlash(false), 2200);
    const li = checkLevelUp(oldXP, updated.user.total_xp);
    if (li) { setLevelUpInfo(li); trackLevelUp(li.level, updated.user.total_xp); }
    const badges = checkBadges(updated);
    if (badges.length > 0) { setNewBadge(badges[0]); trackBadgeEarned(badges[0].id, badges[0].name); }
    if (getStreakMilestone(updated.streaks.current) >= 7) setShowConfetti(true);
    const celMsg = getCelebrationMessage(messagesData, { totalSessions: updated.check_ins.filter(c => c.completed).length, streak: updated.streaks.current });
    setCelebrationMsg(celMsg);
    trackSessionCompleted({ planId: activePlan?.id, activity: activePlan?.activity, sessionId: todaySession?.id, weekNumber: todayInfo?.weekNumber, xpEarned: xpResult.total, streakCount: updated.streaks.current });
    setTimeout(() => { setCelebrationMsg(null); setRecentXP(0); }, 4000);
  }

  function handleBonusSession() {
    const d = getData(); const newStreaks = updateStreak(d); const xpResult = calculateSessionXP(newStreaks.current, true, false);
    updateData(data => { data.streaks = newStreaks; data.user.total_xp += xpResult.total; data.check_ins.push({ date: today, plan_id: activePlan?.id, session_id: 'bonus', completed: true, completed_at: new Date().toISOString(), xp_earned: xpResult.total, bonus_xp: 0, is_bonus: true }); return data; });
    setRecentXP(xpResult.total); setData(getData()); setTimeout(() => setRecentXP(0), 4000);
  }

  const recentBadges = data.badges.filter(b => b.earned).slice(-3).reverse();
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const recentCompletedToday = data.check_ins.some(c => c.date === today && c.completed && c.completed_at && c.completed_at > sixHoursAgo);

  const W = { maxWidth: '860px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 48px)' };

  return (
    <div className="min-h-dvh pb-32" style={{ background: C.bg, color: C.text }}>
      <ConfettiEffect trigger={showConfetti} />
      {levelUpInfo && <LevelUpModal level={levelUpInfo} onClose={() => setLevelUpInfo(null)} />}
      {newBadge && <BadgeModal badge={newBadge} onClose={() => setNewBadge(null)} />}
      {showBanner && returnMessage && <ReturnBanner message={returnMessage} state={returnStateNum} timeMessage={timeMessage} onDismiss={() => setShowBanner(false)} />}

      {/* ── Level Hero Section ── */}
      <div style={{ ...W, paddingTop: '48px', paddingBottom: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'end' }}>
          {/* Left: Level heading */}
          <div>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>
              Current Standing
            </p>
            <h1 className="font-headline" style={{ fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '20px' }}>
              <span style={{ display: 'block', fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)', color: C.text, marginBottom: '2px' }}>
                Level {level.level}:
              </span>
              <span style={{ display: 'block', fontSize: 'clamp(3rem, 6vw, 5.5rem)', color: C.primary, lineHeight: 0.92 }}>
                {level.title}
              </span>
            </h1>
            {/* XP bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ flex: 1, height: '3px', background: C.highest, overflow: 'hidden', borderRadius: '2px' }}>
                <div style={{
                  height: '100%', background: C.primary, borderRadius: '2px',
                  width: `${xpPct}%`, transition: 'width 0.7s ease',
                  boxShadow: `0 0 8px rgba(233,195,73,0.4)`,
                }} />
              </div>
              <span className="font-headline" style={{ fontWeight: 700, color: C.primary, whiteSpace: 'nowrap', position: 'relative' }}>
                {data.user.total_xp.toLocaleString()} / {nextLevel ? nextLevel.xp_required.toLocaleString() : '—'} XP
                {xpFlash && recentXP > 0 && (
                  <span className="animate-fade-in-up" style={{ position: 'absolute', top: '-22px', right: 0, fontSize: '0.85rem', color: C.primary }}>
                    +{recentXP}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Right: Consistency track */}
          <div style={{ background: C.lowest, padding: '20px 20px 16px', borderRadius: '12px', minWidth: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint }}>Consistency Track</span>
              {data.streaks.current > 0 && (
                <span className="font-headline" style={{ fontWeight: 700, color: C.primary, fontSize: '0.85rem' }}>
                  {data.streaks.current} Day Streak
                </span>
              )}
            </div>
            <ConsistencyDots checkIns={data.check_ins} scheduledDays={scheduledDays} plan={activePlan} />
          </div>
        </div>

        {celebrationMsg && (
          <div style={{ marginTop: '16px', padding: '10px 18px', borderRadius: '10px', background: `rgba(47,248,1,0.06)`, border: `1px solid rgba(47,248,1,0.18)`, color: C.green, fontSize: '0.85rem', textAlign: 'center' }}>
            {celebrationMsg}
          </div>
        )}
      </div>

      {/* ── Hero image (full bleed, Sanity-powered) ── */}
      {(heroImg || true) && (
        <div style={{
          width: '100%', height: '220px', marginBottom: '-40px',
          background: heroImg
            ? `url(${sanityImageUrl(heroImg.image, { width: 1400 })}) center/cover no-repeat`
            : `linear-gradient(135deg, #1a1510 0%, #0e0c09 40%, #0e0e0e 100%)`,
          position: 'relative',
        }}>
          {/* Bottom fade into page background */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(19,19,19,0) 20%, #131313 100%)' }} />
          {/* Subtle vignette */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(233,195,73,0.04) 0%, transparent 70%)' }} />
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ ...W, display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* ── Session card ── */}
        <SessionCard
          session={sessionForCard}
          isNextSession={isNextSession}
          nextLabel={nextLabel}
          onComplete={handleComplete}
          isCompleted={isCompleted}
          isCooldown={recentCompletedToday}
          isRestDay={rest && !todaySession && !nextInfo}
          equipment={activePlan?.equipment}
        />

        {/* ── Weekly calendar ── */}
        <WeeklyGrid plan={activePlan} checkIns={data.check_ins} />

        {/* ── Stat tiles (3 across) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[
            {
              label: 'Streak',
              value: data.streaks.current === 0 ? '—' : data.streaks.current,
              unit: data.streaks.current > 0 ? 'days' : undefined,
              sub: data.streaks.current > 0 ? `Best · ${data.streaks.best}d` : 'Start today',
              color: data.streaks.current > 0 ? C.primary : C.faint,
            },
            {
              label: 'This Week',
              value: `${completedThisWeek}/${scheduledThisWeek}`,
              sub: completedThisWeek === scheduledThisWeek && scheduledThisWeek > 0 ? 'All done!' : `${scheduledThisWeek - completedThisWeek} left`,
              color: completedThisWeek === scheduledThisWeek && scheduledThisWeek > 0 ? C.green : C.text,
            },
            {
              label: 'Total XP',
              value: data.user.total_xp.toLocaleString(),
              sub: `${level.title}`,
              color: C.primary,
            },
          ].map(({ label, value, unit, sub, color }) => (
            <div key={label} style={{ background: C.low, borderRadius: '12px', padding: '18px 16px' }}>
              <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, marginBottom: '10px' }}>{label}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <p className="font-headline" style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1, color }}>{value}</p>
                {unit && <span style={{ fontSize: '0.72rem', color: C.faint, fontWeight: 500 }}>{unit}</span>}
              </div>
              {sub && <p style={{ fontSize: '0.65rem', color: C.faint, marginTop: '4px' }}>{sub}</p>}
            </div>
          ))}
        </div>

        {!todaySession && !rest && !isCompleted && !recentCompletedToday && (
          <button
            onClick={handleBonusSession}
            style={{ width: '100%', padding: '13px', fontSize: '0.9rem', borderRadius: '12px', border: `1px dashed rgba(255,255,255,0.12)`, color: 'rgba(255,255,255,0.3)', background: 'transparent', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.03em' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
          >
            + Bonus session · +50 XP
          </button>
        )}

        {/* ── Tip card ── */}
        {tip && <TipCard tip={tip} onSeeMore={() => navigate('/tips')} />}

        {/* ── Recent badges ── */}
        {recentBadges.length > 0 && (
          <div style={{ borderRadius: '12px', padding: '20px', background: C.low }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint }}>Recent Badges</p>
              <button onClick={() => navigate('/profile')} style={{ fontSize: '0.75rem', color: C.faint, background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {recentBadges.map(badge => <div key={badge.id} style={{ flex: 1 }}><BadgeCard badge={badge} /></div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
