import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lightbulb } from 'lucide-react';
import { getData } from '../utils/storage';
import { selectTip } from '../utils/tipSelector';
import { trackPageView } from '../utils/analytics';

const CATEGORIES = ['technique', 'recovery', 'mindset', 'progress'];
const CATEGORY_LABELS = { technique: 'Technique', recovery: 'Recovery', mindset: 'Mindset', progress: 'Progress' };

export default function Tips() {
  const navigate = useNavigate();
  const [todayTip, setTodayTip] = useState(null);
  const [allTips, setAllTips] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    trackPageView('tips');
    const d = getData();
    setData(d);

    const loadTips = async () => {
      const tip = await selectTip(d);
      setTodayTip(tip);

      const activePlan = d.plans.find(p => p.status === 'active');
      if (activePlan) {
        const tipModules = {
          gym: () => import('../data/tips/gym-tips.json'),
          swimming: () => import('../data/tips/swimming-tips.json'),
          running: () => import('../data/tips/running-tips.json'),
          yoga: () => import('../data/tips/yoga-tips.json'),
          dance: () => import('../data/tips/dance-tips.json'),
          singing: () => import('../data/tips/singing-tips.json'),
          instrument: () => import('../data/tips/instrument-tips.json'),
        };
        try {
          const loader = tipModules[activePlan.activity];
          if (loader) {
            const mod = await loader();
            const tipData = mod.default || mod;
            setAllTips(tipData.tips || []);
          }
        } catch {
          // Tips not available
        }
      }
    };
    loadTips();
  }, []);

  const filteredTips = selectedCategory
    ? allTips.filter(t => t.category === selectedCategory)
    : allTips;

  const seenTipIds = new Set(data?.tips?.seen_tip_ids || []);

  const pillBase = {
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'all 0.15s',
  };

  return (
    <div className="min-h-dvh pb-28" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="max-w-[480px] mx-auto px-4 pt-14 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate(-1)}
            className="cursor-pointer transition-opacity hover:opacity-60 flex items-center justify-center"
            style={{ color: 'var(--color-text-3)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <p className="text-xs font-medium uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-3)' }}>
            Tips &amp; Insights
          </p>
        </div>
        <h1 className="font-display text-3xl pl-8" style={{ color: 'var(--color-text-1)' }}>
          Learn
        </h1>
      </div>

      <div className="max-w-[480px] mx-auto px-4 space-y-5">
        {/* Today's Featured Tip */}
        {todayTip && (
          <div
            className="rounded-2xl p-6 animate-fade-in"
            style={{
              background: 'rgba(232,193,98,0.07)',
              border: '1px solid rgba(232,193,98,0.2)',
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(232,193,98,0.15)' }}
              >
                <Lightbulb size={15} style={{ color: 'var(--color-gold)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] font-medium uppercase tracking-widest mb-2"
                  style={{ color: 'var(--color-gold)' }}
                >
                  Today&apos;s Tip
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--color-text-1)' }}
                >
                  {todayTip.text}
                </p>
                <p
                  className="text-[10px] mt-3 capitalize font-medium uppercase tracking-wider"
                  style={{ color: 'rgba(232,193,98,0.5)' }}
                >
                  {todayTip.category}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Category Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              ...pillBase,
              background: !selectedCategory ? 'var(--color-text-1)' : 'transparent',
              color: !selectedCategory ? 'var(--color-bg)' : 'var(--color-text-2)',
              border: !selectedCategory
                ? '1px solid var(--color-text-1)'
                : '1px solid var(--color-border-strong)',
              fontWeight: !selectedCategory ? '600' : '400',
            }}
          >
            All
          </button>
          {CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  ...pillBase,
                  background: isActive ? 'var(--color-text-1)' : 'transparent',
                  color: isActive ? 'var(--color-bg)' : 'var(--color-text-2)',
                  border: isActive
                    ? '1px solid var(--color-text-1)'
                    : '1px solid var(--color-border-strong)',
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>

        {/* Tips List */}
        <div className="space-y-2">
          {filteredTips.map(tip => {
            const isSeen = seenTipIds.has(tip.id);
            return (
              <div
                key={tip.id}
                className="rounded-2xl px-5 py-4 transition-all"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  opacity: isSeen ? 0.7 : 1,
                }}
              >
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--color-text-2)' }}
                >
                  {tip.text}
                </p>
                <p
                  className="text-[10px] mt-2.5 capitalize font-medium uppercase tracking-wider"
                  style={{ color: 'var(--color-text-3)' }}
                >
                  {tip.category}
                </p>
              </div>
            );
          })}

          {filteredTips.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>
                No tips available yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
