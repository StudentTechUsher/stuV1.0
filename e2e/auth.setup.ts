import { test as setup } from '@playwright/test';
import { login } from './fixtures/auth';
import path from 'path';

const authFile = path.join(__dirname, '.auth', 'user.json');

/**
 * Global authentication setup
 * This runs once before all tests to create an authenticated session
 */
setup('authenticate', async ({ page }) => {
  // Perform login
  await login(page);

  // Wait a bit to ensure session is established
  await page.waitForTimeout(2000);

  // Save authenticated state
  await page.context().storageState({ path: authFile });
});
