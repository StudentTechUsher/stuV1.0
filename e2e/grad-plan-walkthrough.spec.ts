/**
 * WALKTHROUGH EXAMPLE: Graduation Plan Tests
 *
 * This file demonstrates how to create E2E tests for a feature.
 * Follow this pattern for your own features!
 */

import { test, expect } from '@playwright/test';
import { TEST_URLS } from './fixtures/test-data';

test.describe('Graduation Plan Feature', () => {

  // This runs before each test - sets up the starting state
  test.beforeEach(async ({ page }) => {
    // Navigate to grad plan page
    await page.goto(TEST_URLS.gradPlan);

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
  });

  // TEST 1: Creating a new plan
  test('should create a new graduation plan', async ({ page }) => {
    // STEP 1: Click the "Create Plan" button
    // Use text-based selector for buttons (resilient to style changes)
    await page.click('button:has-text("Create Plan")');

    // STEP 2: Fill out the form
    // Use name attribute for inputs
    await page.fill('input[name="planName"]', 'Computer Science 2026');
    await page.selectOption('select[name="major"]', 'Computer Science');

    // STEP 3: Submit the form
    await page.click('button[type="submit"]');

    // STEP 4: Verify success
    // Check that success message appears
    await expect(
      page.locator('text=Plan created successfully')
    ).toBeVisible({ timeout: 5000 });

    // STEP 5: Verify the plan appears in the list
    await expect(
      page.locator('[data-testid="plan-list"]')
    ).toContainText('Computer Science 2026');
  });

  // TEST 2: Editing an existing plan
  test('should edit an existing plan', async ({ page }) => {
    // Find the first plan card
    const planCard = page.locator('[data-testid="plan-card"]').first();

    // Click the edit button within that card
    await planCard.locator('button:has-text("Edit")').click();

    // Update the plan name
    await page.fill('input[name="planName"]', 'Updated Plan Name');

    // Save changes
    await page.click('button:has-text("Save")');

    // Verify update succeeded
    await expect(page.locator('text=Plan updated')).toBeVisible();
  });

  // TEST 3: Deleting a plan
  test('should delete a plan with confirmation', async ({ page }) => {
    // Get the first plan
    const planCard = page.locator('[data-testid="plan-card"]').first();

    // Click delete button
    await planCard.locator('button:has-text("Delete")').click();

    // Verify confirmation dialog appears
    await expect(page.locator('text=Are you sure')).toBeVisible();

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    // Verify success message
    await expect(page.locator('text=Plan deleted')).toBeVisible();
  });

  // TEST 4: Form validation
  test('should show validation errors for empty form', async ({ page }) => {
    // Open create form
    await page.click('button:has-text("Create Plan")');

    // Try to submit without filling anything
    await page.click('button[type="submit"]');

    // Should see validation errors
    await expect(
      page.locator('text=Plan name is required')
    ).toBeVisible();
  });

  // TEST 5: Filtering/Searching
  test('should filter plans by search term', async ({ page }) => {
    // Type in search box
    await page.fill('input[placeholder*="Search"]', 'Computer');

    // Wait for results to update
    await page.waitForLoadState('networkidle');

    // All visible plans should contain "Computer"
    const visiblePlans = page.locator('[data-testid="plan-card"]:visible');
    const count = await visiblePlans.count();

    // Check each visible plan contains the search term
    for (let i = 0; i < count; i++) {
      await expect(visiblePlans.nth(i)).toContainText('Computer');
    }
  });

});

/**
 * KEY TAKEAWAYS:
 *
 * 1. Use test.describe() to group related tests
 * 2. Use test.beforeEach() to set up common state
 * 3. Use descriptive test names that explain what should happen
 * 4. Break tests into clear steps with comments
 * 5. Always verify the result with expect() assertions
 * 6. Use resilient selectors (text, roles, data-testid)
 * 7. Wait for elements with proper timeouts
 */
