import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SessionCard from '../components/SessionCard';
import WeeklyGrid from '../components/WeeklyGrid';
import ReturnBanner from '../components/ReturnBanner';
import LevelUpModal from '../components/LevelUpModal';
import BadgeModal from '../components/BadgeModal';
import ConfettiEffect from '../components/ConfettiEffect';
import { getData, updateData } from '../utils/storage';
import { fetchHeroImage, fetchDashboardPage } from '../utils/sanityClient';
import { getTodaySession, isRestDay } from '../utils/planGenerator';
import { detectReturnState, getReturnMessage, getTimeMessage, getReducedSession, getCelebrationMessage } from '../utils/returnState';
import { updateStreak, getConsecutiveMisses, getStreakMilestone } from '../utils/streakTracker';
import { calculateSessionXP, checkLevelUp, getLevelFromXP, getXPToNextLevel } from '../utils/xpCalculator';
import { checkBadges } from '../utils/badgeChecker';
import { selectTip, markTipSeen } from '../utils/tipSelector';
import { getToday, formatDate } from '../utils/dateUtils';
import { trackPageView, trackSessionCompleted, trackReturnState, trackBadgeEarned, trackLevelUp } from '../utils/analytics';
import messagesData from '../data/messages.json';
import levelsData from '../data/levels.json';
import { useThemeColors } from '../hooks/useTheme';

const ALL_LEVELS = levelsData.levels;
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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
  const C = useThemeColors();
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
  const C = useThemeColors();
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
  const [cms, setCms] = useState(null);

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
  useEffect(() => { fetchDashboardPage().then(doc => { if (doc) setCms(doc); }).catch(() => {}); }, []);

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

  const scheduledDays = activePlan?.scheduled_days || [];

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

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const recentCompletedToday = data.check_ins.some(c => c.date === today && c.completed && c.completed_at && c.completed_at > sixHoursAgo);

  const W = { maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 64px)' };

  return (
    <div className="min-h-dvh pb-32 md:pb-12 md:pt-14" style={{ background: C.bg, color: C.text }}>
      <ConfettiEffect trigger={showConfetti} />
      {levelUpInfo && <LevelUpModal level={levelUpInfo} onClose={() => setLevelUpInfo(null)} />}
      {newBadge && <BadgeModal badge={newBadge} onClose={() => setNewBadge(null)} />}
      {showBanner && returnMessage && <ReturnBanner message={returnMessage} state={returnStateNum} timeMessage={timeMessage} onDismiss={() => setShowBanner(false)} />}

      {/* ── Main content ── */}
      <div style={{ ...W, display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: 'clamp(28px, 4vw, 48px)', paddingBottom: '8px' }}>

        {/* ── Level Hero Section ── */}
        <div className="dashboard-level-grid" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(200px, 28%)', gap: '24px', alignItems: 'end', marginBottom: '8px' }}>
          {/* Left: Level heading */}
          <div>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>
              {cms?.currentStandingLabel || 'Current Standing'}
            </p>
            <h1 className="font-headline" style={{ fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '20px' }}>
              <span style={{ display: 'block', fontSize: 'clamp(1.2rem, 2vw, 1.7rem)', color: C.text, marginBottom: '2px' }}>
                Level {level.level}:
              </span>
              <span style={{ display: 'block', fontSize: 'clamp(2.8rem, 5vw, 4.8rem)', color: C.primary, lineHeight: 0.92 }}>
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
              <span className="font-headline" style={{ fontWeight: 700, color: C.primary, whiteSpace: 'nowrap', position: 'relative', fontSize: '0.9rem' }}>
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
          <div style={{ background: C.lowest, padding: '18px 18px 14px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint }}>{cms?.consistencyTrackLabel || 'Consistency Track'}</span>
              {data.streaks.current > 0 && (
                <span className="font-headline" style={{ fontWeight: 700, color: C.primary, fontSize: '0.8rem' }}>
                  {data.streaks.current} Day Streak
                </span>
              )}
            </div>
            <ConsistencyDots checkIns={data.check_ins} scheduledDays={scheduledDays} plan={activePlan} />
          </div>
        </div>

        {celebrationMsg && (
          <div style={{ padding: '10px 18px', borderRadius: '10px', background: `rgba(47,248,1,0.06)`, border: `1px solid rgba(47,248,1,0.18)`, color: C.green, fontSize: '0.85rem', textAlign: 'center' }}>
            {celebrationMsg}
          </div>
        )}

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
          heroImg={heroImg}
          cms={cms}
        />

        {/* ── Weekly calendar ── */}
        <WeeklyGrid plan={activePlan} checkIns={data.check_ins} label={cms?.trainingRecordLabel} />

      </div>
    </div>
  );
}
