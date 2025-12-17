'use client';

import * as React from 'react';
import { Bug } from 'lucide-react';
import { ReportIssueModal } from './report-issue-modal';

export function ReportIssueButton() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-3 font-body-semi text-sm text-[#0A0A0A] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 group"
        aria-label="Report an issue"
      >
        <Bug size={18} className="group-hover:rotate-12 transition-transform duration-200" />
        <span className="hidden sm:inline">Report Issue</span>
      </button>

      {/* Modal */}
      <ReportIssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
