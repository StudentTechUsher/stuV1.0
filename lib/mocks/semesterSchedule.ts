import { CourseRow, SectionOption } from '@/types/schedule';

export const mockSemesterSchedule: CourseRow[] = [
  {
    id: 'course-1',
    code: 'FIN 413',
    title: 'Real Estate Finance and Investment',
    section: '002',
    difficulty: 3.1,
    instructorId: 'inst-1',
    instructorName: 'Jarom Jackson',
    instructorRating: 4.2,
    meeting: {
      days: ['M', 'W'],
      start: '09:00',
      end: '09:45',
    },
    location: {
      building: '232 TNRB',
      room: '232',
    },
    credits: 3.0,
    requirementTags: [
      { type: 'MAJOR', weight: 5.6 },
    ],
    description: 'This course covers the fundamentals of real estate finance, including property valuation, mortgage markets, investment analysis, and portfolio management.',
    prereqs: ['FIN 201', 'ACCT 200'],
    seats: {
      capacity: 45,
      open: 12,
      waitlist: 0,
    },
    attributes: ['Writing Intensive', 'Business Core'],
    actions: {
      withdrawable: true,
    },
  },
  {
    id: 'course-2',
    code: 'REL 122',
    title: 'New Testament',
    section: '033',
    difficulty: 2.3,
    instructorId: 'inst-2',
    instructorName: 'Eric Huntsman',
    instructorRating: 4.8,
    meeting: {
      days: ['Tu', 'Th'],
      start: '09:00',
      end: '09:45',
    },
    location: {
      building: '2005 JSB',
      room: '2005',
    },
    credits: 2.0,
    requirementTags: [
      { type: 'REL', weight: 4.1 },
    ],
    description: 'A study of the New Testament, focusing on the life and teachings of Jesus Christ and the writings of the Apostles.',
    prereqs: [],
    seats: {
      capacity: 150,
      open: 24,
      waitlist: 0,
    },
    attributes: ['General Education'],
    actions: {
      withdrawable: true,
    },
  },
  {
    id: 'course-3',
    code: 'ECON 388',
    title: 'Econometrics',
    section: '001',
    difficulty: 4.2,
    instructorId: 'inst-3',
    instructorName: 'Lars Lefgren',
    instructorRating: 3.9,
    meeting: {
      days: ['M', 'W', 'F'],
      start: '10:00',
      end: '10:50',
    },
    location: {
      building: '350 TNRB',
      room: '350',
    },
    credits: 3.0,
    requirementTags: [
      { type: 'MAJOR', weight: 6.2 },
      { type: 'GE', weight: 2.1 },
    ],
    description: 'Introduction to econometric theory and applications. Topics include regression analysis, hypothesis testing, and forecasting techniques.',
    prereqs: ['ECON 110', 'STAT 121'],
    seats: {
      capacity: 40,
      open: 5,
      waitlist: 2,
    },
    attributes: ['Quantitative Reasoning'],
    actions: {
      withdrawable: true,
    },
  },
  {
    id: 'course-4',
    code: 'WRTG 316',
    title: 'Technical Communication',
    section: '005',
    difficulty: 2.8,
    instructorId: 'inst-4',
    instructorName: 'Jennifer Johnson',
    instructorRating: 4.5,
    meeting: {
      days: ['Tu', 'Th'],
      start: '14:00',
      end: '15:15',
    },
    location: {
      building: '1140 JFSB',
      room: '1140',
    },
    credits: 3.0,
    requirementTags: [
      { type: 'GE', weight: 4.1 },
    ],
    description: 'Principles and practice of technical and professional communication, including documentation, presentations, and collaborative writing.',
    prereqs: ['WRTG 150'],
    seats: {
      capacity: 25,
      open: 0,
      waitlist: 3,
    },
    attributes: ['Writing Intensive', 'Advanced Writing'],
    actions: {
      withdrawable: true,
    },
  },
  {
    id: 'course-5',
    code: 'CS 260',
    title: 'Web Programming',
    section: '002',
    difficulty: 3.5,
    instructorId: 'inst-5',
    instructorName: 'Mark Clement',
    instructorRating: 4.1,
    meeting: {
      days: ['M', 'W', 'F'],
      start: '11:00',
      end: '11:50',
    },
    location: {
      building: '1170 TMCB',
      room: '1170',
    },
    credits: 3.0,
    requirementTags: [
      { type: 'ELECTIVE', weight: 1.1 },
    ],
    description: 'Introduction to web application development, including HTML, CSS, JavaScript, and modern frameworks. Students will build full-stack web applications.',
    prereqs: ['CS 142'],
    seats: {
      capacity: 50,
      open: 18,
      waitlist: 0,
    },
    attributes: ['Lab Required'],
    actions: {
      withdrawable: true,
    },
  },
];

export const mockSectionOptions: Record<string, SectionOption[]> = {
  'course-1': [
    {
      sectionId: 'sec-1-1',
      section: '001',
      instructorId: 'inst-1a',
      instructorName: 'David Smith',
      instructorRating: 3.8,
      meeting: {
        days: ['M', 'W'],
        start: '08:00',
        end: '08:45',
      },
      location: {
        building: '232 TNRB',
        room: '232',
      },
      seats: {
        capacity: 45,
        open: 8,
        waitlist: 0,
      },
    },
    {
      sectionId: 'sec-1-2',
      section: '002',
      instructorId: 'inst-1',
      instructorName: 'Jarom Jackson',
      instructorRating: 4.2,
      meeting: {
        days: ['M', 'W'],
        start: '09:00',
        end: '09:45',
      },
      location: {
        building: '232 TNRB',
        room: '232',
      },
      seats: {
        capacity: 45,
        open: 12,
        waitlist: 0,
      },
    },
    {
      sectionId: 'sec-1-3',
      section: '003',
      instructorId: 'inst-1b',
      instructorName: 'Sarah Williams',
      instructorRating: 4.6,
      meeting: {
        days: ['Tu', 'Th'],
        start: '10:30',
        end: '11:45',
      },
      location: {
        building: '350 TNRB',
        room: '350',
      },
      seats: {
        capacity: 45,
        open: 0,
        waitlist: 5,
      },
      conflicts: ['course-3'],
    },
  ],
  'course-2': [
    {
      sectionId: 'sec-2-1',
      section: '033',
      instructorId: 'inst-2',
      instructorName: 'Eric Huntsman',
      instructorRating: 4.8,
      meeting: {
        days: ['Tu', 'Th'],
        start: '09:00',
        end: '09:45',
      },
      location: {
        building: '2005 JSB',
        room: '2005',
      },
      seats: {
        capacity: 150,
        open: 24,
        waitlist: 0,
      },
    },
    {
      sectionId: 'sec-2-2',
      section: '034',
      instructorId: 'inst-2a',
      instructorName: 'Thomas Wayment',
      instructorRating: 4.5,
      meeting: {
        days: ['M', 'W', 'F'],
        start: '12:00',
        end: '12:50',
      },
      location: {
        building: '1110 JSB',
        room: '1110',
      },
      seats: {
        capacity: 150,
        open: 45,
        waitlist: 0,
      },
    },
  ],
};
