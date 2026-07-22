import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentPlan } from '../utils/storage';
import BottomNav from '../components/BottomNav';

const CATEGORY_ORDER = ['Proteins & Dairy', 'Vegetables', 'Grains & Staples', 'Spices', 'Other'];

function aggregateIngredients(plan) {
  const map = {};
  const days = plan.days || [];

  for (const day of days) {
    const meals = day.meals || [];
    for (const meal of meals) {
      const ingredients = meal.ingredients || [];
      for (const ing of ingredients) {
        const name = (ing.name || '').trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (!map[key]) {
          map[key] = {
            name,
            quantity: 0,
            unit: ing.unit || '',
            category: ing.category || 'Other',
          };
        }
        map[key].quantity += (ing.quantity || 0);
      }
    }
  }

  // Group by category
  const groups = {};
  for (const item of Object.values(map)) {
    const cat = CATEGORY_ORDER.includes(item.category) ? item.category : 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }

  // Sort groups by defined order, items alphabetically within group
  const sorted = [];
  for (const cat of CATEGORY_ORDER) {
    if (groups[cat] && groups[cat].length > 0) {
      sorted.push({
        category: cat,
        items: groups[cat].sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
  }
  return sorted;
}

function formatGroceryText(groups) {
  const lines = [];
  for (const group of groups) {
    lines.push(`\n${group.category.toUpperCase()}`);
    lines.push('─'.repeat(24));
    for (const item of group.items) {
      const qty = item.quantity
        ? `${Math.round(item.quantity * 10) / 10}${item.unit ? ` ${item.unit}` : ''}`
        : '';
      lines.push(`  ${item.name}${qty ? ` — ${qty}` : ''}`);
    }
  }
  return `GROCERY LIST\n${'═'.repeat(24)}${lines.join('\n')}`;
}

export default function GroceryList() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [groups, setGroups] = useState([]);
  const [checked, setChecked] = useState({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const currentPlan = getCurrentPlan();
    if (!currentPlan) {
      navigate('/nutriplan/dashboard', { replace: true });
      return;
    }
    setPlan(currentPlan);
    setGroups(aggregateIngredients(currentPlan));
  }, [navigate]);

  if (!plan) return null;

  const totalMeals = (plan.days || []).reduce((sum, d) => sum + (d.meals || []).length, 0);

  const toggleChecked = (key) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = async () => {
    const text = formatGroceryText(groups);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  };

  const handleShare = async () => {
    const text = formatGroceryText(groups);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Grocery List', text });
      } catch {
        // User cancelled or error
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-surface-paper relative overflow-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary-container/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-clay-accent/10 blur-3xl" />

      {/* Top bar */}
      <header className="flex items-center justify-between max-w-xl mx-auto w-full px-container-margin pt-4 pb-2">
        <h1 className="font-display-lg text-display-lg text-primary">NutriPlan</h1>
        <button
          onClick={() => navigate('/nutriplan/profile')}
          className="w-10 h-10 rounded-full bg-surface-cream flex items-center justify-center text-on-surface-variant hover:bg-primary-container/30 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>person</span>
        </button>
      </header>

      <main className="flex flex-col max-w-xl mx-auto w-full px-container-margin pb-24">
        {/* Headline */}
        <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Grocery List</h2>

        {/* Summary */}
        <div className="flex items-center gap-2 text-on-surface-variant mb-4">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>calendar_today</span>
          <span className="font-body-md text-body-md">7 days &middot; {totalMeals} meals</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-outline-variant/30 font-label-md text-label-md text-on-surface-variant hover:bg-surface-cream transition-colors active:scale-[0.98]"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Copied' : 'Copy to clipboard'}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-outline-variant/30 font-label-md text-label-md text-on-surface-variant hover:bg-surface-cream transition-colors active:scale-[0.98]"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>share</span>
            Share
          </button>
        </div>

        {/* Grouped sections */}
        {groups.map((group) => (
          <div key={group.category} className="mb-4">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-3">
              {group.category}
            </h3>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const key = item.name.toLowerCase();
                const isChecked = !!checked[key];
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-2 py-3 px-4 rounded-lg cursor-pointer transition-colors hover:bg-surface-cream/50 ${
                      isChecked ? 'opacity-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleChecked(key)}
                      className="w-5 h-5 rounded border-2 border-outline-variant/50 text-primary-container accent-primary-container flex-shrink-0"
                    />
                    <span
                      className={`font-body-md text-body-md text-on-surface flex-1 ${
                        isChecked ? 'line-through' : ''
                      }`}
                    >
                      {item.name}
                    </span>
                    {item.quantity > 0 && (
                      <span className="font-body-md text-body-md text-on-surface-variant flex-shrink-0">
                        {Math.round(item.quantity * 10) / 10}
                        {item.unit ? ` ${item.unit}` : ''}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-on-surface-variant mb-3" style={{ fontSize: 48 }}>
              shopping_cart
            </span>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              No ingredients found in your plan
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
