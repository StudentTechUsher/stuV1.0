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
    <main className="p-6 md:p-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-header text-[var(--foreground)]">Reports</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          View and analyze institutional reports
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border)]">
        <nav className="flex gap-4" aria-label="Report tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-body-semi text-sm border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
              activeTab === 'overview'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            aria-current={activeTab === 'overview' ? 'page' : undefined}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('demand')}
            className={`px-4 py-2 font-body-semi text-sm border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
              activeTab === 'demand'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            aria-current={activeTab === 'demand' ? 'page' : undefined}
          >
            Demand
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 font-body-semi text-sm border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
              activeTab === 'withdrawals'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
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
        <div className="p-8 text-center text-[var(--muted-foreground)] font-body">
          {activeTab === 'overview' && 'Overview report content coming soon...'}
          {activeTab === 'demand' && 'Demand report content coming soon...'}
        </div>
      )}
    </main>
  );
}
