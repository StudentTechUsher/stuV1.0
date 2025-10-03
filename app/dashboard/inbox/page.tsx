// Server component for the Inbox route.
// Fetches unread notifications for current user and renders a client DataGrid.
import React from 'react';
import { createServerSupabase } from '@/lib/supabaseServer';
import { getUnreadNotificationsForUser } from '@/lib/services/notifService';
import NotificationsGrid, { NotificationRow } from '@/components/inbox/notifications-grid';

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
	const rows: NotificationRow[] = notifications.map((n: any) => ({
		id: n.id,
		message: n.context_json?.message || n.type,
		url: n.url,
		created_utc: n.created_utc,
		type: n.type,
		context_json: n.context_json,
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
