// Barrel exports for progress-overview components
export { ProgressOverviewCard } from './ProgressOverviewCard';
export { RequirementRow } from './RequirementRow';
export { SubrequirementRow } from './SubrequirementRow';
export { CategoryTabs, OVERALL_VIEW } from './CategoryTabs';
export { CourseItem } from './CourseItem';
export { TermBadge } from './TermBadge';
export { MainProgressOverview } from './MainProgressOverview';
export { ProgressOverviewContainer } from './ProgressOverviewContainer';
export type {
  ProgressCategory,
  Requirement,
  Subrequirement,
  RequirementStatus,
  Course,
  CourseStatus,
  ProgressOverviewCardProps,
  OverallProgress,
  SectionProgress,
  MainProgressOverviewProps,
} from './types';
export {
  mockFinanceProgress,
  mockGEProgress,
  mockReligionProgress,
  mockElectivesProgress,
  mockAllCategories,
} from './mockProgressData';
export {
  convertCategoryProgressToProgressCategory,
  convertCategoriesToProgressCategories,
} from './dataAdapter';
export { computeMainProgressData } from './mainProgressAdapter';
export { formatTermLabel, getStatusLabel } from './termUtils';
