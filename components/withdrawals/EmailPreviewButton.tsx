/**
 * Assumptions:
 * - Opens a modal with the email digest preview
 * - Uses design tokens from globals.css
 */

'use client';

import React, { useState } from 'react';
import type { AdvisorDigest } from '@/lib/jobs/withdrawalDigest';
import WithdrawalDigestEmail from '@/emails/WithdrawalDigestEmail';

interface EmailPreviewButtonProps {
  digest: AdvisorDigest;
}

export default function EmailPreviewButton({ digest }: EmailPreviewButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] font-body-semi text-sm hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
        aria-label="Preview email digest"
      >
        Email Preview
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Modal */}
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vh] max-w-4xl z-50 bg-[var(--card)] rounded-2xl shadow-2xl overflow-auto"
            role="dialog"
            aria-labelledby="email-preview-title"
          >
            <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] px-6 py-4 flex justify-between items-center">
              <h2
                id="email-preview-title"
                className="text-xl font-body-semi text-[var(--foreground)]"
              >
                Email Digest Preview
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] rounded p-1"
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <WithdrawalDigestEmail digest={digest} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
