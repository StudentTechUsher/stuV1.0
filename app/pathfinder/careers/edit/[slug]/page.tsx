/**
 * Assumptions:
 * - App Router edit page for advisors/admins
 * - Mock role check (isAdvisor = true for PoC)
 * - Redirects to pathfinder after save
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { saveCareerDraft, publishCareer as publishCareerFn, useCareer } from '@/lib/hooks/useCareers';
import CareerEditForm from '@/components/pathfinder/CareerEditForm';
import type { Career } from '@/types/career';

export default function CareerEditPage({
  params,
}: Readonly<{
  params: { slug: string };
}>) {
  const router = useRouter();
  const { data: career, isLoading, error } = useCareer(params.slug);

  const handleSave = async (updatedCareer: Career, publish: boolean) => {
    try {
      if (publish) {
        await publishCareerFn(updatedCareer.id);
      } else {
        await saveCareerDraft(updatedCareer);
      }
      router.push('/pathfinder');
    } catch (err) {
      console.error('Failed to save career:', err);
      alert('Failed to save changes');
    }
  };

  const handleCancel = () => {
    if (confirm('Discard all changes?')) {
      router.push('/pathfinder');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--muted-foreground)]">Loading career data...</p>
      </div>
    );
  }

  if (error || !career) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--destructive)]">
          Failed to load career. Please try again.
        </p>
        <button
          onClick={() => router.push('/pathfinder')}
          className="mt-4 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi"
        >
          Back to Pathfinder
        </button>
      </div>
    );
  }

  return (
    <main className="p-6 md:p-8 min-h-screen bg-[var(--background)]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/pathfinder')}
            className="text-[var(--primary)] hover:underline font-body-semi text-sm mb-2"
          >
            ← Back to Pathfinder
          </button>
          <h1 className="text-3xl font-header text-[var(--foreground)]">
            Edit Career: {career.title}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Status:{' '}
            <span
              className={`font-body-semi ${
                career.status === 'PUBLISHED'
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)]'
              }`}
            >
              {career.status}
            </span>
          </p>
        </div>

        <div className="bg-[var(--card)] rounded-2xl shadow-lg p-6">
          <CareerEditForm
            initialCareer={career}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </main>
  );
}
