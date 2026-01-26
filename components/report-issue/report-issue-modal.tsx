'use client';

import * as React from 'react';
import { X, Bug, Loader2 } from 'lucide-react';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { usePostHog } from '@/contexts/posthog-provider';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportIssueModal({ isOpen, onClose }: ReportIssueModalProps) {
  const [description, setDescription] = React.useState('');
  const [stepsToReproduce, setStepsToReproduce] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const { track } = useAnalytics();
  const { posthog } = usePostHog();

  React.useEffect(() => {
    if (isOpen) {
      // Reset form when opening
      setDescription('');
      setStepsToReproduce('');
      setSubmitStatus('idle');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Get current page URL
      const pageUrl = window.location.href;

      // Get PostHog session replay URL if available
      let sessionReplayUrl = '';
      if (posthog && typeof posthog.get_session_replay_url === 'function') {
        sessionReplayUrl = posthog.get_session_replay_url() || '';
      }

      // Send issue report
      const response = await fetch('/api/report-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description.trim(),
          stepsToReproduce: stepsToReproduce.trim() || undefined,
          pageUrl,
          sessionReplayUrl: sessionReplayUrl || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus('success');

        // Track in PostHog
        track('issue_reported', {
          page_url: pageUrl,
          has_steps: !!stepsToReproduce.trim(),
        });

        // Close modal after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting issue report:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#0A0A0A] bg-[#0A0A0A] px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]">
              <Bug size={20} className="text-[#0A0A0A]" />
            </div>
            <h2 className="font-header-bold text-xl text-white">Report an Issue</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {submitStatus === 'success' ? (
            <div className="py-8 text-center space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-header-bold text-lg text-[var(--foreground)]">
                Issue Reported Successfully
              </h3>
              <p className="font-body text-sm text-[var(--muted-foreground)]">
                Thank you for your feedback! We'll look into this right away.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="description" className="block font-body-semi text-sm text-[var(--foreground)]">
                  What issue did you encounter? <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue you're experiencing..."
                  rows={4}
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-4 py-3 font-body text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="steps" className="block font-body-semi text-sm text-[var(--foreground)]">
                  Steps to reproduce (optional)
                </label>
                <textarea
                  id="steps"
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                  rows={3}
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-4 py-3 font-body text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {submitStatus === 'error' && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm font-body-semi text-red-800">
                    Failed to submit issue report. Please try again or email us directly at admin@stuplanning.com
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <p className="text-xs font-body text-[var(--muted-foreground)]">
                  We&apos;ll include your current page and session info to help debug.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-[var(--border)] px-4 py-2 font-body-semi text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !description.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-body-semi text-sm text-[#0A0A0A] hover:bg-[var(--primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Bug size={16} />
                        Submit Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
