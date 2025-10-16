'use client';

import React from 'react';

// Inline keyframes and styles
const styles = `
@keyframes stu-fill-loop {
  0% {
    background-position: 0% 0%;
    opacity: 0;
  }
  5% {
    opacity: 1;
  }
  95% {
    opacity: 1;
  }
  100% {
    background-position: 0% 100%;
    opacity: 0;
  }
}

@keyframes stu-text-shimmer {
  0% {
    background-position: 200% center;
  }
  100% {
    background-position: -200% center;
  }
}

.stu-loader__icon-fill {
  animation: stu-fill-loop var(--stu-loader-speed, 2.5s) ease-in-out infinite;
  background-size: 100% 200%;
}

.stu-loader__text {
  position: relative;
  background: linear-gradient(
    90deg,
    var(--foreground) 0%,
    var(--foreground) 25%,
    var(--primary) 50%,
    var(--foreground) 75%,
    var(--foreground) 100%
  );
  background-size: 200% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: stu-text-shimmer var(--stu-loader-speed, 3s) linear infinite;
}
`;

export interface StuLoaderProps {
  /**
   * Visual variant of the loader
   * - inline: Small loader (16-24px) beside text, used in buttons or process lines
   * - card: Medium loader centered in cards or sections
   * - page: Large loader for full-screen or container loading states
   */
  variant?: 'inline' | 'card' | 'page';

  /**
   * Loading text to display with animated highlight effect
   */
  text?: string;

  /**
   * Custom fill color (defaults to var(--primary))
   */
  color?: string;

  /**
   * Animation speed in seconds (default: 2)
   */
  speed?: number;

  /**
   * Additional CSS class names
   */
  className?: string;
}

/**
 * Unified loading animation component featuring the Stu brand icon
 * with a smooth fill animation and optional text with highlight wave effect.
 *
 * Replaces all traditional loading indicators (spinners, skeletons, etc.)
 * across the Stu platform.
 *
 * @example
 * ```tsx
 * <StuLoader variant="page" text="Analyzing your coursework & motivations..." />
 * <StuLoader variant="inline" text="Generating personalized career directions..." />
 * <StuLoader variant="card" />
 * ```
 */
export function StuLoader({
  variant = 'card',
  text,
  color,
  speed = 2,
  className = '',
}: StuLoaderProps) {
  const variantClasses = {
    inline: 'stu-loader--inline',
    card: 'stu-loader--card',
    page: 'stu-loader--page',
  };

  const containerClass = `stu-loader ${variantClasses[variant]} ${className}`.trim();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className={containerClass} role="status" aria-live="polite" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: variant === 'inline' ? '0.5rem' : variant === 'card' ? '1rem' : '1.5rem',
        ...(variant === 'card' && { flexDirection: 'column', padding: '2rem' }),
        ...(variant === 'page' && { flexDirection: 'column', minHeight: '300px' }),
      }}>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: variant === 'inline' ? '20px' : variant === 'card' ? '48px' : '80px',
          height: variant === 'inline' ? '20px' : variant === 'card' ? '48px' : '80px',
        } as React.CSSProperties}
      >
        {/* Colored gradient layer that loops upward with mask */}
        <div
          className="stu-loader__icon-fill"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, var(--stu-loader-color, var(--primary)) 0%, var(--stu-loader-color, var(--primary)) 40%, transparent 60%, transparent 100%)',
            backgroundSize: '100% 300%',
            maskImage: 'url(/icons/stu_icon_black.png)',
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskImage: 'url(/icons/stu_icon_black.png)',
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            '--stu-loader-speed': `${speed}s`,
            '--stu-loader-color': color || 'var(--primary)',
          } as React.CSSProperties}
        />
      </div>

      {text && (
        <div
          className="stu-loader__text"
          style={{
            '--stu-loader-speed': `${speed * 1.5}s`,
            fontSize: variant === 'inline' ? '0.875rem' : variant === 'card' ? '0.9375rem' : '1.125rem',
            lineHeight: variant === 'inline' ? '1.25rem' : variant === 'card' ? '1.5rem' : '1.75rem',
            fontFamily: "'Inter', sans-serif",
            fontWeight: variant === 'page' ? 500 : 400,
            textAlign: variant === 'inline' ? 'left' : 'center',
            maxWidth: variant === 'card' ? '400px' : variant === 'page' ? '500px' : 'none',
          } as React.CSSProperties}
        >
          {text}
        </div>
      )}

      {/* Screen reader text */}
      <span style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: 0,
      }}>
        {text || 'Loading...'}
      </span>
    </div>
    </>
  );
}

/**
 * Hook to manage loading states with StuLoader
 *
 * @example
 * ```tsx
 * const { isLoading, startLoading, stopLoading } = useStuLoading();
 *
 * return (
 *   <div>
 *     {isLoading && <StuLoader variant="inline" text="Processing..." />}
 *     <button onClick={startLoading}>Start</button>
 *   </div>
 * );
 * ```
 */
export function useStuLoading(initialState = false) {
  const [isLoading, setIsLoading] = React.useState(initialState);

  const startLoading = React.useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = React.useCallback(() => {
    setIsLoading(false);
  }, []);

  const toggleLoading = React.useCallback(() => {
    setIsLoading((prev) => !prev);
  }, []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    toggleLoading,
    setIsLoading,
  };
}
