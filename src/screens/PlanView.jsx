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
      <div className="min-h-dvh bg-[var(--color-bg)] pb-20">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <p className="font-display text-lg text-[var(--color-text-primary)] text-center">Plan</p>
        </div>
        <div className="max-w-[480px] mx-auto px-4 py-12 text-center">
          <p className="text-[var(--color-text-muted)]">No active plan.</p>
          <button
            onClick={() => navigate('/onboarding')}
            className="mt-4 px-6 py-2.5 bg-[var(--color-text-primary)] text-[var(--color-surface)] rounded-full text-sm cursor-pointer"
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
    <div className="min-h-dvh bg-[var(--color-bg)] pb-20">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <p className="font-display text-lg text-[var(--color-text-primary)] text-center">Plan</p>
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-6">
        {/* Plan selector if multiple plans */}
        {data.plans.filter(p => p.status === 'active').length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {data.plans.filter(p => p.status === 'active').map(plan => (
              <button
                key={plan.id}
                onClick={() => { setSelectedPlan(plan); setSelectedWeek(plan.current_week || 1); }}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border cursor-pointer ${
                  selectedPlan.id === plan.id
                    ? 'bg-[var(--color-text-primary)] text-[var(--color-surface)] border-[var(--color-text-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}
              >
                {ACTIVITY_ICONS[plan.activity] || plan.activity}
              </button>
            ))}
          </div>
        )}

        {/* Plan Header */}
        <div className="mb-6">
          <h2 className="font-display text-2xl text-[var(--color-text-primary)]">
            {ACTIVITY_ICONS[selectedPlan.activity] || selectedPlan.activity}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Week {selectedWeek} of {totalWeeks}
          </p>
          <div className="w-full h-1.5 bg-[var(--color-border)] rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-[var(--color-complete)] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Week Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {selectedPlan.weeks.map(week => {
            const completedCount = week.sessions.filter(s => s.status === 'completed').length;
            const totalCount = week.sessions.filter(s => s.type === 'scheduled').length;
            return (
              <button
                key={week.week_number}
                onClick={() => setSelectedWeek(week.week_number)}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap border cursor-pointer ${
                  selectedWeek === week.week_number
                    ? 'bg-[var(--color-text-primary)] text-[var(--color-surface)] border-[var(--color-text-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}
              >
                <span>Week {week.week_number}</span>
                {totalCount > 0 && (
                  <span className="ml-1 text-xs opacity-60">{completedCount}/{totalCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sessions */}
        <div className="space-y-3">
          {currentWeekData?.sessions.map(session => (
            <div
              key={session.id}
              className={`border rounded-xl p-4 transition-colors ${
                session.status === 'completed'
                  ? 'bg-[var(--color-complete)]/5 border-[var(--color-complete)]/30'
                  : session.status === 'missed'
                  ? 'border-[var(--color-missed)]/30'
                  : 'border-[var(--color-border)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] capitalize">
                    {session.day} {session.date && `· ${formatDate(session.date)}`}
                  </p>
                  <p className="text-sm font-medium text-[var(--color-text-primary)] mt-0.5">
                    {session.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--color-text-muted)]">
                    <Clock size={12} />
                    <span>{session.duration_minutes} min</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.status === 'completed' && (
                    <div className="w-6 h-6 bg-[var(--color-complete)] rounded-full flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                  {session.blocks && (
                    <button
                      onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                      className="text-[var(--color-text-muted)] cursor-pointer"
                    >
                      {expandedSession === session.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}
                </div>
              </div>

              {expandedSession === session.id && session.blocks && (
                <div className="mt-3 space-y-2 animate-fade-in">
                  {session.blocks.map((block, i) => (
                    <div key={i} className="pl-3 border-l-2 border-[var(--color-border)]">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                        {block.type}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{block.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Plan Actions */}
        <div className="mt-8 space-y-3">
          <button
            onClick={() => navigate('/onboarding')}
            className="w-full py-2.5 border border-[var(--color-border)] rounded-full text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            Start New Plan
          </button>
        </div>
      </div>
    </div>
  );
}
