'use client';

import { useState } from 'react';
import {
  FileText,
  FileCheck,
  GraduationCap,
  CheckCircle,
  Award,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';

interface AcademicAction {
  icon: LucideIcon;
  title: string;
  href: string;
}

const BYU_ACTIONS: AcademicAction[] = [
  {
    icon: FileText,
    title: 'Print Unofficial Transcript',
    href: 'https://y.byu.edu/ry/ae/prod/records/cgi/stdCourseWork.cgi',
  },
  {
    icon: FileCheck,
    title: 'Order Official Transcript',
    href: 'https://commtech.byu.edu/auth/parchment/',
  },
  {
    icon: GraduationCap,
    title: 'Start Graduation Application',
    href: 'https://commtech.byu.edu/auth/gradapp/',
  },
  {
    icon: CheckCircle,
    title: 'Request Enrollment Verification',
    href: 'https://commtech.byu.edu/auth/registrar/verification/index.php',
  },
  {
    icon: Award,
    title: 'Order a Diploma',
    href: 'https://www.michaelsutter.com/byu',
  },
];

export function AcademicActionsMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-body-semi text-sm font-medium text-[var(--foreground)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md"
        title="Academic actions and services"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="hidden sm:inline">Academic Actions</span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg">
          <div className="p-2">
            {BYU_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.href}
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  onClick={() => setIsOpen(false)}
                >
                  <Icon size={16} className="text-[var(--primary)] flex-shrink-0" />
                  <span className="text-[var(--foreground)]">{action.title}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Close menu when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
