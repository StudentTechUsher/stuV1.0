import type { Meta, StoryObj } from '@storybook/react';
import { SectionSelectionCard } from './SectionSelectionCard';
import type { CourseSectionWithMeetings, RankedSection } from '@/lib/mastra/types';

/**
 * SectionSelectionCard displays course section details with ranking information.
 * Used in the AI-guided course selection agent to show available sections.
 */
const meta = {
  title: 'Scheduler/Agent/SectionSelectionCard',
  component: SectionSelectionCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSelect: { action: 'section selected' },
  },
} satisfies Meta<typeof SectionSelectionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data helpers
const createMockSection = (overrides?: Partial<CourseSectionWithMeetings>): CourseSectionWithMeetings => ({
  offering_id: 1001,
  course_code: 'CS 450',
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
      location: 'Engineering Building Room 201',
    },
  ],
  ...overrides,
});

const createMockRanking = (
  section: CourseSectionWithMeetings,
  overrides?: Partial<RankedSection>
): RankedSection => ({
  section,
  score: 95,
  matchDetails: {
    timeMatch: true,
    dayMatch: true,
    waitlistStatus: 'available',
    pros: ['Morning time (your preference)', 'MWF (your preferred days)', 'Seats available (12 open)'],
    cons: [],
    scoreBreakdown: {
      baseScore: 50,
      timeBonus: 20,
      dayBonus: 10,
      availabilityBonus: 10,
      dailyHoursBonus: 5,
      lunchBreakBonus: 0,
      waitlistPenalty: 0,
    },
  },
  ...overrides,
});

/**
 * Default state: Available section with high score and matching preferences
 */
export const Default: Story = {
  args: {
    section: createMockSection(),
    ranking: createMockRanking(createMockSection()),
    disabled: false,
    onSelect: (section) => console.log('Selected:', section.section_label),
  },
};

/**
 * Waitlisted section with medium score
 */
export const Waitlisted: Story = {
  args: {
    section: createMockSection({
      section_label: '002',
      seats_available: 0,
      waitlist_count: 5,
      instructor: 'Dr. Michael Chen',
      parsedMeetings: [
        {
          days: 'TTh',
          daysOfWeek: [2, 4],
          startTime: '14:00',
          endTime: '15:30',
          location: 'Science Hall Room 105',
        },
      ],
    }),
    ranking: createMockRanking(
      createMockSection({
        section_label: '002',
        seats_available: 0,
        waitlist_count: 5,
      }),
      {
        score: 75,
        matchDetails: {
          timeMatch: false,
          dayMatch: false,
          waitlistStatus: 'waitlisted',
          pros: ['Good instructor rating'],
          cons: ['Waitlisted (position #5)', 'Afternoon time', 'Different days than preferred'],
          scoreBreakdown: {
            baseScore: 50,
            timeBonus: 0,
            dayBonus: 0,
            availabilityBonus: 0,
            dailyHoursBonus: 5,
            lunchBreakBonus: 0,
            waitlistPenalty: -20,
          },
        },
      }
    ),
    onSelect: (section) => console.log('Selected:', section.section_label),
  },
};

/**
 * Full section (cannot be selected)
 */
export const Full: Story = {
  args: {
    section: createMockSection({
      section_label: '003',
      seats_available: 0,
      waitlist_count: null,
      instructor: 'Dr. Emily Williams',
      parsedMeetings: [
        {
          days: 'MWF',
          daysOfWeek: [1, 3, 5],
          startTime: '11:00',
          endTime: '12:00',
          location: 'Main Campus Room 401',
        },
      ],
    }),
    ranking: createMockRanking(
      createMockSection({
        section_label: '003',
        seats_available: 0,
      }),
      {
        score: 60,
        matchDetails: {
          timeMatch: true,
          dayMatch: true,
          waitlistStatus: 'full',
          pros: ['MWF (your preferred days)'],
          cons: ['Section full (no waitlist)', 'Blocks lunch time'],
          scoreBreakdown: {
            baseScore: 50,
            timeBonus: 20,
            dayBonus: 10,
            availabilityBonus: 0,
            dailyHoursBonus: 0,
            lunchBreakBonus: -20,
            waitlistPenalty: 0,
          },
        },
      }
    ),
    onSelect: (section) => console.log('Selected:', section.section_label),
  },
};

/**
 * Section with many pros and cons
 */
export const ManyProsCons: Story = {
  args: {
    section: createMockSection({
      section_label: '004',
      instructor: 'Dr. Robert Martinez',
      seats_available: 3,
      parsedMeetings: [
        {
          days: 'MW',
          daysOfWeek: [1, 3],
          startTime: '08:00',
          endTime: '09:30',
          location: 'North Building Room 202',
        },
      ],
    }),
    ranking: createMockRanking(
      createMockSection({
        section_label: '004',
        seats_available: 3,
      }),
      {
        score: 88,
        matchDetails: {
          timeMatch: true,
          dayMatch: true,
          waitlistStatus: 'available',
          pros: [
            'Early morning time (your preference)',
            'MW schedule (your preferred days)',
            'Seats available (3 open)',
            'Respects daily hour limit',
            'Allows lunch break',
          ],
          cons: [
            'Very early start time (8:00 AM)',
            'Only 3 seats left',
            'Long walk from previous class',
          ],
          scoreBreakdown: {
            baseScore: 50,
            timeBonus: 20,
            dayBonus: 10,
            availabilityBonus: 3,
            dailyHoursBonus: 5,
            lunchBreakBonus: 0,
            waitlistPenalty: 0,
          },
        },
      }
    ),
    onSelect: (section) => console.log('Selected:', section.section_label),
  },
};

