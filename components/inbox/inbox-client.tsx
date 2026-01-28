'use client';

import { useState, useMemo } from 'react';
import { NotificationCard, type NotificationCardProps } from './notification-card';
import { useRouter } from 'next/navigation';
import {
	markAllNotificationsReadAction,
	deleteNotificationAction,
	deleteAllReadNotificationsAction,
} from '@/lib/services/server-actions';

type InboxClientProps = {
	notifications: NotificationCardProps[];
	userId: string;
};

type FilterChip = {
	label: string;
	value: string;
	count: number;
};

type ReadFilter = 'all' | 'unread' | 'read';

type TimeGroup = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

/**
 * Groups notifications by time period
 */
function groupByTime(notifications: NotificationCardProps[]): Record<TimeGroup, NotificationCardProps[]> {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	const thisWeekStart = new Date(today);
	thisWeekStart.setDate(thisWeekStart.getDate() - 7);

	const groups: Record<TimeGroup, NotificationCardProps[]> = {
		today: [],
		yesterday: [],
		thisWeek: [],
		earlier: [],
	};

	notifications.forEach((notif) => {
		const notifDate = new Date(notif.created_utc);
		if (notifDate >= today) {
			groups.today.push(notif);
		} else if (notifDate >= yesterday) {
			groups.yesterday.push(notif);
		} else if (notifDate >= thisWeekStart) {
			groups.thisWeek.push(notif);
		} else {
			groups.earlier.push(notif);
		}
	});

	return groups;
}

