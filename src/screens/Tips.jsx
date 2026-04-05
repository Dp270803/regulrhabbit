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

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] pb-20">
      <div className="border-b border-[var(--color-border)] px-4 py-3 flex items-center">
        <button onClick={() => navigate(-1)} className="text-[var(--color-text-muted)] cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <p className="font-display text-lg text-[var(--color-text-primary)] text-center flex-1">Tips</p>
        <div className="w-5" />
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-6 space-y-6">
        {/* Today's Tip */}
        {todayTip && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-streak)]/20 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[var(--color-streak)]/10 rounded-full flex items-center justify-center shrink-0">
                <Lightbulb size={14} className="text-[var(--color-streak)]" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-streak)] mb-1">
                  Today&apos;s Tip
                </p>
                <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                  {todayTip.text}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-2 capitalize">
                  {todayTip.category}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs border whitespace-nowrap cursor-pointer ${
              !selectedCategory
                ? 'bg-[var(--color-text-primary)] text-[var(--color-surface)] border-[var(--color-text-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs border whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[var(--color-text-primary)] text-[var(--color-surface)] border-[var(--color-text-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Tip List */}
        <div className="space-y-3">
          {filteredTips.map(tip => (
            <div
              key={tip.id}
              className={`bg-[var(--color-surface)] border rounded-xl p-4 ${
                seenTipIds.has(tip.id) ? 'border-[var(--color-border)]' : 'border-[var(--color-border)]'
              }`}
            >
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {tip.text}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-2 capitalize">
                {tip.category}
              </p>
            </div>
          ))}
          {filteredTips.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
              No tips available yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
