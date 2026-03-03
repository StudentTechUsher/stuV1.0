import { defineConfig, devices } from '@playwright/test';

const appUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const storybookUrl = process.env.STORYBOOK_BASE_URL || 'http://127.0.0.1:6006';

export default defineConfig({
  testDir: './tests',
  testMatch: [
    '**/storybook/dark-mode-contract.spec.ts',
    '**/app/dark-mode-contract.spec.ts',
    '**/visual/storybook-dark-all-stories.spec.ts',
    '**/visual/app-dark-routes.spec.ts',
  ],
  timeout: 90 * 1000,
  expect: {
    timeout: 15 * 1000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html'], ['github']] : [['list'], ['html']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: appUrl,
    actionTimeout: 15 * 1000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    timezoneId: 'UTC',
  },
  snapshotPathTemplate: '{testDir}/visual/__snapshots__/{arg}{ext}',
  webServer: [
    {
      command: 'pnpm dev',
      url: appUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 240 * 1000,
      env: {
        SKIP_ENV_VALIDATION: 'true',
      },
    },
    {
      command: `pnpm storybook --ci -p ${new URL(storybookUrl).port || '6006'}`,
      url: storybookUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 240 * 1000,
      env: {
        SKIP_ENV_VALIDATION: 'true',
      },
    },
  ],
});
