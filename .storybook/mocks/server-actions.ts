/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck

// Storybook-safe stubs for server actions.
// These mocks keep client components renderable without Next.js server runtime.

export async function organizeCoursesIntoSemestersAction(coursesData: unknown, prompt: unknown) {
  return { success: true, message: 'Mock organize result' };
}

export async function getAiPromptAction(promptName: string): Promise<string | null> {
  return null;
}

export async function decodeAccessIdServerAction(accessId: string) {
  return { success: false, error: 'Mocked in Storybook' };
}

export async function fetchGradPlanForEditing(gradPlanId: string) {
  return null;
}

export async function fetchGradPlanById(gradPlanId: string) {
  return null;
}

export async function fetchPendingGradPlans() {
  return [];
}

export async function fetchActiveGradPlanProgramsAction(profileId: string) {
  return { success: true, hasGradPlan: false, programs: [] };
}

export async function updateGradPlanWithAdvisorNotes(gradPlanId: string, advisorNotes: string) {
  return { success: true };
}

export async function approveGradPlan(gradPlanId: string) {
  return { success: true };
}

export async function submitGradPlanForApproval(userId: string, planData: unknown, programIds: number[], planName?: string) {
  return { success: true, accessId: 'mock-access-id' };
}

export async function updateGradPlanDetailsAction(gradPlanId: string, planDetails: unknown) {
  return { success: true };
}

export async function updateStudentGradPlanAction(gradPlanId: string, planDetails: unknown) {
  return { success: true };
}

export async function setGradPlanActiveAction(gradPlanId: string) {
  return { success: true };
}

export async function updateGradPlanDetailsAndAdvisorNotesAction(gradPlanId: string, planDetails: unknown, advisorNotes: string) {
  return { success: true };
}

export async function updateGradPlanNameAction(gradPlanId: string, planName: string) {
  return { success: true };
}

export async function deleteGradPlanAction(gradPlanId: string) {
  return { success: true };
}

export async function setActiveTermAction(gradPlanId: string, termIndex: number) {
  return { success: true };
}

export async function updateTermTitleAction(gradPlanId: string, termIndex: number, newTitle: string) {
  return { success: true };
}

export async function fetchProgramsByUniversity(universityId: number) {
  return [];
}

export async function deleteProgram(programId: string) {
  return { success: true };
}

export async function issueGradPlanAccessId(gradPlanId: string): Promise<string> {
  return 'mock-access-id';
}

export async function chatbotSendMessage(message: string, sessionId?: string) {
  return { success: true, message: 'Mocked response' };
}

export async function fetchUserCoursesAction(userId: string) {
  return { success: true, courses: [] };
}

export async function fetchUserCoursesMetadataAction(userId: string) {
  return { success: true, hasData: false, lastUpdated: null };
}

export async function parseTranscriptCoursesAction(args: { fileName?: string; fileText?: string }) {
  return {
    success: true,
    report: { courses_found: 0, terms_detected: [], used_byu_parser: false, validation_report: { invalidCourses: 0 } },
  };
}

export async function saveManualCoursesAction(userId: string, courses: unknown[]) {
  return { success: true };
}

export async function updateUserCourseTagsAction(courseId: string, tags: string[]) {
  return { success: true };
}

export async function updateCourseFulfillmentsAction(courseId: string, fulfillments: unknown[]) {
  return { success: true };
}

export async function clearUserCoursesAction(userId: string) {
  return { success: true };
}

export async function updateUserCoursesAction(userId: string, courses: unknown[]) {
  return { success: true };
}

export async function fetchProfileBasicInfoAction(userId: string) {
  return { success: true, data: null };
}

export async function updateProfileAction(userId: string, updates: Record<string, string | null>) {
  return { success: true };
}

export async function hasStudentRecordAction(userId: string) {
  return { success: true, exists: true };
}

export async function ensureStudentRecordAction(userId: string) {
  return { success: true };
}

export async function updateProfileForChatbotAction(userId: string, updates: unknown) {
  return { success: true };
}

export async function getCollegesAction(universityId: number) {
  return { success: true, colleges: ['Engineering', 'Business'] };
}

export async function getDepartmentCodesAction(universityId: number, college: string) {
  return { success: true, departments: ['CS', 'MATH'] };
}

export async function getCoursesByDepartmentAction(universityId: number, college: string, department: string) {
  return { success: true, courses: [] };
}

export async function getCourseByCodeAction(universityId: number, courseCode: string) {
  return {
    success: true,
    course: {
      course_code: courseCode,
      title: `Course ${courseCode}`,
      description: null,
      prerequisites: null,
    },
  };
}

export async function markAllNotificationsReadAction(userId: string) {
  return { success: true };
}

export async function deleteNotificationAction(notifId: string, userId: string) {
  return { success: true };
}

export async function deleteAllReadNotificationsAction(userId: string) {
  return { success: true };
}

export async function approveStudentAction(studentId: string) {
  return { success: true };
}

export async function updateGraduationTimelineAction(estGradTerm: string, estGradDate: string) {
  return { success: true };
}

export async function updateStudentTypeAction(studentType: 'undergraduate' | 'honor' | 'graduate') {
  return { success: true };
}

export async function updateWorkStatusAction(workStatus: 'not_working' | 'part_time' | 'full_time' | 'variable') {
  return { success: true };
}

export async function updateCareerGoalsAction(careerGoals: string | null) {
  return { success: true };
}

export async function fetchStudentPlanningDataAction() {
  return { success: true, data: {} };
}

export async function getActiveScheduleAction(studentId: number) {
  return { success: true, schedule: null };
}

export async function createScheduleAction(studentId: number) {
  return { success: true, schedule: { id: 'mock-schedule' } };
}

export async function setActiveScheduleAction(scheduleId: string, studentId: number) {
  return { success: true };
}

export async function addBlockedTimeAction(scheduleId: string, blockedTime: unknown) {
  return { success: true };
}

export async function updateBlockedTimeAction(scheduleId: string, blockedTimeId: string, updates: unknown) {
  return { success: true };
}

export async function deleteBlockedTimeAction(scheduleId: string, blockedTimeId: string) {
  return { success: true };
}

export async function updateSchedulePreferencesAction(scheduleId: string, preferences: unknown) {
  return { success: true };
}

export async function addCourseSelectionAction(scheduleId: string, courseSelection: unknown) {
  return { success: true };
}

export async function updateCourseSelectionAction(selectionId: string, updates: unknown) {
  return { success: true };
}

export async function deleteCourseSelectionAction(selectionId: string) {
  return { success: true };
}

export async function validateScheduleAction(scheduleId: string) {
  return { success: true, issues: [] };
}

export async function getScheduleWithCourseDetailsAction(scheduleId: string) {
  return { success: true, schedule: null, courses: [] };
}

export async function searchCourseOfferingsAction(universityId: number, searchTerm?: string) {
  return { success: true, offerings: [] };
}

export async function getCourseSectionsAction(universityId: number, termName: string, courseCode: string) {
  return { success: true, sections: [] };
}

export async function fetchCourseOfferingsForTermAction(universityId: number, termName: string) {
  return { success: true, offerings: [] };
}
