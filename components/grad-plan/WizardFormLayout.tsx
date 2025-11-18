'use client';

import React, { ReactNode } from 'react';

interface WizardFormLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footerButtons?: ReactNode;
}

export default function WizardFormLayout({
  title,
  subtitle,
  children,
  footerButtons,
}: WizardFormLayoutProps) {
  return (
    <div className="w-full space-y-8">
      {/* Question Section */}
      <div>
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-3 max-w-lg">
            {subtitle}
          </p>
        )}
      </div>

      {/* Form Content */}
      <div className="w-full">
        {children}
      </div>

      {/* Footer Buttons */}
      {footerButtons && (
        <div className="pt-4">
          {footerButtons}
        </div>
      )}
    </div>
  );
}
