/**
 * Mock implementation of CourseSelectionOrchestrator for Storybook
 * This allows us to demo the UI without needing live Supabase connections
 */

import type {
  CourseSelectionSessionInput,
  AgentConversationState,
  AgentMessageContent,
  CourseSectionWithMeetings,
} from '@/lib/mastra/types';

export class MockCourseSelectionOrchestrator {
  private state: AgentConversationState;
  private currentPhase = 'welcome';
  private mockSections: CourseSectionWithMeetings[] = [];

  constructor(input: CourseSelectionSessionInput) {
    this.state = {
      currentCourseIndex: 0,
      totalCourses: input.gradPlanCourses.length,
      coursesCompleted: [],
      calendarEvents: [...input.existingCalendar],
      sessionId: 'mock-session-123',
      scheduleId: input.scheduleId,
      studentId: input.studentId,
      universityId: input.universityId,
      termName: input.termName,
      preferences: input.preferences,
    };

    // Create mock sections for demo
    this.mockSections = this.createMockSections(input.gradPlanCourses[0] || 'CS 450');
  }

  async start(): Promise<AgentMessageContent> {
    return {
      text: `🎓 Welcome to your AI Course Scheduler!\n\nI'll help you select courses for ${this.state.termName}. We have ${this.state.totalCourses} courses to schedule:\n\n${this.state.totalCourses > 0 ? '• ' + Array.from({ length: this.state.totalCourses }, (_, i) => `Course ${i + 1}`).join('\n• ') : 'No courses'}`,
      options: [
        { label: "Let's go!", value: 'start' },
        { label: 'Cancel', value: 'cancel' },
      ],
    };
  }

  async processUserInput(userInput: string | { sectionId?: number; action?: string }): Promise<AgentMessageContent> {
    const input = typeof userInput === 'string' ? userInput : userInput.action || 'start';

    if (input === 'start') {
      return this.startFirstCourse();
    }

    if (typeof userInput === 'object' && userInput.sectionId) {
      return this.handleSectionSelection(userInput.sectionId);
    }

    return { text: 'Processing your selection...' };
  }

  private async startFirstCourse(): Promise<AgentMessageContent> {
    const courseCode = 'CS 450'; // Mock course

    this.state.currentCourse = {
      code: courseCode,
      title: 'Software Engineering',
      availableSections: this.mockSections,
      rankedSections: this.mockSections.map((section, idx) => ({
        section,
        score: 95 - idx * 10,
        matchDetails: {
          timeMatch: idx === 0,
          dayMatch: idx === 0,
          waitlistStatus: idx === 0 ? ('available' as const) : idx === 1 ? ('waitlisted' as const) : ('full' as const),
          pros: idx === 0 ? ['Morning time (your preference)', 'MWF schedule', 'Seats available'] : ['Good instructor'],
          cons: idx === 0 ? [] : idx === 1 ? ['Waitlisted'] : ['Section full'],
          scoreBreakdown: {
            baseScore: 50,
            timeBonus: idx === 0 ? 20 : 0,
            dayBonus: idx === 0 ? 10 : 0,
            availabilityBonus: idx === 0 ? 10 : 0,
            dailyHoursBonus: 5,
            lunchBreakBonus: 0,
            waitlistPenalty: idx === 1 ? -20 : 0,
          },
        },
      })),
      awaitingBackupCount: 2,
    };

    this.currentPhase = 'awaiting_primary';

    return {
      text: `Great! Let's start with **${courseCode} - ${this.state.currentCourse.title}**\n\nI found 3 available sections that fit your schedule. They're ranked by how well they match your preferences.`,
      prompt: 'Select your preferred section:',
    };
  }

