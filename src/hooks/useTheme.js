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
  bg: '#fbf9f8', low: '#f5f3f3', container: '#f0eded',
  high: '#eae8e7', highest: '#e4e2e1', lowest: '#ffffff',
  primary: '#005cab', onPrimary: '#ffffff', green: '#166534',
  text: '#1b1c1c', muted: '#5f5e5e', faint: '#727783',
  red: '#b91c1c', amber: '#b45309',
  separator: 'rgba(0,0,0,0.06)',
  border: 'rgba(0,0,0,0.1)',
  navBg: 'rgba(251,249,248,0.94)',
  primaryBorder: 'rgba(0,92,171,0.18)',
  primaryRgb: '0,92,171',
};

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('regulr_theme');
      return stored || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    try {
      localStorage.setItem('regulr_theme', theme);
    } catch {}
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return { theme, toggle, isDark: theme === 'dark' };
}

export function useThemeColors() {
  const { isDark } = useTheme();
  return isDark ? DARK_COLORS : LIGHT_COLORS;
}
