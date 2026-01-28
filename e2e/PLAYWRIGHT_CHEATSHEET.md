# Playwright E2E Testing Cheat Sheet

Quick reference for common Playwright patterns.

---

## 🎬 Quick Start

```bash
# Start codegen to record tests
pnpm test:e2e:codegen

# Run tests
pnpm test:e2e                    # All tests
pnpm test:e2e:ui                 # Interactive UI mode
pnpm test:e2e:headed             # See browser
pnpm test:e2e:debug              # Debug mode

# Run specific tests
pnpm test:e2e e2e/auth.spec.ts   # Specific file
pnpm test:e2e --grep "login"     # Tests matching pattern
```

---

## 📍 Locators (How to Find Elements)

```typescript
// By role (BEST - most resilient)
page.getByRole('button', { name: 'Submit' })
page.getByRole('textbox', { name: 'Email' })
page.getByRole('heading', { name: 'Welcome' })

// By label text
page.getByLabel('Email address')
page.getByLabel('Password')

// By placeholder
page.getByPlaceholder('Enter email')

// By text content
page.getByText('Sign In')
page.getByText(/welcome/i)  // Case insensitive regex

// By test ID (RECOMMENDED)
page.locator('[data-testid="submit-btn"]')

// By CSS selector
page.locator('button.primary')
page.locator('#submit-button')
page.locator('input[name="email"]')

// By attribute
page.locator('[type="submit"]')
page.locator('[href="/dashboard"]')

// Chaining locators
page.locator('form').locator('button')
page.locator('[data-testid="card"]').getByRole('button', { name: 'Delete' })

// First/Last/Nth
page.locator('li').first()
page.locator('li').last()
page.locator('li').nth(2)

// Filter
page.locator('li').filter({ hasText: 'Active' })
```

---

## 🖱️ Actions

```typescript
// Click
await page.click('button')
await page.dblclick('button')        // Double click
await page.click('button', { button: 'right' })  // Right click

// Type
await page.fill('input', 'text')     // Fast - replaces content
await page.type('input', 'text')     // Slower - types character by character

// Select
await page.selectOption('select', 'value')
await page.selectOption('select', { label: 'Option 1' })

// Check/Uncheck
await page.check('input[type="checkbox"]')
await page.uncheck('input[type="checkbox"]')

// Hover
await page.hover('button')

// Focus
await page.focus('input')

// Press keys
await page.press('input', 'Enter')
await page.press('input', 'Control+A')
await page.keyboard.type('hello')
await page.keyboard.press('Backspace')

// Upload files
await page.setInputFiles('input[type="file"]', 'path/to/file.pdf')
await page.setInputFiles('input[type="file"]', ['file1.pdf', 'file2.pdf'])

// Drag and drop
await page.dragAndDrop('#source', '#target')
```

---

## ✅ Assertions

```typescript
// Visibility
await expect(page.locator('h1')).toBeVisible()
await expect(page.locator('h1')).toBeHidden()
await expect(page.locator('h1')).not.toBeVisible()

// Text
await expect(page.locator('h1')).toHaveText('Welcome')
await expect(page.locator('h1')).toContainText('Wel')
await expect(page.locator('p')).toHaveText(/welcome/i)

// Value (for inputs)
await expect(page.locator('input')).toHaveValue('test@example.com')

// Attribute
await expect(page.locator('button')).toHaveAttribute('disabled')
await expect(page.locator('button')).toHaveAttribute('type', 'submit')

// Class
await expect(page.locator('div')).toHaveClass('active')
await expect(page.locator('div')).toHaveClass(/active/)

// Count
await expect(page.locator('li')).toHaveCount(5)

// URL
expect(page.url()).toContain('/dashboard')
expect(page.url()).toBe('http://localhost:3000/dashboard')

// Enabled/Disabled
await expect(page.locator('button')).toBeEnabled()
await expect(page.locator('button')).toBeDisabled()

// Checked
await expect(page.locator('input[type="checkbox"]')).toBeChecked()
await expect(page.locator('input[type="checkbox"]')).not.toBeChecked()

// Custom timeout
await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })
```

---

## ⏰ Waiting

```typescript
// Wait for element
await page.waitForSelector('h1')
await page.waitForSelector('h1', { state: 'visible' })
await page.waitForSelector('h1', { state: 'hidden' })

// Wait for URL
await page.waitForURL('/dashboard')
await page.waitForURL(/\/profile\/\d+/)

// Wait for load state
await page.waitForLoadState('load')           // HTML loaded
await page.waitForLoadState('domcontentloaded')  // DOM ready
await page.waitForLoadState('networkidle')    // No network activity

// Wait for response
const response = await page.waitForResponse('**/api/users')
expect(response.status()).toBe(200)

// Wait for timeout (avoid if possible)
await page.waitForTimeout(1000)  // 1 second

// Wait for function
await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Ready')
```

---

## 🧭 Navigation

```typescript
await page.goto('/')
await page.goto('/dashboard')
await page.goto('https://example.com')

await page.goBack()
await page.goForward()
await page.reload()
```

