/**
 * GPA Prediction Calculator Page
 * Server component shell that delegates to client component
 */

import { GPACalculatorContent } from './client';

export const metadata = {
  title: 'GPA Prediction Calculator',
  description: 'See what grades you need to achieve your graduation GPA goal',
};

export default function GPACalculatorPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="font-header text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            GPA Prediction Calculator
          </h1>
          <p className="font-body mt-2 text-[var(--muted-foreground)]">
            Explore your graduation GPA scenarios and set course goals
          </p>
        </div>

        {/* Main Content - Rendered on client */}
        <GPACalculatorContent />
      </div>
    </div>
  );
}
