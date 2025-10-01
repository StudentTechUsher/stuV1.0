import { supabase } from '../supabase'

/**
 * Returns the count of graduation plans currently pending approval.
 * Uses a head/count query for efficiency (no row data transferred).
 *
 * AUTHORIZED FOR ADVISORS (and potentially admins) – relies on RLS to prevent
 * unauthorized access. Adjust policies if broader visibility is desired.
 */
export async function getPendingGradPlansCount(): Promise<number> {
	try {
		const { count, error } = await supabase
			.from('grad_plan')
			.select('*', { count: 'exact', head: true })
			.eq('pending_approval', true)

		if (error) {
			console.error('❌ Error counting pending grad plans:', error)
			return 0
		}

		return count ?? 0
	} catch (err) {
		console.error('❌ Unexpected error counting pending grad plans:', err)
		return 0
	}
}

/**
 * Optionally: helper that returns a boolean for quick badge visibility.
 */
export async function hasPendingGradPlans(): Promise<boolean> {
	return (await getPendingGradPlansCount()) > 0
}

export type NotificationStatus = "queued" | "sent" | "failed";

export async function createNotification({
	target_user_id,
	initiator_user_id,
	type,
	context_json,
	url,
	is_read,
	read_utc,
	created_utc,
	channel_mask,
	status
}: {
	target_user_id: string,
	initiator_user_id: string | null,
	type: string,
	context_json: any | null,
	url: string | null,
	is_read: false,
	read_utc: string | null,
	created_utc: string,
	channel_mask: number,
	status: NotificationStatus
}) {
	try {
		if (!target_user_id) throw new Error("targetUserId is required.");
		const insertPayload = {
			target_user_id,
			initiator_user_id,
			type,
			context_json,
			url,
			is_read,
			read_utc,
			channel_mask,
			status,
			created_utc
		}

		const { data, error } = await supabase
			.from("notifications")
			.insert(insertPayload)
			.select("*")
			.single();

		if (error) {
			console.error('❌ Error creating notification:', error)
			return null
		}

		return data
	} catch (err) {
		console.error('❌ Unexpected error creating notification:', err)
		return null;
	}
}

export async function createNotifForPlanReady(userId: string, accessId: string) {
	try {
		return await createNotification({
			target_user_id: userId,
			type: "PlanReady",
			context_json: { accessId },
			url: `/grad-planner/${accessId}`,
			status: "queued",
			initiator_user_id: null,
			is_read: false,
			read_utc: null,
			created_utc: new Date().toISOString(),
			channel_mask: 1
		})
	}
	catch (err) {
		console.error('❌ Error creating PlanReady notification:', err)
		return null;
	}
}

export async function markSingleNotificationRead(notifId: string) {
	try {
		const { data, error } = await supabase
			.from("notifications")
			.update({ is_read: true, read_utc: new Date().toISOString() })
			.eq("id", notifId)
			.select("*")
			.single();

		if (error) {
			console.error('❌ Error marking notification as read:', error)
			return null
		}

		return data
	} catch (err) {
		console.error('❌ Unexpected error marking notification as read:', err)
		return null
	}
}
