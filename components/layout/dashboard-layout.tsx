'use client';

import { Sidebar } from './sidebar';
import { signOut } from '@/lib/utils/auth-client';
import type { NavItem as BaseNavItem } from '@/app/(dashboard)/layout';

type NavItem = BaseNavItem & {
  section: 'primary' | 'secondary' | 'bottom';
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  items: BaseNavItem[];
}

export function DashboardLayout({ children, items }: DashboardLayoutProps) {
  const handleSignOut = async () => {
    try {
      const result = await signOut();
      if (result.success) {
        // Use window.location for a hard redirect that clears all client state
        window.location.href = '/login';
      } else {
        console.error('Sign out failed:', result.error);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Add section classification to items
  const itemsWithSections: NavItem[] = items.map((item, index) => ({
    ...item,
    section: classifyItemSection(item.href, index, items.length),
  }));

  return (
    <>
      <Sidebar items={itemsWithSections} onSignOut={handleSignOut} />
      <main className="transition-all duration-200 ease-out">{children}</main>
    </>
  );
}

function classifyItemSection(href: string, index: number, totalItems: number): 'primary' | 'secondary' {
  // Primary: Dashboard, Inbox, and core navigation (first ~7-8 items)
  // Secondary: Admin/system items

  const primaryRoutes = ['/', '/inbox', '/grad-plan', '/sandbox', '/academic-history', '/course-scheduler', '/pathfinder', '/approve-grad-plans', '/advisees', '/maintain-programs', '/program-flow', '/appointments', '/admin/forecast'];

  if (primaryRoutes.some(route => href.startsWith(route))) {
    return 'primary';
  }

  return 'secondary';
}
