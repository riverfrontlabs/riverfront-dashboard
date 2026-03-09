'use client';

import { useTheme } from './ThemeProvider';
import { Button } from './ui/button';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={toggle}
      className="text-xs"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </Button>
  );
}
