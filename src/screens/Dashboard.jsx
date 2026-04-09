import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SessionCard from '../components/SessionCard';
import StreakCounter from '../components/StreakCounter';
import WeeklyGrid from '../components/WeeklyGrid';
import XPBar from '../components/XPBar';
import TipCard from '../components/TipCard';
import BadgeCard from '../components/BadgeCard';
import ReturnBanner from '../components/ReturnBanner';
import LevelUpModal from '../components/LevelUpModal';
import BadgeModal from '../components/BadgeModal';
import ConfettiEffect from '../components/ConfettiEffect';
import { getData, updateData } from '../utils/storage';
import { getTodaySession, isRestDay } from '../utils/planGenerator';
import { detectReturnState, getReturnMessage, getTimeMessage, getReducedSession, getCelebrationMessage } from '../utils/returnState';
import { updateStreak, getConsecutiveMisses, getStreakMilestone } from '../utils/streakTracker';
import { calculateSessionXP, checkLevelUp } from '../utils/xpCalculator';
import { checkBadges } from '../utils/badgeChecker';
import { selectTip, markTipSeen } from '../utils/tipSelector';
import { getToday, formatDate } from '../utils/dateUtils';
import { trackPageView, trackSessionCompleted, trackReturnState, trackBadgeEarned, trackLevelUp } from '../utils/analytics';
import messagesData from '../data/messages.json';

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

  // Always show something — fallback to next upcoming session
  const nextInfo = !displaySession && activePlan ? getNextSession(activePlan) : null;
  const sessionForCard = displaySession || nextInfo?.session;
  const isNextSession = !displaySession && !!nextInfo;
  const nextLabel = nextInfo ? `Up Next — ${formatDate(nextInfo.session.date)}` : null;

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
    setData(updated); setRecentXP(xpResult.total);
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
  const W = { maxWidth: '860px', margin: '0 auto', padding: '0 5vw' };

  return (
    <div className="min-h-dvh pb-32" style={{
      background: 'radial-gradient(ellipse 70% 35% at 15% 0%, rgba(232,193,98,0.06) 0%, transparent 100%), #080808',
      color: 'var(--color-text-1)',
    }}>
      <ConfettiEffect trigger={showConfetti} />
      {levelUpInfo && <LevelUpModal level={levelUpInfo} onClose={() => setLevelUpInfo(null)} />}
      {newBadge && <BadgeModal badge={newBadge} onClose={() => setNewBadge(null)} />}
      {showBanner && returnMessage && <ReturnBanner message={returnMessage} state={returnStateNum} timeMessage={timeMessage} onDismiss={() => setShowBanner(false)} />}

      {/* Header */}
      <div style={{ ...W, paddingTop: '52px', paddingBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.68rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>
              {getTimeGreeting()}
            </p>
            <h1 className="font-display" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', lineHeight: 1.05, marginBottom: '6px', letterSpacing: '-0.01em' }}>
              {activePlan?.plan_label || 'Dashboard'}
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
              Week {todayInfo?.weekNumber || 1} of 4{activePlan?.frequency ? ` · ${activePlan.frequency} days/week` : ''}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, paddingTop: '4px' }}>
            <p className="font-mono" style={{ fontSize: '2.6rem', fontWeight: 700, lineHeight: 1, color: '#E8C162', textShadow: '0 0 32px rgba(232,193,98,0.35)' }}>
              {data.streaks.current}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '4px', letterSpacing: '0.06em' }}>day streak</p>
          </div>
        </div>
        {celebrationMsg && (
          <div style={{ marginTop: '16px', padding: '10px 18px', borderRadius: '10px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', color: '#4ADE80', fontSize: '0.85rem', textAlign: 'center' }}>
            {celebrationMsg}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ ...W, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <SessionCard
          session={sessionForCard}
          isNextSession={isNextSession}
          nextLabel={nextLabel}
          onComplete={handleComplete}
          isCompleted={isCompleted}
          isRestDay={rest && !todaySession && !nextInfo}
          equipment={activePlan?.equipment}
        />

        {!todaySession && !rest && !isCompleted && (
          <button
            onClick={handleBonusSession}
            style={{ width: '100%', padding: '13px', fontSize: '0.85rem', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.3)', background: 'transparent', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.03em' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
          >
            + Bonus session · +50 XP
          </button>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          <StreakCounter current={data.streaks.current} best={data.streaks.best} consecutiveMisses={missedCount} />
          <WeeklyGrid plan={activePlan} checkIns={data.check_ins} />
        </div>

        <XPBar totalXP={data.user.total_xp} recentXP={recentXP} />
        <TipCard tip={tip} onSeeMore={() => navigate('/tips')} />

        {recentBadges.length > 0 && (
          <div style={{ borderRadius: '16px', padding: '22px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 2px 24px rgba(0,0,0,0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>Recent Badges</p>
              <button onClick={() => navigate('/profile')} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {recentBadges.map(badge => <div key={badge.id} style={{ flex: 1 }}><BadgeCard badge={badge} /></div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
