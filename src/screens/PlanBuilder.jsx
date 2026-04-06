import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import OptionButton from '../components/OptionButton';
import ConfettiEffect from '../components/ConfettiEffect';
import { generatePlan } from '../utils/planGenerator';
import { getData, updateData } from '../utils/storage';
import { trackOnboardingStarted, trackOnboardingStep, trackPlanCreated } from '../utils/analytics';
import chatbotFlow from '../data/chatbot-flow.json';

const GOAL_LABELS = {
  muscle: 'Build muscle & get bigger',
  fat_loss: 'Lose fat and get lean',
  strength: 'Get stronger (powerlifting)',
  general: 'General fitness and health',
};

const EQUIPMENT_LABELS = {
  full_gym: 'Full gym',
  home_dumbbells: 'Home gym (dumbbells)',
  bodyweight: 'Bodyweight only',
};

const PLAN_TYPE_LABELS = {
  2: 'Full Body A/B Split',
  3: 'Push / Pull / Legs',
  4: 'Upper / Lower Split',
  5: 'Upper / Lower Split',
};

export default function PlanBuilder() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [currentStep, setCurrentStep] = useState(chatbotFlow.initial_step);
  const [answers, setAnswers] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [multiSelect, setMultiSelect] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    trackOnboardingStarted();
    showBotMessage(chatbotFlow.initial_step);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showOptions]);

  function showBotMessage(stepKey, updatedAnswers) {
    const step = chatbotFlow.steps[stepKey];
    if (!step) return;

    setIsTyping(true);
    setShowOptions(false);

    const ans = updatedAnswers || answers;
    let botMsg = step.bot_message || '';
    botMsg = botMsg.replace(/\{first_day\}/g, ans.scheduled_days?.[0]
      ? ans.scheduled_days[0].charAt(0).toUpperCase() + ans.scheduled_days[0].slice(1)
      : 'Monday');

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { type: 'bot', text: botMsg, step: stepKey }]);

      if (step.type === 'summary') {
        setMessages(prev => [...prev, { type: 'summary', answers: ans }]);
        setTimeout(() => { setCurrentStep('confirm'); showBotMessage('confirm', ans); }, 800);
        return;
      }

      if (step.type === 'complete') {
        handleComplete(ans);
        return;
      }

      setTimeout(() => setShowOptions(true), 200);
    }, 600);
  }

  function handleOptionSelect(option) {
    const stepData = chatbotFlow.steps[currentStep];

    setMessages(prev => [...prev, { type: 'user', text: option.label }]);
    setShowOptions(false);
    setHistory(prev => [...prev, { step: currentStep, answers: { ...answers } }]);

    const newAnswers = { ...answers };
    if (stepData.field) {
      newAnswers[stepData.field] = option.value;
    }

    trackOnboardingStep(stepIndex + 1, currentStep, option.label);
    setStepIndex(prev => prev + 1);
    setAnswers(newAnswers);

    const nextStep = option.next;
    setCurrentStep(nextStep);
    showBotMessage(nextStep, newAnswers);
  }

  function handleMultiSelectConfirm() {
    if (multiSelect.length === 0) return;

    const stepData = chatbotFlow.steps[currentStep];
    setMessages(prev => [...prev, {
      type: 'user',
      text: multiSelect.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', '),
    }]);
    setShowOptions(false);
    setHistory(prev => [...prev, { step: currentStep, answers: { ...answers } }]);

    const newAnswers = { ...answers };
    if (stepData.field) {
      newAnswers[stepData.field] = multiSelect;
    }

    trackOnboardingStep(stepIndex + 1, currentStep, multiSelect.join(','));
    setStepIndex(prev => prev + 1);
    setAnswers(newAnswers);
    setMultiSelect([]);

    const nextStep = stepData.next || 'equipment';
    setCurrentStep(nextStep);
    showBotMessage(nextStep, newAnswers);
  }

  async function handleComplete(finalAnswers) {
    setIsGenerating(true);
    const enrichedAnswers = { ...finalAnswers, activity: 'gym' };
    try {
      const plan = await generatePlan(enrichedAnswers);
      setShowConfetti(true);

      updateData(data => {
        data.onboarding_complete = true;
        data.user.persona = 'neutral';
        data.plans.push(plan);
        return data;
      });

      trackPlanCreated({
        activity: 'gym',
        experience_level: enrichedAnswers.experience_level,
        frequency: enrichedAnswers.frequency,
        persona: 'neutral',
        session_duration: enrichedAnswers.session_duration,
      });

      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error('Plan generation failed:', err);
      setMessages(prev => [...prev, { type: 'bot', text: 'Something went wrong. Let me try again…' }]);
      setIsGenerating(false);
    }
  }

  function handleBack() {
    navigate('/');
  }

  function getCurrentOptions() {
    const step = chatbotFlow.steps[currentStep];
    if (!step) return null;

    if (step.type === 'multi_select') {
      return (
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {step.options.map(opt => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={multiSelect.includes(opt.value)}
                onClick={() => {
                  setMultiSelect(prev =>
                    prev.includes(opt.value)
                      ? prev.filter(v => v !== opt.value)
                      : [...prev, opt.value]
                  );
                }}
              />
            ))}
          </div>
          {multiSelect.length > 0 && (
            <button
              onClick={handleMultiSelectConfirm}
              className="w-full py-2.5 rounded-full text-sm font-medium cursor-pointer transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-text-1)', color: 'var(--color-bg)' }}
            >
              Confirm ({multiSelect.length} days selected)
            </button>
          )}
        </div>
      );
    }

    if (!step.options) return null;

    return step.options.map(opt => (
      <OptionButton
        key={opt.label}
        label={opt.label}
        onClick={() => handleOptionSelect(opt)}
      />
    ));
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <ConfettiEffect trigger={showConfetti} />

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <button
          onClick={handleBack}
          className="text-sm transition-opacity cursor-pointer hover:opacity-70"
          style={{ color: 'var(--color-text-2)' }}
        >
          ← Back
        </button>
        <p className="font-display text-lg" style={{ color: 'var(--color-text-1)' }}>Set Up Your Plan</p>
        <div className="w-12" />
      </div>

      {/* Chat messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6"
        style={{ maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', width: '100%' }}
      >
        {messages.map((msg, i) => {
          if (msg.type === 'summary') {
            const freq = msg.answers.frequency;
            const planType = PLAN_TYPE_LABELS[freq] || 'Full Body';
            return (
              <div key={i} className="mb-4 animate-fade-in">
                <div
                  className="rounded-2xl p-5 mx-2"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-3)' }}>
                    Your Plan
                  </p>
                  <div className="space-y-2.5">
                    {[
                      ['Plan type', planType],
                      ['Goal', GOAL_LABELS[msg.answers.gym_goal] || msg.answers.gym_goal],
                      ['Level', msg.answers.experience_level ? msg.answers.experience_level.charAt(0).toUpperCase() + msg.answers.experience_level.slice(1) : null],
                      ['Frequency', `${freq} day${freq > 1 ? 's' : ''}/week`],
                      ['Days', msg.answers.scheduled_days?.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')],
                      ['Equipment', EQUIPMENT_LABELS[msg.answers.equipment] || msg.answers.equipment],
                    ].map(([label, value]) => value && (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span style={{ color: 'var(--color-text-3)' }}>{label}</span>
                        <span className="font-medium" style={{ color: 'var(--color-text-1)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }
          return (
            <ChatMessage
              key={i}
              message={msg.text}
              isBot={msg.type === 'bot'}
              isTyping={false}
            />
          );
        })}

        {isTyping && <ChatMessage isBot isTyping />}

        {isGenerating && (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: 'var(--color-text-3)', animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-3)' }}>Building your plan…</p>
          </div>
        )}
      </div>

      {/* Options panel */}
      {showOptions && !isGenerating && (
        <div
          className="shrink-0 px-4 py-4 animate-fade-in"
          style={{
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            maxWidth: '480px',
            marginLeft: 'auto',
            marginRight: 'auto',
            width: '100%',
          }}
        >
          <div className="flex flex-wrap gap-2">
            {getCurrentOptions()}
          </div>
        </div>
      )}
    </div>
  );
}
