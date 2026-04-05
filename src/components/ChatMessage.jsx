export default function ChatMessage({ message, isBot, isTyping }) {
  if (isTyping) {
    return (
      <div className="flex items-end gap-2 mb-4">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: 'var(--color-border-strong)', color: 'var(--color-text-1)' }}
        >
          R
        </div>
        <div
          className="px-4 py-3 rounded-2xl rounded-bl-sm"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex gap-1 items-center h-4">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: 'var(--color-text-3)', animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isBot) {
    return (
      <div className="flex items-end gap-2 mb-4 animate-fade-in-up">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: 'var(--color-text-1)', color: 'var(--color-bg)' }}
        >
          R
        </div>
        <div
          className="flex-1 px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-1)',
          }}
        >
          {message}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end mb-4 animate-fade-in">
      <div
        className="px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed max-w-[75%]"
        style={{
          background: 'var(--color-text-1)',
          color: 'var(--color-bg)',
        }}
      >
        {message}
      </div>
    </div>
  );
}
