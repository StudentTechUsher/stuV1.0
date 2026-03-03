import type { Decorator } from '@storybook/react';
import { COLOR_MODE_GLOBAL } from '@/lib/theme/dark-mode-contract';

type StorybookColorMode = 'light' | 'dark';

export const withColorMode: Decorator = (Story, context) => {
  const colorMode: StorybookColorMode = context.globals[COLOR_MODE_GLOBAL] === 'dark' ? 'dark' : 'light';

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.toggle('dark', colorMode === 'dark');
    root.style.colorScheme = colorMode;
    root.dataset.storybookColorMode = colorMode;
  }

  return (
    <div className={colorMode === 'dark' ? 'dark' : undefined} data-storybook-color-mode={colorMode}>
      <Story />
    </div>
  );
};
