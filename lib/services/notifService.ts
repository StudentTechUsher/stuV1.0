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