/**
 * Course Selection Orchestrator (Hybrid Approach)
 *
 * Simple state machine that orchestrates the course-by-course selection flow
 * using the 4 core tools without full Mastra agent complexity.
 *
 * This uses:
 * - The 4 tools we built (getCourseOfferingsForCourse, checkSectionConflicts, rankSectionsByPreferences, addCourseSelection)
 * - A simple state machine for flow control
 * - Existing OpenAI service for conversational aspects (if needed)
 */

import {
  CourseSelectionSessionInput,
  AgentConversationState,
  CourseSectionWithMeetings,
  RankedSection,
  SchedulerEvent,
  AgentMessageContent,
  NoValidSectionsError,
} from './types';
import {
  getCourseOfferingsForCourse,
  checkSectionConflicts,
  rankSectionsByPreferences,
  addCourseSelection,
} from './tools/courseSelectionTools';
import {
  formatSectionListMessage,
  formatWaitlistConfirmation,
  formatBackupRequest,
  formatNoValidSectionsMessage,
  formatCourseCompletionMessage,
  formatSessionCompleteMessage,
  formatWelcomeMessage,
  formatProgressIndicator,
} from './utils/messageFormatting';

// ============================================================================
// Orchestrator State Machine
// ============================================================================

/**
 * Phases of the course selection process
 */
type SelectionPhase =
  | 'welcome' // Initial welcome message
  | 'fetching_sections' // Fetching course offerings
  | 'awaiting_primary' // User selecting primary section
  | 'awaiting_waitlist_confirmation' // User confirming waitlist
  | 'awaiting_backup_1' // User selecting first backup
  | 'awaiting_backup_2' // User selecting second backup
  | 'saving_selection' // Saving to database
  | 'course_complete' // Current course done, moving to next
  | 'session_complete' // All courses done
  | 'error'; // Error state

/**
 * Orchestrator manages the course-by-course selection flow
 */
export class CourseSelectionOrchestrator {
  private state: AgentConversationState;
  private currentPhase: SelectionPhase = 'welcome';
  private sessionInput: CourseSelectionSessionInput;

