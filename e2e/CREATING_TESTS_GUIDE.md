# Creating New E2E Tests with Playwright

This guide walks you through creating new end-to-end tests for your application.

---

## 🎬 Method 1: Using Codegen (Recommended for Beginners)

Playwright Codegen records your interactions and generates test code automatically.

### Step 1: Start Your Dev Server

```bash
pnpm dev
```

### Step 2: Launch Codegen

```bash
pnpm test:e2e:codegen
```

This opens:
- **Browser window** - Interact with your app here
- **Playwright Inspector** - See generated code here

### Step 3: Record Your Test

1. **Navigate** to the feature you want to test
2. **Click, type, select** - All actions are recorded
3. **Add assertions** using the Inspector tools:
   - Click "Assert visibility" to check if an element is visible
   - Click "Assert text" to verify text content
   - Click "Assert value" to check input values

### Step 4: Copy and Save

1. Click the **"Copy"** button in the Inspector
2. Create a new test file: `e2e/my-feature.spec.ts`
3. Paste the code
4. Clean it up (add descriptions, organize into test blocks)

### Example Recording Flow

```
1. Click "Upload Transcript" button
   → Codegen generates: await page.click('text=Upload Transcript');

2. Select a file
   → Codegen generates: await page.setInputFiles('input[type="file"]', 'path/to/file');

3. Click "Submit"
   → Codegen generates: await page.click('button[type="submit"]');

4. Verify success message appears
   → Use Inspector's "Assert visibility" on the success message
   → Codegen generates: await expect(page.locator('text=Success')).toBeVisible();
```

---

## ✍️ Method 2: Writing Tests Manually

For more control, write tests from scratch.

### Test File Structure

```typescript
import { test, expect } from '@playwright/test';
import { TEST_URLS } from './fixtures/test-data';

test.describe('Feature Name', () => {

  test('should do something specific', async ({ page }) => {
    // 1. Setup / Navigate
    await page.goto(TEST_URLS.someRoute);

    // 2. Interact
    await page.click('button');
    await page.fill('input[name="email"]', 'test@example.com');

    // 3. Assert
    await expect(page.locator('h1')).toHaveText('Expected Text');
  });

});
```

### Common Playwright Actions

#### Navigation
```typescript
await page.goto('/dashboard');
await page.goBack();
await page.reload();
```

#### Clicking
```typescript
// By text
await page.click('text=Sign In');

// By role
await page.click('button[type="submit"]');

// By test ID
await page.click('[data-testid="submit-button"]');

// By CSS selector
await page.click('.submit-btn');
```

#### Typing
```typescript
// Fill input
await page.fill('input[name="email"]', 'user@example.com');

// Type with delay (simulates human typing)
await page.type('input[name="password"]', 'secret', { delay: 100 });

// Clear and type
await page.fill('input[name="search"]', ''); // clear
await page.fill('input[name="search"]', 'new value');
```

#### Selecting
```typescript
// Select dropdown option
await page.selectOption('select[name="country"]', 'USA');

// Check checkbox
await page.check('input[type="checkbox"]');

// Uncheck checkbox
await page.uncheck('input[type="checkbox"]');

// Choose radio button
await page.check('input[value="option1"]');
```

#### File Upload
```typescript
await page.setInputFiles('input[type="file"]', 'path/to/file.pdf');

// Multiple files
await page.setInputFiles('input[type="file"]', [
  'file1.pdf',
  'file2.pdf'
]);

// From buffer
await page.setInputFiles('input[type="file"]', {
  name: 'test.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('file contents')
});
```

### Common Assertions

#### Visibility
```typescript
// Element is visible
await expect(page.locator('h1')).toBeVisible();

// Element is hidden
await expect(page.locator('.spinner')).toBeHidden();
```

#### Text Content
```typescript
// Exact text
await expect(page.locator('h1')).toHaveText('Welcome');

// Contains text
await expect(page.locator('p')).toContainText('success');

// Multiple elements
await expect(page.locator('li')).toHaveText(['Item 1', 'Item 2', 'Item 3']);
```

#### Attributes
```typescript
// Has attribute
await expect(page.locator('button')).toHaveAttribute('disabled', '');

// Has class
await expect(page.locator('div')).toHaveClass(/active/);

// Has value
await expect(page.locator('input')).toHaveValue('test@example.com');
```

