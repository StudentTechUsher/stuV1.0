# E2E Testing with Playwright

This document describes the end-to-end (E2E) testing setup for the STU application using Playwright.

## Overview

The E2E testing infrastructure provides:
- **Cross-browser testing**: Chromium, Firefox, and WebKit
- **Nightly CI/CD runs**: Scheduled tests at 2 AM UTC
- **Comprehensive test coverage**: Auth flows, graduation plans, and transcript uploads
- **Code generation support**: Easy test creation with Playwright Codegen

## Project Structure

```
e2e/
├── auth.spec.ts              # Authentication flow tests
├── auth.setup.ts             # Global auth setup (runs once)
├── grad-plan.spec.ts         # Graduation plan workflow tests
├── transcript.spec.ts        # Transcript upload tests
├── fixtures/
│   ├── auth.ts               # Auth helper functions
│   └── test-data.ts          # Test data constants
└── .auth/                    # Saved auth states (gitignored)
    └── user.json             # Authenticated session storage
```

## Getting Started

### Prerequisites

1. **Node.js 20+** and **pnpm** installed
2. **Test user account** with credentials stored in environment variables
3. **Development server** running locally

### Installation

Playwright browsers are already installed as part of the setup. If you need to reinstall:

```bash
pnpm exec playwright install --with-deps
```

## Running Tests

### Local Development

```bash
# Run all E2E tests (headless)
pnpm test:e2e

# Run tests with UI mode (recommended for development)
pnpm test:e2e:ui

# Run tests with browser visible
pnpm test:e2e:headed

# Run tests in debug mode (step-through)
pnpm test:e2e:debug

# View HTML test report
pnpm test:e2e:report
```

### Running Specific Tests

```bash
# Run only auth tests
pnpm test:e2e e2e/auth.spec.ts

# Run specific browser
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit

# Run specific test by name
pnpm test:e2e -g "should successfully login"
```

## Creating New Tests

### Using Playwright Codegen

The easiest way to create new tests is using Playwright's code generator:

```bash
# Start the dev server
pnpm dev

# In another terminal, run codegen
pnpm test:e2e:codegen
```

This will:
1. Open a browser window
2. Show the Playwright Inspector
3. Record your actions as code
4. Generate test code you can copy into spec files

### Manual Test Creation

1. Create a new `.spec.ts` file in the `e2e/` directory
2. Import test utilities from `@playwright/test`
3. Import helpers from `fixtures/`
4. Write your tests using Playwright API

Example:

```typescript
import { test, expect } from '@playwright/test';
import { TEST_URLS } from './fixtures/test-data';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto(TEST_URLS.home);
    await expect(page).toHaveTitle(/Expected Title/);
  });
});
```

## Environment Variables

### Required for Tests

