'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  delayMs?: number;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  className,
  delayMs = 200,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50',
            'px-3 py-1.5 rounded-lg',
            'bg-[var(--popover)] text-[var(--popover-foreground)]',
            'border border-[var(--border)]',
            'shadow-[var(--shadow-lg)]',
            'text-xs font-medium',
            'whitespace-nowrap',
            'pointer-events-none',
            'animate-in fade-in-0 zoom-in-95',
            positionClasses[side],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
