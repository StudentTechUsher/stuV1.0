'use client';

import React from 'react';

interface StuLoadingAnimationCSSProps {
  size?: number;
  className?: string;
  speed?: number; // Animation duration in seconds, default 2
}

/**
 * STU Loading Animation Component (Pure CSS Version)
 *
 * A lightweight version using only CSS for the fill effect.
 * Perfect for situations where you want minimal dependencies.
 *
 * @param size - Size of the logo in pixels (default: 80)
 * @param className - Additional CSS classes for the container
 * @param speed - Animation duration in seconds (default: 2)
 */
export default function StuLoadingAnimationCSS({
  size = 80,
  className = '',
  speed = 2
}: StuLoadingAnimationCSSProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className="stu-loader-container"
        style={{
          width: size,
          height: size,
          position: 'relative',
        }}
      >
        {/* Base logo using background-image */}
        <div
          className="stu-loader-base"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/stu_icon_black.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />

        {/* Animated fill with mask */}
        <div
          className="stu-loader-fill-wrapper"
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            WebkitMaskImage: 'url(/stu_icon_black.png)',
            maskImage: 'url(/stu_icon_black.png)',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        >
          <div
            className="stu-loader-fill"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '100%',
              background: 'var(--primary)',
              animation: `stuFillAnimation ${speed}s ease-in-out infinite`,
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes stuFillAnimation {
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
      `}</style>
    </div>
  );
}

/**
 * Alternative with pulse effect (slightly different timing)
 */
export function StuLoadingPulse({
  size = 80,
  className = ''
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className="stu-loader-container"
        style={{
          width: size,
          height: size,
          position: 'relative',
        }}
      >
        {/* Base logo */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/stu_icon_black.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />

        {/* Pulsing fill */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            WebkitMaskImage: 'url(/stu_icon_black.png)',
            maskImage: 'url(/stu_icon_black.png)',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        >
          <div
            className="stu-loader-pulse"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--primary)',
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes stuPulseAnimation {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }

        .stu-loader-pulse {
          animation: stuPulseAnimation 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
