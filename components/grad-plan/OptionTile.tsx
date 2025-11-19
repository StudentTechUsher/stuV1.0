'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface OptionTileProps {
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * OptionTile - compact, minimal option button for wizard selections
 * Design: Clean border, subtle hover effect, minimal padding
 * Matches Figma's onboarding style with soft shadows and transitions
 */
export default function OptionTile({
  title,
  description,
  selected,
  onClick,
  disabled = false,
  className = '',
}: OptionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={selected ? {
        borderColor: 'var(--primary)',
        backgroundColor: 'rgba(18, 249, 135, 0.1)'
      } : undefined}
      className={`
        relative w-full px-4 py-3 md:px-5 md:py-4 rounded-lg border transition-all duration-150
        text-left cursor-pointer group
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
        ${
          !selected
            ? 'border-gray-200 bg-white hover:border-gray-300'
            : ''
        }
        ${className}
      `}
    >
      {/* Checkmark indicator - minimal circle */}
      {selected && (
        <div className="absolute top-3 right-3 md:top-3.5 md:right-3.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
            <Check size={14} className="text-black" strokeWidth={3} />
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="pr-8">
        <p className="font-medium text-gray-900 text-base leading-tight">
          {title}
        </p>
        {description && (
          <p className="text-xs md:text-sm text-gray-600 mt-1.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </button>
  );
}
