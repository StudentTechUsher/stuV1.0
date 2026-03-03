export interface DarkModeRouteTarget {
  id: string;
  route: string;
  selectors: string[];
  expectDarkClass: boolean;
  allowAuthRedirect?: boolean;
  notes?: string;
}

export const DARK_MODE_ROUTE_MANIFEST: DarkModeRouteTarget[] = [
  {
    id: 'home',
    route: '/',
    selectors: ['main', 'body'],
    expectDarkClass: true,
    allowAuthRedirect: true,
    notes: 'Root currently redirects to /login.',
  },
  {
    id: 'login',
    route: '/login',
    selectors: ['main', 'form'],
    expectDarkClass: true,
  },
  {
    id: 'onboarding',
    route: '/onboarding',
    selectors: ['main', 'body'],
    expectDarkClass: true,
    allowAuthRedirect: true,
  },
  {
    id: 'services',
    route: '/services',
    selectors: ['main', 'header'],
    expectDarkClass: true,
  },
  {
    id: 'how-it-works',
    route: '/how-it-works',
    selectors: ['main', 'header'],
    expectDarkClass: true,
  },
  {
    id: 'dashboard',
    route: '/dashboard',
    selectors: ['main', 'body'],
    expectDarkClass: true,
    allowAuthRedirect: true,
    notes: 'Requires authenticated user to reach dashboard content.',
  },
  {
    id: 'grad-plan-create',
    route: '/grad-plan/create',
    selectors: ['main', 'body'],
    expectDarkClass: true,
    allowAuthRedirect: true,
  },
  {
    id: 'pathfinder',
    route: '/pathfinder',
    selectors: ['main', 'body'],
    expectDarkClass: true,
    allowAuthRedirect: true,
  },
  {
    id: 'course-scheduler',
    route: '/course-scheduler',
    selectors: ['main', 'body'],
    expectDarkClass: true,
    allowAuthRedirect: true,
  },
  {
    id: 'reports',
    route: '/reports',
    selectors: ['main', 'body'],
    expectDarkClass: true,
    allowAuthRedirect: true,
  },
];
