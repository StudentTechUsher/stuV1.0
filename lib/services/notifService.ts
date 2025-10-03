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

/**
 * Creates a notification informing a student their graduation plan was edited by an advisor.
 * Uses the "edit grad plan" type (as requested) so downstream filters can differentiate.
 */
export async function createNotifForGradPlanEdited(
  targetUserId: string,
  initiatorUserId: string | null,
  accessId: string,
  changeData?: {
    movedCourses: Array<{ courseName: string; courseCode: string; fromTerm: number; toTerm: number }>;
    hasSuggestions: boolean;
  }
) {
  try {
    if (!targetUserId || !accessId) throw new Error('Missing target user or accessId');

    // Build context with change details
    const contextJson: any = {
      message: 'Your most recent grad plan was just updated with edits'
    };

    if (changeData) {
      contextJson.movedCourses = changeData.movedCourses;
      contextJson.hasSuggestions = changeData.hasSuggestions;
    }

    return await createNotification({
      target_user_id: targetUserId,
      initiator_user_id: initiatorUserId,
      type: 'edit grad plan',
      context_json: contextJson,
      url: `/dashboard/grad-plan/${accessId}`,
      status: 'queued',
      is_read: false,
      read_utc: null,
      created_utc: new Date().toISOString(),
      channel_mask: 1,
    });
  } catch (err) {
    console.error('❌ Error creating GradPlanEdited notification:', err);
    return null;
  }
}

/**
 * Notification when a graduation plan has been approved.
 * URL points to the generic grad planner dashboard route.
 */
export async function createNotifForGradPlanApproved(targetUserId: string, initiatorUserId: string | null) {
	try {
		if (!targetUserId) throw new Error('Missing target user id');
		return await createNotification({
			target_user_id: targetUserId,
			initiator_user_id: initiatorUserId,
			type: 'grad plan approved',
			context_json: { message: 'Your recent grad plan was just approved! See it here' },
			url: '/dashboard/grad-planner',
			status: 'queued',
			is_read: false,
			read_utc: null,
			created_utc: new Date().toISOString(),
			channel_mask: 1,
		});
	} catch (err) {
		console.error('❌ Error creating GradPlanApproved notification:', err);
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

/**
 * Fetches all unread notifications for a given user (target_user_id) ordered by newest first.
 * This is intended for server-side usage (e.g., Inbox page server component) so that
 * data is fetched securely with RLS applied. If you need pagination later, add range().
 */
export async function getUnreadNotificationsForUser(userId: string) {
	try {
		if (!userId) throw new Error('userId is required');
		const { data, error } = await supabase
			.from('notifications')
			.select('*')
			.eq('target_user_id', userId)
			.eq('is_read', false)
			.order('created_utc', { ascending: false });

		if (error) {
			console.error('❌ Error fetching unread notifications:', error);
			return [];
		}
		return data || [];
	} catch (err) {
		console.error('❌ Unexpected error fetching unread notifications:', err);
		return [];
	}
}

/**
 * Returns a count of unread notifications for a user using a head/count query (no row data transferred).
 */
export async function getUnreadNotificationsCount(userId: string): Promise<number> {
	try {
		if (!userId) return 0;
		const { count, error } = await supabase
			.from('notifications')
			.select('*', { count: 'exact', head: true })
			.eq('target_user_id', userId)
			.eq('is_read', false);
		if (error) {
			console.error('❌ Error counting unread notifications:', error);
			return 0;
		}
		return count ?? 0;
	} catch (err) {
		console.error('❌ Unexpected error counting unread notifications:', err);
		return 0;
	}
}
