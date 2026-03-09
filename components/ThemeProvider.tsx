'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayOpaque, setOverlayOpaque] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    const initial = saved === 'light' || saved === 'dark' ? saved : 'dark';
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggle = () => {
    if (toggling) return; // debounce mid-transition clicks
    setToggling(true);

    const next: Theme = theme === 'dark' ? 'light' : 'dark';

    // 1. Mount overlay (invisible)
    setOverlayVisible(true);

    // 2. Trigger fade-in on next paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOverlayOpaque(true));
    });

    // 3. Swap theme at peak blur (midpoint of fade-in)
    setTimeout(() => {
      setTheme(next);
      localStorage.setItem('theme', next);
      applyTheme(next);
    }, 200);

    // 4. Start fade-out
    setTimeout(() => {
      setOverlayOpaque(false);
    }, 320);

    // 5. Unmount overlay + unlock
    setTimeout(() => {
      setOverlayVisible(false);
      setToggling(false);
    }, 560);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}

      {/* Frosted glass transition overlay */}
      {overlayVisible && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            pointerEvents: 'none',
            backdropFilter: 'blur(12px) saturate(0.6)',
            WebkitBackdropFilter: 'blur(12px) saturate(0.6)',
            backgroundColor: 'rgba(150, 150, 160, 0.18)',
            opacity: overlayOpaque ? 1 : 0,
            transition: 'opacity 220ms ease-in-out',
          }}
        />
      )}
    </ThemeContext.Provider>
  );
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}
