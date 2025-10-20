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
        className="inline-flex items-center gap-2 rounded-[7px] border border-[color-mix(in_srgb,var(--primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,white)] px-4 py-2 font-body-semi text-sm text-[color-mix(in_srgb,var(--foreground)_78%,var(--primary)_22%)] transition-all duration-150 hover:-translate-y-[1px] hover:bg-[color-mix(in_srgb,var(--primary)_16%,white)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        aria-label="Preview email digest"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Email Preview
      </button>

      {isOpen && (
        <>
          {/* Premium Backdrop with strong blur */}
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Premium Modal */}
          <div
            className="fixed left-1/2 top-1/2 z-50 h-[90vh] w-[90vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[7px] border border-[color-mix(in_srgb,rgba(0,0,0,0.14)_18%,var(--border)_82%)] bg-white shadow-[0_52px_140px_-50px_rgba(10,31,26,0.75)]"
            role="dialog"
            aria-labelledby="email-preview-title"
          >
            {/* Premium Black Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between bg-[#0A0A0A] px-6 py-4">
              <h2
                id="email-preview-title"
                className="font-body-semi text-xl font-semibold tracking-tight text-white"
              >
                Email Digest Preview
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-[7px] p-2 text-white/70 transition-all duration-150 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label="Close preview"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-auto p-6" style={{ maxHeight: 'calc(90vh - 64px)' }}>
              <WithdrawalDigestEmail digest={digest} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