---

## 📸 Screenshots & Videos

```typescript
// Screenshot
await page.screenshot({ path: 'screenshot.png' })
await page.screenshot({ path: 'screenshot.png', fullPage: true })

// Element screenshot
await page.locator('div').screenshot({ path: 'element.png' })

// Videos are auto-recorded on failure (configured in playwright.config.ts)
```

---

## 🎭 Multiple Elements

```typescript
// Count
const count = await page.locator('li').count()

// Loop through
const items = page.locator('li')
for (let i = 0; i < await items.count(); i++) {
  console.log(await items.nth(i).textContent())
}

// All text contents
const texts = await page.locator('li').allTextContents()

// Check all checkboxes
const checkboxes = page.locator('input[type="checkbox"]')
for (let i = 0; i < await checkboxes.count(); i++) {
  await checkboxes.nth(i).check()
}
```

---

## 📝 Forms

```typescript
// Fill text input
await page.fill('input[name="email"]', 'user@example.com')

// Clear input
await page.fill('input[name="email"]', '')

// Select dropdown
await page.selectOption('select[name="country"]', 'USA')

// Check checkbox
await page.check('input[type="checkbox"]')

// Radio button
await page.check('input[value="option1"]')

// Submit form
await page.click('button[type="submit"]')
// OR
await page.press('input', 'Enter')
```

---

## 🪟 Dialogs

```typescript
// Handle alert/confirm/prompt
page.on('dialog', dialog => {
  console.log(dialog.message())
  dialog.accept()           // Click OK
  // dialog.dismiss()       // Click Cancel
  // dialog.accept('text')  // Enter text in prompt
})

// Then trigger the dialog
await page.click('button')
```

---

## 🍪 Cookies & Storage

```typescript
// Get cookies
const cookies = await page.context().cookies()

// Add cookie
await page.context().addCookies([{
  name: 'session',
  value: 'abc123',
  domain: 'localhost',
  path: '/'
}])

// Clear cookies
await page.context().clearCookies()

// LocalStorage
await page.evaluate(() => {
  localStorage.setItem('key', 'value')
  localStorage.getItem('key')
  localStorage.removeItem('key')
  localStorage.clear()
})

// SessionStorage
await page.evaluate(() => {
  sessionStorage.setItem('key', 'value')
})
```

---

## 🎯 Best Practices

### ✅ DO

```typescript
// Use user-facing selectors
page.getByRole('button', { name: 'Submit' })
page.getByLabel('Email')

// Use data-testid for stable selectors
page.locator('[data-testid="submit-btn"]')

// Wait for elements explicitly
await page.waitForSelector('h1')
await expect(page.locator('h1')).toBeVisible()

// Use descriptive test names
test('should display error when submitting empty form', ...)

// Keep tests independent
test.beforeEach(async ({ page }) => {
  // Reset state before each test
})
```

### ❌ DON'T

```typescript
// Don't use fragile selectors
page.locator('div > div > button:nth-child(3)')  // BAD

// Don't use waitForTimeout
await page.waitForTimeout(5000)  // BAD - use proper waits

// Don't make tests depend on each other
test('create user', ...)
test('edit user', ...)  // BAD - depends on previous test

// Don't hardcode URLs
await page.goto('http://localhost:3000/dashboard')  // BAD
await page.goto(TEST_URLS.dashboard)  // GOOD
```

---

## 🐛 Debugging

```typescript
// Pause execution (opens inspector)
await page.pause()

// Console log
console.log(await page.locator('h1').textContent())
console.log(await page.title())

// Take screenshot
await page.screenshot({ path: 'debug.png' })

// Print HTML
console.log(await page.content())
console.log(await page.locator('div').innerHTML())

// Slow down execution
test.use({ slowMo: 1000 })  // 1 second delay between actions
```

---

## 🎪 Test Hooks

```typescript
test.beforeAll(async () => {
  // Runs once before all tests in the file
})

test.beforeEach(async ({ page }) => {
  // Runs before each test
  await page.goto('/')
})

test.afterEach(async ({ page }) => {
  // Runs after each test
  await page.screenshot({ path: 'after.png' })
})

test.afterAll(async () => {
  // Runs once after all tests in the file
})
```

---

## 🏃 Running Tests

```bash
# All tests
pnpm test:e2e

# Specific file
pnpm test:e2e e2e/auth.spec.ts

# Specific test by name
pnpm test:e2e --grep "should login"

# Specific project (browser)
pnpm test:e2e --project=chromium

# UI mode
pnpm test:e2e:ui

# Headed mode (see browser)
pnpm test:e2e:headed

# Debug mode
pnpm test:e2e:debug

# Show report
pnpm test:e2e:report

# Update snapshots
pnpm test:e2e --update-snapshots
```

---

## 📚 Quick Links

- 📖 [Full Docs](https://playwright.dev)
- 🎓 [Tutorials](https://playwright.dev/docs/intro)
- 🔍 [API Reference](https://playwright.dev/docs/api/class-playwright)
- 💡 [Best Practices](https://playwright.dev/docs/best-practices)
