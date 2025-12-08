'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type NotificationContext = {
  movedCourses?: unknown[];
  hasSuggestions?: boolean;
  [key: string]: unknown;
};

export type NotificationCardProps = {
  id: string;
  message: string;
  url: string | null;
  created_utc: string;
  type: string;
  context_json?: NotificationContext;
  is_read: boolean;
};

/**
 * Format a timestamp as relative time (e.g., "2 hours ago")
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  } else {
    // For older dates, show the actual date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

/**
 * Get icon and color for notification type
 */
function getNotificationStyle(type: string): { icon: React.ReactElement; accentColor: string } {
  switch (type) {
    case 'edit grad plan':
      return {
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        accentColor: 'var(--primary)',
      };
    case 'message':
      return {
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
        accentColor: '#2196f3',
      };
    case 'reminder':
      return {
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        ),
        accentColor: '#9C27B0',
      };
    default:
      return {
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        accentColor: '#5E35B1',
      };
  }
}

export function NotificationCard({
  id,
  message,
  url,
  created_utc,
  type,
  context_json,
  is_read,
}: NotificationCardProps) {
  const router = useRouter();
  const { icon, accentColor } = getNotificationStyle(type);

  const handleClick = async () => {
    try {
      // Mark as read
      await supabase
        .from('notifications')
        .update({ is_read: true, read_utc: new Date().toISOString() })
        .eq('id', id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      if (url) {
        // Store notification context in localStorage for grad plan edits
        if (type === 'edit grad plan' && context_json) {
          const changeData = {
            movedCourses: Array.isArray(context_json.movedCourses) ? context_json.movedCourses : [],
            hasSuggestions: Boolean(context_json.hasSuggestions),
          };
          localStorage.setItem('advisorChanges', JSON.stringify(changeData));
        }
        router.push(url);
      }
    }
  };

  // Format the timestamp
  const timeAgo = formatTimeAgo(created_utc);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!url}
      className={`group relative w-full overflow-hidden rounded-xl border p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${
        !is_read
          ? 'border-[color-mix(in_srgb,var(--primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--primary)_3%,white)]'
          : 'border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white'
      }`}
    >
      {/* Accent bar on the left */}
      <div
        className="absolute left-0 top-0 h-full w-1 transition-all duration-200 group-hover:w-1.5"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-start gap-4 pl-3">
        {/* Icon container */}
        <div className="relative">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors"
            style={{
              backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
              color: accentColor,
            }}
          >
            {icon}
          </div>
          {/* Unread indicator dot */}
          {!is_read && (
            <div
              className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white"
              style={{ backgroundColor: accentColor }}
              aria-label="Unread"
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1">
          {/* Message */}
          <p className="font-body-semi text-sm font-medium leading-relaxed text-[var(--foreground)]">
            {message}
          </p>

          {/* Metadata row */}
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            {/* Type badge */}
            <span
              className="rounded-full px-2.5 py-0.5 font-medium"
              style={{
                backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                color: accentColor,
              }}
            >
              {type}
            </span>
            {/* Timestamp */}
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {timeAgo}
            </span>
          </div>
        </div>

        {/* Arrow indicator */}
        {url && (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 group-hover:scale-110"
            style={{ color: accentColor }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}
