import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, Trash2, Sun, Moon, Pencil, Check } from 'lucide-react';
import BadgeGrid from '../components/BadgeGrid';
import BadgeModal from '../components/BadgeModal';
import ContributionGrid from '../components/ContributionGrid';
import { getData, exportData, importData, resetData, updateData } from '../utils/storage';
import { getAllBadges } from '../utils/badgeChecker';
import { getLevelFromXP } from '../utils/xpCalculator';
import { trackPageView } from '../utils/analytics';
import { useTheme } from '../hooks/useTheme';
import { fetchProfilePage } from '../utils/sanityClient';

const ACTIVITY_LABELS = { gym: 'Gym Regular', swimming: 'Swimmer', running: 'Runner', yoga: 'Yogi', dance: 'Dancer', singing: 'Vocalist', instrument: 'Musician' };

export default function Profile() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetText, setResetText] = useState('');
  const { theme, toggle, isDark } = useTheme();
  const [cms, setCms] = useState(null);

  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const nameInputRef = useRef(null);

  useEffect(() => {
    trackPageView('profile');
    const d = getData();
    if (!d.onboarding_complete) {
      navigate('/');
      return;
    }
    setData(d);
    setNameInput(d.user.name || '');
    fetchProfilePage().then(doc => { if (doc) setCms(doc); }).catch(() => {});
  }, [navigate]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  if (!data) return null;

  const activePlan = data.plans.find(p => p.status === 'active');
  const level = getLevelFromXP(data.user.total_xp);
  const totalSessions = data.check_ins.filter(c => c.completed).length;
  const daysSinceStart = data.created_at
    ? Math.floor((Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const allBadges = getAllBadges(data);

  const displayName = data.user.name;
  const ghostTag = cms?.ghostTag || 'Ghost Member';
  const namePrompt = cms?.namePrompt || 'Tap to add your name';

  function saveName() {
    const trimmed = nameInput.trim();
    const updated = updateData(d => {
      d.user.name = trimmed || null;
      return d;
    });
    setData(updated);
    setIsEditingName(false);
  }

  function handleNameKeyDown(e) {
    if (e.key === 'Enter') saveName();
    if (e.key === 'Escape') {
      setNameInput(data.user.name || '');
      setIsEditingName(false);
    }
  }

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
    { label: cms?.statSessionsLabel || 'Sessions', value: totalSessions },
    { label: cms?.statDaysLabel || 'Days Active', value: daysSinceStart },
    { label: cms?.statStreakLabel || 'Best Streak', value: `${data.streaks.best}d` },
    { label: cms?.statXpLabel || 'Total XP', value: data.user.total_xp.toLocaleString() },
  ];

  return (
    <div className="min-h-dvh pb-28" style={{ background: 'var(--color-bg)' }}>
      {selectedBadge && <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />}

      {/* Header */}
      <div className="px-4 pt-14 pb-8 max-w-[480px] mx-auto">
        <p className="text-xs font-medium uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--color-text-3)' }}>
          {cms?.personalVaultEyebrow || 'Personal Vault'}
        </p>

        {/* Name block */}
        {isEditingName ? (
          <div className="flex items-center gap-2 mb-4">
            <input
              ref={nameInputRef}
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={saveName}
              onKeyDown={handleNameKeyDown}
              maxLength={32}
              placeholder={cms?.nameInputPlaceholder || 'Your name'}
              className="font-display text-3xl bg-transparent outline-none border-b-2 flex-1 min-w-0"
              style={{
                color: 'var(--color-text-1)',
                borderColor: 'var(--color-gold)',
                paddingBottom: '2px',
              }}
            />
            <button
              onMouseDown={e => { e.preventDefault(); saveName(); }}
              className="flex-shrink-0 p-1 rounded-full cursor-pointer"
              style={{ color: 'var(--color-gold)' }}
            >
              <Check size={18} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-3 mb-4">
            {displayName ? (
              <h1 className="font-display text-3xl" style={{ color: 'var(--color-text-1)' }}>
                {displayName}
              </h1>
            ) : (
              <div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-1"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.12)' }}
                >
                  <span className="font-mono text-base font-semibold" style={{ color: 'var(--color-text-3)' }}>
                    {ghostTag}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-3)', opacity: 0.6 }}>
                  {namePrompt}
                </p>
              </div>
            )}
            <button
              onClick={() => {
                setNameInput(data.user.name || '');
                setIsEditingName(true);
              }}
              className="flex-shrink-0 mb-1 p-1.5 rounded-full cursor-pointer transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-text-3)', background: 'rgba(255,255,255,0.05)' }}
              title={displayName ? 'Edit name' : 'Add your name'}
            >
              <Pencil size={13} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>
            {ACTIVITY_LABELS[activePlan?.activity] || 'Regular'}
          </span>
          <span style={{ color: 'var(--color-text-3)', opacity: 0.4, fontSize: '0.6rem' }}>·</span>
          <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>
            {daysSinceStart} days in
          </span>
          <span style={{ color: 'var(--color-text-3)', opacity: 0.4, fontSize: '0.6rem' }}>·</span>
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full"
            style={{ background: 'rgba(232,193,98,0.1)' }}
          >
            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--color-gold)' }}>
              Lv.{level.level}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-gold)', opacity: 0.75 }}>
              {level.title}
            </span>
          </div>
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
            {cms?.activitySectionLabel || 'Activity'}
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
            {cms?.badgesSectionLabel || 'Badges'}
          </p>
          <BadgeGrid badges={allBadges} onBadgeClick={setSelectedBadge} />
        </div>

        {/* Settings */}
        <div>
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-text-3)' }}
          >
            {cms?.settingsSectionLabel || 'Settings'}
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
                  {cms?.appearanceRowLabel || 'Appearance'}
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
              {cms?.exportRowLabel || 'Export My Data'}
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
              {cms?.importRowLabel || 'Import Data'}
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
              {cms?.resetRowLabel || 'Reset All Data'}
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
