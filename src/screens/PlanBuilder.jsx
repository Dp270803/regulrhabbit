import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import OptionButton from '../components/OptionButton';
import ConfettiEffect from '../components/ConfettiEffect';
import { generatePlan } from '../utils/planGenerator';
import { getData, updateData } from '../utils/storage';
import { trackOnboardingStarted, trackOnboardingStep, trackPlanCreated } from '../utils/analytics';
import chatbotFlow from '../data/chatbot-flow.json';

const ACTIVITY_LABELS = {
  gym: 'Gym / Strength Training',
  swimming: 'Swimming',
  running: 'Running',
  yoga: 'Yoga',
  dance: 'Dance',
  singing: 'Singing / Vocals',
  instrument: 'Musical Instrument',
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

    let botMsg = step.bot_message || '';
    const ans = updatedAnswers || answers;
    botMsg = botMsg.replace(/\{activity\}/g, ACTIVITY_LABELS[ans.activity] || ans.activity || 'this');
    botMsg = botMsg.replace(/\{first_day\}/g, ans.scheduled_days?.[0] || 'Monday');

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { type: 'bot', text: botMsg, step: stepKey }]);

      if (step.type === 'summary') {
        setMessages(prev => [...prev, { type: 'summary', answers: ans }]);
        setTimeout(() => {
          showBotMessage('confirm', ans);
        }, 800);
        return;
      }

      if (step.type === 'complete') {
        handleComplete(ans);
        return;
      }

      setTimeout(() => setShowOptions(true), 200);
    }, 600);
  }

  function handleOptionSelect(option, step) {
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

    // Restarter warning check
    if (currentStep === 'frequency' && stepData.restarter_warning) {
      const warn = stepData.restarter_warning;
      if (newAnswers.persona === warn.condition.persona && option.value === warn.condition.value) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, { type: 'bot', text: warn.message }]);
          setCurrentStep('frequency_warning');
          setTimeout(() => setShowOptions(true), 200);
        }, 600);
        return;
      }
    }

    let nextStep = option.next;
    if (nextStep === 'activity_specific') {
      const activity = newAnswers.activity;
      const conditional = chatbotFlow.steps.activity_specific;
      if (conditional?.conditions?.[activity]) {
        const actStep = conditional.conditions[activity];
        setCurrentStep('activity_specific');

        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, { type: 'bot', text: actStep.bot_message }]);
          setCurrentStep(`activity_specific_${activity}`);
          setTimeout(() => setShowOptions(true), 200);
        }, 600);
        return;
      }
      nextStep = 'time_preference';
    }

    setCurrentStep(nextStep);
    showBotMessage(nextStep, newAnswers);
  }

  function handleMultiSelectConfirm() {
    if (multiSelect.length === 0) return;

    const stepData = chatbotFlow.steps[currentStep];
    setMessages(prev => [...prev, { type: 'user', text: multiSelect.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ') }]);
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

    if (multiSelect.length > (newAnswers.frequency || 3)) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          type: 'bot',
          text: `You picked ${multiSelect.length} days but said ${newAnswers.frequency} days/week. I'll use these ${multiSelect.length} days and build rest days around them.`,
        }]);
        const next = stepData.next || 'activity_specific';
        setCurrentStep(next);
        setTimeout(() => showBotMessage(next, newAnswers), 800);
      }, 600);
      return;
    }

    const next = stepData.next || 'activity_specific';
    setCurrentStep(next);
    showBotMessage(next, newAnswers);
  }

  async function handleComplete(finalAnswers) {
    setIsGenerating(true);
    try {
      const plan = await generatePlan(finalAnswers);
      setShowConfetti(true);

      updateData(data => {
        data.onboarding_complete = true;
        data.user.persona = finalAnswers.persona || 'neutral';
        data.user.preferred_time = finalAnswers.preferred_time || 'none';
        data.plans.push(plan);
        return data;
      });

      trackPlanCreated({
        activity: finalAnswers.activity,
        experience_level: finalAnswers.experience_level,
        frequency: finalAnswers.frequency,
        persona: finalAnswers.persona,
        session_duration: finalAnswers.session_duration,
      });

      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error('Plan generation failed:', err);
      setMessages(prev => [...prev, { type: 'bot', text: 'Something went wrong generating your plan. Let me try again...' }]);
      setIsGenerating(false);
    }
  }

  function handleBack() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setAnswers(prev.answers);
    setCurrentStep(prev.step);
    setMessages(msgs => {
      const lastBotIdx = msgs.length - 1;
      let cutIdx = lastBotIdx;
      while (cutIdx >= 0 && msgs[cutIdx].step !== prev.step) cutIdx--;
      return msgs.slice(0, Math.max(cutIdx, 0));
    });
    setShowOptions(false);
    setTimeout(() => showBotMessage(prev.step, prev.answers), 100);
  }

  function getCurrentOptions() {
    if (currentStep === 'frequency_warning') {
      const warn = chatbotFlow.steps.frequency.restarter_warning;
      return warn.options.map(opt => (
        <OptionButton
          key={opt.label}
          label={opt.label}
          onClick={() => {
            setMessages(prev => [...prev, { type: 'user', text: opt.label }]);
            setShowOptions(false);
            const newAnswers = { ...answers, frequency: opt.value };
            setAnswers(newAnswers);
            setCurrentStep(opt.next);
            showBotMessage(opt.next, newAnswers);
          }}
        />
      ));
    }

    if (currentStep.startsWith('activity_specific_')) {
      const activity = answers.activity;
      const actStep = chatbotFlow.steps.activity_specific.conditions[activity];
      if (!actStep) return null;
      return actStep.options.map(opt => (
        <OptionButton
          key={opt.label}
          label={opt.label}
          onClick={() => {
            setMessages(prev => [...prev, { type: 'user', text: opt.label }]);
            setShowOptions(false);
            setHistory(prev => [...prev, { step: currentStep, answers: { ...answers } }]);
            const newAnswers = { ...answers };
            if (actStep.field) newAnswers[actStep.field] = opt.value;
            setAnswers(newAnswers);
            setCurrentStep(opt.next);
            showBotMessage(opt.next, newAnswers);
          }}
        />
      ));
    }

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
              Confirm ({multiSelect.length} days)
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
        onClick={() => handleOptionSelect(opt, step)}
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
          disabled={history.length === 0}
          className="text-sm transition-opacity disabled:opacity-20 cursor-pointer disabled:cursor-default"
          style={{ color: 'var(--color-text-2)' }}
        >
          ← Back
        </button>
        <p className="font-display text-lg" style={{ color: 'var(--color-text-1)' }}>Set Up Your Plan</p>
        <div className="w-12" />
      </div>

      {/* Chat messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6"
        style={{ maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', width: '100%' }}
      >
        {messages.map((msg, i) => {
          if (msg.type === 'summary') {
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
                    Your Plan Summary
                  </p>
                  <div className="space-y-2">
                    {[
                      ['Activity', ACTIVITY_LABELS[msg.answers.activity] || msg.answers.activity],
                      ['Level', msg.answers.experience_level],
                      ['Frequency', `${msg.answers.frequency} days/week`],
                      ['Duration', `${msg.answers.session_duration} min`],
                      ['Days', msg.answers.scheduled_days?.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')],
                    ].map(([label, value]) => value && (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span style={{ color: 'var(--color-text-3)' }}>{label}</span>
                        <span style={{ color: 'var(--color-text-1)' }}>{value}</span>
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
