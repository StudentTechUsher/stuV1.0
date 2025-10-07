'use client';

import React from 'react';
import Image from 'next/image';

interface StuLoadingAnimationProps {
  size?: number; // Size in pixels, default 80
  className?: string;
}

/**
 * STU Loading Animation Component
 *
 * A professional loading animation featuring the STU graduation cap logo
 * that fills up with the primary brand color from bottom to top, then empties
 * and repeats in a continuous loop.
 *
 * @param size - Size of the logo in pixels (default: 80)
 * @param className - Additional CSS classes for the container
 */
export default function StuLoadingAnimation({
  size = 80,
  className = ''
}: StuLoadingAnimationProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className="relative"
        style={{ width: size, height: size }}
      >
        {/* Base logo (black) */}
        <div className="absolute inset-0">
          <Image
            src="/stu_icon_black.png"
            alt="STU Logo"
            width={size}
            height={size}
            className="w-full h-full object-contain"
            priority
          />
        </div>

        {/* Animated fill overlay */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            WebkitMaskImage: `url(/stu_icon_black.png)`,
            maskImage: `url(/stu_icon_black.png)`,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        >
          {/* The filling color */}
          <div
            className="stu-fill-animation"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '100%',
              backgroundColor: 'var(--primary)',
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes stuFillUp {
          0% {
            transform: translateY(100%);
          }
          85% {
            transform: translateY(0%);
          }
          100% {
            transform: translateY(0%);
          }
        }

        .stu-fill-animation {
          animation: stuFillUp 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

/**
 * Full-page loading overlay variant
 * Centers the animation on the entire viewport with an optional backdrop
 */
export function StuLoadingOverlay({
  showBackdrop = true,
  size = 100
}: {
  showBackdrop?: boolean;
  size?: number;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        showBackdrop ? 'bg-background/80 backdrop-blur-sm' : ''
      }`}
    >
      <StuLoadingAnimation size={size} />
    </div>
  );
}
