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
    if (!d.onboarding_complete) {
      navigate('/');
      return;
    }
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
        if (existing >= 0) {
          data.badges[existing] = badge;
        } else {
          data.badges.push(badge);
        }
      }

      const levelInfo = checkLevelUp(oldXP, data.user.total_xp);
      if (levelInfo) {
        data.user.level = levelInfo.level;
      }

      return data;
    });

    setData(updated);
    setRecentXP(xpResult.total);

    const levelInfo = checkLevelUp(oldXP, updated.user.total_xp);
    if (levelInfo) {
      setLevelUpInfo(levelInfo);
      trackLevelUp(levelInfo.level, updated.user.total_xp);
    }

    const newBadges = checkBadges(updated);
    if (newBadges.length > 0) {
      setNewBadge(newBadges[0]);
      trackBadgeEarned(newBadges[0].id, newBadges[0].name);
    }

    const streakMilestone = getStreakMilestone(updated.streaks.current);
    if (streakMilestone && streakMilestone >= 7) {
      setShowConfetti(true);
    }

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

    setTimeout(() => {
      setCelebrationMsg(null);
      setRecentXP(0);
    }, 4000);
  }

  function handleBonusSession() {
    const d = getData();
    const newStreaks = updateStreak(d);
    const xpResult = calculateSessionXP(newStreaks.current, true, false);

    updateData(data => {
      data.streaks = newStreaks;
      data.user.total_xp += xpResult.total;
      data.check_ins.push({
        date: today,
        plan_id: activePlan?.id,
        session_id: 'bonus',
        completed: true,
        completed_at: new Date().toISOString(),
        xp_earned: xpResult.total,
        bonus_xp: 0,
        is_bonus: true,
      });
      return data;
    });

    setRecentXP(xpResult.total);
    setData(getData());
    setTimeout(() => setRecentXP(0), 4000);
  }

  const recentBadges = data.badges.filter(b => b.earned).slice(-3).reverse();

  function getTimeGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  return (
    <div className="min-h-dvh pb-28" style={{ background: 'var(--color-bg)' }}>
      <ConfettiEffect trigger={showConfetti} />
      {levelUpInfo && <LevelUpModal level={levelUpInfo} onClose={() => setLevelUpInfo(null)} />}
      {newBadge && <BadgeModal badge={newBadge} onClose={() => setNewBadge(null)} />}

      {/* Return Banner */}
      {showBanner && returnMessage && (
        <ReturnBanner
          message={returnMessage}
          state={returnStateNum}
          timeMessage={timeMessage}
          onDismiss={() => setShowBanner(false)}
        />
      )}

      {/* Header */}
      <div className="px-4 pt-12 pb-8 max-w-[480px] mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--color-text-3)' }}>
              {getTimeGreeting()}
            </p>
            <h1 className="font-display text-3xl" style={{ color: 'var(--color-text-1)' }}>
              {activePlan ? `Week ${todayInfo?.weekNumber || 1}` : 'Dashboard'}
            </h1>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-semibold" style={{ color: 'var(--color-gold)' }}>
              {data.streaks.current}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>day streak</p>
          </div>
        </div>

        {celebrationMsg && (
          <div
            className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-center animate-fade-in"
            style={{ background: 'rgba(74,222,128,0.1)', color: 'var(--color-green)' }}
          >
            {celebrationMsg}
          </div>
        )}
      </div>

      <div className="max-w-[480px] mx-auto px-4 space-y-3">
        {/* Today's Session */}
        <SessionCard
          session={displaySession}
          onComplete={handleComplete}
          isCompleted={isCompleted}
          isRestDay={rest && !todaySession}
        />

        {/* Bonus session */}
        {!todaySession && !rest && !isCompleted && (
          <button
            onClick={handleBonusSession}
            className="w-full py-3 text-sm rounded-2xl border-dashed transition-all cursor-pointer"
            style={{
              border: '1px dashed var(--color-border-strong)',
              color: 'var(--color-text-3)',
              background: 'transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--color-text-1)';
              e.currentTarget.style.color = 'var(--color-text-1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border-strong)';
              e.currentTarget.style.color = 'var(--color-text-3)';
            }}
          >
            + Bonus session · +50 XP
          </button>
        )}

        {/* Stats row: Streak + XP */}
        <StreakCounter
          current={data.streaks.current}
          best={data.streaks.best}
          consecutiveMisses={missedCount}
        />

        {/* Weekly Grid */}
        <WeeklyGrid plan={activePlan} checkIns={data.check_ins} />

        {/* XP Bar */}
        <XPBar totalXP={data.user.total_xp} recentXP={recentXP} />

        {/* Tip */}
        <TipCard tip={tip} onSeeMore={() => navigate('/tips')} />

        {/* Recent Badges */}
        {recentBadges.length > 0 && (
          <div
            className="rounded-2xl p-6"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-3)' }}>
                Recent Badges
              </p>
              <button
                onClick={() => navigate('/profile')}
                className="text-xs cursor-pointer transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-text-3)' }}
              >
                View all →
              </button>
            </div>
            <div className="flex gap-2">
              {recentBadges.map(badge => (
                <div key={badge.id} className="flex-1">
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
