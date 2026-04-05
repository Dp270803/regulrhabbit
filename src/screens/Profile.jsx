import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, Trash2, Sun, Moon } from 'lucide-react';
import BadgeGrid from '../components/BadgeGrid';
import BadgeModal from '../components/BadgeModal';
import ContributionGrid from '../components/ContributionGrid';
import { getData, exportData, importData, resetData } from '../utils/storage';
import { getAllBadges } from '../utils/badgeChecker';
import { getLevelFromXP } from '../utils/xpCalculator';
import { trackPageView } from '../utils/analytics';
import { useTheme } from '../hooks/useTheme';

const ACTIVITY_LABELS = { gym: 'Gym Regular', swimming: 'Swimmer', running: 'Runner', yoga: 'Yogi', dance: 'Dancer', singing: 'Vocalist', instrument: 'Musician' };

export default function Profile() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetText, setResetText] = useState('');
  const { theme, toggle, isDark } = useTheme();

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

  const statCards = [
    { label: 'Sessions', value: totalSessions },
    { label: 'Days Active', value: daysSinceStart },
    { label: 'Best Streak', value: `${data.streaks.best}d` },
    { label: 'Total XP', value: data.user.total_xp.toLocaleString() },
  ];

  return (
    <div className="min-h-dvh pb-28" style={{ background: 'var(--color-bg)' }}>
      {selectedBadge && <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />}

      {/* Header */}
      <div className="px-4 pt-14 pb-8 max-w-[480px] mx-auto">
        <p className="text-xs font-medium uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--color-text-3)' }}>
          {ACTIVITY_LABELS[activePlan?.activity] || 'Regular'} &middot; {daysSinceStart} days in
        </p>
        <h1 className="font-display text-3xl" style={{ color: 'var(--color-text-1)' }}>
          You&apos;re a Regular.
        </h1>
        <div
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full"
          style={{ background: 'rgba(232,193,98,0.1)' }}
        >
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-gold)' }}>
            Level {level.level}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>—</span>
          <span className="text-xs" style={{ color: 'var(--color-gold)', opacity: 0.8 }}>
            {level.title}
          </span>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 space-y-6">
        {/* Stats 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map(stat => (
            <div
              key={stat.label}
              className="rounded-2xl p-5 flex flex-col items-center justify-center text-center"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <p
                className="font-mono text-2xl font-semibold leading-none mb-2"
                style={{ color: 'var(--color-text-1)' }}
              >
                {stat.value}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Activity History */}
        <div>
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-text-3)' }}
          >
            Activity
          </p>
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <ContributionGrid plan={activePlan} checkIns={data.check_ins} />
          </div>
        </div>

        {/* Badges */}
        <div>
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-text-3)' }}
          >
            Badges
          </p>
          <BadgeGrid badges={allBadges} onBadgeClick={setSelectedBadge} />
        </div>

        {/* Settings */}
        <div>
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-text-3)' }}
          >
            Settings
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--color-border)' }}
          >
            {/* Appearance row */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-3">
                {isDark
                  ? <Moon size={16} style={{ color: 'var(--color-text-2)' }} />
                  : <Sun size={16} style={{ color: 'var(--color-text-2)' }} />
                }
                <span className="text-sm" style={{ color: 'var(--color-text-2)' }}>
                  Appearance
                </span>
              </div>
              <button
                onClick={toggle}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs cursor-pointer transition-all"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border-strong)',
                  color: 'var(--color-text-2)',
                }}
              >
                {isDark ? <><Sun size={12} /> Light</> : <><Moon size={12} /> Dark</>}
              </button>
            </div>

            {/* Export */}
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 px-5 py-4 text-sm text-left cursor-pointer transition-opacity hover:opacity-70"
              style={{
                color: 'var(--color-text-2)',
                borderBottom: '1px solid var(--color-border)',
                background: 'transparent',
              }}
            >
              <Download size={16} style={{ color: 'var(--color-text-3)' }} />
              Export My Data
            </button>

            {/* Import */}
            <button
              onClick={handleImport}
              className="w-full flex items-center gap-3 px-5 py-4 text-sm text-left cursor-pointer transition-opacity hover:opacity-70"
              style={{
                color: 'var(--color-text-2)',
                borderBottom: '1px solid var(--color-border)',
                background: 'transparent',
              }}
            >
              <Upload size={16} style={{ color: 'var(--color-text-3)' }} />
              Import Data
            </button>

            {/* Reset */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center gap-3 px-5 py-4 text-sm text-left cursor-pointer transition-opacity hover:opacity-70"
              style={{
                color: 'var(--color-red)',
                background: 'transparent',
              }}
            >
              <Trash2 size={16} />
              Reset All Data
            </button>
          </div>
        </div>

        {/* Reset Confirmation */}
        {showResetConfirm && (
          <div
            className="rounded-2xl p-5 animate-fade-in"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid rgba(248,113,113,0.25)',
            }}
          >
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-2)' }}>
              This cannot be undone. Type <span style={{ color: 'var(--color-red)' }}>DELETE</span> to confirm.
            </p>
            <input
              type="text"
              value={resetText}
              onChange={e => setResetText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm bg-transparent mb-4 outline-none"
              style={{
                border: '1px solid var(--color-border-strong)',
                color: 'var(--color-text-1)',
              }}
              placeholder="Type DELETE"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowResetConfirm(false); setResetText(''); }}
                className="flex-1 py-2.5 rounded-full text-sm cursor-pointer transition-opacity hover:opacity-70"
                style={{
                  border: '1px solid var(--color-border-strong)',
                  color: 'var(--color-text-2)',
                  background: 'transparent',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetText !== 'DELETE'}
                className="flex-1 py-2.5 rounded-full text-sm cursor-pointer transition-opacity"
                style={{
                  background: resetText === 'DELETE' ? 'var(--color-red)' : 'rgba(248,113,113,0.2)',
                  color: '#fff',
                  opacity: resetText !== 'DELETE' ? 0.4 : 1,
                }}
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
