import type { Meta, StoryObj } from '@storybook/react';
import MajorInfoModal from './MajorInfoModal';
import type { MajorInfo } from '@/types/major';

// Mock Next.js router
const mockRouter = {
    push: () => { },
    replace: () => { },
    prefetch: () => { },
    back: () => { },
    forward: () => { },
    refresh: () => { },
};

// @ts-ignore
window.next = { router: mockRouter };

const meta = {
    title: 'Pathfinder/MajorInfoModal',
    component: MajorInfoModal,
    parameters: {
        layout: 'fullscreen',
        nextjs: {
            appDirectory: true,
        },
    },
    tags: ['autodocs'],
    argTypes: {
        onClose: { action: 'closed' },
    },
} satisfies Meta<typeof MajorInfoModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockMajor: MajorInfo = {
    id: 'computer-science',
    slug: 'computer-science',
    name: 'Computer Science',
    degreeType: 'BS' as const,
    shortOverview: 'Study the theoretical and practical aspects of computation.',
    overview: `The Computer Science major provides a strong foundation in the theory and practice of computing. Students learn to design, implement, and analyze algorithms and software systems.
  
  The curriculum covers a wide range of topics, including software engineering, artificial intelligence, database systems, and computer networks.`,
    topCareers: [
        { slug: 'software-developer', title: 'Software Developer' },
        { slug: 'data-scientist', title: 'Data Scientist' },
    ],
    careerOutlook: 'Graduates are in high demand across technology, finance, healthcare, and many other sectors.',
    totalCredits: 120,
    typicalDuration: '4 years',
    coreCourses: ['CS 101 - Intro to CS', 'CS 102 - Data Structures', 'CS 201 - Algorithms', 'MATH 101 - Calculus I'],
    electiveCourses: ['CS 301 - AI', 'CS 302 - Web Dev', 'CS 303 - Database Systems'],
    courseEquivalencies: [
        { institutionCourse: 'AP Computer Science A', equivalentCourses: ['CS 101'], notes: 'Score of 4 or 5 required' },
    ],
    prerequisites: ['High School Pre-Calculus or limit'],
    mathRequirements: 'Calculus I & II, Linear Algebra, Discrete Math',
    otherRequirements: 'Senior Capstone Project',
    topSkills: ['Programming', 'Algorithm Design', 'Logic', 'Problem Solving'],
    learningOutcomes: [
        'Analyze a complex computing problem',
        'Design, implement, and evaluate a computing-based solution',
        'Communicate effectively in a variety of professional contexts',
    ],
    internshipOpportunities: ['Tech Giant Summer Analyst', 'University Research Lab'],
    researchAreas: ['Artificial Intelligence', 'Cybersecurity', 'Human-Computer Interaction'],
    studyAbroadOptions: ['Exchange program with ETH Zurich', 'Semester in Singapore'],
    clubs: ['ACM', 'Women in Computing'],
    relatedMajors: ['software-engineering', 'data-science', 'mathematics'],
    commonMinors: ['Mathematics', 'Business', 'Psychology'],
    dualDegreeOptions: ['BS/MS in Computer Science (5 years)'],
    departmentWebsite: 'https://cs.university.edu',
    advisingContact: 'advising@cs.university.edu',
    links: [{ label: 'Department Handbook', url: '#' }],
    lastUpdatedISO: new Date().toISOString(),
    status: 'PUBLISHED' as const,
};

export const Default: Story = {
    args: {
        major: mockMajor,
        open: true,
        onClose: () => { },
    },
};

export const HighMatch: Story = {
    args: {
        major: mockMajor,
        open: true,
        onClose: () => { },
        completedCourses: [
            { code: 'CS 101', title: 'Intro to CS', credits: 4 },
            { code: 'CS 102', title: 'Data Structures', credits: 4 },
            { code: 'MATH 101', title: 'Calculus I', credits: 4 },
            { code: 'CS 201', title: 'Algorithms', credits: 4 }, // Added to increase match
        ],
    },
};

export const MediumMatch: Story = {
    args: {
        major: mockMajor,
        open: true,
        onClose: () => { },
        completedCourses: [
            { code: 'CS 101', title: 'Intro to CS', credits: 4 },
            { code: 'MATH 101', title: 'Calculus I', credits: 4 },
        ],
    },
};

export const LowMatch: Story = {
    args: {
        major: mockMajor,
        open: true,
        onClose: () => { },
        completedCourses: [
            { code: 'ART 100', title: 'Art Appreciation', credits: 3 },
        ],
    },
};

export const AdvisorView: Story = {
    args: {
        major: mockMajor,
        open: true,
        onClose: () => { },
        isAdvisor: true,
    },
};