#### Count
```typescript
// Count elements
await expect(page.locator('li')).toHaveCount(5);
```

#### URL
```typescript
// Current URL contains
expect(page.url()).toContain('/dashboard');

// Wait for URL
await page.waitForURL('**/dashboard');
```

### Waiting Strategies

#### Wait for Element
```typescript
// Wait for element to be visible
await page.waitForSelector('h1', { state: 'visible' });

// Wait for element to be hidden
await page.waitForSelector('.spinner', { state: 'hidden' });

// Wait for element to be attached to DOM
await page.waitForSelector('button', { state: 'attached' });
```

#### Wait for Navigation
```typescript
// Wait for page load
await page.waitForLoadState('networkidle');

// Wait for specific URL
await page.waitForURL('/dashboard');

// Wait for URL pattern
await page.waitForURL(/\/profile\/\d+/);
```

#### Wait for Response
```typescript
// Wait for API call
const responsePromise = page.waitForResponse('**/api/users');
await page.click('button');
const response = await responsePromise;
expect(response.status()).toBe(200);
```

#### Custom Timeout
```typescript
// Wait with custom timeout
await page.waitForSelector('h1', { timeout: 10000 }); // 10 seconds
```

---

## 🏗️ Test Organization Best Practices

### 1. Use Descriptive Test Names

```typescript
// ❌ Bad
test('test 1', async ({ page }) => { ... });

// ✅ Good
test('should display error when submitting empty form', async ({ page }) => { ... });
```

### 2. Group Related Tests

```typescript
test.describe('User Profile', () => {
  test.describe('Editing', () => {
    test('should update first name', async ({ page }) => { ... });
    test('should update last name', async ({ page }) => { ... });
  });

  test.describe('Deletion', () => {
    test('should confirm before deleting', async ({ page }) => { ... });
  });
});
```

### 3. Use Fixtures and Helpers

```typescript
// Create reusable helper functions
async function navigateToProfile(page) {
  await page.goto('/profile');
  await page.waitForLoadState('networkidle');
}

test('should edit profile', async ({ page }) => {
  await navigateToProfile(page);
  // ... rest of test
});
```

### 4. Use Test Data Constants

```typescript
// Bad - hardcoded values
await page.fill('input[name="email"]', 'test@example.com');

// Good - use constants
import { TEST_USER } from './fixtures/test-data';
await page.fill('input[name="email"]', TEST_USER.email);
```

---

## 🎯 Locator Strategies (Best to Worst)

### 1. User-Facing Attributes (Best)
```typescript
// By role
page.getByRole('button', { name: 'Sign In' })

// By label
page.getByLabel('Email')

// By placeholder
page.getByPlaceholder('Enter your email')

// By text
page.getByText('Welcome')
```

### 2. Test IDs
```typescript
page.locator('[data-testid="submit-button"]')
```

### 3. CSS Selectors (Use Sparingly)
```typescript
page.locator('button.submit-btn')
```

### 4. XPath (Last Resort)
```typescript
page.locator('xpath=//button[contains(text(), "Submit")]')
```

---

## 🐛 Debugging Tests

### Run in Headed Mode
```bash
pnpm test:e2e:headed
```

### Run in Debug Mode
```bash
pnpm test:e2e:debug
```

### View Test Report
```bash
pnpm test:e2e:report
```

### Add Debug Statements
```typescript
// Pause execution
await page.pause();

// Take screenshot
await page.screenshot({ path: 'debug.png' });

// Print page content
console.log(await page.content());

// Print element text
console.log(await page.locator('h1').textContent());
```

---

## 📝 Example: Complete Test File

Here's a complete example testing a graduation plan feature:

```typescript
import { test, expect } from '@playwright/test';
import { TEST_URLS, TEST_USER } from './fixtures/test-data';

test.describe('Graduation Plan Management', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to grad plan page before each test
    await page.goto(TEST_URLS.gradPlan);
    await page.waitForLoadState('networkidle');
  });

  test('should create a new graduation plan', async ({ page }) => {
    // Click create button
    await page.click('button:has-text("Create Plan")');

    // Fill form
    await page.fill('input[name="planName"]', 'CS 2026 Plan');
    await page.selectOption('select[name="major"]', 'Computer Science');
    await page.fill('input[name="gradYear"]', '2026');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for success
    await expect(page.locator('text=Plan created successfully')).toBeVisible();

    // Verify plan appears in list
    await expect(page.locator('[data-testid="plan-list"]')).toContainText('CS 2026 Plan');
  });

  test('should edit an existing plan', async ({ page }) => {
    // Find first plan
    const firstPlan = page.locator('[data-testid="plan-card"]').first();

    // Click edit button
    await firstPlan.locator('button:has-text("Edit")').click();

    // Update name
    await page.fill('input[name="planName"]', 'Updated Plan Name');

    // Save
    await page.click('button:has-text("Save")');

    // Verify update
    await expect(page.locator('text=Plan updated')).toBeVisible();
  });

  test('should delete a plan with confirmation', async ({ page }) => {
    // Find plan to delete
    const planToDelete = page.locator('[data-testid="plan-card"]').first();
    const planName = await planToDelete.locator('h3').textContent();

    // Click delete
    await planToDelete.locator('button:has-text("Delete")').click();

    // Verify confirmation dialog
    await expect(page.locator('text=Are you sure')).toBeVisible();

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    // Verify deletion
    await expect(page.locator('text=Plan deleted')).toBeVisible();

    // Verify plan is gone from list
    await expect(page.locator(`text=${planName}`)).not.toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('button:has-text("Create Plan")');

    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // Should see validation errors
    await expect(page.locator('text=Plan name is required')).toBeVisible();
    await expect(page.locator('text=Major is required')).toBeVisible();
  });

  test('should filter plans by major', async ({ page }) => {
    // Select a major filter
    await page.selectOption('select[name="filterMajor"]', 'Computer Science');

    // Wait for filtered results
    await page.waitForLoadState('networkidle');

    // All visible plans should be CS
    const plans = page.locator('[data-testid="plan-card"]');
    const count = await plans.count();

    for (let i = 0; i < count; i++) {
      await expect(plans.nth(i)).toContainText('Computer Science');
    }
  });

});
```

---

## 🚀 Running Your Tests

```bash
# Run specific test file
pnpm test:e2e e2e/my-feature.spec.ts

# Run specific test by name
pnpm test:e2e --grep "should create a new plan"

# Run in UI mode (interactive)
pnpm test:e2e:ui

# Run in specific browser
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

---

## 📚 Additional Resources

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Locators Guide](https://playwright.dev/docs/locators)

---

## 💡 Pro Tips

1. **Use data-testid attributes** in your components for stable selectors
2. **Keep tests independent** - each test should work in isolation
3. **Don't test third-party code** - focus on your app's functionality
4. **Use Page Object Models** for complex pages (see next section)
5. **Mock external APIs** when possible to make tests faster and more reliable
6. **Take screenshots on failure** (already configured in playwright.config.ts)

---

## 🎨 Page Object Model Pattern (Advanced)

For complex pages, create Page Object Models:

```typescript
// e2e/pages/GradPlanPage.ts
import { Page } from '@playwright/test';

export class GradPlanPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/grad-plan');
    await this.page.waitForLoadState('networkidle');
  }

  async createPlan(name: string, major: string, year: string) {
    await this.page.click('button:has-text("Create Plan")');
    await this.page.fill('input[name="planName"]', name);
    await this.page.selectOption('select[name="major"]', major);
    await this.page.fill('input[name="gradYear"]', year);
    await this.page.click('button[type="submit"]');
  }

  async getPlanByName(name: string) {
    return this.page.locator(`[data-testid="plan-card"]:has-text("${name}")`);
  }
}

// Usage in test
import { GradPlanPage } from './pages/GradPlanPage';

test('should create plan using POM', async ({ page }) => {
  const gradPlanPage = new GradPlanPage(page);

  await gradPlanPage.goto();
  await gradPlanPage.createPlan('My Plan', 'CS', '2026');

  const plan = await gradPlanPage.getPlanByName('My Plan');
  await expect(plan).toBeVisible();
});
```

---

Happy Testing! 🎉
