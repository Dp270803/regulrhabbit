import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { getData, getUser, getTargets, getCredits, updateData, updateMultiple, resetData } from '../utils/storage';
import { calculateTargets } from '../utils/calculations';

const GOAL_LABELS = {
  fat_loss: 'Fat loss',
  muscle_gain: 'Muscle gain',
  maintenance: 'Maintenance',
  recomp: 'Body recomp',
};

const ACTIVITY_LABELS = {
  sedentary: 'Sedentary',
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Active',
  very_active: 'Very active',
};

const DIET_LABELS = {
  omnivore: 'Omnivore',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  pescatarian: 'Pescatarian',
  keto: 'Keto',
};

const CUISINE_LABELS = {
  indian: 'Indian',
  mediterranean: 'Mediterranean',
  american: 'American',
  east_asian: 'East Asian',
  mexican: 'Mexican',
  mixed: 'Mixed',
};

const SEX_OPTIONS = ['male', 'female'];
const GOAL_OPTIONS = ['fat_loss', 'muscle_gain', 'maintenance', 'recomp'];
const ACTIVITY_OPTIONS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const DIET_OPTIONS = ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto'];
const CUISINE_OPTIONS = ['indian', 'mediterranean', 'american', 'east_asian', 'mexican', 'mixed'];
const MEALS_OPTIONS = [3, 4, 5];

