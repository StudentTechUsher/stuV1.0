// Server component for the Inbox route.
// Fetches all notifications for current user and passes to client component for rendering.
import React from 'react';
import { createServerSupabase } from '@/lib/supabaseServer';
import { getAllNotificationsForUser } from '@/lib/services/notifService';
import { InboxClient } from '@/components/inbox/inbox-client';
import { type NotificationCardProps } from '@/components/inbox/notification-card';

type NotificationRecord = {
	id: string;
	type: string;
	url: string | null;
	created_utc: string;
	context_json: { message?: string } | null;
	is_read: boolean;
};

const isNotificationRecord = (value: unknown): value is NotificationRecord => {
	if (typeof value !== 'object' || value === null) return false;
	const record = value as Record<string, unknown>;
	return typeof record.id === 'string'
		&& typeof record.type === 'string'
		&& typeof record.created_utc === 'string'
		&& typeof record.is_read === 'boolean';
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

	const notifications = await getAllNotificationsForUser(user.id);
	const notificationCards: NotificationCardProps[] = notifications
		.filter(isNotificationRecord)
		.map((notification) => ({
			id: notification.id,
			message: extractMessage(notification.context_json, notification.type),
			url: notification.url ?? null,
			created_utc: notification.created_utc,
			type: notification.type,
			context_json: notification.context_json ?? undefined,
			is_read: notification.is_read,
		}));

	return <InboxClient notifications={notificationCards} userId={user.id} />;
}
