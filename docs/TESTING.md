# Testing Guide

This project uses [Vitest](https://vitest.dev/) for unit and integration testing.

## Quick Start

```bash
# Run tests in watch mode (auto-reruns on file changes)
npm test

# Run tests once (useful for CI/CD)
npm run test:run

# Run tests with UI dashboard
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## File Structure

```
lib/
├── services/
│   ├── programService.ts          # Service to test
│   └── programService.test.ts     # Test file
├── __mocks__/
│   └── supabase.ts                # Mock Supabase client
vitest.config.ts                    # Vitest configuration
vitest.setup.ts                     # Test setup (runs before all tests)
```

## Writing Tests

### Test File Naming Convention

- Unit tests: `*.test.ts` or `*.spec.ts`
- Place test files next to the code they test
- Example: `programService.ts` → `programService.test.ts`

### Example Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabase } from '@/lib/__mocks__/supabase';
import { yourFunction } from './yourService';

// Mock the module
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('yourService', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Reset all mocks before each test
  });

  describe('yourFunction', () => {
    it('should do something', async () => {
      // Arrange: Set up mock responses
      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({
        data: [{ id: 1, name: 'Test' }],
        error: null
      });

      // Act: Call the function
      const result = await yourFunction(1);

      // Assert: Verify the results
      expect(mockSupabase.from).toHaveBeenCalledWith('table_name');
      expect(result).toEqual([{ id: 1, name: 'Test' }]);
    });

    it('should handle errors', async () => {
      // Arrange: Mock an error
      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: null,
        error: new Error('Database error')
      });

      // Act & Assert: Expect the function to throw
      await expect(yourFunction(1)).rejects.toThrow('Database error');
    });
  });
});
```

## Mocking Supabase

The `mockSupabase` provides a chainable mock for Supabase queries:

```typescript
// Basic query chain
mockSupabase.from.mockReturnThis();
mockSupabase.select.mockReturnThis();
mockSupabase.eq.mockReturnThis();
mockSupabase.order.mockResolvedValue({ data: [...], error: null });

// Multiple .eq() calls (need to chain properly)
mockSupabase.eq
  .mockReturnValueOnce(mockSupabase)  // First .eq()
  .mockReturnValueOnce(mockSupabase)  // Second .eq()
  .mockResolvedValue({ data: [...], error: null }); // Final result

// Insert/Update/Delete
mockSupabase.from.mockReturnThis();
mockSupabase.update.mockReturnThis();
mockSupabase.eq.mockResolvedValue({ error: null });
```

## Testing Best Practices

### 1. Test Organization
- Group related tests with `describe()`
- One `it()` per test case
- Use descriptive test names: "should [expected behavior] when [condition]"

### 2. Test Structure (AAA Pattern)
- **Arrange**: Set up test data and mocks
- **Act**: Execute the function being tested
- **Assert**: Verify the results

### 3. What to Test
✅ **DO Test:**
- Happy path (normal operation)
- Error handling
- Edge cases (null, undefined, empty arrays)
- Different input variations
- Return values match expectations
- Correct database queries are made

❌ **DON'T Test:**
- Implementation details
- Third-party libraries (like Supabase itself)
- Constants or simple getters

### 4. Mock Data
- Keep mock data minimal and relevant
- Use TypeScript types for type safety
- Reset mocks between tests with `beforeEach()`

### 5. Coverage Goals
- Aim for 80%+ code coverage
- Focus on critical business logic
- Don't chase 100% coverage at the expense of test quality

## Running Tests in CI/CD

Add to your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run tests
  run: npm run test:run

# With coverage reporting
- name: Run tests with coverage
  run: npm run test:coverage
```

## Common Issues

### Issue: "Cannot find module '@/lib/supabase'"
**Solution**: Check `vitest.config.ts` has the correct path alias:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './'),
  },
}
```

### Issue: Mock not working
**Solution**: Ensure mock is defined before import:
```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));
```

### Issue: Tests passing but function is broken
**Solution**: Check that mocks accurately reflect real Supabase behavior

## Using Tests to Protect Against AI Edits

When working with AI coding assistants (like Claude Code):

### 1. Before AI Makes Changes
```bash
# Run tests to establish baseline
npm run test:run
```

### 2. Instruct AI
Tell the AI:
> "Before making changes, run the tests to ensure they pass. After your changes, run tests again to verify nothing broke."

### 3. After AI Makes Changes
```bash
# Verify tests still pass
npm run test:run

# If tests fail, ask AI to fix them
# The test output will show exactly what broke
```

### 4. Protect Critical Functions
For important services, write comprehensive tests first:

```typescript
describe('critical function', () => {
  it('should maintain backward compatibility', () => {
    // Test the exact behavior that must not change
  });
});
```

Then tell AI:
> "This function has tests that must pass. Do not break the existing test suite."

### 5. Use Tests as Documentation
Tests show AI (and developers) how functions should behave:

```typescript
it('should return empty array when university has no programs', async () => {
  // This test documents expected behavior
  // AI will see this and maintain it
});
```

## Example: Protecting programService.ts

When asking AI to modify `programService.ts`:

**Good prompt:**
> "Update the fetchProgramsByUniversity function to also filter by active status. Run the existing tests first, then update the function and tests together, ensuring all tests pass."

**Better prompt:**
> "I need to add an 'active' filter to fetchProgramsByUniversity. Here's what I need:
> 1. Run `npm run test:run` to verify current tests pass
> 2. Update the function to accept an optional `activeOnly` parameter
> 3. Update the test file to cover the new parameter
> 4. Run tests again to verify everything works
> 5. Show me the test output"

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Mocking Guide](https://vitest.dev/guide/mocking.html)