function EditableRow({ label, value, displayValue, field, type, options, optionLabels, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = () => {
    setEditing(false);
    if (draft !== value) {
      onSave(field, type === 'number' ? parseFloat(draft) : draft);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center justify-between py-4">
        <span className="font-label-md text-label-md text-ink-muted uppercase tracking-wider shrink-0 mr-4">
          {label}
        </span>
        {options ? (
          <select
            value={draft || ''}
            onChange={(e) => {
              const val = type === 'number' ? parseInt(e.target.value) : e.target.value;
              setDraft(val);
              setEditing(false);
              onSave(field, val);
            }}
            onBlur={handleSave}
            autoFocus
            className="font-body-md text-body-md text-ink-black bg-surface-cream border border-outline-variant/30 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary text-right"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {optionLabels ? (optionLabels[opt] || opt) : opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type || 'text'}
            value={draft || ''}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="font-body-md text-body-md text-ink-black bg-surface-cream border border-outline-variant/30 rounded-lg px-3 py-1.5 w-28 text-right focus:outline-none focus:border-primary"
          />
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center justify-between py-4 w-full text-left group"
    >
      <span className="font-label-md text-label-md text-ink-muted uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="font-body-md text-body-md text-ink-black">
          {displayValue || value || '--'}
        </span>
        <span
          className="material-symbols-outlined text-ink-muted/40 group-hover:text-ink-muted transition-colors"
          style={{ fontSize: 16 }}
        >
          edit
        </span>
      </div>
    </button>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());
  const [targets, setTargets] = useState(getTargets());
  const [credits, setCredits] = useState(getCredits());
  const [hasChanges, setHasChanges] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetInput, setResetInput] = useState('');

  const refreshData = useCallback(() => {
    setUser(getUser());
    setTargets(getTargets());
    setCredits(getCredits());
  }, []);

  const handleBodyStatSave = (field, value) => {
    updateData(`user.${field}`, value);
    setHasChanges(true);
    refreshData();
  };

  const handleDietSave = (field, value) => {
    updateData(`user.${field}`, value);
    refreshData();
  };

  const handleRecalculate = () => {
    const freshUser = getUser();
    const newTargets = calculateTargets(freshUser);
    updateMultiple({
      'targets.bmr': newTargets.bmr,
      'targets.tdee': newTargets.tdee,
      'targets.target_calories': newTargets.target_calories,
      'targets.protein_g': newTargets.protein_g,
      'targets.fat_g': newTargets.fat_g,
      'targets.carb_g': newTargets.carb_g,
      'targets.deficit_or_surplus': newTargets.deficit_or_surplus,
    });
    setHasChanges(false);
    refreshData();
  };

  const handleExport = () => {
    const data = getData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutriplan-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (resetInput === 'DELETE') {
      resetData();
      navigate('/nutriplan', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-surface-paper pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-surface-paper/95 backdrop-blur-sm">
        <div className="max-w-xl mx-auto w-full px-container-margin flex items-center gap-3 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-cream text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              arrow_back
            </span>
          </button>
          <h1 className="font-headline-md text-headline-md text-on-surface">Profile</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto w-full px-container-margin">
        {/* Section 1 - Body Stats */}
        <section>
          <h2 className="font-label-md text-label-md text-primary uppercase tracking-widest mb-1 pt-4">
            Body Stats
          </h2>
          <div className="divide-y divide-outline-variant/30">
            <EditableRow
              label="Weight"
              value={user.weight_kg}
              displayValue={user.weight_kg ? `${user.weight_kg} kg` : null}
              field="weight_kg"
              type="number"
              onSave={handleBodyStatSave}
            />
            <EditableRow
              label="Height"
              value={user.height_cm}
              displayValue={user.height_cm ? `${user.height_cm} cm` : null}
              field="height_cm"
              type="number"
              onSave={handleBodyStatSave}
            />
            <EditableRow
              label="Age"
              value={user.age}
              displayValue={user.age ? `${user.age} years` : null}
              field="age"
              type="number"
              onSave={handleBodyStatSave}
            />
            <EditableRow
              label="Sex"
              value={user.sex}
              displayValue={user.sex ? user.sex.charAt(0).toUpperCase() + user.sex.slice(1) : null}
              field="sex"
              options={SEX_OPTIONS}
              optionLabels={{ male: 'Male', female: 'Female' }}
              onSave={handleBodyStatSave}
            />
            <EditableRow
              label="Goal"
              value={user.goal}
              displayValue={GOAL_LABELS[user.goal]}
              field="goal"
              options={GOAL_OPTIONS}
              optionLabels={GOAL_LABELS}
              onSave={handleBodyStatSave}
            />
            <EditableRow
              label="Activity"
              value={user.activity_level}
              displayValue={ACTIVITY_LABELS[user.activity_level]}
              field="activity_level"
              options={ACTIVITY_OPTIONS}
              optionLabels={ACTIVITY_LABELS}
              onSave={handleBodyStatSave}
            />
          </div>

          {/* Recalculate button */}
          {hasChanges && (
            <button
              onClick={handleRecalculate}
              className="w-full py-3 mt-4 rounded-xl bg-primary-container text-on-primary-container font-label-md text-label-md font-bold uppercase tracking-widest shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            >
              Recalculate targets
            </button>
          )}

          {/* Current targets summary */}
          {targets.target_calories && (
            <div className="mt-4 bg-surface-cream rounded-xl p-4 flex items-center justify-between">
              <span className="font-label-md text-label-md text-ink-muted uppercase tracking-wider">Daily target</span>
              <span className="font-body-md text-body-md text-ink-black">
                {targets.target_calories.toLocaleString()} kcal &middot; {targets.protein_g}P &middot; {targets.fat_g}F &middot; {targets.carb_g}C
              </span>
            </div>
          )}
        </section>

        {/* Section 2 - Diet Preferences */}
        <section className="border-t border-outline-variant/30 mt-6">
          <h2 className="font-label-md text-label-md text-primary uppercase tracking-widest mb-1 pt-6">
            Diet Preferences
          </h2>
          <div className="divide-y divide-outline-variant/30">
            <EditableRow
              label="Diet type"
              value={user.dietary_preference}
              displayValue={DIET_LABELS[user.dietary_preference]}
              field="dietary_preference"
              options={DIET_OPTIONS}
              optionLabels={DIET_LABELS}
              onSave={handleDietSave}
            />
            <EditableRow
              label="Cuisine"
              value={user.cuisine}
              displayValue={CUISINE_LABELS[user.cuisine]}
              field="cuisine"
              options={CUISINE_OPTIONS}
              optionLabels={CUISINE_LABELS}
              onSave={handleDietSave}
            />
            <div className="flex items-center justify-between py-4">
              <span className="font-label-md text-label-md text-ink-muted uppercase tracking-wider">
                Allergies
              </span>
              <span className="font-body-md text-body-md text-ink-black">
                {user.allergies && user.allergies.length > 0
                  ? user.allergies.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')
                  : 'None'}
              </span>
            </div>
            <EditableRow
              label="Meals/day"
              value={user.meals_per_day}
              displayValue={user.meals_per_day ? `${user.meals_per_day} meals` : null}
              field="meals_per_day"
              type="number"
              options={MEALS_OPTIONS}
              optionLabels={{ 3: '3 meals', 4: '4 meals', 5: '5 meals' }}
              onSave={handleDietSave}
            />
          </div>
        </section>

        {/* Section 3 - Plan Credits */}
        <section className="border-t border-outline-variant/30 mt-6">
          <h2 className="font-label-md text-label-md text-primary uppercase tracking-widest mb-1 pt-6">
            Plan Credits
          </h2>
          <div className="flex items-center justify-between py-4">
            <div>
              <span className="font-headline-md text-headline-md text-primary">{credits}</span>
              <span className="font-body-md text-body-md text-on-surface-variant ml-2">
                {credits === 1 ? 'plan remaining' : 'plans remaining'}
              </span>
            </div>
            <button
              onClick={() => navigate('/nutriplan/paywall')}
              className="px-5 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-label-md text-label-md font-bold uppercase tracking-widest transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            >
              Buy more
            </button>
          </div>
        </section>

        {/* Section 4 - Account */}
        <section className="border-t border-outline-variant/30 mt-6">
          <h2 className="font-label-md text-label-md text-primary uppercase tracking-widest mb-1 pt-6">
            Account
          </h2>
          <div className="divide-y divide-outline-variant/30">
            <button
              onClick={handleExport}
              className="flex items-center justify-between py-4 w-full text-left group"
            >
              <span className="font-body-md text-body-md text-ink-black">Export data</span>
              <span
                className="material-symbols-outlined text-ink-muted/40 group-hover:text-ink-muted transition-colors"
                style={{ fontSize: 18 }}
              >
                download
              </span>
            </button>
            <a
              href="#"
              className="flex items-center justify-between py-4 w-full text-left group"
            >
              <span className="font-body-md text-body-md text-ink-black">Privacy Policy</span>
              <span
                className="material-symbols-outlined text-ink-muted/40 group-hover:text-ink-muted transition-colors"
                style={{ fontSize: 18 }}
              >
                open_in_new
              </span>
            </a>
            <a
              href="#"
              className="flex items-center justify-between py-4 w-full text-left group"
            >
              <span className="font-body-md text-body-md text-ink-black">Terms of Service</span>
              <span
                className="material-symbols-outlined text-ink-muted/40 group-hover:text-ink-muted transition-colors"
                style={{ fontSize: 18 }}
              >
                open_in_new
              </span>
            </a>
          </div>
        </section>

        {/* Section 5 - Footer */}
        <section className="border-t border-outline-variant/30 mt-6 pt-6 pb-8">
          <p className="font-label-md text-label-md text-ink-muted text-center mb-6">
            NutriPlan v1.0.0
          </p>

          {!resetConfirm ? (
            <button
              onClick={() => setResetConfirm(true)}
              className="w-full text-center font-label-md text-label-md text-error py-3 rounded-xl border border-error/20 hover:bg-error/5 transition-colors active:scale-[0.98]"
            >
              Reset all data
            </button>
          ) : (
            <div className="bg-error/5 border border-error/20 rounded-xl p-4">
              <p className="font-body-md text-body-md text-on-surface mb-3">
                Type <strong>DELETE</strong> to confirm. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={resetInput}
                  onChange={(e) => setResetInput(e.target.value)}
                  placeholder="DELETE"
                  className="flex-grow font-body-md text-body-md bg-white border border-error/30 rounded-lg px-3 py-2 text-center focus:outline-none focus:border-error"
                />
                <button
                  onClick={handleReset}
                  disabled={resetInput !== 'DELETE'}
                  className={`px-5 py-2 rounded-lg font-label-md text-label-md font-bold uppercase tracking-widest transition-all duration-200 ${
                    resetInput === 'DELETE'
                      ? 'bg-error text-white hover:opacity-90 active:scale-[0.98]'
                      : 'bg-error/20 text-error/40 cursor-not-allowed'
                  }`}
                >
                  Confirm
                </button>
              </div>
              <button
                onClick={() => { setResetConfirm(false); setResetInput(''); }}
                className="w-full text-center font-label-md text-label-md text-ink-muted mt-3 hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
