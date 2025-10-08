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

export default function ManageCareersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const { data: careers, isLoading } = useCareerSearch(searchTerm);

  const handlePublish = async (id: string) => {
    if (!confirm('Publish this career?')) return;

    try {
      await publishCareer(id);
      window.location.reload(); // Simple refresh for PoC
    } catch (err) {
      alert('Failed to publish career');
    }
  };

  const handleEdit = (slug: string) => {
    router.push(`/pathfinder/careers/edit/${slug}`);
  };

  const getStatusBadge = (status: string) => {
    return status === 'PUBLISHED' ? (
      <span className="px-2 py-1 text-xs font-body-semi rounded-lg bg-[var(--primary-15)] text-[var(--primary)]">
        Published
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-body-semi rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)]">
        Draft
      </span>
    );
  };

  const getOutlookBadge = (label?: string) => {
    const colors = {
      Hot: 'bg-[var(--primary-15)] text-[var(--primary)]',
      Growing: 'bg-[var(--accent)] text-[var(--accent-foreground)]',
      Stable: 'bg-[var(--secondary)] text-[var(--secondary-foreground)]',
      Declining: 'bg-[var(--destructive)] text-[var(--destructive-foreground)]',
    };

    if (!label) return <span className="text-xs text-[var(--muted-foreground)]">-</span>;

    return (
      <span className={`px-2 py-1 text-xs font-body-semi rounded-lg ${colors[label as keyof typeof colors]}`}>
        {label}
      </span>
    );
  };

  return (
    <main className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-header text-[var(--foreground)]">
            Manage Careers
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Edit career information and manage publications
          </p>
        </div>
        <button
          onClick={() => router.push('/pathfinder')}
          className="px-4 py-2 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] font-body-semi hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
        >
          Back to Pathfinder
        </button>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search careers..."
          className="w-full max-w-md px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-8">
          <p className="text-[var(--muted-foreground)]">Loading careers...</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--muted)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-body-semi text-[var(--foreground)] uppercase">
                    Career
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-body-semi text-[var(--foreground)] uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-body-semi text-[var(--foreground)] uppercase">
                    Outlook
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-body-semi text-[var(--foreground)] uppercase">
                    Salary (Median)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-body-semi text-[var(--foreground)] uppercase">
                    Last Updated
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-body-semi text-[var(--foreground)] uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {careers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                      No careers found
                    </td>
                  </tr>
                ) : (
                  careers.map((career) => (
                    <tr
                      key={career.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-body-semi text-[var(--foreground)]">
                            {career.title}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            {career.slug}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(career.status)}</td>
                      <td className="px-4 py-3">
                        {getOutlookBadge(career.outlook.growthLabel)}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)] font-body">
                        {career.salaryUSD.median
                          ? `$${(career.salaryUSD.median / 1000).toFixed(0)}k`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                        {new Date(career.lastUpdatedISO).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(career.slug)}
                            className="px-3 py-1 text-sm rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi hover:bg-[var(--hover-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
                          >
                            Edit
                          </button>
                          {career.status === 'DRAFT' && (
                            <button
                              onClick={() => handlePublish(career.id)}
                              className="px-3 py-1 text-sm rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] font-body-semi hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
                            >
                              Publish
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-[var(--muted)] border-t border-[var(--border)]">
            <p className="text-sm text-[var(--muted-foreground)]">
              Showing {careers.length} career{careers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {!isLoading && careers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <p className="text-sm text-[var(--muted-foreground)] mb-1">Total Careers</p>
            <p className="text-2xl font-body-semi text-[var(--foreground)]">
              {careers.length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <p className="text-sm text-[var(--muted-foreground)] mb-1">Published</p>
            <p className="text-2xl font-body-semi text-[var(--primary)]">
              {careers.filter((c) => c.status === 'PUBLISHED').length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
            <p className="text-sm text-[var(--muted-foreground)] mb-1">Drafts</p>
            <p className="text-2xl font-body-semi text-[var(--muted-foreground)]">
              {careers.filter((c) => c.status === 'DRAFT').length}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