/**
 * Online/Async section (no meeting times)
 */
export const OnlineAsync: Story = {
  args: {
    section: createMockSection({
      section_label: '005-ONLINE',
      instructor: 'Dr. Jennifer Lee',
      seats_available: 50,
      parsedMeetings: [],
    }),
    ranking: createMockRanking(
      createMockSection({
        section_label: '005-ONLINE',
        parsedMeetings: [],
      }),
      {
        score: 85,
        matchDetails: {
          timeMatch: true,
          dayMatch: true,
          waitlistStatus: 'available',
          pros: [
            'Online/Asynchronous',
            'Flexible schedule',
            'Many seats available (50 open)',
            'No travel required',
          ],
          cons: ['Requires self-discipline', 'Less direct interaction'],
          scoreBreakdown: {
            baseScore: 50,
            timeBonus: 15,
            dayBonus: 10,
            availabilityBonus: 10,
            dailyHoursBonus: 0,
            lunchBreakBonus: 0,
            waitlistPenalty: 0,
          },
        },
      }
    ),
    onSelect: (section) => console.log('Selected:', section.section_label),
  },
};

/**
 * Low score section with poor preference match
 */
export const LowScore: Story = {
  args: {
    section: createMockSection({
      section_label: '006',
      instructor: 'Dr. David Anderson',
      seats_available: 8,
      parsedMeetings: [
        {
          days: 'TTh',
          daysOfWeek: [2, 4],
          startTime: '18:00',
          endTime: '19:30',
          location: 'Extension Campus Room 101',
        },
      ],
    }),
    ranking: createMockRanking(
      createMockSection({
        section_label: '006',
      }),
      {
        score: 45,
        matchDetails: {
          timeMatch: false,
          dayMatch: false,
          waitlistStatus: 'available',
          pros: ['Seats available (8 open)'],
          cons: [
            'Evening time (outside preference)',
            'TTh (not preferred days)',
            'Late end time (7:30 PM)',
            'Extension campus (far location)',
            'After work hours',
          ],
          scoreBreakdown: {
            baseScore: 50,
            timeBonus: 0,
            dayBonus: 0,
            availabilityBonus: 5,
            dailyHoursBonus: 0,
            lunchBreakBonus: 0,
            waitlistPenalty: -10,
          },
        },
      }
    ),
    onSelect: (section) => console.log('Selected:', section.section_label),
  },
};

/**
 * Disabled state (already selected or unavailable)
 */
export const Disabled: Story = {
  args: {
    section: createMockSection(),
    ranking: createMockRanking(createMockSection()),
    disabled: true,
    onSelect: (section) => console.log('Selected:', section.section_label),
  },
};

/**
 * Multiple sections in a list (common use case)
 */
export const MultipleInList = {
  render: () => {
    const sections = [
      {
        section: createMockSection({ section_label: '001', seats_available: 15 }),
        ranking: createMockRanking(createMockSection({ section_label: '001' }), { score: 95 }),
      },
      {
        section: createMockSection({
          section_label: '002',
          seats_available: 0,
          waitlist_count: 3,
          parsedMeetings: [
            {
              days: 'TTh',
              daysOfWeek: [2, 4],
              startTime: '14:00',
              endTime: '15:30',
              location: 'Science Hall 105',
            },
          ],
        }),
        ranking: createMockRanking(
          createMockSection({ section_label: '002', seats_available: 0, waitlist_count: 3 }),
          {
            score: 72,
            matchDetails: {
              timeMatch: false,
              dayMatch: false,
              waitlistStatus: 'waitlisted',
              pros: ['Popular instructor'],
              cons: ['Waitlisted (position #3)', 'Afternoon time'],
              scoreBreakdown: {
                baseScore: 50,
                timeBonus: 0,
                dayBonus: 0,
                availabilityBonus: 0,
                dailyHoursBonus: 2,
                lunchBreakBonus: 0,
                waitlistPenalty: -20,
              },
            },
          }
        ),
      },
      {
        section: createMockSection({
          section_label: '003',
          seats_available: 5,
          parsedMeetings: [
            {
              days: 'MWF',
              daysOfWeek: [1, 3, 5],
              startTime: '13:00',
              endTime: '14:00',
              location: 'Main Building 301',
            },
          ],
        }),
        ranking: createMockRanking(createMockSection({ section_label: '003' }), {
          score: 88,
          matchDetails: {
            timeMatch: true,
            dayMatch: true,
            waitlistStatus: 'available',
            pros: ['MWF schedule', 'Seats available (5 open)'],
            cons: ['Blocks lunch time'],
            scoreBreakdown: {
              baseScore: 50,
              timeBonus: 20,
              dayBonus: 10,
              availabilityBonus: 5,
              dailyHoursBonus: 3,
              lunchBreakBonus: 0,
              waitlistPenalty: 0,
            },
          },
        }),
      },
    ];

    return (
      <div style={{ maxWidth: '500px', padding: '20px' }}>
        {sections.map(({ section, ranking }) => (
          <SectionSelectionCard
            key={section.offering_id}
            section={section}
            ranking={ranking}
            onSelect={(s) => console.log('Selected:', s.section_label)}
          />
        ))}
      </div>
    );
  },
};
