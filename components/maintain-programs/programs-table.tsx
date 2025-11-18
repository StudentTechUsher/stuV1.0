'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { ProgramRow } from '@/types/program';

export type ProgramsTableProps = {
  rows: ProgramRow[];
  onDelete: (row: ProgramRow) => void;
  canDelete?: boolean;
};

export default function ProgramsTable({ rows, onDelete, canDelete = true }: Readonly<ProgramsTableProps>) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [programToDelete, setProgramToDelete] = React.useState<ProgramRow | null>(null);

  const handleEdit = (row: ProgramRow) => {
    router.push(`/maintain-programs/${row.id}`);
  };

  const getBadgeClasses = (programType: string) => {
    // Case-insensitive comparison - match colors from academic-progress-card
    const typeUpper = programType.toUpperCase();

    if (typeUpper === 'MAJOR') {
      return 'bg-[color-mix(in_srgb,var(--primary)_18%,white)] text-[var(--dark)] border-[color-mix(in_srgb,var(--primary)_35%,white)]'; // Green
    }
    if (typeUpper === 'MINOR') {
      return 'bg-[color-mix(in_srgb,#001F54_18%,white)] text-[#001F54] border-[color-mix(in_srgb,#001F54_35%,white)]'; // Dark blue
    }
    if (typeUpper === 'GENERAL_EDUCATION' || typeUpper === 'GENERAL EDUCATION') {
      return 'bg-[color-mix(in_srgb,#2196f3_18%,white)] text-[#1565c0] border-[color-mix(in_srgb,#2196f3_35%,white)]'; // Light blue
    }
    // Emphasis or other types
    return 'bg-[color-mix(in_srgb,#5E35B1_18%,white)] text-[#5E35B1] border-[color-mix(in_srgb,#5E35B1_35%,white)]'; // Purple
  };

  const handleDeleteClick = (row: ProgramRow) => {
    setProgramToDelete(row);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (programToDelete) {
      onDelete(programToDelete);
      setDeleteDialogOpen(false);
      setProgramToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setProgramToDelete(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white shadow-sm">
        {/* Table Header */}
        <div className="border-b-2 px-4 py-3.5 sm:px-6" style={{ backgroundColor: "#0A0A0A", borderColor: "#0A0A0A" }}>
          <h3 className="font-header text-sm font-bold uppercase tracking-wider text-white">
            All Programs
          </h3>
        </div>

        {/* Column Headers - Hidden on mobile */}
        <div className="hidden border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_20%,transparent)] px-4 py-3 sm:px-6 lg:grid lg:grid-cols-[2fr_1fr_1fr_1.5fr_1.5fr_auto] lg:gap-4">
          <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Name</div>
          <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Type</div>
          <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Version</div>
          <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Created</div>
          <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Modified</div>
          <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Actions</div>
        </div>

        {/* Table Body */}
        <div className="max-h-[600px] overflow-y-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--muted)_50%,transparent)]">
                <svg className="h-8 w-8 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-header-bold mb-2 text-lg font-bold text-[var(--foreground)]">No Programs Found</h3>
              <p className="font-body text-sm text-[var(--muted-foreground)]">Get started by creating your first program.</p>
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="group grid grid-cols-1 gap-3 border-b border-[var(--border)] px-4 py-4 transition-colors hover:bg-[color-mix(in_srgb,var(--muted)_15%,transparent)] sm:px-6 lg:grid-cols-[2fr_1fr_1fr_1.5fr_1.5fr_auto] lg:items-center lg:gap-4"
              >
                {/* Name */}
                <div>
                  <p className="font-body-semi text-sm font-bold text-[var(--foreground)]">
                    {row.name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 lg:hidden">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold shadow-sm ${getBadgeClasses(row.program_type)}`}>
                      {row.program_type}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                      v{row.version}
                    </span>
                  </div>
                </div>

                {/* Type - Desktop Only */}
                <div className="hidden lg:block">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${getBadgeClasses(row.program_type)}`}>
                    {row.program_type}
                  </span>
                </div>

                {/* Version - Desktop Only */}
                <div className="hidden lg:block">
                  <span className="font-body text-sm text-[var(--foreground)]">
                    v{row.version}
                  </span>
                </div>

                {/* Created */}
                <div className="hidden lg:block">
                  <p className="font-body text-sm text-[var(--muted-foreground)]">
                    {formatDate(row.created_at)}
                  </p>
                </div>

                {/* Modified */}
                <div className="hidden lg:block">
                  <p className="font-body text-sm text-[var(--muted-foreground)]">
                    {formatDate(row.modified_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(row)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-[var(--foreground)] transition-all duration-200 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:text-[var(--primary)]"
                    aria-label="Edit requirements"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(row)}
                    disabled={!canDelete}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-[var(--foreground)] transition-all duration-200 hover:border-[#ef4444] hover:bg-[color-mix(in_srgb,#ef4444_8%,transparent)] hover:text-[#ef4444] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:bg-white disabled:hover:text-[var(--foreground)]"
                    aria-label="Delete program"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            {/* Modal Header */}
            <div className="border-b border-[var(--border)] px-6 py-4">
              <h3
                id="delete-dialog-title"
                className="font-header text-lg font-bold text-[var(--foreground)]"
              >
                Confirm Delete
              </h3>
            </div>

            {/* Modal Content */}
            <div className="space-y-3 px-6 py-5">
              <p className="font-body text-sm text-[var(--foreground)]">
                Are you sure you want to delete the program <strong>"{programToDelete?.name}"</strong>?
              </p>
              <div className="rounded-lg border border-[#ef4444]/20 bg-[color-mix(in_srgb,#ef4444_5%,transparent)] p-3">
                <p className="font-body text-xs text-[var(--muted-foreground)]">
                  This action cannot be undone. All associated data will be permanently removed.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="rounded-lg border border-[var(--border)] bg-white px-4 py-2 font-body-semi text-sm font-semibold text-[var(--foreground)] transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--muted)_30%,transparent)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-[#ef4444] px-4 py-2 font-body-semi text-sm font-semibold text-white transition-all duration-200 hover:bg-[#dc2626]"
              >
                Delete Program
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}