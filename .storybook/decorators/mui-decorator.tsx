import type { Decorator } from '@storybook/react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

// Create Emotion cache for Material-UI
const cache = createCache({
  key: 'storybook-mui',
  prepend: true,
});

export const withMuiTheme: Decorator = (Story) => {
  return (
    <CacheProvider value={cache}>
      <Story />
    </CacheProvider>
  );
};
