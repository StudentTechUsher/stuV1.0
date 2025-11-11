'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import type { AdvisorStudentRow } from '@/lib/services/profileService';
import { Search, ChevronDown, ChevronUp, User, GraduationCap } from 'lucide-react';

interface AdvisorStudentsTableProps {
  rows: AdvisorStudentRow[];
}

type SortField = 'fname' | 'lname' | 'programs';
type SortDirection = 'asc' | 'desc';

export default function AdvisorStudentsTable({ rows }: Readonly<AdvisorStudentsTableProps>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('lname');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Debug: Log received data
  React.useEffect(() => {
    console.log('📊 AdvisorStudentsTable received rows:', rows.length);
    console.log('📸 Avatar URLs:', rows.map(r => ({
      name: `${r.fname} ${r.lname}`,
      avatar_url: r.avatar_url,
      hasAvatar: !!r.avatar_url
    })));
  }, [rows]);

  // Filter and sort data
  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = rows.filter(row =>
        row.fname.toLowerCase().includes(query) ||
        row.lname.toLowerCase().includes(query) ||
        row.programs.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [rows, searchQuery, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRows.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRows = filteredAndSortedRows.slice(startIndex, endIndex);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Empty state
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-white p-12 text-center">
        <div className="mx-auto max-w-md space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--muted)]">
            <User size={32} className="text-[var(--muted-foreground)]" />
          </div>
          <h3 className="font-header-bold text-lg text-[var(--foreground)]">
            No Students Yet
          </h3>
          <p className="font-body text-sm text-[var(--muted-foreground)] leading-relaxed">
            You don't have any advisees assigned yet. Students will appear here once they are assigned to you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search by name or program..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-white py-2.5 pl-10 pr-4 font-body text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-all duration-200 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-0"
          />
        </div>

        {/* Results count */}
        <div className="font-body text-sm text-[var(--muted-foreground)]">
          Showing <span className="font-semibold text-[var(--foreground)]">{startIndex + 1}-{Math.min(endIndex, filteredAndSortedRows.length)}</span> of <span className="font-semibold text-[var(--foreground)]">{filteredAndSortedRows.length}</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Black Header */}
            <thead>
              <tr className="bg-[#0A0A0A] text-white">
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('fname')}
                    className="inline-flex items-center gap-2 font-body-semi text-xs uppercase tracking-wider transition-colors hover:text-[var(--primary)]"
                  >
                    <span>First Name</span>
                    {sortField === 'fname' && (
                      sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('lname')}
                    className="inline-flex items-center gap-2 font-body-semi text-xs uppercase tracking-wider transition-colors hover:text-[var(--primary)]"
                  >
                    <span>Last Name</span>
                    {sortField === 'lname' && (
                      sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('programs')}
                    className="inline-flex items-center gap-2 font-body-semi text-xs uppercase tracking-wider transition-colors hover:text-[var(--primary)]"
                  >
                    <span>Programs</span>
                    {sortField === 'programs' && (
                      sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </button>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <div className="space-y-2">
                      <p className="font-body-semi text-sm text-[var(--foreground)]">
                        No students found
                      </p>
                      <p className="font-body text-xs text-[var(--muted-foreground)]">
                        Try adjusting your search query
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="group transition-all duration-150 hover:bg-[color-mix(in_srgb,var(--primary)_3%,white)]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {row.avatar_url ? (
                          <img
                            src={row.avatar_url}
                            alt={`${row.fname} ${row.lname}`}
                            className="h-10 w-10 rounded-full border-2 border-[var(--border)] object-cover shadow-sm"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_15%,white)]">
                            <span className="font-body-semi text-sm text-[var(--foreground)]">
                              {row.fname.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="font-body-semi text-sm text-[var(--foreground)]">
                          {row.fname}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-body-semi text-sm text-[var(--foreground)]">
                        {row.lname}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {row.programs ? (
                        <div className="flex flex-wrap gap-2">
                          {row.programs.split(',').map((program, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 shadow-sm"
                            >
                              <GraduationCap size={14} className="text-[var(--primary)]" />
                              <span className="font-body text-xs text-[var(--foreground)]">
                                {program.trim()}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="font-body text-sm italic text-[var(--muted-foreground)]">
                          No programs selected
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredAndSortedRows.length > 0 && (
          <div className="border-t border-[var(--border)] bg-[var(--muted)] px-6 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <label className="font-body text-sm text-[var(--muted-foreground)]">
                  Rows per page:
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 font-body-semi text-sm text-[var(--foreground)] transition-all duration-200 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-0"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 font-body-semi text-sm text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`rounded-lg px-3 py-1.5 font-body-semi text-sm transition-all duration-200 ${
                          currentPage === pageNum
                            ? 'bg-[var(--primary)] text-[#0A0A0A]'
                            : 'border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--muted)]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 font-body-semi text-sm text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
