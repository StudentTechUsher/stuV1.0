import type { Meta, StoryObj } from '@storybook/react';
import DashboardLayoutClient from './dashboard-layout-client';
import { DarkModeProvider } from '@/contexts/dark-mode-context';
import { UniversityThemeProvider } from '@/contexts/university-theme-context';
import type { University } from '@/lib/types/university';
import type { NavItem } from '@/app/(dashboard)/layout';

const meta: Meta<typeof DashboardLayoutClient> = {
  title: 'Dashboard/Layout',
  component: DashboardLayoutClient,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => {
      const mockUniversity: University = {
        id: 1,
        created_at: new Date().toISOString(),
        name: 'STU University',
        subdomain: 'stu',
        domain: 'stuplanning.com',
        primary_color: '#12F987',
        secondary_color: '#0D8B56',
        accent_color: '#85E5C2',
        dark_color: '#0A1B12',
        light_color: '#F0FFF9',
        text_color: '#1A1A1A',
        secondary_text_color: '#666666',
        logo_url: undefined,
      };

      return (
        <DarkModeProvider>
          <UniversityThemeProvider initialUniversity={mockUniversity} disableAutoLoad>
            <Story />
          </UniversityThemeProvider>
        </DarkModeProvider>
      );
    },
  ],
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

const studentItems: NavItem[] = [
  { href: '/dashboard', segment: null, label: 'Dashboard', icon: 'dashboard' },
  { href: '/inbox', segment: 'inbox', label: 'Inbox', icon: 'inbox', badgeCount: 2 },
  { href: '/grad-plan', segment: 'grad-plan', label: 'Graduation Planner', icon: 'planner' },
  { href: '/sandbox', segment: 'sandbox', label: 'Plan Sandbox', icon: 'sandbox' },
  { href: '/academic-history', segment: 'academic-history', label: 'Academic History', icon: 'history' },
  { href: '/course-scheduler', segment: 'course-scheduler', label: 'Schedule Courses', icon: 'semester' },
  { href: '/pathfinder', segment: 'pathfinder', label: 'Pathfinder', icon: 'map' },
  { href: '/profile', segment: 'profile', label: 'Profile', icon: 'profile' },
];

const advisorItems: NavItem[] = [
  { href: '/dashboard', segment: null, label: 'Dashboard', icon: 'dashboard' },
  { href: '/inbox', segment: 'inbox', label: 'Inbox', icon: 'inbox', badgeCount: 5 },
  { href: '/approve-grad-plans', segment: 'approve-grad-plans', label: 'Approve Plans', icon: 'map', badgeCount: 3 },
  { href: '/approve-students', segment: 'approve-students', label: 'Approve Students', icon: 'users' },
  { href: '/advisees', segment: 'advisees', label: 'My Case Load', icon: 'advisees' },
  { href: '/maintain-programs', segment: 'maintain-programs', label: 'Maintain Programs', icon: 'programs' },
  { href: '/program-flow', segment: 'program-flow', label: 'Program Flow', icon: 'programFlow' },
  { href: '/appointments', segment: 'appointments', label: 'Appointments', icon: 'appointments' },
  { href: '/reports', segment: 'reports', label: 'Reports', icon: 'reports', badgeCount: 3 },
  { href: '/careers/manage', segment: 'careers', label: 'Manage Careers', icon: 'careers' },
  { href: '/profile', segment: 'profile', label: 'Profile', icon: 'profile' },
];

function PlaceholderContent({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="font-header text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2">
            Storybook preview of the dashboard shell (sidebar + main content spacing).
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm h-48" />
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm h-48" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm h-80" />
      </div>
    </div>
  );
}

export const Student: Story = {
  render: () => (
    <DashboardLayoutClient items={studentItems} role="student">
      <PlaceholderContent title="Student Dashboard" />
    </DashboardLayoutClient>
  ),
};

export const Advisor: Story = {
  render: () => (
    <DashboardLayoutClient items={advisorItems} role="advisor">
      <PlaceholderContent title="Advisor Dashboard" />
    </DashboardLayoutClient>
  ),
};
