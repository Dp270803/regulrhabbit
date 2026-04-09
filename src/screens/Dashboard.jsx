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
import { getToday } from '../utils/dateUtils';
import { trackPageView, trackSessionCompleted, trackReturnState, trackBadgeEarned, trackLevelUp } from '../utils/analytics';
import messagesData from '../data/messages.json';

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
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
      const msg = getReturnMessage(messagesData, state, {
        duration: `${duration}`,
        days: missedCount,
        reducedDuration: `${Math.round(duration * 0.6)}`,
      });
      setReturnMessage(msg);
      setTimeMessage(getTimeMessage(messagesData));
      trackReturnState(state, missedCount, msg);
    }

    const t = await selectTip(d);
    if (t) {
      setTip(t);
      const updated = markTipSeen(d, t.id);
      updateData(() => updated);
    }
  }, [navigate]);

  useEffect(() => {
    trackPageView('dashboard');
    loadDashboard();
  }, [loadDashboard]);

  if (!data) return null;

  const activePlan = data.plans.find(p => p.status === 'active');
  const todayInfo = activePlan ? getTodaySession(activePlan) : null;
  const todaySession = todayInfo?.session;
  const rest = activePlan ? isRestDay(activePlan) : true;
  const today = getToday();
  const isCompleted = data.check_ins.some(c => c.date === today && c.completed);
  const missedCount = getConsecutiveMisses(data);
  const displaySession = todaySession && returnStateNum >= 4 && !isCompleted
    ? getReducedSession(todaySession, returnStateNum)
    : todaySession;

  function handleComplete() {
    const d = getData();
    const oldXP = d.user.total_xp;
    const isComeback = missedCount > 0;
    const newStreaks = updateStreak(d);
    const xpResult = calculateSessionXP(newStreaks.current, false, isComeback);

    const checkIn = {
      date: today,
      plan_id: activePlan?.id,
      session_id: todaySession?.id,
      completed: true,
      completed_at: new Date().toISOString(),
      xp_earned: xpResult.total,
      bonus_xp: xpResult.comebackBonus,
    };

    const updated = updateData(data => {
      data.streaks = newStreaks;
      data.user.total_xp += xpResult.total;
      data.check_ins.push(checkIn);
      if (activePlan) {
        const plan = data.plans.find(p => p.id === activePlan.id);
        if (plan) {
          for (const week of plan.weeks) {
            for (const session of week.sessions) {
              if (session.id === todaySession?.id || session.date === today) {
                session.status = 'completed';
                session.completed_at = new Date().toISOString();
              }
            }
          }
        }
      }
      const newBadges = checkBadges(data);
      for (const badge of newBadges) {
        const existing = data.badges.findIndex(b => b.id === badge.id);
        if (existing >= 0) data.badges[existing] = badge;
        else data.badges.push(badge);
      }
      const levelInfo = checkLevelUp(oldXP, data.user.total_xp);
      if (levelInfo) data.user.level = levelInfo.level;
      return data;
    });

    setData(updated);
    setRecentXP(xpResult.total);

    const levelInfo = checkLevelUp(oldXP, updated.user.total_xp);
    if (levelInfo) { setLevelUpInfo(levelInfo); trackLevelUp(levelInfo.level, updated.user.total_xp); }

    const newBadges = checkBadges(updated);
    if (newBadges.length > 0) { setNewBadge(newBadges[0]); trackBadgeEarned(newBadges[0].id, newBadges[0].name); }

    if (getStreakMilestone(updated.streaks.current) >= 7) setShowConfetti(true);

    const celMsg = getCelebrationMessage(messagesData, {
      totalSessions: updated.check_ins.filter(c => c.completed).length,
      streak: updated.streaks.current,
    });
    setCelebrationMsg(celMsg);

    trackSessionCompleted({
      planId: activePlan?.id,
      activity: activePlan?.activity,
      sessionId: todaySession?.id,
      weekNumber: todayInfo?.weekNumber,
      xpEarned: xpResult.total,
      streakCount: updated.streaks.current,
    });

    setTimeout(() => { setCelebrationMsg(null); setRecentXP(0); }, 4000);
  }

  function handleBonusSession() {
    const d = getData();
    const newStreaks = updateStreak(d);
    const xpResult = calculateSessionXP(newStreaks.current, true, false);
    updateData(data => {
      data.streaks = newStreaks;
      data.user.total_xp += xpResult.total;
      data.check_ins.push({
        date: today, plan_id: activePlan?.id, session_id: 'bonus',
        completed: true, completed_at: new Date().toISOString(),
        xp_earned: xpResult.total, bonus_xp: 0, is_bonus: true,
      });
      return data;
    });
    setRecentXP(xpResult.total);
    setData(getData());
    setTimeout(() => setRecentXP(0), 4000);
  }

  const recentBadges = data.badges.filter(b => b.earned).slice(-3).reverse();

  const CONTENT = { maxWidth: '900px', margin: '0 auto', padding: '0 5vw' };

  return (
    <div className="min-h-dvh pb-32" style={{ background: 'var(--color-bg)' }}>
      <ConfettiEffect trigger={showConfetti} />
      {levelUpInfo && <LevelUpModal level={levelUpInfo} onClose={() => setLevelUpInfo(null)} />}
      {newBadge && <BadgeModal badge={newBadge} onClose={() => setNewBadge(null)} />}

      {showBanner && returnMessage && (
        <ReturnBanner
          message={returnMessage}
          state={returnStateNum}
          timeMessage={timeMessage}
          onDismiss={() => setShowBanner(false)}
        />
      )}

      {/* ── Header ── */}
      <div style={{ ...CONTENT, paddingTop: '56px', paddingBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '6px' }}>
              {getTimeGreeting()}
            </p>
            <h1 className="font-display" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: 'var(--color-text-1)', lineHeight: 1.1, marginBottom: '4px' }}>
              {activePlan?.plan_label || 'Dashboard'}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-3)' }}>
              Week {todayInfo?.weekNumber || 1} of 4
              {activePlan?.frequency ? ` · ${activePlan.frequency} days/week` : ''}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p className="font-mono" style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1, color: 'var(--color-gold)', textShadow: '0 0 24px rgba(232,193,98,0.3)' }}>
              {data.streaks.current}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '4px' }}>day streak</p>
          </div>
        </div>

        {celebrationMsg && (
          <div style={{ marginTop: '16px', padding: '10px 16px', borderRadius: '12px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: 'var(--color-green)', fontSize: '0.875rem', fontWeight: 500, textAlign: 'center' }}>
            {celebrationMsg}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ ...CONTENT, display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Today's Session */}
        <SessionCard
          session={displaySession}
          onComplete={handleComplete}
          isCompleted={isCompleted}
          isRestDay={rest && !todaySession}
          equipment={activePlan?.equipment}
        />

        {/* Bonus session */}
        {!todaySession && !rest && !isCompleted && (
          <button
            onClick={handleBonusSession}
            style={{
              width: '100%', padding: '14px', fontSize: '0.875rem',
              borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.15)',
              color: 'var(--color-text-3)', background: 'transparent', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'var(--color-text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'var(--color-text-3)'; }}
          >
            + Bonus session · +50 XP
          </button>
        )}

        {/* Stats row — 2 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <StreakCounter
            current={data.streaks.current}
            best={data.streaks.best}
            consecutiveMisses={missedCount}
          />
          <WeeklyGrid plan={activePlan} checkIns={data.check_ins} />
        </div>

        {/* XP */}
        <XPBar totalXP={data.user.total_xp} recentXP={recentXP} />

        {/* Tip */}
        <TipCard tip={tip} onSeeMore={() => navigate('/tips')} />

        {/* Recent Badges */}
        {recentBadges.length > 0 && (
          <div style={{
            borderRadius: '20px', padding: '24px',
            background: 'linear-gradient(145deg, #1c1c1c 0%, #121212 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>
                Recent Badges
              </p>
              <button onClick={() => navigate('/profile')} style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                View all →
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {recentBadges.map(badge => (
                <div key={badge.id} style={{ flex: 1 }}>
                  <BadgeCard badge={badge} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