  constructor(input: CourseSelectionSessionInput) {
    this.sessionInput = input;

    // Initialize state
    this.state = {
      currentCourseIndex: 0,
      totalCourses: input.gradPlanCourses.length,
      coursesCompleted: [],
      calendarEvents: [...input.existingCalendar],
      sessionId: crypto.randomUUID(),
      scheduleId: input.scheduleId,
      studentId: input.studentId,
      universityId: input.universityId,
      termName: input.termName,
      preferences: input.preferences,
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Start the session
   * Returns welcome message
   */
  async start(): Promise<AgentMessageContent> {
    this.currentPhase = 'welcome';
    return formatWelcomeMessage(
      this.sessionInput.termName,
      this.sessionInput.gradPlanCourses.length,
      this.sessionInput.gradPlanCourses
    );
  }

  /**
   * Process user input and advance state
   * @param userInput - User's selection or response
   * @returns Next agent message
   */
  async processUserInput(userInput: string | { sectionId?: number; action?: string }): Promise<AgentMessageContent> {
    try {
      switch (this.currentPhase) {
        case 'welcome':
          if (typeof userInput === 'string' && userInput === 'start') {
            return await this.startCourseProcessing();
          }
          return { text: 'Click "Let\'s go!" to start scheduling your courses.' };

        case 'awaiting_primary':
          return await this.handlePrimarySelection(userInput);

        case 'awaiting_waitlist_confirmation':
          return await this.handleWaitlistConfirmation(userInput);

        case 'awaiting_backup_1':
          return await this.handleBackup1Selection(userInput);

        case 'awaiting_backup_2':
          return await this.handleBackup2Selection(userInput);

        case 'course_complete':
          return await this.moveToNextCourse();

        case 'session_complete':
          return formatSessionCompleteMessage(this.state.coursesCompleted);

        default:
          return { text: 'Processing...', prompt: 'Please wait' };
      }
    } catch (error) {
      console.error('Error processing user input:', error);
      this.currentPhase = 'error';
      return {
        text: `⚠️ An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        options: [
          { label: 'Try again', value: 'retry' },
          { label: 'Skip course', value: 'skip' },
        ],
      };
    }
  }

  /**
   * Get current state (for UI to display progress, calendar, etc.)
   */
  getState(): AgentConversationState {
    return { ...this.state };
  }

  /**
   * Get progress indicator text
   */
  getProgressIndicator(): string {
    const currentCourse = this.sessionInput.gradPlanCourses[this.state.currentCourseIndex];
    return formatProgressIndicator(this.state.currentCourseIndex, this.state.totalCourses, currentCourse);
  }

  // ============================================================================
  // Private Flow Methods
  // ============================================================================

  /**
   * Start processing the first (or next) course
   */
  private async startCourseProcessing(): Promise<AgentMessageContent> {
    const courseCode = this.sessionInput.gradPlanCourses[this.state.currentCourseIndex];

    if (!courseCode) {
      // No more courses
      this.currentPhase = 'session_complete';
      return formatSessionCompleteMessage(this.state.coursesCompleted);
    }

    this.currentPhase = 'fetching_sections';

    // 1. Fetch sections for this course
    const sections = await getCourseOfferingsForCourse(
      this.sessionInput.universityId,
      this.sessionInput.termName,
      courseCode
    );

    if (sections.length === 0) {
      return {
        text: `❌ No sections found for **${courseCode}** in ${this.sessionInput.termName}.`,
        options: [
          { label: 'Skip course', value: 'skip' },
          { label: 'Exit', value: 'exit' },
        ],
      };
    }

    // 2. Filter out conflicting sections
    const nonConflictingSections: CourseSectionWithMeetings[] = [];
    for (const section of sections) {
      const conflictCheck = await checkSectionConflicts(
        section,
        this.state.calendarEvents,
        this.sessionInput.preferences
      );
      if (!conflictCheck.hasConflict) {
        nonConflictingSections.push(section);
      }
    }

    if (nonConflictingSections.length === 0) {
      return formatNoValidSectionsMessage(courseCode);
    }

    // 3. Rank sections by preferences
    const rankedSections = await rankSectionsByPreferences(
      nonConflictingSections,
      this.sessionInput.preferences
    );

    // Update state
    this.state.currentCourse = {
      code: courseCode,
      title: sections[0]?.title || '',
      availableSections: nonConflictingSections,
      rankedSections,
      awaitingBackupCount: 2,
    };

    this.currentPhase = 'awaiting_primary';

    // 4. Present options to user
    return formatSectionListMessage(courseCode, this.state.currentCourse.title, rankedSections, 5);
  }

  /**
   * Handle user selecting primary section
   */
  private async handlePrimarySelection(
    userInput: string | { sectionId?: number; action?: string }
  ): Promise<AgentMessageContent> {
    if (!this.state.currentCourse) {
      throw new Error('No current course in state');
    }

    // Parse selection
    let selectedSection: CourseSectionWithMeetings | undefined;

    if (typeof userInput === 'object' && userInput.sectionId) {
      selectedSection = this.state.currentCourse.availableSections.find(
        (s) => s.offering_id === userInput.sectionId
      );
    } else if (typeof userInput === 'string') {
      // Try to match section label from string (e.g., "Section 001")
      const match = userInput.match(/section\s+(\d+)/i);
      if (match) {
        const sectionLabel = match[1];
        selectedSection = this.state.currentCourse.availableSections.find((s) =>
          s.section_label?.includes(sectionLabel)
        );
      }
    }

    if (!selectedSection) {
      return {
        text: 'Please select a valid section from the list above.',
        prompt: 'Which section do you prefer?',
      };
    }

    // Save selection
    this.state.currentCourse.primarySelected = selectedSection;

    // Check if waitlisted
    if (selectedSection.waitlist_count && selectedSection.waitlist_count > 0) {
      this.currentPhase = 'awaiting_waitlist_confirmation';
      return formatWaitlistConfirmation(selectedSection, selectedSection.waitlist_count);
    }

    // Not waitlisted, move to backup selection
    this.currentPhase = 'awaiting_backup_1';
    return this.promptForBackup(1);
  }

  /**
   * Handle waitlist confirmation
   */
  private async handleWaitlistConfirmation(
    userInput: string | { action?: string }
  ): Promise<AgentMessageContent> {
    const action = typeof userInput === 'object' ? userInput.action : userInput;

    if (action === 'no') {
      // User doesn't want waitlist, show other sections
      this.currentPhase = 'awaiting_primary';
      if (this.state.currentCourse) {
        return formatSectionListMessage(
          this.state.currentCourse.code,
          this.state.currentCourse.title,
          this.state.currentCourse.rankedSections,
          5
        );
      }
    }

    // User accepts waitlist, move to backup selection
    this.currentPhase = 'awaiting_backup_1';
    return this.promptForBackup(1);
  }

  /**
   * Prompt for backup section
   */
  private promptForBackup(backupNumber: 1 | 2): AgentMessageContent {
    if (!this.state.currentCourse) {
      throw new Error('No current course');
    }

    // Filter out already selected sections
    const selectedIds = new Set([
      this.state.currentCourse.primarySelected?.offering_id,
      this.state.currentCourse.backup1Selected?.offering_id,
    ]);

    const remainingSections = this.state.currentCourse.rankedSections.filter(
      (r) => !selectedIds.has(r.section.offering_id)
    );

    return formatBackupRequest(backupNumber, remainingSections, 3);
  }

  /**
   * Handle first backup selection
   */
  private async handleBackup1Selection(
    userInput: string | { sectionId?: number }
  ): Promise<AgentMessageContent> {
    if (!this.state.currentCourse) {
      throw new Error('No current course');
    }

    const selectedSection = this.findSectionFromInput(userInput);
    if (!selectedSection) {
      return {
        text: 'Please select a valid backup section.',
        prompt: 'Select backup #1:',
      };
    }

    this.state.currentCourse.backup1Selected = selectedSection;
    this.state.currentCourse.awaitingBackupCount = 1;

    // Move to backup 2
    this.currentPhase = 'awaiting_backup_2';
    return this.promptForBackup(2);
  }

  /**
   * Handle second backup selection
   */
  private async handleBackup2Selection(
    userInput: string | { sectionId?: number }
  ): Promise<AgentMessageContent> {
    if (!this.state.currentCourse) {
      throw new Error('No current course');
    }

    const selectedSection = this.findSectionFromInput(userInput);
    if (!selectedSection) {
      return {
        text: 'Please select a valid backup section.',
        prompt: 'Select backup #2:',
      };
    }

    this.state.currentCourse.backup2Selected = selectedSection;
    this.state.currentCourse.awaitingBackupCount = 0;

    // Save all selections to database
    this.currentPhase = 'saving_selection';
    return await this.saveSelectionAndAdvance();
  }

  /**
   * Save course selection and move to next course
   */
  private async saveSelectionAndAdvance(): Promise<AgentMessageContent> {
    if (!this.state.currentCourse) {
      throw new Error('No current course');
    }

    const { primarySelected, backup1Selected, backup2Selected, code } = this.state.currentCourse;

    if (!primarySelected) {
      throw new Error('No primary selection');
    }

    // Save to database
    const result = await addCourseSelection({
      scheduleId: this.state.scheduleId,
      courseCode: code,
      primaryOfferingId: primarySelected.offering_id,
      backup1OfferingId: backup1Selected?.offering_id || null,
      backup2OfferingId: backup2Selected?.offering_id || null,
      isWaitlisted: (primarySelected.waitlist_count || 0) > 0,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to save selection');
    }

    // Add to calendar
    if (primarySelected.parsedMeetings) {
      for (const meeting of primarySelected.parsedMeetings) {
        for (const dayOfWeek of meeting.daysOfWeek) {
          this.state.calendarEvents.push({
            id: `${result.selectionId}-${dayOfWeek}`,
            title: `${code} (${primarySelected.section_label})`,
            dayOfWeek,
            startTime: meeting.startTime,
            endTime: meeting.endTime,
            location: meeting.location,
            category: 'Course',
            courseCode: code,
            sectionLabel: primarySelected.section_label || undefined,
            instructor: primarySelected.instructor || undefined,
            offeringId: primarySelected.offering_id,
          });
        }
      }
    }

    // Mark course as completed
    this.state.coursesCompleted.push(code);

    // Auto-advance to next course
    this.state.currentCourseIndex += 1;
    this.state.currentCourse = undefined;

    if (this.state.currentCourseIndex >= this.state.totalCourses) {
      // All courses done
      this.currentPhase = 'session_complete';
      return formatSessionCompleteMessage(this.state.coursesCompleted);
    }

    // Show completion message and automatically start next course
    this.currentPhase = 'course_complete';

    const completionMsg = formatCourseCompletionMessage(
      code,
      primarySelected.section_label || '',
      this.state.coursesCompleted.length,
      this.state.totalCourses
    );

    // Immediately start processing next course
    // (User will see completion message, then next course sections)
    return completionMsg;
  }

  /**
   * Move to next course in the list
   */
  private async moveToNextCourse(): Promise<AgentMessageContent> {
    this.state.currentCourseIndex += 1;
    this.state.currentCourse = undefined;

    if (this.state.currentCourseIndex >= this.state.totalCourses) {
      // All courses done
      this.currentPhase = 'session_complete';
      return formatSessionCompleteMessage(this.state.coursesCompleted);
    }

    // Start next course
    return await this.startCourseProcessing();
  }

  /**
   * Helper to find section from user input
   */
  private findSectionFromInput(
    userInput: string | { sectionId?: number }
  ): CourseSectionWithMeetings | undefined {
    if (!this.state.currentCourse) {
      return undefined;
    }

    if (typeof userInput === 'object' && userInput.sectionId) {
      return this.state.currentCourse.availableSections.find((s) => s.offering_id === userInput.sectionId);
    } else if (typeof userInput === 'string') {
      const match = userInput.match(/section\s+(\d+)/i);
      if (match) {
        const sectionLabel = match[1];
        return this.state.currentCourse.availableSections.find((s) => s.section_label?.includes(sectionLabel));
      }
    }

    return undefined;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Reset orchestrator to start over
   */
  reset(): void {
    this.state.currentCourseIndex = 0;
    this.state.coursesCompleted = [];
    this.state.currentCourse = undefined;
    this.state.calendarEvents = [...this.sessionInput.existingCalendar];
    this.currentPhase = 'welcome';
  }

  /**
   * Skip current course
   */
  async skipCurrentCourse(): Promise<AgentMessageContent> {
    if (this.state.currentCourse) {
      this.state.coursesCompleted.push(`${this.state.currentCourse.code} (skipped)`);
    }
    return await this.moveToNextCourse();
  }

  /**
   * Get current calendar events (for display)
   */
  getCalendarEvents(): SchedulerEvent[] {
    return [...this.state.calendarEvents];
  }
}
