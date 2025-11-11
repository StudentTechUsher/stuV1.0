'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

type Props = {
  planId: string;
  initialName: string;
  onSaved?: (newName: string) => void;
  className?: string; // should inherit heading styles from parent
};

const MAX_LEN = 120;

function normalizeName(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

export default function EditablePlanTitle({
  planId,
  initialName,
  onSaved,
  className
}: Props) {
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  // Enter saves, Esc cancels
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.currentTarget as HTMLDivElement).blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setError(null);
      setEditing(false);
      // reset text content
      if (ref.current) ref.current.textContent = name;
    }
  }

  function startEditing() {
    setEditing(true);
    setError(null);
    requestAnimationFrame(() => {
      if (!ref.current) return;
      const r = document.createRange();
      r.selectNodeContents(ref.current);
      const sel = window.getSelection();
      if (!sel) return;
      sel.removeAllRanges();
      sel.addRange(r);
    });
  }

  async function commit() {
    const normalized = normalizeName(ref.current?.textContent ?? '');
    // Early validations
    if (!normalized.length) {
      setError('Name cannot be empty.');
      // keep editing; restore text to previous valid value
      if (ref.current) ref.current.textContent = name;
      return;
    }
    if (normalized.length > MAX_LEN) {
      setError(`Name must be ≤ ${MAX_LEN} characters.`);
      return;
    }
    if (normalized === name) {
      // No change
      setEditing(false);
      setError(null);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/plans/${planId}/name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalized })
      });

      if (res.status === 409) {
        setError('You already have a plan with that name. Choose a different name.');
        // keep editing; keep the user's typed value visible
        setSaving(false);
        return;
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = (errorData as { error?: string; message?: string }).error ||
                        (errorData as { error?: string; message?: string }).message ||
                        `Save failed (${res.status})`;
        throw new Error(errorMsg);
      }
      const data = (await res.json()) as { name: string };
      setName(data.name);
      if (ref.current) ref.current.textContent = data.name;
      setEditing(false);
      onSaved?.(data.name);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Save failed. Try again.';
      setError(errorMessage);
      console.error('EditablePlanTitle save error:', errorMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div
        ref={ref}
        role="textbox"
        aria-label="Plan name"
        aria-invalid={!!error}
        aria-describedby={error ? 'plan-name-error' : undefined}
        contentEditable={editing}
        suppressContentEditableWarning
        onClick={() => !editing && startEditing()}
        onBlur={() => editing && commit()}
        onKeyDown={onKeyDown}
        onInput={(_e) => {
          // Track input for character limit enforcement
        }}
        onMouseEnter={() => !editing && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={editing ? {
          outline: '2px solid var(--primary)',
          borderRadius: '2px',
          paddingLeft: '2px',
          paddingRight: '2px',
          fontWeight: '700'
        } : hovering ? {
          outline: '1px solid rgba(10,31,26,0.3)',
          borderRadius: '2px',
          paddingLeft: '2px',
          paddingRight: '2px',
          fontWeight: '700'
        } : {}}
        className={clsx(
          // Base: no box styling
          'outline-none border-none',
          'transition-all duration-100',
          // Hover shows I-beam cursor when not editing
          !editing && 'cursor-text',
          // Inherit heading styles from parent - applied always to keep size consistent
          className
        )}
        // Prevent paste of rich text
        onPaste={(e) => {
          e.preventDefault();
          const text = (e.clipboardData.getData('text') || '').replace(/\s+/g, ' ');
          document.execCommand('insertText', false, text);
        }}
      >
        {name}
      </div>

      {/* Inline help/error */}
      {error && (
        <div id="plan-name-error" aria-live="polite" className="mt-1 text-sm text-red-600">
          {saving ? 'Saving…' : error}
        </div>
      )}
    </div>
  );
}
