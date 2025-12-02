'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Sidebar } from '@/components/layout/sidebar';
import DashboardChatFab from '@/components/dashboard/dashboard-chat-fab';
import GradPlanRealtimeListener from '@/components/dashboard/grad-plan-realtime-listener';
import type { NavItem } from '@/app/(dashboard)/layout';

type Role = 'student' | 'advisor' | 'admin';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  items: NavItem[];
  role: Role;
  userId?: string;
}

type NavItemWithSection = NavItem & {
  section: 'primary' | 'secondary' | 'bottom';
};

const COLLAPSED_WIDTH = 70;

export default function DashboardLayoutClient({
  children,
  items,
  role,
  userId,
}: Readonly<DashboardLayoutClientProps>) {
  const router = useRouter();
  const [sidebarWidth, setSidebarWidth] = useState(COLLAPSED_WIDTH);
  const mainRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Monitor sidebar width changes
  useEffect(() => {
    const checkSidebarWidth = () => {
      const nav = document.querySelector('nav[aria-label="Main navigation"]') as HTMLElement;
      if (nav) {
        const width = nav.offsetWidth;
        setSidebarWidth(width);
      }
    };

    checkSidebarWidth();
    const observer = new ResizeObserver(checkSidebarWidth);
    const nav = document.querySelector('nav[aria-label="Main navigation"]');
    if (nav) {
      observer.observe(nav);
    }

    return () => observer.disconnect();
  }, []);

  // Add section classification to items
  const itemsWithSections: NavItemWithSection[] = items.map(item => ({
    ...item,
    section: classifyItemSection(item.href),
  }));

  return (
    <>
      <Sidebar items={itemsWithSections} onSignOut={handleSignOut} />
      <main
        ref={mainRef}
        className="transition-all duration-200 ease-out min-h-screen"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {children}
        <DashboardChatFab role={role} />
      </main>
      {userId && <GradPlanRealtimeListener userId={userId} />}
    </>
  );
}

function classifyItemSection(href: string): 'primary' | 'secondary' {
  // Primary navigation: main app features
  const primaryRoutes = [
    '/',
    '/inbox',
    '/grad-plan',
    '/sandbox',
    '/academic-history',
    '/semester-scheduler',
    '/pathfinder',
    '/approve-grad-plans',
    '/advisees',
    '/maintain-programs',
    '/program-flow',
    '/appointments',
    '/profile',
  ];

  // Secondary: admin/system features
  const secondaryRoutes = ['/admin', '/users', '/system', '/manage-advisors', '/careers', '/reports'];

  if (primaryRoutes.some(route => href === route || href.startsWith(route + '/'))) {
    return 'primary';
  }

  if (secondaryRoutes.some(route => href === route || href.startsWith(route + '/'))) {
    return 'secondary';
  }

  return 'primary';
}
