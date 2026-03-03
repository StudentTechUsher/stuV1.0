import type { StorybookConfig } from '@storybook/nextjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Ensure Storybook can load modules that validate env at import-time.
const STORYBOOK_SUPABASE_URL = 'http://127.0.0.1:54321';
const STORYBOOK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
process.env.SKIP_ENV_VALIDATION = process.env.SKIP_ENV_VALIDATION || 'true';
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || STORYBOOK_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || STORYBOOK_SUPABASE_ANON_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || STORYBOOK_SUPABASE_ANON_KEY;
process.env.NEXT_PUBLIC_ENV = process.env.NEXT_PUBLIC_ENV || 'development';

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
  env: (configEnv) => ({
    ...configEnv,
    SKIP_ENV_VALIDATION: 'true',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || STORYBOOK_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || STORYBOOK_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || STORYBOOK_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || 'development',
  }),
  webpackFinal: async (config) => {
    // Add path alias
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Keep specific aliases before "@" so they are matched first by webpack.
        '@/lib/services/server-actions$': join(__dirname, './mocks/server-actions.ts'),
        '@/lib/services/server-actions': join(__dirname, './mocks/server-actions.ts'),
        '@/hooks/useAuth$': join(__dirname, './mocks/useAuth.ts'),
        '@/hooks/useAuth': join(__dirname, './mocks/useAuth.ts'),
        'server-only$': join(__dirname, './mocks/server-only.ts'),
        'server-only': join(__dirname, './mocks/server-only.ts'),
        '@': join(__dirname, '../'),
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
