import { supabaseAdmin } from "../supabaseAdmin";
import { sendGradPlanApprovalEmail } from './emailService'

/**
 * Returns the count of graduation plans currently pending approval.
 * Uses a head/count query for efficiency (no row data transferred).
 *
 * AUTHORIZED FOR ADVISORS (and potentially admins) – relies on RLS to prevent
 * unauthorized access. Adjust policies if broader visibility is desired.
 */
export async function getPendingGradPlansCount(): Promise<number> {
	try {
		const { count, error } = await supabaseAdmin
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
	context_json: Record<string, unknown> | null,
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

		const { data, error } = await supabaseAdmin
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
			context_json: {
				message: 'Your Grad Plan is Ready!',
				accessId
			},
			url: `/grad-plan/${accessId}`,
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
    const contextJson: Record<string, unknown> = {
      message: 'Your Grad Plan was Edited'
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
      url: `/grad-plan/${accessId}`,
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
 * Notification when a graduation plan has been approved by an advisor.
 * Only sends notification if the plan was approved by an advisor/admin (not by the student themselves).
 * Fetches user email from profiles, sends email notification, and creates in-app notification.
 */
export async function createNotifForGradPlanApproved(targetUserId: string, initiatorUserId: string | null) {
	try {
		if (!targetUserId) throw new Error('Missing target user id');

		// Don't send notification if student activated their own plan
		if (!initiatorUserId || initiatorUserId === targetUserId) {
			console.log('ℹ️ Skipping approval notification - student activated their own plan');
			return null;
		}

		// Fetch initiator's role to verify they're an advisor/admin
		const { data: initiatorProfile, error: initiatorError } = await supabaseAdmin
			.from('profiles')
			.select('first_name, last_name, roles!inner(role_name)')
			.eq('id', initiatorUserId)
			.single();

		if (initiatorError) {
			console.error('❌ Error fetching initiator profile:', initiatorError);
			return null;
		}

		// Check if initiator is an advisor, admin, or superadmin
		const initiatorRole = (initiatorProfile.roles as unknown as { role_name: string })?.role_name;
		const isAdvisorOrAdmin = ['advisor', 'admin', 'superadmin'].includes(initiatorRole);

		if (!isAdvisorOrAdmin) {
			console.log('ℹ️ Skipping approval notification - initiator is not an advisor/admin');
			return null;
		}

		const advisorName = `${initiatorProfile.first_name} ${initiatorProfile.last_name}`;

		// Fetch student profile to get email and first name
		const { data: profile, error: profileError } = await supabaseAdmin
			.from('profiles')
			.select('email, first_name')
			.eq('id', targetUserId)
			.single();

		if (profileError) {
			console.error('❌ Error fetching user profile for grad plan approval:', profileError);
		}

		// Fetch the most recent approved grad plan to get access_id
		const { data: gradPlan, error: gradPlanError } = await supabaseAdmin
			.from('grad_plan')
			.select('access_id')
			.eq('user_id', targetUserId)
			.eq('pending_approval', false)
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		if (gradPlanError) {
			console.error('❌ Error fetching grad plan for approval notification:', gradPlanError);
		}

		// Send email if we have the necessary data
		if (profile?.email && profile?.first_name && gradPlan?.access_id) {
			await sendGradPlanApprovalEmail({
				studentFirstName: profile.first_name,
				studentEmail: profile.email,
				planAccessId: gradPlan.access_id,
				advisorName
			});
		}

		// Create in-app notification
		return await createNotification({
			target_user_id: targetUserId,
			initiator_user_id: initiatorUserId,
			type: 'grad plan approved',
			context_json: { message: 'Your grad plan was approved!' },
			url: '/grad-plan',
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
		const { data, error } = await supabaseAdmin
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
		const { data, error } = await supabaseAdmin
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
		const { count, error } = await supabaseAdmin
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

/**
 * Fetches all notifications for a given user (target_user_id).
 * Orders by unread status first (unread first), then by newest first within each group.
 * This is intended for server-side usage (e.g., Inbox page server component) so that
 * data is fetched securely with RLS applied.
 */
export async function getAllNotificationsForUser(userId: string) {
	try {
		if (!userId) throw new Error('userId is required');
		const { data, error } = await supabaseAdmin
			.from('notifications')
			.select('*')
			.eq('target_user_id', userId)
			.order('is_read', { ascending: true })
			.order('created_utc', { ascending: false });

		if (error) {
			console.error('❌ Error fetching all notifications:', error);
			return [];
		}
		return data || [];
	} catch (err) {
		console.error('❌ Unexpected error fetching all notifications:', err);
		return [];
	}
}

/**
 * AUTHORIZATION: USERS can only mark their own notifications as read
 * Marks all unread notifications for a user as read
 * @param userId - The user ID whose notifications should be marked as read
 * @returns Success/error result with count of notifications marked
 */
export async function markAllNotificationsRead(userId: string): Promise<{
	success: boolean;
	error?: string;
	count?: number;
}> {
	try {
		if (!userId) throw new Error('userId is required');

		const { data, error } = await supabaseAdmin
			.from('notifications')
			.update({ is_read: true, read_utc: new Date().toISOString() })
			.eq('target_user_id', userId)
			.eq('is_read', false)
			.select('id');

		if (error) {
			console.error('❌ Error marking all notifications as read:', error);
			return { success: false, error: error.message };
		}

		return { success: true, count: data?.length || 0 };
	} catch (err) {
		console.error('❌ Unexpected error marking all notifications as read:', err);
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error'
		};
	}
}

/**
 * AUTHORIZATION: USERS can only delete their own notifications
 * Deletes a single notification by ID
 * @param notifId - The notification ID to delete
 * @param userId - The user ID (for verification)
 * @returns Success/error result
 */
export async function deleteNotification(
	notifId: string,
	userId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		if (!notifId) throw new Error('notifId is required');
		if (!userId) throw new Error('userId is required');

		// Verify the notification belongs to this user before deleting
		const { data: notif, error: fetchError } = await supabaseAdmin
			.from('notifications')
			.select('target_user_id')
			.eq('id', notifId)
			.single();

		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				return { success: false, error: 'Notification not found' };
			}
			console.error('❌ Error fetching notification:', fetchError);
			return { success: false, error: 'Failed to verify notification' };
		}

		// Verify ownership
		if (notif.target_user_id !== userId) {
			return { success: false, error: 'Access denied: Notification belongs to another user' };
		}

		const { error: deleteError } = await supabaseAdmin
			.from('notifications')
			.delete()
			.eq('id', notifId);

		if (deleteError) {
			console.error('❌ Error deleting notification:', deleteError);
			return { success: false, error: deleteError.message };
		}

		return { success: true };
	} catch (err) {
		console.error('❌ Unexpected error deleting notification:', err);
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error'
		};
	}
}

/**
 * AUTHORIZATION: USERS can only delete their own notifications
 * Deletes all read notifications for a user
 * @param userId - The user ID whose read notifications should be deleted
 * @returns Success/error result with count of notifications deleted
 */
export async function deleteAllReadNotifications(userId: string): Promise<{
	success: boolean;
	error?: string;
	count?: number;
}> {
	try {
		if (!userId) throw new Error('userId is required');

		const { data, error } = await supabaseAdmin
			.from('notifications')
			.delete()
			.eq('target_user_id', userId)
			.eq('is_read', true)
			.select('id');

		if (error) {
			console.error('❌ Error deleting read notifications:', error);
			return { success: false, error: error.message };
		}

		return { success: true, count: data?.length || 0 };
	} catch (err) {
		console.error('❌ Unexpected error deleting read notifications:', err);
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error'
		};
	}
}
