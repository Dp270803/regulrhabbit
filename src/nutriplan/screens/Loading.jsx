import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, getTargets, saveMealPlan } from '../utils/storage';

const MEAL_TYPES_BY_COUNT = {
  3: ['breakfast', 'lunch', 'dinner'],
  4: ['breakfast', 'lunch', 'snack', 'dinner'],
  5: ['breakfast', 'snack', 'lunch', 'snack', 'dinner'],
};

const MOCK_MEALS = {
  breakfast: [
    {
      name: 'Masala Oats Upma',
      calories: 320, protein_g: 12, fat_g: 10, carb_g: 46,
      prep_time: '15 min',
      ingredients: [
        { name: 'Rolled oats', quantity: 80, unit: 'g', category: 'Grains & Staples' },
        { name: 'Onion', quantity: 1, unit: 'medium', category: 'Vegetables' },
        { name: 'Green peas', quantity: 40, unit: 'g', category: 'Vegetables' },
        { name: 'Mustard seeds', quantity: 5, unit: 'g', category: 'Spices' },
        { name: 'Turmeric', quantity: 2, unit: 'g', category: 'Spices' },
      ],
      instructions: 'Heat oil and splutter mustard seeds. Saute onions until translucent. Add peas, turmeric, and oats with 2 cups water. Cook until thick and fluffy.',
    },
    {
      name: 'Moong Dal Cheela',
      calories: 280, protein_g: 18, fat_g: 8, carb_g: 35,
      prep_time: '20 min',
      ingredients: [
        { name: 'Moong dal', quantity: 100, unit: 'g', category: 'Proteins & Dairy' },
        { name: 'Ginger', quantity: 10, unit: 'g', category: 'Vegetables' },
        { name: 'Green chili', quantity: 1, unit: 'pc', category: 'Vegetables' },
        { name: 'Cumin seeds', quantity: 5, unit: 'g', category: 'Spices' },
        { name: 'Coriander leaves', quantity: 10, unit: 'g', category: 'Vegetables' },
      ],
      instructions: 'Blend soaked dal with ginger and chili into a batter. Add cumin and coriander. Pour thin rounds on a hot griddle and cook both sides until golden.',
    },
    {
      name: 'Poha with Peanuts',
      calories: 310, protein_g: 9, fat_g: 12, carb_g: 42,
      prep_time: '12 min',
      ingredients: [
        { name: 'Flattened rice (poha)', quantity: 100, unit: 'g', category: 'Grains & Staples' },
        { name: 'Peanuts', quantity: 20, unit: 'g', category: 'Proteins & Dairy' },
        { name: 'Onion', quantity: 1, unit: 'small', category: 'Vegetables' },
        { name: 'Curry leaves', quantity: 8, unit: 'pc', category: 'Spices' },
        { name: 'Lemon', quantity: 0.5, unit: 'pc', category: 'Vegetables' },
      ],
      instructions: 'Rinse poha and set aside. Fry peanuts and curry leaves in oil. Add onions, then poha with turmeric. Toss well and finish with lemon juice.',
    },
  ],
  lunch: [
    {
      name: 'Rajma Chawal',
      calories: 480, protein_g: 22, fat_g: 10, carb_g: 72,
      prep_time: '35 min',
      ingredients: [
        { name: 'Kidney beans', quantity: 100, unit: 'g', category: 'Proteins & Dairy' },
        { name: 'Basmati rice', quantity: 100, unit: 'g', category: 'Grains & Staples' },
        { name: 'Tomato puree', quantity: 100, unit: 'ml', category: 'Vegetables' },
        { name: 'Onion', quantity: 1, unit: 'large', category: 'Vegetables' },
        { name: 'Rajma masala', quantity: 10, unit: 'g', category: 'Spices' },
      ],
      instructions: 'Pressure cook soaked rajma until soft. Saute onions, add tomato puree and spices. Add cooked rajma and simmer 15 minutes. Serve over steamed rice.',
    },
    {
      name: 'Palak Paneer with Roti',
      calories: 520, protein_g: 26, fat_g: 24, carb_g: 48,
      prep_time: '30 min',
      ingredients: [
        { name: 'Spinach', quantity: 200, unit: 'g', category: 'Vegetables' },
        { name: 'Paneer', quantity: 150, unit: 'g', category: 'Proteins & Dairy' },
        { name: 'Whole wheat flour', quantity: 80, unit: 'g', category: 'Grains & Staples' },
        { name: 'Garlic', quantity: 3, unit: 'cloves', category: 'Vegetables' },
        { name: 'Cream', quantity: 15, unit: 'ml', category: 'Proteins & Dairy' },
      ],
      instructions: 'Blend blanched spinach. Saute garlic, add puree, spices, and paneer cubes. Simmer 10 minutes. Serve with fresh whole wheat rotis.',
    },
    {
      name: 'Chole with Bhature',
      calories: 540, protein_g: 20, fat_g: 18, carb_g: 74,
      prep_time: '40 min',
      ingredients: [
        { name: 'Chickpeas', quantity: 100, unit: 'g', category: 'Proteins & Dairy' },
        { name: 'All-purpose flour', quantity: 80, unit: 'g', category: 'Grains & Staples' },
        { name: 'Tea bag', quantity: 1, unit: 'pc', category: 'Other' },
        { name: 'Onion', quantity: 1, unit: 'large', category: 'Vegetables' },
        { name: 'Chole masala', quantity: 15, unit: 'g', category: 'Spices' },
      ],
      instructions: 'Pressure cook chickpeas with tea bag for color. Make a rich onion-tomato gravy with chole masala. Deep fry bhature from kneaded dough. Serve together.',
    },
  ],
  dinner: [
    {
      name: 'Dal Tadka with Jeera Rice',
      calories: 440, protein_g: 20, fat_g: 12, carb_g: 64,
      prep_time: '25 min',
      ingredients: [
        { name: 'Toor dal', quantity: 100, unit: 'g', category: 'Proteins & Dairy' },
        { name: 'Basmati rice', quantity: 75, unit: 'g', category: 'Grains & Staples' },
        { name: 'Cumin seeds', quantity: 5, unit: 'g', category: 'Spices' },
        { name: 'Ghee', quantity: 15, unit: 'ml', category: 'Proteins & Dairy' },
        { name: 'Dried red chili', quantity: 2, unit: 'pc', category: 'Spices' },
      ],
      instructions: 'Cook dal until soft. Prepare tadka with ghee, cumin, and dried chilies. Pour over dal. Cook jeera rice with whole cumin seeds. Serve together.',
    },
    {
      name: 'Baingan Bharta with Bajra Roti',
      calories: 380, protein_g: 14, fat_g: 14, carb_g: 52,
      prep_time: '30 min',
      ingredients: [
        { name: 'Eggplant', quantity: 1, unit: 'large', category: 'Vegetables' },
        { name: 'Bajra flour', quantity: 80, unit: 'g', category: 'Grains & Staples' },
        { name: 'Onion', quantity: 1, unit: 'medium', category: 'Vegetables' },
        { name: 'Tomato', quantity: 2, unit: 'medium', category: 'Vegetables' },
        { name: 'Green chili', quantity: 2, unit: 'pc', category: 'Vegetables' },
      ],
      instructions: 'Roast eggplant over flame until charred. Mash the flesh. Saute onions, tomatoes, and chilies. Add mashed eggplant and cook 10 minutes. Serve with bajra roti.',
    },
    {
      name: 'Paneer Tikka with Mint Chutney',
      calories: 420, protein_g: 28, fat_g: 22, carb_g: 26,
      prep_time: '25 min',
      ingredients: [
        { name: 'Paneer', quantity: 200, unit: 'g', category: 'Proteins & Dairy' },
        { name: 'Yogurt', quantity: 100, unit: 'ml', category: 'Proteins & Dairy' },
        { name: 'Bell pepper', quantity: 1, unit: 'pc', category: 'Vegetables' },
        { name: 'Tikka masala', quantity: 10, unit: 'g', category: 'Spices' },
        { name: 'Fresh mint', quantity: 15, unit: 'g', category: 'Vegetables' },
      ],
      instructions: 'Marinate paneer and bell pepper in spiced yogurt for 15 minutes. Grill or pan-fry until charred. Blend mint with yogurt for chutney. Serve together.',
    },
  ],
  snack: [
    {
      name: 'Roasted Makhana',
      calories: 160, protein_g: 5, fat_g: 6, carb_g: 22,
      prep_time: '8 min',
      ingredients: [
        { name: 'Fox nuts (makhana)', quantity: 50, unit: 'g', category: 'Grains & Staples' },
        { name: 'Ghee', quantity: 5, unit: 'ml', category: 'Proteins & Dairy' },
        { name: 'Black salt', quantity: 1, unit: 'g', category: 'Spices' },
        { name: 'Chaat masala', quantity: 2, unit: 'g', category: 'Spices' },
      ],
      instructions: 'Dry roast makhana in a pan until crisp. Add ghee, toss with salt and chaat masala. Let cool before eating.',
    },
    {
      name: 'Sprout Chaat',
      calories: 180, protein_g: 10, fat_g: 4, carb_g: 26,
      prep_time: '10 min',
      ingredients: [
        { name: 'Mixed sprouts', quantity: 100, unit: 'g', category: 'Proteins & Dairy' },
        { name: 'Onion', quantity: 1, unit: 'small', category: 'Vegetables' },
        { name: 'Tomato', quantity: 1, unit: 'small', category: 'Vegetables' },
        { name: 'Lemon juice', quantity: 15, unit: 'ml', category: 'Vegetables' },
        { name: 'Chaat masala', quantity: 2, unit: 'g', category: 'Spices' },
      ],
      instructions: 'Boil or steam sprouts until tender. Toss with onion, tomato, lemon juice, and chaat masala. Serve immediately.',
    },
  ],
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function generateMockPlan(user, targets) {
  const mealsPerDay = user.meals_per_day || 3;
  const mealTypes = MEAL_TYPES_BY_COUNT[mealsPerDay] || MEAL_TYPES_BY_COUNT[3];

  const days = DAY_NAMES.map((dayName) => {
    const meals = mealTypes.map((mealType, idx) => {
      const pool = MOCK_MEALS[mealType] || MOCK_MEALS.snack;
      const meal = pool[idx % pool.length];
      return {
        meal_type: mealType,
        ...meal,
      };
    });

    return {
      day: dayName,
      meals,
    };
  });

  return {
    id: `plan_${Date.now()}`,
    created_at: new Date().toISOString(),
    targets: { ...targets },
    preferences: {
      dietary_preference: user.dietary_preference,
      cuisine: user.cuisine,
      meals_per_day: user.meals_per_day,
      allergies: user.allergies,
    },
    days,
  };
}

const TIMEOUT_MS = 30000;
const STUB_DELAY_MS = 3000;

export default function Loading() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const user = getUser();
  const targets = getTargets();

  const dietLabel = user.dietary_preference
    ? user.dietary_preference.charAt(0).toUpperCase() + user.dietary_preference.slice(1)
    : '';
  const cuisineLabel = user.cuisine
    ? user.cuisine.charAt(0).toUpperCase() + user.cuisine.slice(1).replace('_', ' ')
    : '';
  const calsLabel = targets.target_calories
    ? targets.target_calories.toLocaleString()
    : '---';

  const specParts = [
    `${calsLabel} kcal`,
    dietLabel,
    cuisineLabel,
  ].filter(Boolean);

  const generatePlan = () => {
    setError(null);

    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        setError('Generation timed out. Please try again.');
      }
    }, TIMEOUT_MS);

    // Stub: simulate a 3-second generation delay
    const delayId = setTimeout(() => {
      clearTimeout(timeoutId);
      if (!mountedRef.current) return;

      try {
        const plan = generateMockPlan(user, targets);
        saveMealPlan(plan);
        navigate('/nutriplan/plan', { replace: true });
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message || 'Something went wrong. Please try again.');
        }
      }
    }, STUB_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(delayId);
    };
  };

  useEffect(() => {
    mountedRef.current = true;
    const cleanup = generatePlan();
    return () => {
      mountedRef.current = false;
      if (cleanup) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-surface-paper flex items-center justify-center">
        <div className="max-w-sm mx-auto px-container-margin text-center">
          <span
            className="material-symbols-outlined text-error mb-4 block"
            style={{ fontSize: 48 }}
          >
            error_outline
          </span>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
            Something went wrong
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8">
            {error}
          </p>
          <button
            onClick={generatePlan}
            className="bg-primary-container text-on-primary-container w-full py-4 rounded-xl font-label-md text-label-md font-bold uppercase tracking-widest shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.98] mb-4"
          >
            Try again
          </button>
          <button
            onClick={() => navigate(-1)}
            className="font-label-md text-label-md text-ink-muted hover:underline transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-paper flex items-center justify-center">
      <div className="max-w-sm mx-auto px-container-margin text-center">
        {/* Pulsing circle animation */}
        <div className="flex items-center justify-center mb-8">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-primary-container/30 animate-np-pulse" />
            <div
              className="absolute inset-3 rounded-full bg-primary-container/50 animate-np-pulse"
              style={{ animationDelay: '0.4s' }}
            />
            <div
              className="absolute inset-6 rounded-full bg-primary-container animate-np-pulse"
              style={{ animationDelay: '0.8s' }}
            />
          </div>
        </div>

        {/* Main text */}
        <h1 className="font-headline-md text-headline-md text-on-surface mb-3">
          Building your meal plan
        </h1>

        {/* User specs subtext */}
        <p className="font-body-md text-body-md text-on-surface-variant">
          {specParts.join(' · ')}
        </p>
      </div>
    </div>
  );
}
