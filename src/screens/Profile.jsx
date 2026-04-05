import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, Trash2 } from 'lucide-react';
import BadgeGrid from '../components/BadgeGrid';
import BadgeModal from '../components/BadgeModal';
import ContributionGrid from '../components/ContributionGrid';
import { getData, exportData, importData, resetData } from '../utils/storage';
import { getAllBadges } from '../utils/badgeChecker';
import { getLevelFromXP } from '../utils/xpCalculator';
import { trackPageView } from '../utils/analytics';

const ACTIVITY_LABELS = { gym: 'Gym Regular', swimming: 'Swimmer', running: 'Runner', yoga: 'Yogi', dance: 'Dancer', singing: 'Vocalist', instrument: 'Musician' };

export default function Profile() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetText, setResetText] = useState('');

  useEffect(() => {
    trackPageView('profile');
    const d = getData();
    if (!d.onboarding_complete) {
      navigate('/');
      return;
    }
    setData(d);
  }, [navigate]);

  if (!data) return null;

  const activePlan = data.plans.find(p => p.status === 'active');
  const level = getLevelFromXP(data.user.total_xp);
  const totalSessions = data.check_ins.filter(c => c.completed).length;
  const daysSinceStart = data.created_at
    ? Math.floor((Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const allBadges = getAllBadges(data);

  function handleExport() {
    exportData();
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await importData(file);
        setData(getData());
      } catch (err) {
        alert('Failed to import: ' + err.message);
      }
    };
    input.click();
  }

  function handleReset() {
    if (resetText !== 'DELETE') return;
    resetData();
    navigate('/');
  }

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] pb-20">
      {selectedBadge && <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />}

      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <p className="font-display text-lg text-[var(--color-text-primary)] text-center">Profile</p>
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-6 space-y-6">
        {/* Identity Header */}
        <div className="text-center">
          <h1 className="font-display text-3xl text-[var(--color-text-primary)]">
            You&apos;re a Regular.
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {ACTIVITY_LABELS[activePlan?.activity] || 'Regular'} &middot; {daysSinceStart} days in
          </p>
          <div className="inline-block mt-3 px-4 py-1.5 bg-[var(--color-streak)]/10 rounded-full">
            <span className="font-mono text-sm text-[var(--color-streak)]">
              Level {level.level} — {level.title}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Sessions', value: totalSessions },
            { label: 'Current Streak', value: `${data.streaks.current} days` },
            { label: 'Best Streak', value: `${data.streaks.best} days` },
            { label: 'Total XP', value: data.user.total_xp.toLocaleString() },
          ].map(stat => (
            <div key={stat.label} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 text-center">
              <p className="font-mono text-xl font-semibold text-[var(--color-text-primary)]">
                {stat.value}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div>
          <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Badges</h3>
          <BadgeGrid badges={allBadges} onBadgeClick={setSelectedBadge} />
        </div>

        {/* Activity History */}
        <div>
          <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Activity History</h3>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
            <ContributionGrid plan={activePlan} checkIns={data.check_ins} />
          </div>
        </div>

        {/* Data Management */}
        <div>
          <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Data</h3>
          <div className="space-y-2">
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              <Download size={16} /> Export My Data
            </button>
            <button
              onClick={handleImport}
              className="w-full flex items-center gap-3 px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              <Upload size={16} /> Import Data
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-3 border border-[var(--color-missed)]/30 rounded-xl text-sm text-[var(--color-missed)] hover:border-[var(--color-missed)] transition-colors cursor-pointer"
            >
              <Trash2 size={16} /> Reset All Data
            </button>
          </div>
        </div>

        {/* Reset Confirmation */}
        {showResetConfirm && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-missed)]/30 rounded-xl p-4">
            <p className="text-sm text-[var(--color-text-primary)] mb-2">
              This cannot be undone. Type DELETE to confirm.
            </p>
            <input
              type="text"
              value={resetText}
              onChange={e => setResetText(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-transparent text-[var(--color-text-primary)] mb-3"
              placeholder="Type DELETE"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowResetConfirm(false); setResetText(''); }}
                className="flex-1 py-2 border border-[var(--color-border)] rounded-full text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetText !== 'DELETE'}
                className="flex-1 py-2 bg-[var(--color-missed)] text-white rounded-full text-sm disabled:opacity-30 cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
