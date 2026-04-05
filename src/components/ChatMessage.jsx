import { useState, useEffect } from 'react';

export default function ChatMessage({ message, isBot, isTyping, children }) {
  const [showDots, setShowDots] = useState(isTyping);
  const [showContent, setShowContent] = useState(!isTyping);

  useEffect(() => {
    if (isTyping) {
      setShowDots(true);
      setShowContent(false);
      const timer = setTimeout(() => {
        setShowDots(false);
        setShowContent(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isTyping]);

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4 animate-fade-in`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isBot
            ? 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
            : 'bg-[var(--color-text-primary)] text-[var(--color-surface)]'
        }`}
      >
        {showDots && (
          <div className="flex gap-1 py-1">
            <span className="w-2 h-2 bg-[var(--color-text-muted)] rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-[var(--color-text-muted)] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-[var(--color-text-muted)] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        {showContent && (
          <>
            {message && <p className="text-sm leading-relaxed">{message}</p>}
            {children}
          </>
        )}
      </div>
    </div>
  );
}
