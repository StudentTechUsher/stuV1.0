'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, User, UserCheck } from 'lucide-react';
import { approveStudentAction } from '@/lib/services/server-actions';

interface PendingStudent {
  id: string;
  email: string | null;
  fname: string | null;
  lname: string | null;
  created_at: string;
  university_id: number;
  university: {
    id: number;
    name: string;
  } | null;
}

export interface PendingStudentsTableProps {
  readonly students: PendingStudent[];
}

export default function PendingStudentsTable({ students }: PendingStudentsTableProps) {
  const router = useRouter();
  const [studentNames, setStudentNames] = React.useState<Record<string, { fname: string; lname: string }>>({});
  const [approvingId, setApprovingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleNameChange = (studentId: string, field: 'fname' | 'lname', value: string) => {
    setStudentNames(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleApprove = async (student: PendingStudent) => {
    // Get the names from either the state or the student record
    const fname = studentNames[student.id]?.fname || student.fname || '';
    const lname = studentNames[student.id]?.lname || student.lname || '';

    if (!fname.trim() || !lname.trim()) {
      setError('Please enter both first and last name');
      return;
    }

    try {
      setApprovingId(student.id);
      setError(null);

      const result = await approveStudentAction(student.id, fname.trim(), lname.trim());

      if (result.success) {
        // Clear the name inputs for this student
        setStudentNames(prev => {
          const updated = { ...prev };
          delete updated[student.id];
          return updated;
        });
        // Refresh the page to show updated list
        router.refresh();
      } else {
        setError(result.error || 'Failed to approve student');
      }
    } catch (error) {
      console.error('Error approving student:', error);
      setError('An unexpected error occurred');
    } finally {
      setApprovingId(null);
    }
  };

  // Empty state
  if (students.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-white p-12 text-center">
        <div className="mx-auto max-w-md space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--muted)]">
            <UserCheck size={32} className="text-[var(--muted-foreground)]" />
          </div>
          <h3 className="font-header-bold text-lg text-[var(--foreground)]">
            No Students Awaiting Approval
          </h3>
          <p className="font-body text-sm text-[var(--muted-foreground)] leading-relaxed">
            When new students register, they will appear here for you to review and approve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-body-semi text-red-800">{error}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white shadow-sm transition-shadow hover:shadow-md">
        {/* Black Header */}
        <div className="border-b-2 border-[#0A0A0A] bg-[#0A0A0A] px-6 py-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3 text-left">
              <span className="font-body-semi text-xs uppercase tracking-wider text-white">
                Email
              </span>
            </div>
            <div className="col-span-2 text-left">
              <span className="font-body-semi text-xs uppercase tracking-wider text-white">
                First Name
              </span>
            </div>
            <div className="col-span-2 text-left">
              <span className="font-body-semi text-xs uppercase tracking-wider text-white">
                Last Name
              </span>
            </div>
            <div className="col-span-2 text-left">
              <span className="font-body-semi text-xs uppercase tracking-wider text-white">
                Registered
              </span>
            </div>
            <div className="col-span-3 text-right">
              <span className="font-body-semi text-xs uppercase tracking-wider text-white">
                Action
              </span>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-[var(--border)]">
          {students.map((student) => (
            <div
              key={student.id}
              className="px-6 py-4 transition-all duration-150 hover:bg-[color-mix(in_srgb,var(--primary)_3%,white)]"
            >
              <div className="grid grid-cols-12 items-center gap-4">
                {/* Email with Avatar */}
                <div className="col-span-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_15%,white)] shadow-sm">
                    <User size={18} className="text-[var(--foreground)]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-body-semi text-sm text-[var(--foreground)] truncate">
                      {student.email || 'No email'}
                    </span>
                    {student.university && (
                      <span className="font-body text-xs text-[var(--muted-foreground)] truncate">
                        {student.university.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* First Name Input */}
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="First name"
                    value={studentNames[student.id]?.fname || student.fname || ''}
                    onChange={(e) => handleNameChange(student.id, 'fname', e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-body text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    disabled={approvingId === student.id}
                  />
                </div>

                {/* Last Name Input */}
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Last name"
                    value={studentNames[student.id]?.lname || student.lname || ''}
                    onChange={(e) => handleNameChange(student.id, 'lname', e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-body text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    disabled={approvingId === student.id}
                  />
                </div>

                {/* Registered Date */}
                <div className="col-span-2 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <Calendar size={16} className="flex-shrink-0 text-[var(--muted-foreground)]" />
                  <span className="font-body">{formatDate(student.created_at)}</span>
                </div>

                {/* Approve Button */}
                <div className="col-span-3 text-right">
                  {approvingId === student.id ? (
                    <div className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]"></div>
                      <span className="font-body-semi">Approving...</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApprove(student)}
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-body-semi text-[#0A0A0A] shadow-sm transition-all duration-150 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={
                        !(studentNames[student.id]?.fname || student.fname) ||
                        !(studentNames[student.id]?.lname || student.lname)
                      }
                    >
                      <UserCheck size={16} />
                      <span>Approve</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
