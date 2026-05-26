/**
 * AskCoach.jsx
 *
 * Floating "Ask Coach" widget for on-demand Q&A grounded in The Muscle Ladder.
 * - Collapsed: single round button bottom-right.
 * - Expanded: chat panel with conversation history (in-memory, not persisted).
 *
 * Calls /.netlify/functions/qa-chat. Uses user's active plan + injuries + goal
 * as context. Optionally accepts `currentExercise` for in-session form questions.
 */

import { useState, useRef, useEffect } from 'react';
import { MessageCircleQuestion, X, Send } from 'lucide-react';
import { useThemeColors } from '../hooks/useTheme';
import { getData } from '../utils/storage';

const SUGGESTED_QUESTIONS = [
  'How do I fix lower back rounding on RDLs?',
  'What can I do instead of barbell squats with a bad knee?',
  'How close to failure should my last set be?',
  'Should I deload this week?',
];

export default function AskCoach({ currentExercise = null }) {
  const C = useThemeColors();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);  // [{role, content, book_reference, subs}]
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  async function ask(question) {
    const trimmed = question.trim();
    if (!trimmed || busy) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setBusy(true);

    const data = getData();
    const activePlan = data.plans?.find(p => p.status === 'active');

    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/.netlify/functions/qa-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          context: {
            active_plan: activePlan?.name || activePlan?.activity || null,
            current_exercise: currentExercise,
            injuries: data.user?.injuries || [],
            goal: data.user?.goal || null,
            experience_level: data.user?.training_experience || 'intermediate',
          },
          history,
        }),
      });
      const result = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.answer || 'Try again - I couldn\'t respond just now.',
        book_reference: result.book_reference,
        subs: result.suggested_substitutions || [],
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'The coach is offline right now. Try again in a moment.',
      }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask coach"
        style={{
          position: 'fixed', right: '20px', bottom: '108px', zIndex: 60,
          width: '52px', height: '52px', borderRadius: '50%',
          background: C.primary, color: C.onPrimary, border: 'none',
          boxShadow: `0 8px 28px rgba(${C.primaryRgb},0.36)`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <MessageCircleQuestion size={22} strokeWidth={2.2} />
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', right: '20px', bottom: '108px', zIndex: 60,
      width: 'min(380px, calc(100vw - 32px))', maxHeight: 'min(620px, calc(100vh - 200px))',
      background: C.low, border: `1px solid ${C.border}`,
      borderRadius: '16px', boxShadow: `0 18px 48px rgba(0,0,0,0.35)`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: `1px solid ${C.separator}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: C.lowest,
      }}>
        <div>
          <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.primary, margin: '0 0 2px' }}>
            Ask Coach
          </p>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: C.text, margin: 0 }}>
            Grounded in The Muscle Ladder
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          style={{ background: 'transparent', border: 'none', color: C.faint, cursor: 'pointer', padding: 4 }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        {messages.length === 0 && (
          <>
            <p style={{ fontSize: '0.82rem', color: C.muted, margin: '0 0 6px', lineHeight: 1.5 }}>
              Ask about form, substitutions, programming - anything from the book.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  style={{
                    textAlign: 'left', padding: '9px 12px', borderRadius: '8px',
                    background: C.lowest, border: `1px solid ${C.border}`,
                    color: C.text, fontSize: '0.78rem', cursor: 'pointer',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
            <div style={{
              padding: '10px 13px', borderRadius: '12px',
              background: m.role === 'user' ? C.primary : C.lowest,
              color: m.role === 'user' ? C.onPrimary : C.text,
              border: m.role === 'user' ? 'none' : `1px solid ${C.border}`,
              fontSize: '0.85rem', lineHeight: 1.55,
            }}>
              {m.content}
            </div>
            {m.role === 'assistant' && m.book_reference && (
              <p style={{ fontSize: '0.65rem', color: C.faint, marginTop: 4, fontStyle: 'italic' }}>
                - {m.book_reference}
              </p>
            )}
            {m.role === 'assistant' && m.subs?.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {m.subs.map((s, si) => (
                  <div key={si} style={{
                    padding: '7px 10px', borderRadius: '8px', background: `rgba(${C.primaryRgb},0.08)`,
                    fontSize: '0.78rem', color: C.text, border: `1px solid rgba(${C.primaryRgb},0.18)`,
                  }}>
                    <span style={{ fontWeight: 700, color: C.primary }}>{s.name}</span>
                    {s.reason && <span style={{ color: C.muted }}> - {s.reason}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div style={{ alignSelf: 'flex-start', padding: '10px 13px', borderRadius: '12px', background: C.lowest, border: `1px solid ${C.border}`, color: C.faint, fontSize: '0.82rem' }}>
            Thinking…
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.separator}`, background: C.lowest }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Ask about form, substitutions…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ask(input)}
            disabled={busy}
            style={{
              flex: 1, padding: '9px 12px', borderRadius: '10px',
              border: `1px solid ${C.border}`, background: C.container,
              color: C.text, fontSize: '0.85rem', outline: 'none',
            }}
          />
          <button
            onClick={() => ask(input)}
            disabled={busy || !input.trim()}
            style={{
              padding: '9px', borderRadius: '10px',
              background: busy || !input.trim() ? C.separator : C.primary,
              color: busy || !input.trim() ? C.faint : C.onPrimary,
              border: 'none', cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
