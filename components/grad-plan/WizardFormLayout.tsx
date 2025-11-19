'use client';

import React, { ReactNode } from 'react';

interface WizardFormLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footerButtons?: ReactNode;
}

/**
 * WizardFormLayout - minimal form container
 * Used within WizardContainer to structure individual step content
 * Provides consistent spacing and button layout
 */
export default function WizardFormLayout({
  title,
  subtitle,
  children,
  footerButtons,
}: WizardFormLayoutProps) {
  return (
    <div className="w-full space-y-6">
      {/* Question Title & Subtitle - handled by WizardContainer, but kept here for optional use */}
      {title && (
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-2 max-w-lg leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Form/Content area - compact and responsive */}
      <div className="w-full">
        {children}
      </div>

      {/* Navigation buttons - minimal, compact layout */}
      {footerButtons && (
        <div className="pt-2 flex gap-3 justify-center md:justify-end">
          {footerButtons}
        </div>
      )}
    </div>
  );
}