```bash
# Test user credentials
E2E_TEST_EMAIL=e2e-test@example.com
E2E_TEST_PASSWORD=YourSecurePassword123!

# Optional: Custom base URL
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

### Setting Up Test Credentials

1. Create a test user account in your Supabase instance
2. Add credentials to `.env.local` for local testing:

```bash
E2E_TEST_EMAIL=your-test-user@example.com
E2E_TEST_PASSWORD=YourTestPassword123!
```

3. Add the same credentials to GitHub Secrets for CI/CD:
   - Go to your repository settings
   - Navigate to Secrets and Variables > Actions
   - Add `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`

## CI/CD Integration

### Nightly Runs

The E2E tests run automatically every night at 2 AM UTC via GitHub Actions.

See `.github/workflows/e2e-tests.yml` for the workflow configuration.

### Manual Trigger

You can manually trigger the E2E tests from GitHub:
1. Go to Actions tab
2. Select "E2E Tests" workflow
3. Click "Run workflow"

### Viewing Results

When tests fail:
- Check the GitHub Actions run for detailed logs
- Download test artifacts (screenshots, videos, traces)
- Use Playwright Trace Viewer to debug issues

## Test Coverage

### Authentication (`e2e/auth.spec.ts`)
- ✅ Login with valid credentials
- ✅ Login with invalid credentials (error handling)
- ✅ Form validation
- ✅ Logout functionality
- ✅ Session persistence
- ✅ Protected route access control
- ⏭️ OAuth flows (skipped - requires OAuth setup)

### Graduation Plans (`e2e/grad-plan.spec.ts`)
- ✅ View existing graduation plan
- ✅ Display plan metadata
- ✅ Show courses in semesters
- ⏭️ Create new plan (skipped - requires setup)
- ⏭️ Add/remove courses (skipped - requires implementation)
- ✅ Drag and drop functionality
- ✅ Progress indicators
- ✅ Data persistence
- ✅ Responsive design

### Transcript Upload (`e2e/transcript.spec.ts`)
- ✅ Upload interface display
- ⏭️ PDF file upload (requires test fixture)
- ✅ File type validation
- ⏭️ Error handling for invalid files
- ✅ Parsed course display
- ✅ Course management
- ✅ Accessibility features
- ✅ Responsive design

**Note**: Tests marked with ⏭️ are skipped and need:
- Test fixtures (sample PDFs, test data)
- Feature implementation
- OAuth provider configuration

## Debugging Failed Tests

### Using UI Mode (Recommended)

```bash
pnpm test:e2e:ui
```

UI Mode provides:
- Visual test execution
- Time-travel debugging
- Watch mode for test development
- Screenshot and trace inspection

### Using Debug Mode

```bash
pnpm test:e2e:debug
```

This opens Playwright Inspector for step-by-step debugging.

### Viewing Traces

After a test failure:

```bash
pnpm test:e2e:report
```

Click on a failed test to view its trace, which includes:
- Network activity
- DOM snapshots
- Console logs
- Screenshots at each step

## Best Practices

### 1. Use Data Test IDs

Add `data-testid` attributes to elements for stable selection:

```tsx
<button data-testid="submit-button">Submit</button>
```

```typescript
await page.click('[data-testid="submit-button"]');
```

### 2. Avoid Hard-Coded Waits

Use Playwright's auto-waiting instead of `waitForTimeout`:

```typescript
// ❌ Bad
await page.waitForTimeout(5000);

// ✅ Good
await page.waitForLoadState('networkidle');
await page.waitForSelector('[data-testid="content"]');
```

### 3. Clean Up Test Data

If your tests create database records, clean them up after:

```typescript
test.afterEach(async () => {
  // Clean up test data
});
```

### 4. Keep Tests Independent

Each test should be able to run in isolation without depending on other tests.

### 5. Use Fixtures for Common Setup

Store reusable test data and helpers in `e2e/fixtures/`:
- `test-data.ts`: Constants and sample data
- `auth.ts`: Authentication helpers

## Troubleshooting

### Tests Fail Locally But Pass in CI

- Check browser versions: `pnpm exec playwright --version`
- Clear Playwright cache: `rm -rf ~/.cache/ms-playwright`
- Reinstall browsers: `pnpm exec playwright install --with-deps`

### Authentication Setup Fails

- Verify test credentials are correct
- Check that the test user exists in your database
- Ensure Supabase connection is working

### Flaky Tests

- Increase timeout for specific tests
- Use `page.waitForLoadState('networkidle')`
- Check for race conditions in your application

### "Cannot find module" Errors

- Run `pnpm install` to ensure all dependencies are installed
- Check that TypeScript paths are configured correctly

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Codegen Guide](https://playwright.dev/docs/codegen)
- [Debugging Tests](https://playwright.dev/docs/debug)

## Next Steps

1. **Add More Test Coverage**
   - Admin features
   - GPA calculator
   - Career exploration
   - Notifications

2. **Create Test Fixtures**
   - Sample transcript PDFs
   - Test user data seeds
   - Mock API responses

3. **Visual Regression Testing**
   - Add screenshot comparison tests
   - Set up baseline images

4. **Performance Testing**
   - Use Playwright traces for performance analysis
   - Add custom performance metrics

5. **Run Tests on PRs**
   - Add critical path tests to PR workflow
   - Set up parallel test execution
