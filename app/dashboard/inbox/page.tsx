// Server component for the Inbox route.
// Fetches unread notifications for current user and renders a client DataGrid.
import React from 'react';
import { createServerSupabase } from '@/lib/supabaseServer';
import { getUnreadNotificationsForUser } from '@/lib/services/notifService';
import NotificationsGrid, { NotificationRow } from '@/components/inbox/notifications-grid';

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

// Because MUI DataGrid relies on browser APIs for some interactions, we keep the grid itself
// in a small Client Boundary component to allow hover navigation. However, you requested the
// page.tsx be a server component — so we fetch data here and pass it down.

// NOTE: DataGrid moved to a client component to avoid server runtime errors.

export default async function InboxPage() {
	const supabase = await createServerSupabase();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		return (
			<div className="p-6">
				<h1 className="text-xl font-semibold mb-2">Inbox</h1>
				<p>Please sign in to view your notifications.</p>
			</div>
		);
	}

	const notifications = await getUnreadNotificationsForUser(user.id);
	const rows: NotificationRow[] = notifications
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
		<div className="p-6 space-y-4">
			<h1 className="text-2xl font-semibold">Inbox</h1>
			{rows.length === 0 ? (
				<p className="text-sm text-gray-600">No unread notifications.</p>
			) : (
				<NotificationsGrid rows={rows} />
			)}
		</div>
	);
}
