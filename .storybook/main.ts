import type { StorybookConfig } from '@storybook/nextjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig = {
  stories: [
    '../components/**/*.stories.@(js|jsx|ts|tsx)',
    '../app/**/*.stories.@(js|jsx|ts|tsx)',
  ],
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
        '@/lib/services/server-actions': join(__dirname, './mocks/server-actions.ts'),
        '@/hooks/useAuth': join(__dirname, './mocks/useAuth.ts'),
        // Mock node modules
        'node:buffer': require.resolve('buffer/'),
        'node:stream': require.resolve('stream-browserify'),
        'node:util': require.resolve('util/'),
      };

      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer/'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util/'),
        process: require.resolve('process/browser'),
        fs: false,
        path: false,
        os: false,
      };
    }

    // Provide global Buffer + strip node: protocol imports for webpack
    const webpack = await import('webpack');
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.default.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser',
      }),
      new webpack.default.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, '');
      })
    );

    return config;
  },
};

export default config;
