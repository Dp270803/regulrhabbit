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
};

export const LIGHT_COLORS = {
  bg: '#f4f5f7', low: '#ffffff', container: '#eef0f3',
  high: '#e6e8ec', highest: '#dcdfe5', lowest: '#ffffff',
  primary: '#005cab', onPrimary: '#ffffff', green: '#166534',
  text: '#111318', muted: '#4b4f5a', faint: '#878c99',
  red: '#b91c1c', amber: '#b45309',
  separator: 'rgba(0,0,0,0.07)',
  border: 'rgba(0,0,0,0.12)',
  navBg: 'rgba(244,245,247,0.95)',
  primaryBorder: 'rgba(0,92,171,0.2)',
  primaryRgb: '0,92,171',
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
