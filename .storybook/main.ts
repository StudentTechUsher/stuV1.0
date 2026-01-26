import type { StorybookConfig } from '@storybook/nextjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    // Temporarily disabled - need v10 compatible versions
    // '@storybook/addon-essentials',
    // '@storybook/addon-interactions',
    // '@storybook/addon-a11y',
    // '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {
      nextConfigPath: join(__dirname, '../next.config.ts'),
    },
  },
  staticDirs: ['../public'],
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => {
        if (prop.parent) {
          return !prop.parent.fileName.includes('node_modules');
        }
        return true;
      },
    },
  },
  webpackFinal: async (config) => {
    // Add path alias
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': join(__dirname, '../'),
      };
    }

    return config;
  },
};

export default config;
