/**
 * Assumptions:
 * - Modal on desktop (centered), drawer on mobile (bottom sheet)
 * - Accessible with focus trap, Esc to close, keyboard navigation
 * - Uses design tokens from globals.css
 * - Sections: Overview, Education, Majors, Locations, Salary, Outlook, Skills, Day-to-day, Recommendations, Related
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Career } from '@/types/career';
import CareerSkillChips from './CareerSkillChips';
import InfoRow from './InfoRow';

interface CareerInfoModalProps {
  career: Career;
  open: boolean;
  onClose: () => void;
  onSelectRelated?: (slug: string) => void;
  isAdvisor?: boolean;
}

export default function CareerInfoModal({
  career,
  open,
  onClose,
  onSelectRelated,
  isAdvisor = false,
}: CareerInfoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);

    // Focus trap
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    firstElement?.focus();

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  const formatSalary = (num?: number) => {
    if (!num) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getOutlookColor = (label?: string) => {
    switch (label) {
      case 'Hot':
        return 'bg-[var(--primary-15)] text-[var(--primary)]';
      case 'Growing':
        return 'bg-[var(--accent)] text-[var(--accent-foreground)]';
      case 'Stable':
        return 'bg-[var(--secondary)] text-[var(--secondary-foreground)]';
      case 'Declining':
        return 'bg-[var(--destructive)] text-[var(--destructive-foreground)]';
      default:
        return 'bg-[var(--muted)] text-[var(--muted-foreground)]';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal - centered on desktop, drawer on mobile */}
      <div
        ref={modalRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] h-[90vh] max-w-4xl z-50 bg-[var(--card)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-labelledby="career-modal-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] px-6 py-4 flex justify-between items-center">
          <div className="flex-1">
            <h2
              id="career-modal-title"
              className="text-2xl font-header text-[var(--foreground)]"
            >
              {career.title}
            </h2>
            {career.outlook.growthLabel && (
              <span
                className={`inline-block mt-2 px-3 py-1 text-sm font-body-semi rounded-lg ${getOutlookColor(
                  career.outlook.growthLabel
                )}`}
              >
                {career.outlook.growthLabel} Outlook
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdvisor && (
              <>
                <button
                  onClick={() => router.push('/pathfinder/careers/manage')}
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] font-body-semi text-sm hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
                  title="Manage all careers"
                >
                  Manage All
                </button>
                <button
                  onClick={() =>
                    router.push(`/pathfinder/careers/edit/${career.slug}`)
                  }
                  className="px-4 py-2 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] font-body-semi text-sm hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
                >
                  Edit
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] rounded p-2"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Overview */}
          <section>
            <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
              Overview
            </h3>
            <p className="text-[var(--foreground)] font-body whitespace-pre-line">
              {career.overview}
            </p>
          </section>

          {/* Education */}
          <section>
            <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
              Education & Certifications
            </h3>
            <dl className="space-y-3">
              <InfoRow
                label="Typical Level"
                value={career.education.typicalLevel.replace('_', ' ')}
              />
              {career.education.certifications &&
                career.education.certifications.length > 0 && (
                  <InfoRow
                    label="Certifications"
                    value={
                      <ul className="list-disc list-inside space-y-1">
                        {career.education.certifications.map((cert, idx) => (
                          <li key={idx}>{cert}</li>
                        ))}
                      </ul>
                    }
                  />
                )}
            </dl>
          </section>

          {/* Best Majors */}
          {career.bestMajors.length > 0 && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Best-Fit Majors
              </h3>
              <div className="flex flex-wrap gap-2">
                {career.bestMajors.map((major) => (
                  <span
                    key={major.id}
                    className="px-3 py-1.5 text-sm rounded-lg bg-[var(--primary-15)] text-[var(--foreground)] font-body-semi"
                  >
                    {major.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Location Hubs */}
          {career.locationHubs.length > 0 && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Top U.S. Location Hubs
              </h3>
              <div className="flex flex-wrap gap-2">
                {career.locationHubs.map((loc, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] font-body"
                  >
                    📍 {loc}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Salary */}
          <section>
            <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
              Salary Range (USD)
            </h3>
            <dl className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-[var(--muted)]">
                  <dt className="text-xs text-[var(--muted-foreground)] mb-1">
                    Entry Level
                  </dt>
                  <dd className="text-lg font-body-semi text-[var(--foreground)]">
                    {formatSalary(career.salaryUSD.entry)}
                  </dd>
                </div>
                <div className="p-3 rounded-lg bg-[var(--muted)]">
                  <dt className="text-xs text-[var(--muted-foreground)] mb-1">
                    Median
                  </dt>
                  <dd className="text-lg font-body-semi text-[var(--foreground)]">
                    {formatSalary(career.salaryUSD.median)}
                  </dd>
                </div>
                <div className="p-3 rounded-lg bg-[var(--muted)]">
                  <dt className="text-xs text-[var(--muted-foreground)] mb-1">
                    90th Percentile
                  </dt>
                  <dd className="text-lg font-body-semi text-[var(--foreground)]">
                    {formatSalary(career.salaryUSD.p90)}
                  </dd>
                </div>
              </div>
              {career.salaryUSD.source && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  Source: {career.salaryUSD.source}
                </p>
              )}
            </dl>
          </section>

          {/* Job Outlook */}
          <section>
            <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
              Job Growth Outlook
            </h3>
            {career.outlook.notes && (
              <p className="text-[var(--foreground)] font-body mb-2">
                {career.outlook.notes}
              </p>
            )}
            {career.outlook.source && (
              <p className="text-xs text-[var(--muted-foreground)]">
                Source: {career.outlook.source}
              </p>
            )}
          </section>

          {/* Top Skills */}
          {career.topSkills.length > 0 && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Key Skills & Technologies
              </h3>
              <CareerSkillChips skills={career.topSkills} />
            </section>
          )}

          {/* Day-to-Day */}
          {career.dayToDay.length > 0 && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Day-to-Day Activities
              </h3>
              <ul className="space-y-2">
                {career.dayToDay.map((activity, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-[var(--foreground)] font-body"
                  >
                    <span className="text-[var(--primary)] mt-1">•</span>
                    <span>{activity}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Recommendations */}
          {(career.recommendedCourses || career.internships || career.clubs) && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Recommendations
              </h3>
              <dl className="space-y-4">
                {career.recommendedCourses &&
                  career.recommendedCourses.length > 0 && (
                    <InfoRow
                      label="Courses"
                      value={
                        <ul className="list-disc list-inside space-y-1">
                          {career.recommendedCourses.map((course, idx) => (
                            <li key={idx}>{course}</li>
                          ))}
                        </ul>
                      }
                    />
                  )}
                {career.internships && career.internships.length > 0 && (
                  <InfoRow
                    label="Internships"
                    value={
                      <ul className="list-disc list-inside space-y-1">
                        {career.internships.map((intern, idx) => (
                          <li key={idx}>{intern}</li>
                        ))}
                      </ul>
                    }
                  />
                )}
                {career.clubs && career.clubs.length > 0 && (
                  <InfoRow
                    label="Clubs"
                    value={
                      <ul className="list-disc list-inside space-y-1">
                        {career.clubs.map((club, idx) => (
                          <li key={idx}>{club}</li>
                        ))}
                      </ul>
                    }
                  />
                )}
              </dl>
            </section>
          )}

          {/* Related Careers */}
          {career.relatedCareers && career.relatedCareers.length > 0 && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Related Careers
              </h3>
              <div className="flex flex-wrap gap-2">
                {career.relatedCareers.map((slug, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectRelated?.(slug)}
                    className="px-3 py-1.5 text-sm rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] font-body hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
                  >
                    {slug
                      .split('-')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ')}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Links */}
          {career.links && career.links.length > 0 && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Sources & Resources
              </h3>
              <ul className="space-y-2">
                {career.links.map((link, idx) => (
                  <li key={idx}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--primary)] hover:underline font-body"
                    >
                      {link.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[var(--card)] border-t border-[var(--border)] px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-[var(--muted-foreground)]">
            Last updated: {new Date(career.lastUpdatedISO).toLocaleDateString()}{' '}
            {career.updatedBy && `by ${career.updatedBy.name}`}
          </p>
          {!isAdvisor && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi text-sm hover:bg-[var(--hover-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
            >
              Select This Career
            </button>
          )}
        </div>
      </div>
    </>
  );
}
