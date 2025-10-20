/**
 * Assumptions:
 * - App Router page
 * - Tabbed interface with Weekly Withdrawals as default (for demo)
 * - Using design tokens from globals.css
 * - advisorId hardcoded to 'adv_001' for PoC
 */

'use client';

import React, { useState } from 'react';
import ReportsWithdrawalsPanel from '@/components/withdrawals/ReportsWithdrawalsPanel';
import { getCurrentWeek } from '@/utils/date';

type Tab = 'overview' | 'demand' | 'withdrawals';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('withdrawals');

  return (
    <main className="p-4 sm:p-6 space-y-6">
      {/* Modern Page Header - matches advisor dashboard style */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-header text-3xl font-bold text-[var(--foreground)]">
            Reports
          </h1>
          <p className="font-body mt-1.5 text-sm text-[var(--muted-foreground)]">
            View and analyze institutional reports
          </p>
        </div>
      </div>

      {/* Modern Tab Navigation - cleaner design with subtle styling */}
      <div className="border-b border-[color-mix(in_srgb,var(--muted-foreground)_12%,transparent)]">
        <nav className="flex gap-1" aria-label="Report tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 font-body-semi text-sm border-b-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 rounded-t-lg ${
              activeTab === 'overview'
                ? 'border-[var(--primary)] text-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
            }`}
            aria-current={activeTab === 'overview' ? 'page' : undefined}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('demand')}
            className={`px-4 py-2.5 font-body-semi text-sm border-b-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 rounded-t-lg ${
              activeTab === 'demand'
                ? 'border-[var(--primary)] text-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
            }`}
            aria-current={activeTab === 'demand' ? 'page' : undefined}
          >
            Demand
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2.5 font-body-semi text-sm border-b-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 rounded-t-lg ${
              activeTab === 'withdrawals'
                ? 'border-[var(--primary)] text-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
            }`}
            aria-current={activeTab === 'withdrawals' ? 'page' : undefined}
          >
            Weekly Withdrawals
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'withdrawals' ? (
        <ReportsWithdrawalsPanel
          advisorId="adv_001"
          defaultRange={getCurrentWeek()}
        />
      ) : (
        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] p-12 shadow-sm">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--muted-foreground)_8%,transparent)]">
              <svg className="h-8 w-8 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-body-semi mb-2 text-lg font-semibold text-[var(--foreground)]">
              {activeTab === 'overview' ? 'Overview Report' : 'Demand Report'}
            </h3>
            <p className="font-body text-sm text-[var(--muted-foreground)]">
              Content coming soon...
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
