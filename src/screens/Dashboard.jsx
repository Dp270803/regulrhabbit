import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SessionCard from '../components/SessionCard';
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
import { calculateSessionXP, checkLevelUp, getLevelFromXP } from '../utils/xpCalculator';
import { checkBadges } from '../utils/badgeChecker';
import { selectTip, markTipSeen } from '../utils/tipSelector';
import { getToday, formatDate, getWeekDates } from '../utils/dateUtils';
import { trackPageView, trackSessionCompleted, trackReturnState, trackBadgeEarned, trackLevelUp } from '../utils/analytics';
import messagesData from '../data/messages.json';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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

function StatTile({ label, value, sub, valueColor, accent, unit }) {
  return (
    <div style={{
      background: 'linear-gradient(145deg, #1a1a1a 0%, #111111 100%)',
      border: accent ? `1px solid ${accent}28` : '1px solid rgba(255,255,255,0.07)',
      borderRadius: '18px',
      padding: '24px 22px 20px',
      boxShadow: '0 4px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: '14px' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
        <p className="font-mono" style={{ fontSize: '2.4rem', fontWeight: 700, lineHeight: 1, color: valueColor || 'var(--color-text-1)' }}>{value}</p>
        {unit && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{unit}</span>}
      </div>
      {sub && <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)', marginTop: '6px', lineHeight: 1.4 }}>{sub}</p>}
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

  const nextInfo = !displaySession && activePlan ? getNextSession(activePlan) : null;
  const sessionForCard = displaySession || nextInfo?.session;
  const isNextSession = !displaySession && !!nextInfo;
  const nextLabel = nextInfo ? `Up Next — ${formatDate(nextInfo.session.date)}` : null;

  // Weekly stats for stat tiles
  const weekDates = getWeekDates(today);
  const scheduledDays = activePlan?.scheduled_days || [];
  const completedThisWeek = weekDates.filter(date => data.check_ins.some(c => c.date === date && c.completed)).length;
  const scheduledThisWeek = weekDates.filter((_, i) => scheduledDays.includes(DAY_KEYS[i])).length;

  const level = getLevelFromXP(data.user.total_xp);

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

      {/* ── Header ── */}
      <div style={{ ...W, paddingTop: '52px', paddingBottom: '28px' }}>
        <p style={{ fontSize: '0.68rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>
          {getTimeGreeting()}
        </p>
        <h1 className="font-display" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', lineHeight: 1.05, letterSpacing: '-0.01em', marginBottom: '6px' }}>
          {activePlan?.plan_label || 'Dashboard'}
        </h1>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
          Week {todayInfo?.weekNumber || nextInfo?.weekNumber || 1} of 4{activePlan?.frequency ? ` · ${activePlan.frequency} days/week` : ''}
        </p>
        {celebrationMsg && (
          <div style={{ marginTop: '16px', padding: '10px 18px', borderRadius: '10px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', color: '#4ADE80', fontSize: '0.85rem', textAlign: 'center' }}>
            {celebrationMsg}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ ...W, display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── Stat tiles (3 across) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <StatTile
            label="Streak"
            value={data.streaks.current === 0 ? '—' : data.streaks.current}
            unit={data.streaks.current > 0 ? 'days' : undefined}
            sub={data.streaks.current > 0 ? `Personal best · ${data.streaks.best} days` : 'Complete a session to start'}
            valueColor={data.streaks.current > 0 ? '#E8C162' : 'rgba(255,255,255,0.25)'}
            accent={data.streaks.current > 0 ? '#E8C162' : null}
          />
          <StatTile
            label="This Week"
            value={`${completedThisWeek}/${scheduledThisWeek}`}
            sub={completedThisWeek === scheduledThisWeek && scheduledThisWeek > 0 ? 'All done — great week!' : `${scheduledThisWeek - completedThisWeek} session${scheduledThisWeek - completedThisWeek !== 1 ? 's' : ''} remaining`}
            valueColor={completedThisWeek === scheduledThisWeek && scheduledThisWeek > 0 ? '#4ADE80' : 'var(--color-text-1)'}
            accent={completedThisWeek === scheduledThisWeek && scheduledThisWeek > 0 ? '#4ADE80' : null}
          />
          <StatTile
            label="Total XP"
            value={data.user.total_xp.toLocaleString()}
            unit="xp"
            sub={`${level.title} · Level ${level.level}`}
            valueColor="#E8C162"
            accent="#E8C162"
          />
        </div>

        {/* ── Weekly calendar ── */}
        <WeeklyGrid plan={activePlan} checkIns={data.check_ins} />

        {/* ── Session card ── */}
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

        {/* ── XP progress + Tip side by side ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
          <XPBar totalXP={data.user.total_xp} recentXP={recentXP} />
          {tip && <TipCard tip={tip} onSeeMore={() => navigate('/tips')} />}
        </div>

        {/* ── Recent badges ── */}
        {recentBadges.length > 0 && (
          <div style={{ borderRadius: '18px', padding: '24px', background: 'linear-gradient(145deg, #1a1a1a 0%, #111111 100%)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 28px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>Recent Badges</p>
              <button onClick={() => navigate('/profile')} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
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