  private async handleSectionSelection(sectionId: number): Promise<AgentMessageContent> {
    const section = this.mockSections.find((s) => s.offering_id === sectionId);

    if (this.currentPhase === 'awaiting_primary') {
      this.currentPhase = 'awaiting_backup_1';
      return {
        text: `✅ Great choice! Section ${section?.section_label || '001'} has been selected as your primary.\n\nNow let's choose a backup section in case your primary fills up.`,
        prompt: 'Select your first backup:',
      };
    }

    if (this.currentPhase === 'awaiting_backup_1') {
      this.currentPhase = 'awaiting_backup_2';
      return {
        text: `✅ First backup selected: Section ${section?.section_label || '002'}\n\nLet's choose one more backup for maximum flexibility.`,
        prompt: 'Select your second backup:',
      };
    }

    if (this.currentPhase === 'awaiting_backup_2') {
      this.state.coursesCompleted.push(this.state.currentCourse?.code || 'CS 450');
      this.state.currentCourseIndex += 1;

      if (this.state.currentCourseIndex >= this.state.totalCourses) {
        this.currentPhase = 'session_complete';
        return {
          text: `🎉 **All done!**\n\nYou've successfully scheduled all ${this.state.totalCourses} courses for ${this.state.termName}.\n\nYour schedule is ready to view on the calendar!`,
        };
      }

      return {
        text: `✅ ${this.state.currentCourse?.code} complete!\n\n**Progress:** ${this.state.coursesCompleted.length}/${this.state.totalCourses} courses scheduled\n\nMoving to the next course...`,
      };
    }

    return { text: 'Selection saved!' };
  }

  private createMockSections(courseCode: string): CourseSectionWithMeetings[] {
    return [
      {
        offering_id: 1001,
        course_code: courseCode,
        section_label: '001',
        title: 'Software Engineering',
        term_name: 'Fall 2026',
        instructor: 'Dr. Sarah Johnson',
        seats_available: 12,
        seats_capacity: 30,
        waitlist_count: 0,
        credits_decimal: 3,
        meetings_json: null,
        location_raw: null,
        parsedMeetings: [
          {
            days: 'MWF',
            daysOfWeek: [1, 3, 5],
            startTime: '09:00',
            endTime: '10:00',
            location: 'Engineering 201',
          },
        ],
      },
      {
        offering_id: 1002,
        course_code: courseCode,
        section_label: '002',
        title: 'Software Engineering',
        term_name: 'Fall 2026',
        instructor: 'Dr. Michael Chen',
        seats_available: 0,
        seats_capacity: 30,
        waitlist_count: 5,
        credits_decimal: 3,
        meetings_json: null,
        location_raw: null,
        parsedMeetings: [
          {
            days: 'TTh',
            daysOfWeek: [2, 4],
            startTime: '14:00',
            endTime: '15:30',
            location: 'Science Hall 105',
          },
        ],
      },
      {
        offering_id: 1003,
        course_code: courseCode,
        section_label: '003',
        title: 'Software Engineering',
        term_name: 'Fall 2026',
        instructor: 'Dr. Emily Williams',
        seats_available: 0,
        seats_capacity: 30,
        waitlist_count: null,
        credits_decimal: 3,
        meetings_json: null,
        location_raw: null,
        parsedMeetings: [
          {
            days: 'MWF',
            daysOfWeek: [1, 3, 5],
            startTime: '11:00',
            endTime: '12:00',
            location: 'Main Building 301',
          },
        ],
      },
    ];
  }

  getState(): AgentConversationState {
    return { ...this.state };
  }

  getProgressIndicator(): string {
    const current = this.state.currentCourseIndex + 1;
    const total = this.state.totalCourses;
    return `Course ${current} of ${total}`;
  }

  getCalendarEvents() {
    return this.state.calendarEvents;
  }

  reset(): void {
    this.currentPhase = 'welcome';
    this.state.currentCourseIndex = 0;
    this.state.coursesCompleted = [];
  }

  async skipCurrentCourse(): Promise<AgentMessageContent> {
    return { text: 'Course skipped' };
  }
}
