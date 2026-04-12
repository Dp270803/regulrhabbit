import { useState, useEffect } from 'react';

export const DARK_COLORS = {
  bg: '#131313', low: '#1c1b1b', container: '#201f1f',
  high: '#2a2a2a', highest: '#353534', lowest: '#0e0e0e',
  primary: '#e9c349', onPrimary: '#3c2f00', green: '#2ff801',
  text: '#e5e2e1', muted: '#c4c7c7', faint: '#7b7c7c',
  red: '#ffb4ab', amber: '#f59e0b',
  separator: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.12)',
  navBg: 'rgba(19,19,19,0.94)',
  primaryBorder: 'rgba(233,195,73,0.22)',
  primaryRgb: '233,195,73',
  cardShadow: 'none',
  redSoft: 'rgba(255,180,171,0.4)',
};

export const LIGHT_COLORS = {
  bg: '#f5f6fa', low: '#ffffff', container: '#f0f2f7',
  high: '#e8eaf2', highest: '#dde0eb', lowest: '#ffffff',
  primary: '#005cab', onPrimary: '#ffffff', green: '#15803d',
  text: '#0d0f14', muted: '#3d4558', faint: '#8891a5',
  red: '#dc2626', amber: '#b45309',
  separator: 'rgba(0,0,0,0.05)',
  border: 'rgba(0,0,0,0.09)',
  navBg: 'rgba(245,246,250,0.96)',
  primaryBorder: 'rgba(0,92,171,0.2)',
  primaryRgb: '0,92,171',
  cardShadow: '0 1px 4px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
  redSoft: 'rgba(220,38,38,0.2)',
};

// Single broadcast channel so every useTheme() instance syncs on toggle
const THEME_EVENT = 'regulr-theme-change';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('regulr_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Listen for changes broadcast by any other useTheme instance
  useEffect(() => {
    const handler = (e) => setTheme(e.detail);
    window.addEventListener(THEME_EVENT, handler);
    return () => window.removeEventListener(THEME_EVENT, handler);
  }, []);

  // Apply the class to <html> and persist
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    try { localStorage.setItem('regulr_theme', theme); } catch {}
  }, [theme]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    // Broadcast to all other mounted useTheme() instances
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }));
  };

  return { theme, toggle, isDark: theme === 'dark' };
}

export function useThemeColors() {
  const { isDark } = useTheme();
  return isDark ? DARK_COLORS : LIGHT_COLORS;
}
