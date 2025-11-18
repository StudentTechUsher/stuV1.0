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
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-full p-4 md:p-6 rounded-lg border-2 transition-all duration-200
        text-left cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${
          selected
            ? 'border-indigo-600 bg-indigo-50'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
        ${className}
      `}
    >
      {/* Checkmark */}
      {selected && (
        <div className="absolute top-3 right-3 md:top-4 md:right-4">
          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
            <Check size={16} className="text-white" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="pr-8">
        <p className="font-semibold text-gray-900 text-base md:text-lg">
          {title}
        </p>
        {description && (
          <p className="text-sm text-gray-600 mt-1">
            {description}
          </p>
        )}
      </div>
    </button>
  );
}
