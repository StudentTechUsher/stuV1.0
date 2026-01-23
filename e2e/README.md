# E2E Tests Quick Start

## Setup Test Credentials

Before running tests, add your test user credentials to `.env.local`:

```bash
# E2E Test Credentials
E2E_TEST_EMAIL=your-test-user@example.com
E2E_TEST_PASSWORD=YourSecurePassword123!
```

**Important:** Create a dedicated test user account in your Supabase instance for these tests.

## Running Tests

```bash
# Start development server (in one terminal)
pnpm dev

# Run tests with UI mode (in another terminal)
pnpm test:e2e:ui
```

### Other Test Commands

```bash
# Run all tests (headless)
pnpm test:e2e

# Run with browser visible
pnpm test:e2e:headed

# Debug mode (step-through)
pnpm test:e2e:debug

# Run specific test file
pnpm test:e2e e2e/auth.spec.ts

# Run specific browser only
pnpm test:e2e --project=chromium
```

## Creating New Tests

Use Playwright's code generator:

```bash
# Start dev server
pnpm dev

# Open codegen tool (in another terminal)
pnpm test:e2e:codegen
```

Interact with your app in the opened browser, and Playwright will generate test code for you.

## Test Structure

- `auth.spec.ts` - Authentication flows (11 tests)
- `grad-plan.spec.ts` - Graduation plan workflows (27 tests)
- `transcript.spec.ts` - Transcript upload (49 tests)
- `auth.setup.ts` - Global auth setup (runs once before all tests)
- `fixtures/` - Reusable test helpers and data

## Documentation

For full documentation, see:
- [E2E Testing Guide](../docs/setup/E2E_TESTING.md)
- [Playwright Docs](https://playwright.dev)

## Troubleshooting

### Tests fail with "Cannot find module"
```bash
pnpm install
```

### Authentication setup fails
1. Verify test credentials in `.env.local`
2. Ensure test user exists in Supabase
3. Check that dev server is running

### Need to see what tests are available
```bash
pnpm exec playwright test --list
```

## CI/CD

Tests run automatically every night at 2 AM UTC via GitHub Actions.

Manual trigger: Go to Actions tab → E2E Tests → Run workflow
