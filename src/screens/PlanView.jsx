import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Check, Clock } from 'lucide-react';
import { getData } from '../utils/storage';
import { formatDate } from '../utils/dateUtils';
import { trackPageView } from '../utils/analytics';

export default function PlanView() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [expandedSession, setExpandedSession] = useState(null);

  useEffect(() => {
    trackPageView('plan');
    const d = getData();
    if (!d.onboarding_complete) {
      navigate('/');
      return;
    }
    setData(d);
    const active = d.plans.find(p => p.status === 'active');
    if (active) {
      setSelectedPlan(active);
      setSelectedWeek(active.current_week || 1);
    }
  }, [navigate]);

  if (!data || !selectedPlan) {
    return (
      <div className="min-h-dvh pb-28" style={{ background: 'var(--color-bg)' }}>
        <div
          className="px-4 pt-14 pb-6 max-w-[480px] mx-auto"
        >
          <h1 className="font-display text-3xl" style={{ color: 'var(--color-text-1)' }}>Plan</h1>
        </div>
        <div className="max-w-[480px] mx-auto px-4 py-12 text-center">
          <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>No active plan.</p>
          <button
            onClick={() => navigate('/onboarding')}
            className="mt-6 px-8 py-3 rounded-2xl text-sm font-medium cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-text-1)', color: 'var(--color-bg)' }}
          >
            Create a Plan
          </button>
        </div>
      </div>
    );
  }

  const ACTIVITY_ICONS = { gym: 'Gym', swimming: 'Swimming', running: 'Running', yoga: 'Yoga', dance: 'Dance', singing: 'Singing', instrument: 'Instrument' };

  const currentWeekData = selectedPlan.weeks.find(w => w.week_number === selectedWeek);
  const totalWeeks = selectedPlan.weeks.length;
  const progress = ((selectedWeek - 1) / totalWeeks) * 100;

  return (
    <div className="min-h-dvh pb-28" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="px-4 pt-14 pb-6 max-w-[480px] mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--color-text-3)' }}>
              Your Plan
            </p>
            <h1 className="font-display text-3xl" style={{ color: 'var(--color-text-1)' }}>
              {ACTIVITY_ICONS[selectedPlan.activity] || selectedPlan.activity}
            </h1>
          </div>
          <p className="text-xs pb-1" style={{ color: 'var(--color-text-3)' }}>
            Week {selectedWeek} of {totalWeeks}
          </p>
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-px mt-5 rounded-full overflow-hidden"
          style={{ background: 'var(--color-border)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'var(--color-gold)' }}
          />
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 space-y-6">
        {/* Plan selector if multiple plans */}
        {data.plans.filter(p => p.status === 'active').length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {data.plans.filter(p => p.status === 'active').map(plan => {
              const isActive = selectedPlan.id === plan.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => { setSelectedPlan(plan); setSelectedWeek(plan.current_week || 1); }}
                  className="px-4 py-1.5 rounded-full text-xs whitespace-nowrap cursor-pointer transition-all"
                  style={{
                    background: isActive ? 'var(--color-text-1)' : 'transparent',
                    color: isActive ? 'var(--color-bg)' : 'var(--color-text-2)',
                    border: isActive ? '1px solid var(--color-text-1)' : '1px solid var(--color-border-strong)',
                  }}
                >
                  {ACTIVITY_ICONS[plan.activity] || plan.activity}
                </button>
              );
            })}
          </div>
        )}

        {/* Week Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {selectedPlan.weeks.map(week => {
            const completedCount = week.sessions.filter(s => s.status === 'completed').length;
            const totalCount = week.sessions.filter(s => s.type === 'scheduled').length;
            const isActive = selectedWeek === week.week_number;
            return (
              <button
                key={week.week_number}
                onClick={() => setSelectedWeek(week.week_number)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm whitespace-nowrap cursor-pointer transition-all"
                style={{
                  background: isActive ? 'var(--color-text-1)' : 'transparent',
                  color: isActive ? 'var(--color-bg)' : 'var(--color-text-2)',
                  border: isActive ? '1px solid var(--color-text-1)' : '1px solid var(--color-border-strong)',
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                <span>Week {week.week_number}</span>
                {totalCount > 0 && (
                  <span
                    className="text-[10px]"
                    style={{ opacity: 0.6 }}
                  >
                    {completedCount}/{totalCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sessions */}
        <div className="space-y-2">
          {currentWeekData?.sessions.map(session => {
            const isCompleted = session.status === 'completed';
            const isMissed = session.status === 'missed';
            return (
              <div
                key={session.id}
                className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: isCompleted
                    ? 'rgba(74,222,128,0.05)'
                    : 'var(--color-surface)',
                  border: isCompleted
                    ? '1px solid rgba(74,222,128,0.2)'
                    : isMissed
                    ? '1px solid rgba(248,113,113,0.2)'
                    : '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[10px] font-medium uppercase tracking-wider mb-1 capitalize"
                      style={{
                        color: isCompleted
                          ? 'var(--color-green)'
                          : isMissed
                          ? 'var(--color-red)'
                          : 'var(--color-text-3)',
                      }}
                    >
                      {session.day}{session.date && ` · ${formatDate(session.date)}`}
                    </p>
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--color-text-1)' }}
                    >
                      {session.title}
                    </p>
                    <div
                      className="flex items-center gap-1.5 mt-1.5"
                      style={{ color: 'var(--color-text-3)' }}
                    >
                      <Clock size={11} />
                      <span className="text-xs">{session.duration_minutes} min</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    {isCompleted && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--color-green)' }}
                      >
                        <Check size={13} color="#000" strokeWidth={3} />
                      </div>
                    )}
                    {session.blocks && (
                      <button
                        onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                        className="cursor-pointer transition-opacity hover:opacity-60"
                        style={{ color: 'var(--color-text-3)' }}
                      >
                        {expandedSession === session.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}
                  </div>
                </div>

                {expandedSession === session.id && session.blocks && (
                  <div
                    className="px-5 pb-4 space-y-3 animate-fade-in"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    <div className="pt-3 space-y-3">
                      {session.blocks.map((block, i) => (
                        <div
                          key={i}
                          className="pl-3"
                          style={{ borderLeft: '2px solid var(--color-border-strong)' }}
                        >
                          <p
                            className="text-[10px] font-medium uppercase tracking-widest mb-0.5"
                            style={{ color: 'var(--color-text-3)' }}
                          >
                            {block.type}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>
                            {block.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Plan Actions */}
        <div className="pt-2 pb-4">
          <button
            onClick={() => navigate('/onboarding')}
            className="w-full py-3 rounded-2xl text-sm cursor-pointer transition-all"
            style={{
              border: '1px solid var(--color-border-strong)',
              color: 'var(--color-text-2)',
              background: 'transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--color-text-1)';
              e.currentTarget.style.color = 'var(--color-text-1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border-strong)';
              e.currentTarget.style.color = 'var(--color-text-2)';
            }}
          >
            Start New Plan
          </button>
        </div>
      </div>
    </div>
  );
}
