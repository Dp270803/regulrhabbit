import { useNavigate } from 'react-router-dom';
import { addCredits } from '../utils/storage';

const VALUE_PROPS = [
  '7 days of meals, fully structured',
  'Matched to your exact macros',
  'Your cuisine and diet type',
  'Grocery list with quantities',
  'Prep time for every meal',
];

export default function Paywall() {
  const navigate = useNavigate();

  const handlePrimary = () => {
    // TODO: Replace with RevenueCat integration
    addCredits(3, 'stub_3pack');
    navigate('/nutriplan/loading');
  };

  const handleSecondary = () => {
    // TODO: Replace with RevenueCat integration
    addCredits(3, 'stub_addon');
    navigate('/nutriplan/loading');
  };

  return (
    <div className="min-h-screen bg-surface-paper relative overflow-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary-container/20 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-clay-accent/10 blur-3xl" />

      <main className="flex flex-col max-w-xl mx-auto w-full px-container-margin pb-section-padding pt-6 min-h-screen">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-cream text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95 mb-6"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            arrow_back
          </span>
        </button>

        {/* Headline */}
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-3">
          Your plan is ready to be built
        </h1>

        {/* Explanation */}
        <p className="font-body-md text-body-md text-on-surface-variant mb-8">
          We'll generate a complete 7-day meal plan tailored to your body, goals,
          and food preferences. Every meal is calorie-counted and macro-balanced.
        </p>

        {/* Value props */}
        <div className="flex flex-col gap-4 mb-10">
          {VALUE_PROPS.map((prop) => (
            <div key={prop} className="flex items-start gap-3">
              <span
                className="material-symbols-outlined text-primary mt-0.5 shrink-0"
                style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <span className="font-body-md text-body-md text-ink-black">{prop}</span>
            </div>
          ))}
        </div>

        {/* Spacer to push CTAs toward bottom */}
        <div className="flex-grow" />

        {/* Primary CTA */}
        <div className="relative mb-4">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-clay-accent text-white font-label-md text-label-md px-4 py-0.5 rounded-full whitespace-nowrap z-10">
            Most popular
          </span>
          <button
            onClick={handlePrimary}
            className="bg-primary-container text-on-primary-container w-full py-5 rounded-xl font-label-md text-label-md font-bold uppercase tracking-widest shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          >
            3 Meal Plans &mdash; $3.99
          </button>
        </div>

        {/* Secondary CTA */}
        <button
          onClick={handleSecondary}
          className="w-full py-4 rounded-xl font-label-md text-label-md font-bold uppercase tracking-widest border-2 border-primary-container text-primary transition-all duration-200 hover:bg-primary-container/10 active:scale-[0.98] mb-6"
        >
          3 More Plans &mdash; $1.99
        </button>

        {/* Restore purchases */}
        <button className="w-full text-center font-label-md text-label-md text-ink-muted py-2 hover:underline transition-colors mb-4">
          Restore purchases
        </button>

        {/* Terms / Privacy */}
        <div className="flex items-center justify-center gap-2 font-label-md text-label-md text-ink-muted/60">
          <a href="#" className="hover:underline">Terms</a>
          <span>&middot;</span>
          <a href="#" className="hover:underline">Privacy</a>
        </div>
      </main>
    </div>
  );
}
