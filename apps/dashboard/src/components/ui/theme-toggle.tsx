'use client';

import { Check, Monitor, Moon, Sun } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTheme, type Theme } from '@/providers/ThemeProvider';

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const LABEL: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System (follows your OS)',
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Theme: ${LABEL[theme]}`}
            title={`Theme: ${LABEL[theme]}`}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon' }),
              'text-muted-foreground'
            )}
          />
        }
      >
        {theme === 'system' ? (
          <Monitor className="size-4" />
        ) : (
          <>
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:block" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-36">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
            <Icon className="mr-2 size-4" />
            <span>{label}</span>
            {theme === value && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
