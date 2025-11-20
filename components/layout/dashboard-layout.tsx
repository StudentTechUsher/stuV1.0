'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Sidebar } from './sidebar';
import type { NavItem as BaseNavItem } from '@/app/(dashboard)/layout';

type NavItem = BaseNavItem & {
  section: 'primary' | 'secondary' | 'bottom';
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  items: BaseNavItem[];
}

export function DashboardLayout({ children, items }: DashboardLayoutProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
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

  const primaryRoutes = ['/', '/inbox', '/grad-plan', '/sandbox', '/academic-history', '/semester-scheduler', '/pathfinder', '/approve-grad-plans', '/advisees', '/maintain-programs', '/program-flow', '/appointments', '/admin/forecast'];

  if (primaryRoutes.some(route => href.startsWith(route))) {
    return 'primary';
  }

  return 'secondary';
}
