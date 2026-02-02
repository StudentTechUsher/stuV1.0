import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

export type RouteContext =
  | 'graduation_planning'
  | 'career_exploration'
  | 'advisor_review'
  | 'inbox'
  | 'pathfinder'
  | 'course_scheduling'
  | 'academic_history'
  | 'general';

export function useRouteContext(): RouteContext {
  const pathname = usePathname();
  
  return useMemo(() => {
    if (pathname.includes('/grad-plan')) return 'graduation_planning';
    if (pathname.includes('/pathfinder')) return 'career_exploration';
    if (pathname.includes('/approve-grad-plans')) return 'advisor_review';
    if (pathname.includes('/inbox')) return 'inbox';
    if (pathname.includes('/course-scheduler')) return 'course_scheduling';
    if (pathname.includes('/academic-history')) return 'academic_history';
    return 'general';
  }, [pathname]);
}

// Helper function to get user-friendly context descriptions
export function getRouteContextDescription(context: RouteContext): string {
  const descriptions = {
    graduation_planning: 'working on graduation planning and course scheduling',
    career_exploration: 'exploring career options and academic pathways',
    advisor_review: 'reviewing and managing student graduation plans',
    inbox: 'viewing notifications and messages',
    pathfinder: 'exploring career and academic pathways',
    course_scheduling: 'planning semester course schedules',
    academic_history: 'reviewing academic progress and completed courses',
    general: 'navigating the academic planning system',
  };
  return descriptions[context];
}