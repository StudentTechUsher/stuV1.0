'use client';

import * as React from 'react';
import { Bug, ChevronRight } from 'lucide-react';
import { ReportIssueModal } from './report-issue-modal';

export function ReportIssueButton() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const handlePrimaryClick = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      return;
    }

    setIsModalOpen(true);
  };

  return (
    <>
      <div
        className={`fixed bottom-6 z-40 transition-all duration-200 ease-out ${
          isCollapsed
            ? 'right-0 translate-x-[calc(100%-3rem)]'
            : 'right-6 translate-x-0'
        }`}
      >
        <div className="flex items-center rounded-full bg-[var(--primary)] text-[#0A0A0A] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 group">
          <button
            type="button"
            onClick={handlePrimaryClick}
            className="flex items-center gap-2 px-4 py-3 font-body-semi text-sm"
            aria-label={isCollapsed ? 'Show report issue button' : 'Report an issue'}
          >
            <Bug size={18} className="group-hover:rotate-12 transition-transform duration-200" />
            <span
              className={`hidden sm:inline transition-opacity duration-200 ${
                isCollapsed ? 'opacity-0' : 'opacity-100'
              }`}
            >
              Report Issue
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className={`flex h-11 w-11 items-center justify-center border-l border-[#0A0A0A]/10 transition-opacity duration-200 ${
              isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            aria-label="Hide report issue button"
            aria-hidden={isCollapsed}
            tabIndex={isCollapsed ? -1 : 0}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Modal */}
      <ReportIssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
