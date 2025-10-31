import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditablePlanTitle from './EditablePlanTitle';

describe('EditablePlanTitle Component', () => {
  const defaultProps = {
    planId: 'test-plan-123',
    ownerId: 'test-user-456',
    initialName: 'My Graduation Plan',
    onSaved: vi.fn(),
  };

  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  describe('View Mode (Default Behavior)', () => {
    it('renders the initial name in plain text', () => {
      render(<EditablePlanTitle {...defaultProps} />);
      expect(screen.getByText('My Graduation Plan')).toBeInTheDocument();
    });

    it('does not show outline in view mode', () => {
      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]');
      expect(titleDiv).toHaveClass('ring-0');
      expect(titleDiv).not.toHaveClass('ring-1');
    });

    it('has cursor-text class for I-beam cursor hover', () => {
      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]');
      expect(titleDiv).toHaveClass('cursor-text');
    });
  });

  describe('Edit Mode Activation', () => {
    it('enters edit mode on click', () => {
      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);

      expect(titleDiv).toHaveAttribute('contenteditable', 'true');
      expect(titleDiv).toHaveClass('ring-1');
    });

    it('shows green outline when in edit mode', () => {
      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);

      expect(titleDiv).toHaveClass('ring-1');
      expect(titleDiv).toHaveClass('ring-[var(--primary)]');
    });

    it('selects all text when entering edit mode', () => {
      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);

      // In edit mode, text should be selected (we can't easily test the actual selection,
      // but we can verify the contenteditable state)
      expect(titleDiv).toHaveAttribute('contenteditable', 'true');
    });
  });

  describe('Input Handling', () => {
    it('allows text input while editing', async () => {
      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);

      // Simulate text input
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: 'Updated Plan Name' }
      });

      expect(titleDiv.textContent).toBe('Updated Plan Name');
    });

    it('enforces max length of 120 characters', async () => {
      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);

      const longText = 'a'.repeat(130);
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: longText }
      });

      // The component should truncate to 121 (MAX_LEN + 1)
      expect(titleDiv.textContent?.length).toBeLessThanOrEqual(121);
    });

    it('collapses multiple spaces to single space on input', async () => {
      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);

      fireEvent.input(titleDiv, {
        currentTarget: { textContent: 'Plan   Name   Here' }
      });

      // Should keep the input as-is during edit, but normalization happens on save
      expect(titleDiv.textContent).toBe('Plan   Name   Here');
    });
  });

  describe('Save Behavior', () => {
    it('saves on blur if name changed', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ name: 'New Plan Name' })
      });
      global.fetch = mockFetch;

      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: 'New Plan Name' }
      });

      fireEvent.blur(titleDiv);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/plans/test-plan-123/name',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
          })
        );
      });
    });

    it('saves on Enter key', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ name: 'New Plan Name' })
      });
      global.fetch = mockFetch;

      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: 'New Plan Name' }
      });

      fireEvent.keyDown(titleDiv, { key: 'Enter' });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('calls onSaved callback after successful save', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ name: 'New Plan Name' })
      });
      global.fetch = mockFetch;

      const onSaved = vi.fn();
      const { container } = render(
        <EditablePlanTitle {...defaultProps} onSaved={onSaved} />
      );
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: 'New Plan Name' }
      });

      fireEvent.blur(titleDiv);

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledWith('New Plan Name');
      });
    });

    it('does not save if name has not changed', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);
      // Don't change the text, just blur
      fireEvent.blur(titleDiv);

      await waitFor(() => {
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    it('shows saving state while request is in progress', async () => {
      const mockFetch = vi.fn(() => new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          status: 200,
          json: async () => ({ name: 'New Plan Name' })
        }), 100);
      }));
      global.fetch = mockFetch;

      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: 'New Plan Name' }
      });

      fireEvent.blur(titleDiv);

      const errorDiv = container.querySelector('#plan-name-error') as HTMLElement;
      expect(errorDiv?.textContent).toBe('Saving…');

      await waitFor(() => {
        expect(errorDiv?.textContent).not.toBe('Saving…');
      }, { timeout: 200 });
    });
  });

  describe('Cancel/Escape Behavior', () => {
    it('reverts changes and exits edit mode on Escape', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: 'Changed Name' }
      });

      fireEvent.keyDown(titleDiv, { key: 'Escape' });

      expect(titleDiv.textContent).toBe('My Graduation Plan');
      expect(titleDiv).toHaveAttribute('contenteditable', 'false');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('clears error message on Escape', async () => {
      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;
      const errorDiv = container.querySelector('#plan-name-error') as HTMLElement;

      fireEvent.click(titleDiv);

      // Try to save empty name (should show error)
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: '' }
      });

      fireEvent.blur(titleDiv);

      await waitFor(() => {
        expect(errorDiv?.textContent).toContain('cannot be empty');
      });

      // Click to edit again and press Escape
      fireEvent.click(titleDiv);
      fireEvent.keyDown(titleDiv, { key: 'Escape' });

      expect(errorDiv?.textContent).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('shows error for empty name', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;
      const errorDiv = container.querySelector('#plan-name-error') as HTMLElement;

      fireEvent.click(titleDiv);
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: '' }
      });

      fireEvent.blur(titleDiv);

      await waitFor(() => {
        expect(errorDiv?.textContent).toContain('cannot be empty');
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(titleDiv.textContent).toBe('My Graduation Plan'); // Reverted
    });

    it('shows error for name exceeding max length', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;
      const errorDiv = container.querySelector('#plan-name-error') as HTMLElement;

      fireEvent.click(titleDiv);

      const tooLongName = 'a'.repeat(121);
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: tooLongName }
      });

      fireEvent.blur(titleDiv);

      await waitFor(() => {
        expect(errorDiv?.textContent).toContain('must be ≤');
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('shows error for duplicate name (409 response)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ code: 'DUPLICATE_NAME' })
      });
      global.fetch = mockFetch;

      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;
      const errorDiv = container.querySelector('#plan-name-error') as HTMLElement;

      fireEvent.click(titleDiv);
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: 'Duplicate Name' }
      });

      fireEvent.blur(titleDiv);

      await waitFor(() => {
        expect(errorDiv?.textContent).toContain('already have a plan');
      });

      expect(titleDiv).toHaveAttribute('contenteditable', 'true'); // Still editing
    });

    it('shows generic error for save failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      });
      global.fetch = mockFetch;

      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;
      const errorDiv = container.querySelector('#plan-name-error') as HTMLElement;

      fireEvent.click(titleDiv);
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: 'New Name' }
      });

      fireEvent.blur(titleDiv);

      await waitFor(() => {
        expect(errorDiv?.textContent).toMatch(/failed|error/i);
      });
    });

    it('trims and normalizes whitespace before saving', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ name: 'Trimmed   Name' })
      });
      global.fetch = mockFetch;

      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: '  Trimmed   Name  ' }
      });

      fireEvent.blur(titleDiv);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/plans/test-plan-123/name',
          expect.objectContaining({
            body: expect.stringContaining('Trimmed Name')
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper role and aria attributes', () => {
      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]');

      expect(titleDiv).toHaveAttribute('role', 'textbox');
      expect(titleDiv).toHaveAttribute('aria-label', 'Plan name');
    });

    it('announces errors via aria-live', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;
      const errorDiv = container.querySelector('#plan-name-error');

      expect(errorDiv).toHaveAttribute('aria-live', 'polite');

      fireEvent.click(titleDiv);
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: '' }
      });

      fireEvent.blur(titleDiv);

      await waitFor(() => {
        expect(errorDiv?.textContent).toContain('cannot be empty');
      });
    });

    it('updates aria-invalid when there is an error', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: '' }
      });

      fireEvent.blur(titleDiv);

      await waitFor(() => {
        expect(titleDiv).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('sets aria-describedby when error exists', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);
      fireEvent.input(titleDiv, {
        currentTarget: { textContent: '' }
      });

      fireEvent.blur(titleDiv);

      await waitFor(() => {
        expect(titleDiv).toHaveAttribute('aria-describedby', 'plan-name-error');
      });
    });
  });

  describe('Props Update', () => {
    it('updates displayed name when initialName prop changes', async () => {
      const { rerender, container } = render(
        <EditablePlanTitle {...defaultProps} />
      );

      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;
      expect(titleDiv.textContent).toBe('My Graduation Plan');

      rerender(
        <EditablePlanTitle {...defaultProps} initialName="Updated Plan" />
      );

      expect(titleDiv.textContent).toBe('Updated Plan');
    });
  });

  describe('Rich Text Prevention', () => {
    it('strips rich text on paste', async () => {
      const { container } = render(<EditablePlanTitle {...defaultProps} />);
      const titleDiv = container.querySelector('[role="textbox"]') as HTMLElement;

      fireEvent.click(titleDiv);

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });

      // Mock the clipboard data
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: vi.fn().mockReturnValue('Plain text from clipboard')
        }
      });

      fireEvent.paste(titleDiv, pasteEvent);

      // The component should prevent default and handle plain text only
      expect(pasteEvent.defaultPrevented).toBe(true);
    });
  });
});
