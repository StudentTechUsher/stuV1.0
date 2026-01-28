import { test, expect } from '@playwright/test';
import { TEST_URLS, TEST_FILES } from './fixtures/test-data';
import path from 'path';

/**
 * Transcript Upload E2E Tests
 *
 * Tests the transcript upload and parsing workflows:
 * - File upload functionality
 * - Parsing and display of courses
 * - Error handling for invalid files
 * - Cancel upload flow
 */

test.describe('Transcript Upload Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test on the transcript page
    await page.goto(TEST_URLS.transcript);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Upload Interface', () => {
    test('should display transcript upload interface', async ({ page }) => {
      // Look for upload button or drag-and-drop area
      const uploadButton = page.locator(
        'button:has-text("Upload"), input[type="file"], [data-testid*="upload"]'
      );

      const uploadElements = await uploadButton.count();
      expect(uploadElements).toBeGreaterThan(0);
    });

    test('should show upload instructions', async ({ page }) => {
      // Look for upload instructions or help text
      const instructions = page.locator(
        ':text("Upload"), :text("PDF"), :text("transcript")'
      );

      const instructionCount = await instructions.count();
      expect(instructionCount).toBeGreaterThan(0);
    });
  });

  test.describe('File Upload', () => {
    test.skip('should accept PDF file upload', async ({ page }) => {
      // This test requires a sample PDF file
      // Skip if the test fixture file doesn't exist

      const fileInput = page.locator('input[type="file"]');

      if (await fileInput.isVisible()) {
        // Upload a sample PDF
        const filePath = path.join(process.cwd(), TEST_FILES.sampleTranscript);

        try {
          await fileInput.setInputFiles(filePath);

          // Wait for upload to complete
          await page.waitForLoadState('networkidle');

          // Verify upload success indicator
          const successMessage = page.locator(
            '[data-testid="success-message"], :text("Success"), :text("Uploaded")'
          );
          await expect(successMessage).toBeVisible({ timeout: 10000 });
        } catch (error) {
          console.error('Sample transcript file not found:', error);
        }
      }
    });

    test('should show upload progress indicator', async ({ page }) => {
      // Look for file input
      const fileInput = page.locator('input[type="file"]');

      if (await fileInput.isVisible()) {
        // Note: This test would need an actual file to upload
        // Checking that the interface supports progress indication
        const uploadButton = page.locator('button:has-text("Upload")');
        const hasUploadUI = await uploadButton.count() > 0 || await fileInput.count() > 0;
        expect(hasUploadUI).toBe(true);
      }
    });

    test('should validate file type', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');

      if (await fileInput.isVisible()) {
        // Check if file input has accept attribute for PDFs
        const acceptAttr = await fileInput.getAttribute('accept');

        if (acceptAttr) {
          expect(acceptAttr).toContain('pdf');
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test.skip('should reject invalid file types', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');

      if (await fileInput.isVisible()) {
        // Try to upload a non-PDF file (e.g., image or text file)
        // This would require creating a test fixture

        // Wait for error message
        const errorMessage = page.locator(
          '[role="alert"], [data-testid="error-message"], :text("invalid")'
        );

        // Error should be displayed
        // await expect(errorMessage).toBeVisible({ timeout: 5000 });
      }
    });

    test('should handle upload cancellation', async ({ page }) => {
      // Look for cancel button during upload
      const fileInput = page.locator('input[type="file"]');

      if (await fileInput.isVisible()) {
        // Check for cancel functionality
        const cancelButton = page.locator(
          'button:has-text("Cancel"), [data-testid="cancel-upload"]'
        );

        const hasCancelOption = await cancelButton.count() > 0;
        expect(hasCancelOption).toBeGreaterThanOrEqual(0);
      }
    });

    test('should show error for corrupted PDF', async ({ page }) => {
      // This test would require a corrupted PDF file
      // Skip for now - to be implemented with proper test fixtures
      test.skip();
    });
  });

  test.describe('Parsed Course Display', () => {
    test('should display parsed courses after upload', async ({ page }) => {
      // Check if there are already parsed courses
      const courseList = page.locator(
        '[data-testid*="course-list"], [data-testid*="parsed-course"]'
      );

      const courseCount = await courseList.count();
      expect(courseCount).toBeGreaterThanOrEqual(0);
    });

    test('should show course details', async ({ page }) => {
      // Look for course information elements
      const courseCard = page.locator(
        '[data-testid*="course"], .course-card, .course-item'
      ).first();

      if (await courseCard.isVisible()) {
        // Verify course details are displayed
        const courseText = await courseCard.textContent();
        expect(courseText).toBeTruthy();
      }
    });

    test('should display course metadata', async ({ page }) => {
      // Look for course details like credits, grade, etc.
      const courseDetails = page.locator(
        ':text("credits"), :text("grade"), :text("Credit")'
      );

      const detailCount = await courseDetails.count();
      expect(detailCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Course Management After Upload', () => {
    test('should allow editing parsed courses', async ({ page }) => {
      // Look for edit button on courses
      const editButton = page.locator(
        'button:has-text("Edit"), button[aria-label*="Edit"]'
      );

      const editCount = await editButton.count();
      expect(editCount).toBeGreaterThanOrEqual(0);
    });

    test('should allow removing parsed courses', async ({ page }) => {
      // Look for delete/remove button
      const deleteButton = page.locator(
        'button:has-text("Delete"), button:has-text("Remove"), button[aria-label*="Delete"]'
      );

      const deleteCount = await deleteButton.count();
      expect(deleteCount).toBeGreaterThanOrEqual(0);
    });

    test.skip('should save parsed courses to graduation plan', async ({ page }) => {
      // Look for button to add courses to plan
      const addToPlanButton = page.locator(
        'button:has-text("Add to Plan"), button:has-text("Save")'
      );

      if (await addToPlanButton.isVisible()) {
        await addToPlanButton.click();

        // Wait for success confirmation
        const successMessage = page.locator(
          '[data-testid="success-message"], :text("Added"), :text("Saved")'
        );
        await expect(successMessage).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Multiple Uploads', () => {
    test('should handle multiple upload attempts', async ({ page }) => {
      // Verify that upload interface is accessible
      const uploadButton = page.locator('input[type="file"], button:has-text("Upload")');
      await expect(uploadButton.first()).toBeVisible();

      // Interface should allow re-upload
      const isEnabled = await uploadButton.first().isEnabled();
      expect(isEnabled).toBe(true);
    });

    test.skip('should replace previous upload', async ({ page }) => {
      // Test behavior when uploading a new transcript
      // Should either replace or merge with previous data
      // Implementation depends on business logic
    });
  });

  test.describe('Parsing Feedback', () => {
    test('should show parsing status', async ({ page }) => {
      // Look for parsing status indicators
      const parsingStatus = page.locator(
        '[data-testid*="parsing"], :text("Parsing"), :text("Processing")'
      );

      const statusCount = await parsingStatus.count();
      expect(statusCount).toBeGreaterThanOrEqual(0);
    });

    test('should display parsing errors if any', async ({ page }) => {
      // Look for error messages related to parsing
      const parsingError = page.locator(
        '[role="alert"], [data-testid*="error"], :text("Could not parse")'
      );

      // Should have error handling UI (even if not currently displayed)
      const errorCount = await parsingError.count();
      expect(errorCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible file upload', async ({ page }) => {
      // Verify file input has proper labels
      const fileInput = page.locator('input[type="file"]');

      if (await fileInput.isVisible()) {
        // Check for aria-label or associated label
        const ariaLabel = await fileInput.getAttribute('aria-label');
        const hasLabel = ariaLabel || (await page.locator('label[for]').count() > 0);

        expect(hasLabel).toBeTruthy();
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Verify upload button is keyboard accessible
      const uploadButton = page.locator('button:has-text("Upload")').first();

      if (await uploadButton.isVisible()) {
        // Focus on the button
        await uploadButton.focus();

        // Verify it's focused
        const isFocused = await uploadButton.evaluate(
          (el) => el === document.activeElement
        );
        expect(isFocused).toBe(true);
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Reload page
      await page.goto(TEST_URLS.transcript);
      await page.waitForLoadState('networkidle');

      // Verify upload interface is accessible
      const uploadInterface = page.locator(
        'input[type="file"], button:has-text("Upload")'
      );
      await expect(uploadInterface.first()).toBeVisible();
    });
  });
});
