/**
 * Modern Reports Page
 * - Tabbed interface with Weekly Withdrawals as default
 * - Clean, minimal design matching dashboard aesthetic
 * - advisorId hardcoded to 'adv_001' for PoC
 */

'use client';

import React, { useState } from 'react';
import ReportsWithdrawalsPanel from '@/components/withdrawals/ReportsWithdrawalsPanel';
import { getCurrentWeek } from '@/utils/date';
import { BarChart3, TrendingUp, AlertCircle } from 'lucide-react';

type Tab = 'overview' | 'demand' | 'withdrawals';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('withdrawals');

  return (
    <main className="p-4 sm:p-6 space-y-6">
      {/* Modern Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-header-bold text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100">
            Reports
          </h1>
          <p className="font-body text-sm text-[var(--muted-foreground)] mt-2">
            View and analyze institutional reports and student data
          </p>
        </div>

        {/* Optional action buttons can go here */}
      </div>

      {/* Modern Tabs - Segmented control style */}
      <div className="inline-flex items-center rounded-xl bg-[var(--muted)] p-1 shadow-sm">
        <button
          onClick={() => setActiveTab('overview')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-body-semi text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ${
            activeTab === 'overview'
              ? 'bg-zinc-50 dark:bg-zinc-800 text-[var(--foreground)] shadow-sm'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
          aria-current={activeTab === 'overview' ? 'page' : undefined}
        >
          <BarChart3 size={16} />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('demand')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-body-semi text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ${
            activeTab === 'demand'
              ? 'bg-zinc-50 dark:bg-zinc-800 text-[var(--foreground)] shadow-sm'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
          aria-current={activeTab === 'demand' ? 'page' : undefined}
        >
          <TrendingUp size={16} />
          <span>Demand</span>
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-body-semi text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ${
            activeTab === 'withdrawals'
              ? 'bg-zinc-50 dark:bg-zinc-800 text-[var(--foreground)] shadow-sm'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
          aria-current={activeTab === 'withdrawals' ? 'page' : undefined}
        >
          <AlertCircle size={16} />
          <span>Weekly Withdrawals</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'withdrawals' ? (
        <ReportsWithdrawalsPanel
          advisorId="adv_001"
          defaultRange={getCurrentWeek()}
        />
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <div className="mx-auto max-w-md space-y-3">
            {activeTab === 'overview' ? (
              <>
                <BarChart3 size={48} className="mx-auto text-[var(--muted-foreground)]" />
                <h3 className="font-header-bold text-lg text-zinc-900 dark:text-zinc-100">
                  Overview Report
                </h3>
                <p className="font-body text-sm text-[var(--muted-foreground)] leading-relaxed">
                  Comprehensive institutional overview coming soon. This will include enrollment trends, graduation rates, and key performance indicators.
                </p>
              </>
            ) : (
              <>
                <TrendingUp size={48} className="mx-auto text-[var(--muted-foreground)]" />
                <h3 className="font-header-bold text-lg text-zinc-900 dark:text-zinc-100">
                  Demand Report
                </h3>
                <p className="font-body text-sm text-[var(--muted-foreground)] leading-relaxed">
                  Course demand analytics coming soon. This will help identify high-demand courses and optimize scheduling.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
