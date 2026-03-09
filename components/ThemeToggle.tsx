'use client';

import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="group flex items-center gap-1 px-2.5 py-1 rounded-full border border-border bg-transparent hover:border-muted-foreground/40 transition-colors text-sm leading-none"
    >
      {/* Sun — full opacity in light mode, dim + brightens on hover in dark mode */}
      <span className={`transition-opacity duration-150 ${isDark ? 'opacity-25 group-hover:opacity-60' : 'opacity-100'}`}>
        ☀️
      </span>
      {/* Moon — full opacity + light blue tint in dark mode, dim + brightens on hover in light mode */}
      <span
        className={`transition-opacity duration-150 ${isDark ? 'opacity-100' : 'opacity-25 group-hover:opacity-60'}`}
        style={isDark ? { filter: 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.6)' } : undefined}
      >
        🌙
      </span>
    </button>
  );
}
