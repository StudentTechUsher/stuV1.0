'use client';

import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import ChatbotDrawer from '@/components/ai-chat/chatbot-drawer';
import GradPlanRealtimeListener from '@/components/dashboard/grad-plan-realtime-listener';
import { signOut } from '@/lib/utils/auth-client';
import type { NavItem } from '@/app/(dashboard)/layout';
import type { Role } from '@/lib/mock-role';

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

const ROLE_PRESETS: Record<Role, { label: string; prompt: string }[]> = {
  student: [
    { label: "Plan my semester", prompt: "Help me plan my semester based on my degree requirements and current credits." },
    { label: "Find advising times", prompt: "When is my next available advising slot and how do I book it?" },
    { label: "Graduation check", prompt: "Am I on track to graduate on time? What classes am I missing?" },
  ],
  advisor: [
    { label: "Daily advisee digest", prompt: "Summarize today's advisee alerts and top follow-ups." },
    { label: "Prep for meeting", prompt: "Given this student ID, summarize their academic standing and risks: <STUDENT_ID>." },
    { label: "Outreach draft", prompt: "Draft an outreach email to students who missed last advising window." },
  ],
  admin: [
    { label: "Health overview", prompt: "Summarize key system metrics and any anomalies in the last 24h." },
    { label: "User audit", prompt: "List newly created users this week and any with incomplete profiles." },
    { label: "Program report", prompt: "Generate a report of enrollments by program and term." },
  ],
  super_admin: [
    { label: "System health", prompt: "Provide an overview of system health, user activity, and any critical alerts." },
    { label: "Cross-university report", prompt: "Generate a report comparing metrics across all universities in the system." },
    { label: "User management", prompt: "List recent user registrations and flag any accounts requiring attention." },
  ],
};

export default function DashboardLayoutClient({
  children,
  items,
  role,
  userId,
}: Readonly<DashboardLayoutClientProps>) {
  const [sidebarWidth, setSidebarWidth] = useState(COLLAPSED_WIDTH);
  const [chatOpen, setChatOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

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

  const presetPrompts = ROLE_PRESETS[role] ?? [];

  return (
    <>
      <Sidebar
        items={itemsWithSections}
        onSignOut={handleSignOut}
        role={role}
        onOpenChat={() => setChatOpen(true)}
      />
      <main
        ref={mainRef}
        className="transition-all duration-200 ease-out min-h-screen"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {children}
      </main>
      {userId && <GradPlanRealtimeListener userId={userId} />}
      {role === 'student' && (
        <ChatbotDrawer
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          role={role}
          presetPrompts={presetPrompts}
        />
      )}
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
    '/course-scheduler',
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
