/**
 * Message Formatting Utilities for Mastra Agent
 *
 * Formats agent responses with visual section cards and clear prompts
 */

import {
  AgentMessageContent,
  RankedSection,
  CourseSectionWithMeetings,
  SectionCardData,
} from '@/lib/mastra/types';

/**
 * Format section list message
 * Shows ranked sections for a course with visual cards
 */
export function formatSectionListMessage(
  courseCode: string,
  courseTitle: string,
  rankedSections: RankedSection[],
  showCount = 5
): AgentMessageContent {
  const sectionsToShow = rankedSections.slice(0, showCount);

  return {
    text:
      `Let's find a section for **${courseCode}** - ${courseTitle}\n\n` +
      `I found ${rankedSections.length} available sections, ranked by your preferences:`,
    sectionCards: sectionsToShow.map((ranked) => ({
      section: ranked.section,
      score: ranked.score,
      pros: ranked.matchDetails.pros,
      cons: ranked.matchDetails.cons,
      status: ranked.matchDetails.waitlistStatus,
      waitlistPosition: ranked.section.waitlist_count || undefined,
    })),
    prompt: 'Which section do you prefer?',
  };
}

/**
 * Format waitlist confirmation message
 */
export function formatWaitlistConfirmation(
  section: CourseSectionWithMeetings,
  waitlistPosition: number
): AgentMessageContent {
  return {
    text:
      `⚠️ **Section ${section.section_label}** is waitlisted (position #${waitlistPosition}).\n\n` +
      `Do you want to join the waitlist?`,
    options: [
      { label: 'Yes, join waitlist', value: 'yes', variant: 'primary' },
      { label: 'No, show other options', value: 'no', variant: 'secondary' },
    ],
  };
}

/**
 * Format backup request message
 */
export function formatBackupRequest(
  backupNumber: 1 | 2,
  remainingSections: RankedSection[],
  showCount = 3
): AgentMessageContent {
  const sectionsToShow = remainingSections.slice(0, showCount);

  return {
    text: `Great choice! Now let's pick backup #${backupNumber} in case you don't get your first choice.`,
    sectionCards: sectionsToShow.map((ranked) => ({
      section: ranked.section,
      score: ranked.score,
      pros: ranked.matchDetails.pros,
      cons: ranked.matchDetails.cons,
      status: ranked.matchDetails.waitlistStatus,
      waitlistPosition: ranked.section.waitlist_count || undefined,
    })),
    prompt: `Select backup #${backupNumber}:`,
  };
}

/**
 * Format "no valid sections" message
 */
export function formatNoValidSectionsMessage(courseCode: string): AgentMessageContent {
  return {
    text:
      `❌ Unfortunately, all sections for **${courseCode}** conflict with your current schedule or personal events.\n\n` +
      `Your options:\n` +
      `1. Choose a different course for this requirement\n` +
      `2. Skip this course for now\n` +
      `3. Exit and adjust your personal events`,
    options: [
      { label: 'Choose different course', value: 'different_course' },
      { label: 'Skip for now', value: 'skip' },
      { label: 'Exit to calendar', value: 'exit' },
    ],
  };
}

/**
 * Format course completion confirmation
 */
export function formatCourseCompletionMessage(
  courseCode: string,
  sectionLabel: string,
  coursesCompleted: number,
  totalCourses: number
): AgentMessageContent {
  return {
    text:
      `✅ **${courseCode} Section ${sectionLabel}** scheduled!\n\n` +
      `Progress: ${coursesCompleted} of ${totalCourses} courses completed.`,
    prompt:
      coursesCompleted < totalCourses
        ? "Let's move to the next course..."
        : 'All courses scheduled! 🎉',
  };
}

/**
 * Format session complete message
 */
export function formatSessionCompleteMessage(scheduledCourses: string[]): AgentMessageContent {
  return {
    text:
      `🎉 **All done!** Your schedule is complete.\n\n` +
      `**Scheduled courses:**\n` +
      scheduledCourses.map((code) => `• ${code}`).join('\n') +
      `\n\nYou can review your calendar to see all your classes.`,
    options: [
      { label: 'View calendar', value: 'view_calendar', variant: 'primary' },
      { label: 'Start over', value: 'start_over', variant: 'secondary' },
    ],
  };
}

/**
 * Format error message
 */
export function formatErrorMessage(error: Error): AgentMessageContent {
  return {
    text:
      `⚠️ **Oops!** I encountered an error:\n\n` +
      `${error.message}\n\n` +
      `Would you like to try again or exit?`,
    options: [
      { label: 'Try again', value: 'retry', variant: 'primary' },
      { label: 'Exit', value: 'exit', variant: 'secondary' },
    ],
  };
}

/**
 * Format welcome message (session start)
 */
export function formatWelcomeMessage(
  termName: string,
  courseCount: number,
  courseCodes: string[]
): AgentMessageContent {
  return {
    text:
      `👋 Hi! I'm your course scheduling assistant.\n\n` +
      `I'll help you find the best sections for your **${courseCount} courses** in **${termName}**:\n\n` +
      courseCodes.map((code, i) => `${i + 1}. ${code}`).join('\n') +
      `\n\nI'll process each course one at a time, showing you sections ranked by your preferences. ` +
      `You'll pick a primary section and 2 backups for each course.\n\n` +
      `Ready to start?`,
    options: [
      { label: "Let's go!", value: 'start', variant: 'primary' },
      { label: 'Cancel', value: 'cancel', variant: 'secondary' },
    ],
  };
}

/**
 * Format progress indicator text
 */
export function formatProgressIndicator(
  currentIndex: number,
  totalCourses: number,
  currentCourse?: string
): string {
  const courseText = currentCourse ? ` - ${currentCourse}` : '';
  return `📚 Course ${currentIndex + 1} of ${totalCourses}${courseText}`;
}
