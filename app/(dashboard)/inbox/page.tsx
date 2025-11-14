// Server component for the Inbox route.
// Fetches unread notifications for current user and renders modern notification cards.
import React from 'react';
import { createServerSupabase } from '@/lib/supabaseServer';
import { getUnreadNotificationsForUser } from '@/lib/services/notifService';
import { NotificationCard, type NotificationCardProps } from '@/components/inbox/notification-card';

type NotificationRecord = {
	id: string;
	type: string;
	url: string | null;
	created_utc: string;
	context_json: { message?: string } | null;
};

const isNotificationRecord = (value: unknown): value is NotificationRecord => {
	if (typeof value !== 'object' || value === null) return false;
	const record = value as Record<string, unknown>;
	return typeof record.id === 'string'
		&& typeof record.type === 'string'
		&& typeof record.created_utc === 'string';
};

const extractMessage = (context: { message?: unknown } | null | undefined, fallback: string): string => {
	if (context && typeof context.message === 'string' && context.message.trim() !== '') {
		return context.message;
	}
	return fallback;
};

export default async function InboxPage() {
	const supabase = await createServerSupabase();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		return (
			<div className="p-4 sm:p-6">
				<div className="mx-auto max-w-4xl">
					<div className="mb-6">
						<h1 className="font-header text-2xl font-bold text-[var(--foreground)]">Inbox</h1>
						<p className="font-body mt-2 text-sm text-[var(--muted-foreground)]">
							Your notifications and updates
						</p>
					</div>
					<div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] p-8 text-center shadow-sm">
						<p className="font-body text-[var(--muted-foreground)]">Please sign in to view your notifications.</p>
					</div>
				</div>
			</div>
		);
	}

	const notifications = await getUnreadNotificationsForUser(user.id);
	const notificationCards: NotificationCardProps[] = notifications
		.filter(isNotificationRecord)
		.map((notification) => ({
			id: notification.id,
			message: extractMessage(notification.context_json, notification.type),
			url: notification.url ?? null,
			created_utc: notification.created_utc,
			type: notification.type,
			context_json: notification.context_json ?? undefined,
		}));

	return (
		<div className="p-4 sm:p-6">
			<div className="mx-auto max-w-4xl">
				{/* Header Section */}
				<div className="mb-6">
					<h1 className="font-header text-2xl font-bold text-[var(--foreground)]">Inbox</h1>
					<p className="font-body mt-2 text-sm text-[var(--muted-foreground)]">
						{notificationCards.length === 0
							? 'You\'re all caught up!'
							: `You have ${notificationCards.length} unread ${notificationCards.length === 1 ? 'notification' : 'notifications'}`}
					</p>
				</div>

				{/* Notifications List */}
				{notificationCards.length === 0 ? (
					<div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] p-12 text-center shadow-sm">
						{/* Empty state icon */}
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]">
							<svg
								className="h-8 w-8 text-[var(--primary)]"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<h3 className="font-header-bold mb-2 text-lg font-bold text-[var(--foreground)]">
							All Clear!
						</h3>
						<p className="font-body text-sm text-[var(--muted-foreground)]">
							You don&apos;t have any unread notifications at the moment.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{notificationCards.map((notification) => (
							<NotificationCard key={notification.id} {...notification} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
