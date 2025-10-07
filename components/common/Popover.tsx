'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface PopoverProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  anchorEl?: HTMLElement | null;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export function Popover({
  isOpen,
  onClose,
  children,
  anchorEl,
  className,
  side = 'bottom',
  align = 'center',
}: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorEl]);

  useEffect(() => {
    if (isOpen && popoverRef.current && anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const popover = popoverRef.current;

      let top = 0;
      let left = 0;

      // Calculate position based on side
      switch (side) {
        case 'top':
          top = rect.top - popover.offsetHeight - 8;
          break;
        case 'bottom':
          top = rect.bottom + 8;
          break;
        case 'left':
          left = rect.left - popover.offsetWidth - 8;
          top = rect.top;
          break;
        case 'right':
          left = rect.right + 8;
          top = rect.top;
          break;
      }

      // Calculate position based on alignment
      if (side === 'top' || side === 'bottom') {
        switch (align) {
          case 'start':
            left = rect.left;
            break;
          case 'center':
            left = rect.left + rect.width / 2 - popover.offsetWidth / 2;
            break;
          case 'end':
            left = rect.right - popover.offsetWidth;
            break;
        }
      } else {
        switch (align) {
          case 'start':
            top = rect.top;
            break;
          case 'center':
            top = rect.top + rect.height / 2 - popover.offsetHeight / 2;
            break;
          case 'end':
            top = rect.bottom - popover.offsetHeight;
            break;
        }
      }

      // Ensure popover stays within viewport
      const maxLeft = window.innerWidth - popover.offsetWidth - 8;
      const maxTop = window.innerHeight - popover.offsetHeight - 8;

      left = Math.max(8, Math.min(left, maxLeft));
      top = Math.max(8, Math.min(top, maxTop));

      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
    }
  }, [isOpen, anchorEl, side, align]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      className={cn(
        'fixed z-50',
        'bg-[var(--popover)] text-[var(--popover-foreground)]',
        'border border-[var(--border)]',
        'rounded-lg shadow-[var(--shadow-lg)]',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
      tabIndex={-1}
    >
      {children}
    </div>,
    document.body
  );
}
