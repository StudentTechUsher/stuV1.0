/**
 * Assumptions:
 * - Admin/Advisor management page for careers
 * - Shows all careers in a table with quick edit/publish actions
 * - Accessible via /pathfinder/careers/manage
 * - Role check (mock for PoC - assume user is admin)
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCareerSearch } from '@/lib/hooks/useCareers';
import { publishCareer } from '@/lib/hooks/useCareers';
import { StuLoader } from '@/components/ui/StuLoader';

export default function ManageCareersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const { data: careers, isLoading } = useCareerSearch(searchTerm);

  const handlePublish = async (id: string) => {
    if (!confirm('Publish this career?')) return;

    try {
      await publishCareer(id);
      window.location.reload(); // Simple refresh for PoC
    } catch (error) {
      console.error(error);
      alert('Failed to publish career');
    }
  };

  const handleEdit = (slug: string) => {
    router.push(`/pathfinder/careers/edit/${slug}`);
  };

  const getStatusBadge = (status: string) => {
    return status === 'PUBLISHED' ? (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_18%,white)] px-3 py-1 text-xs font-semibold text-[var(--primary)] shadow-sm">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
        </svg>
        Published
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f59e0b] bg-[color-mix(in_srgb,#f59e0b_18%,white)] px-3 py-1 text-xs font-semibold text-[#f59e0b] shadow-sm">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
        </svg>
        Draft
      </span>
    );
  };

  const getOutlookBadge = (label?: string) => {
    const colors = {
      Hot: 'border-[#ef4444] bg-[color-mix(in_srgb,#ef4444_18%,white)] text-[#ef4444]',
      Growing: 'border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_18%,white)] text-[var(--primary)]',
      Stable: 'border-[#3b82f6] bg-[color-mix(in_srgb,#3b82f6_18%,white)] text-[#3b82f6]',
      Declining: 'border-[#6b7280] bg-[color-mix(in_srgb,#6b7280_18%,white)] text-[#6b7280]',
    };

    if (!label) return <span className="text-xs text-[var(--muted-foreground)]">-</span>;

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${colors[label as keyof typeof colors]}`}>
        {label}
      </span>
    );
  };

  return (
    <main className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-header text-3xl font-bold text-[var(--foreground)]">
            Manage Careers
          </h1>
          <p className="font-body text-sm text-[var(--muted-foreground)]">
            Edit career information and manage publications
          </p>
        </div>
        <button
          onClick={() => router.push('/pathfinder')}
          className="group flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-4 py-2 font-body-semi text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-200 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
        >
          <svg className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Pathfinder
        </button>
      </div>

      {/* Stats Cards */}
      {!isLoading && careers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Total Careers */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--hover-green)]">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-body text-xs font-medium text-[var(--muted-foreground)]">Total Careers</p>
                <p className="font-header-bold text-2xl font-extrabold text-[var(--foreground)]">{careers.length}</p>
              </div>
            </div>
          </div>

          {/* Published */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--primary)]">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-body text-xs font-medium text-[var(--muted-foreground)]">Published</p>
                <p className="font-header-bold text-2xl font-extrabold text-[var(--primary)]">
                  {careers.filter((c) => c.status === 'PUBLISHED').length}
                </p>
              </div>
            </div>
          </div>

          {/* Drafts */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#f59e0b]">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <p className="font-body text-xs font-medium text-[var(--muted-foreground)]">Drafts</p>
                <p className="font-header-bold text-2xl font-extrabold text-[#f59e0b]">
                  {careers.filter((c) => c.status === 'DRAFT').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg className="h-5 w-5 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search careers..."
          className="w-full rounded-lg border border-[var(--border)] bg-white py-2.5 pl-10 pr-4 font-body text-sm text-[var(--foreground)] shadow-sm transition-all duration-200 placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white p-16 shadow-sm">
          <StuLoader variant="card" text="Loading careers..." />
        </div>
      )}

      {/* Table */}
      {!isLoading && (
        <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white shadow-sm">
          {/* Table Header */}
          <div className="border-b-2 px-4 py-3.5 sm:px-6" style={{ backgroundColor: "#0A0A0A", borderColor: "#0A0A0A" }}>
            <h3 className="font-header text-sm font-bold uppercase tracking-wider text-white">
              All Careers
            </h3>
          </div>

          {/* Column Headers - Hidden on mobile */}
          <div className="hidden border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_20%,transparent)] px-4 py-3 sm:px-6 lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1.5fr] lg:gap-4">
            <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Career</div>
            <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Status</div>
            <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Outlook</div>
            <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Salary</div>
            <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Updated</div>
            <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Actions</div>
          </div>

          {/* Table Body */}
          <div className="max-h-[600px] overflow-y-auto">
            {careers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--muted)_50%,transparent)]">
                  <svg className="h-8 w-8 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-header-bold mb-2 text-lg font-bold text-[var(--foreground)]">No Careers Found</h3>
                <p className="font-body text-sm text-[var(--muted-foreground)]">Try adjusting your search or create a new career.</p>
              </div>
            ) : (
              careers.map((career) => (
                <div
                  key={career.id}
                  className="group grid grid-cols-1 gap-3 border-b border-[var(--border)] px-4 py-4 transition-colors hover:bg-[color-mix(in_srgb,var(--muted)_15%,transparent)] sm:px-6 lg:grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1.5fr] lg:items-center lg:gap-4"
                >
                  {/* Career Name */}
                  <div>
                    <p className="font-body-semi text-sm font-bold text-[var(--foreground)]">
                      {career.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {career.slug}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="lg:block">
                    {getStatusBadge(career.status)}
                  </div>

                  {/* Outlook */}
                  <div className="lg:block">
                    {getOutlookBadge(career.outlook.growthLabel)}
                  </div>

                  {/* Salary */}
                  <div className="hidden lg:block">
                    <p className="font-body text-sm text-[var(--foreground)]">
                      {career.salaryUSD.median
                        ? `$${(career.salaryUSD.median / 1000).toFixed(0)}k`
                        : '-'}
                    </p>
                  </div>

                  {/* Last Updated */}
                  <div className="hidden lg:block">
                    <p className="font-body text-sm text-[var(--muted-foreground)]">
                      {new Date(career.lastUpdatedISO).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(career.slug)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-[var(--foreground)] transition-all duration-200 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:text-[var(--primary)]"
                      aria-label="Edit career"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {career.status === 'DRAFT' && (
                      <button
                        onClick={() => handlePublish(career.id)}
                        className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 font-body-semi text-xs font-semibold text-[var(--foreground)] transition-all duration-200 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:text-[var(--primary)]"
                        aria-label="Publish career"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Publish
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </main>
  );
}