export function InboxClient({ notifications, userId }: InboxClientProps) {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
	const [readFilter, setReadFilter] = useState<ReadFilter>('all');
	const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
	const [isDeletingRead, setIsDeletingRead] = useState(false);

	// Get unique notification types with counts
	const typeChips: FilterChip[] = useMemo(() => {
		const typeCounts = new Map<string, number>();
		notifications.forEach((notif) => {
			typeCounts.set(notif.type, (typeCounts.get(notif.type) || 0) + 1);
		});

		return Array.from(typeCounts.entries()).map(([type, count]) => ({
			label: type,
			value: type,
			count,
		}));
	}, [notifications]);

	// Filter and search notifications
	const filteredNotifications = useMemo(() => {
		return notifications.filter((notif) => {
			// Type filter
			if (selectedTypes.size > 0 && !selectedTypes.has(notif.type)) {
				return false;
			}

			// Read filter
			if (readFilter === 'unread' && notif.is_read) {
				return false;
			}
			if (readFilter === 'read' && !notif.is_read) {
				return false;
			}

			// Search filter
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				const messageMatch = notif.message.toLowerCase().includes(query);
				const typeMatch = notif.type.toLowerCase().includes(query);
				return messageMatch || typeMatch;
			}

			return true;
		});
	}, [notifications, selectedTypes, readFilter, searchQuery]);

	// Group filtered notifications by time
	const groupedNotifications = useMemo(() => {
		return groupByTime(filteredNotifications);
	}, [filteredNotifications]);

	const unreadCount = notifications.filter((n) => !n.is_read).length;

	// Toggle type filter
	const toggleTypeFilter = (type: string) => {
		const newSelected = new Set(selectedTypes);
		if (newSelected.has(type)) {
			newSelected.delete(type);
		} else {
			newSelected.add(type);
		}
		setSelectedTypes(newSelected);
	};

	// Clear all filters
	const clearFilters = () => {
		setSelectedTypes(new Set());
		setReadFilter('all');
		setSearchQuery('');
	};

	// Mark all as read
	const handleMarkAllRead = async () => {
		setIsMarkingAllRead(true);
		try {
			const result = await markAllNotificationsReadAction(userId);

			if (!result.success) {
				console.error('Failed to mark all as read:', result.error);
			} else {
				router.refresh();
			}
		} catch (error) {
			console.error('Error marking all as read:', error);
		} finally {
			setIsMarkingAllRead(false);
		}
	};

	// Delete notification (not currently used but available for future)
	// const handleDeleteNotification = async (notifId: string) => {
	// 	try {
	// 		const result = await deleteNotificationAction(notifId, userId);

	// 		if (!result.success) {
	// 			console.error('Failed to delete notification:', result.error);
	// 		} else {
	// 			router.refresh();
	// 		}
	// 	} catch (error) {
	// 		console.error('Error deleting notification:', error);
	// 	}
	// };

	// Delete all read notifications
	const handleDeleteAllRead = async () => {
		setIsDeletingRead(true);
		try {
			const result = await deleteAllReadNotificationsAction(userId);

			if (!result.success) {
				console.error('Failed to delete read notifications:', result.error);
			} else {
				router.refresh();
			}
		} catch (error) {
			console.error('Error deleting read notifications:', error);
		} finally {
			setIsDeletingRead(false);
		}
	};

	const hasActiveFilters = selectedTypes.size > 0 || readFilter !== 'all' || searchQuery.trim() !== '';
	const readCount = notifications.filter((n) => n.is_read).length;

	return (
		<div className="p-4 sm:p-6">
			<div className="mx-auto max-w-4xl">
				{/* Header Section */}
				<div className="mb-6">
					<h1 className="font-header text-2xl font-bold text-[var(--foreground)]">Inbox</h1>
					<p className="font-body mt-2 text-sm text-[var(--muted-foreground)]">
						{notifications.length === 0
							? 'You have no notifications'
							: unreadCount === 0
								? `You have ${notifications.length} ${notifications.length === 1 ? 'notification' : 'notifications'} - all read`
								: `You have ${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'}`}
					</p>
				</div>

				{/* Controls Section */}
				{notifications.length > 0 && (
					<div className="mb-6 space-y-4">
						{/* Search Bar */}
						<div className="relative">
							<input
								type="text"
								placeholder="Search notifications..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full rounded-lg border border-[color-mix(in_srgb,var(--muted-foreground)_20%,transparent)] bg-white px-4 py-2.5 pl-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_20%,transparent)]"
							/>
							<svg
								className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted-foreground)]"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>

						{/* Filter Chips and Actions */}
						<div className="flex flex-wrap items-center gap-3">
							{/* Read/Unread Filter */}
							<div className="flex gap-2">
								<button
									onClick={() => setReadFilter('all')}
									className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${readFilter === 'all'
											? 'bg-[var(--primary)] text-white'
											: 'bg-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--muted-foreground)_20%,transparent)]'
										}`}
								>
									All
								</button>
								<button
									onClick={() => setReadFilter('unread')}
									className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${readFilter === 'unread'
											? 'bg-[var(--primary)] text-white'
											: 'bg-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--muted-foreground)_20%,transparent)]'
										}`}
								>
									Unread
								</button>
								<button
									onClick={() => setReadFilter('read')}
									className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${readFilter === 'read'
											? 'bg-[var(--primary)] text-white'
											: 'bg-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--muted-foreground)_20%,transparent)]'
										}`}
								>
									Read
								</button>
							</div>

							<div className="h-6 w-px bg-[color-mix(in_srgb,var(--muted-foreground)_20%,transparent)]" />

							{/* Type Filter Chips */}
							{typeChips.map((chip) => (
								<button
									key={chip.value}
									onClick={() => toggleTypeFilter(chip.value)}
									className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${selectedTypes.has(chip.value)
											? 'bg-[var(--primary)] text-white'
											: 'bg-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--muted-foreground)_20%,transparent)]'
										}`}
								>
									{chip.label} ({chip.count})
								</button>
							))}

							{/* Clear Filters */}
							{hasActiveFilters && (
								<>
									<div className="h-6 w-px bg-[color-mix(in_srgb,var(--muted-foreground)_20%,transparent)]" />
									<button
										onClick={clearFilters}
										className="text-sm font-medium text-[var(--primary)] hover:underline"
									>
										Clear filters
									</button>
								</>
							)}

							{/* Bulk Actions */}
							{(unreadCount > 0 || readCount > 0) && (
								<>
									<div className="ml-auto h-6 w-px bg-[color-mix(in_srgb,var(--muted-foreground)_20%,transparent)]" />

									{/* Mark All as Read */}
									{unreadCount > 0 && (
										<button
											onClick={handleMarkAllRead}
											disabled={isMarkingAllRead}
											className="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
										>
											{isMarkingAllRead ? 'Marking...' : 'Mark all as read'}
										</button>
									)}

									{/* Clear All Read */}
									{readCount > 0 && (
										<button
											onClick={handleDeleteAllRead}
											disabled={isDeletingRead}
											className="rounded-lg border border-[var(--primary)] px-4 py-1.5 text-sm font-medium text-[var(--primary)] transition-opacity hover:bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] disabled:opacity-50"
										>
											{isDeletingRead ? 'Deleting...' : 'Clear all read'}
										</button>
									)}
								</>
							)}
						</div>
					</div>
				)}

				{/* Notifications List */}
				{notifications.length === 0 ? (
					<div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] p-12 text-center shadow-sm">
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
							No Notifications
						</h3>
						<p className="font-body text-sm text-[var(--muted-foreground)]">
							You don&apos;t have any notifications at the moment.
						</p>
					</div>
				) : filteredNotifications.length === 0 ? (
					<div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] p-12 text-center shadow-sm">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)]">
							<svg
								className="h-8 w-8 text-[var(--muted-foreground)]"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>
						<h3 className="font-header-bold mb-2 text-lg font-bold text-[var(--foreground)]">
							No Results Found
						</h3>
						<p className="font-body text-sm text-[var(--muted-foreground)]">
							Try adjusting your filters or search query.
						</p>
					</div>
				) : (
					<div className="space-y-6">
						{/* Today */}
						{groupedNotifications.today.length > 0 && (
							<div>
								<h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
									Today
								</h2>
								<div className="space-y-3">
									{groupedNotifications.today.map((notification) => (
										<NotificationCard key={notification.id} {...notification} />
									))}
								</div>
							</div>
						)}

						{/* Yesterday */}
						{groupedNotifications.yesterday.length > 0 && (
							<div>
								<h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
									Yesterday
								</h2>
								<div className="space-y-3">
									{groupedNotifications.yesterday.map((notification) => (
										<NotificationCard key={notification.id} {...notification} />
									))}
								</div>
							</div>
						)}

						{/* This Week */}
						{groupedNotifications.thisWeek.length > 0 && (
							<div>
								<h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
									This Week
								</h2>
								<div className="space-y-3">
									{groupedNotifications.thisWeek.map((notification) => (
										<NotificationCard key={notification.id} {...notification} />
									))}
								</div>
							</div>
						)}

						{/* Earlier */}
						{groupedNotifications.earlier.length > 0 && (
							<div>
								<h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
									Earlier
								</h2>
								<div className="space-y-3">
									{groupedNotifications.earlier.map((notification) => (
										<NotificationCard key={notification.id} {...notification} />
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
