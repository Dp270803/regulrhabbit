import { useEffect, useState } from 'react';

const COLORS = ['#E8C162', '#4ADE80', '#FFFFFF', '#E8C162', '#4ADE80', '#E8C162'];

export default function ConfettiEffect({ trigger }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!trigger) return;

    const items = Array.from({ length: 48 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.6,
      duration: 2.2 + Math.random() * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      width: 3 + Math.random() * 5,
      height: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      // slight horizontal drift
      drift: (Math.random() - 0.5) * 60,
    }));

    setParticles(items);
    const t = setTimeout(() => setParticles([]), 5500);
    return () => clearTimeout(t);
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) translateX(0) rotate(var(--rot)); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(100vh) translateX(var(--drift)) rotate(calc(var(--rot) + 540deg)); opacity: 0; }
        }
      `}</style>
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.left}%`,
            width: p.width,
            height: p.height,
            background: p.color,
            borderRadius: '1px',
            opacity: p.color === '#FFFFFF' ? 0.6 : 0.9,
            '--rot': `${p.rotation}deg`,
            '--drift': `${p.drift}px`,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
