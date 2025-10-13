/**
 * Comprehensive Major Information Modal
 * Similar to CareerInfoModal, provides rich information about academic majors
 * including course requirements, career paths, equivalencies, and opportunities
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { MajorInfo } from '@/types/major';
import CareerSkillChips from './CareerSkillChips';
import InfoRow from './InfoRow';

interface MajorInfoModalProps {
  major: MajorInfo;
  open: boolean;
  onClose: () => void;
  completedCourses?: Array<{ code: string; title: string; credits: number; }>;
  isAdvisor?: boolean;
}

export default function MajorInfoModal({
  major,
  open,
  onClose,
  completedCourses = [],
  isAdvisor = false,
}: MajorInfoModalProps) {
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

  // Calculate course overlap
  const completedCodes = new Set(completedCourses.map(c => c.code.trim().toUpperCase()));
  const coreCourseMatches = major.coreCourses.filter(course => {
    const code = course.split('-')[0].trim().toUpperCase();
    return completedCodes.has(code);
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] h-[90vh] max-w-4xl z-50 bg-[var(--card)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-labelledby="major-modal-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] px-6 py-4 flex justify-between items-center">
          <div className="flex-1">
            <h2
              id="major-modal-title"
              className="text-2xl font-header text-[var(--foreground)]"
            >
              {major.name}
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {major.degreeType} • {major.typicalDuration} • {major.totalCredits} credits
            </p>
            {coreCourseMatches.length > 0 && (
              <div className="mt-2 inline-flex items-center gap-2 rounded border border-[var(--primary-15)] bg-[var(--primary-15)] px-3 py-1">
                <span className="text-xs font-body-semi text-[var(--primary)]">
                  ✓ {coreCourseMatches.length} of your completed courses match core requirements
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdvisor && (
              <button
                onClick={() => {
                  // TODO: Navigate to major edit page when implemented
                  router.push(`/dashboard/maintain-programs?major=${major.slug}`);
                }}
                className="px-4 py-2 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] font-body-semi text-sm hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
              >
                Edit
              </button>
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
              Program Overview
            </h3>
            <p className="text-[var(--foreground)] font-body whitespace-pre-line">
              {major.overview}
            </p>
          </section>

          {/* Career Paths */}
          {major.topCareers.length > 0 && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Top Career Paths
              </h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {major.topCareers.map((career) => (
                  <span
                    key={career.slug}
                    className="px-3 py-1.5 text-sm rounded-lg bg-[var(--primary-15)] text-[var(--foreground)] font-body-semi"
                  >
                    {career.title}
                  </span>
                ))}
              </div>
              {major.careerOutlook && (
                <p className="text-sm text-[var(--muted-foreground)] font-body">
                  {major.careerOutlook}
                </p>
              )}
            </section>
          )}

          {/* Core Courses */}
          {major.coreCourses.length > 0 && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Core Required Courses
              </h3>
              <ul className="space-y-2">
                {major.coreCourses.map((course, idx) => {
                  const code = course.split('-')[0].trim().toUpperCase();
                  const isCompleted = completedCodes.has(code);
                  return (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-[var(--foreground)] font-body"
                    >
                      <span className={isCompleted ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]}"}>
                        {isCompleted ? '✓' : '•'}
                      </span>
                      <span className={isCompleted ? "font-body-semi" : ""}>{course}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Course Equivalencies */}
          {major.courseEquivalencies.length > 0 && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Course Equivalencies & Cross-Listings
              </h3>
              <div className="space-y-3">
                {major.courseEquivalencies.map((eq, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[var(--muted)]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-body-semi text-[var(--foreground)]">
                        {eq.institutionCourse}
                      </span>
                      <span className="text-[var(--muted-foreground)]">→</span>
                      <span className="text-sm text-[var(--foreground)]">
                        {eq.equivalentCourses.join(', ')}
                      </span>
                    </div>
                    {eq.notes && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {eq.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Elective Courses */}
          {major.electiveCourses && major.electiveCourses.length > 0 && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Popular Electives
              </h3>
              <ul className="space-y-2">
                {major.electiveCourses.map((course, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-[var(--foreground)] font-body"
                  >
                    <span className="text-[var(--primary)] mt-1">•</span>
                    <span>{course}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Prerequisites & Requirements */}
          <section>
            <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
              Prerequisites & Requirements
            </h3>
            <dl className="space-y-3">
              {major.prerequisites.length > 0 && (
                <InfoRow
                  label="Prerequisites"
                  value={
                    <ul className="list-disc list-inside space-y-1">
                      {major.prerequisites.map((prereq, idx) => (
                        <li key={idx}>{prereq}</li>
                      ))}
                    </ul>
                  }
                />
              )}
              {major.mathRequirements && (
                <InfoRow label="Math Requirements" value={major.mathRequirements} />
              )}
              {major.otherRequirements && (
                <InfoRow label="Other Requirements" value={major.otherRequirements} />
              )}
            </dl>
          </section>

          {/* Skills & Learning Outcomes */}
          {major.topSkills.length > 0 && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Skills You&apos;ll Develop
              </h3>
              <CareerSkillChips skills={major.topSkills} />
            </section>
          )}

          {major.learningOutcomes.length > 0 && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Learning Outcomes
              </h3>
              <ul className="space-y-2">
                {major.learningOutcomes.map((outcome, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-[var(--foreground)] font-body"
                  >
                    <span className="text-[var(--primary)] mt-1">•</span>
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Opportunities */}
          {(major.internshipOpportunities || major.researchAreas || major.studyAbroadOptions || major.clubs) && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Opportunities & Activities
              </h3>
              <dl className="space-y-4">
                {major.internshipOpportunities && major.internshipOpportunities.length > 0 && (
                  <InfoRow
                    label="Internships"
                    value={
                      <ul className="list-disc list-inside space-y-1">
                        {major.internshipOpportunities.map((intern, idx) => (
                          <li key={idx}>{intern}</li>
                        ))}
                      </ul>
                    }
                  />
                )}
                {major.researchAreas && major.researchAreas.length > 0 && (
                  <InfoRow
                    label="Research Areas"
                    value={
                      <ul className="list-disc list-inside space-y-1">
                        {major.researchAreas.map((area, idx) => (
                          <li key={idx}>{area}</li>
                        ))}
                      </ul>
                    }
                  />
                )}
                {major.studyAbroadOptions && major.studyAbroadOptions.length > 0 && (
                  <InfoRow
                    label="Study Abroad"
                    value={
                      <ul className="list-disc list-inside space-y-1">
                        {major.studyAbroadOptions.map((option, idx) => (
                          <li key={idx}>{option}</li>
                        ))}
                      </ul>
                    }
                  />
                )}
                {major.clubs && major.clubs.length > 0 && (
                  <InfoRow
                    label="Student Organizations"
                    value={
                      <ul className="list-disc list-inside space-y-1">
                        {major.clubs.map((club, idx) => (
                          <li key={idx}>{club}</li>
                        ))}
                      </ul>
                    }
                  />
                )}
              </dl>
            </section>
          )}

          {/* Related Programs */}
          {(major.relatedMajors || major.commonMinors || major.dualDegreeOptions) && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Related Programs
              </h3>
              <dl className="space-y-3">
                {major.relatedMajors && major.relatedMajors.length > 0 && (
                  <div>
                    <dt className="text-sm font-body-semi text-[var(--foreground)] mb-2">Related Majors</dt>
                    <dd className="flex flex-wrap gap-2">
                      {major.relatedMajors.map((slug, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 text-sm rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] font-body"
                        >
                          {slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {major.commonMinors && major.commonMinors.length > 0 && (
                  <InfoRow
                    label="Common Minor Pairings"
                    value={major.commonMinors.join(', ')}
                  />
                )}
                {major.dualDegreeOptions && major.dualDegreeOptions.length > 0 && (
                  <InfoRow
                    label="Dual Degree Options"
                    value={
                      <ul className="list-disc list-inside space-y-1">
                        {major.dualDegreeOptions.map((option, idx) => (
                          <li key={idx}>{option}</li>
                        ))}
                      </ul>
                    }
                  />
                )}
              </dl>
            </section>
          )}

          {/* Links & Resources */}
          {major.links && major.links.length > 0 && (
            <section>
              <h3 className="text-xl font-body-semi text-[var(--foreground)] mb-3 border-b border-[var(--border)] pb-2">
                Resources & More Info
              </h3>
              <ul className="space-y-2">
                {major.departmentWebsite && (
                  <li>
                    <a
                      href={major.departmentWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--primary)] hover:underline font-body"
                    >
                      Department Website ↗
                    </a>
                  </li>
                )}
                {major.advisingContact && (
                  <li className="text-[var(--foreground)] font-body">
                    <strong>Advising:</strong> {major.advisingContact}
                  </li>
                )}
                {major.links.map((link, idx) => (
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
            Last updated: {new Date(major.lastUpdatedISO).toLocaleDateString()}{' '}
            {major.updatedBy && `by ${major.updatedBy.name}`}
          </p>
          {!isAdvisor && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi text-sm hover:bg-[var(--hover-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
            >
              Select This Major
            </button>
          )}
        </div>
      </div>
    </>
  );
}
