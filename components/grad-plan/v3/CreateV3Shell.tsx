'use client';

import type { ReactNode } from 'react';

interface CreateV3ShellProps {
  title?: string;
  subtitle?: string;
  main: ReactNode;
  contextRail: ReactNode;
  progressCard?: ReactNode;
  miniChatPanel?: ReactNode;
  tracePanel?: ReactNode;
}

export default function CreateV3Shell({
  title = 'Build Your Graduation Plan',
  subtitle = 'Guided cards keep every decision explicit and agent-readable at all times.',
  main,
  contextRail,
  progressCard,
  miniChatPanel,
  tracePanel,
}: Readonly<CreateV3ShellProps>) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfdf5_0%,_#f8fafc_45%,_#ffffff_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 md:px-6 lg:py-8">
        <header className="rounded-2xl border border-zinc-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
          <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <main className="order-2 space-y-4 lg:order-1">
            {progressCard}
            {main}
          </main>
          <aside className="order-1 space-y-4 lg:order-2">
            {contextRail}
            {miniChatPanel}
            {tracePanel}
          </aside>
        </div>
      </div>
    </div>
  );
}
