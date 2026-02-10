import type { Meta, StoryObj } from '@storybook/react';
import CareerInfoModal from './CareerInfoModal';
import type { Career } from '@/types/career';

const meta = {
    title: 'Pathfinder/CareerInfoModal',
    component: CareerInfoModal,
    parameters: {
        layout: 'fullscreen',
        nextjs: {
            appDirectory: true,
        },
    },
    tags: ['autodocs'],
    argTypes: {
        onClose: { action: 'closed' },
        onSelectRelated: { action: 'selected related career' },
    },
} satisfies Meta<typeof CareerInfoModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockCareer: Career = {
    id: 'software-developer',
    slug: 'software-developer',
    title: 'Software Developer',
    shortOverview: 'Design, build, and maintain software applications.',
    overview: `Software developers are the creative minds behind computer programs. Some develop the applications that allow people to do specific tasks on a computer or another device. Others develop the underlying systems that run the devices or that control networks.

  They analyze users' needs and then design, test, and develop software to meet those needs. They also recommend software upgrades for customers' existing programs and systems.`,
    education: {
        typicalLevel: 'BACHELOR' as const,
        certifications: ['AWS Certified Developer', 'Microsoft Certified: Azure Developer Associate'],
    },
    bestMajors: [
        { id: 'cs', name: 'Computer Science' },
        { id: 'se', name: 'Software Engineering' },
    ],
    locationHubs: ['San Francisco, CA', 'Seattle, WA', 'Austin, TX', 'New York, NY'],
    salaryUSD: {
        entry: 85000,
        median: 120000,
        p90: 170000,
        source: 'Bureau of Labor Statistics, 2023',
    },
    outlook: {
        growthLabel: 'Growing' as const,
        notes: 'Employment of software developers is projected to grow 25 percent from 2022 to 2032, much faster than the average for all occupations.',
        source: 'BLS Employment Projections',
    },
    topSkills: ['Java', 'Python', 'JavaScript', 'Problem Solving', 'System Design'],
    dayToDay: [
        'Analyze user requirements and define business objectives',
        'Write clean, scalable, and efficient code',
        'Debug and resolve technical issues',
        'Collaborate with designers and product managers',
    ],
    recommendedCourses: [
        'CS 101: Intro to Programming',
        'CS 201: Data Structures',
        'CS 301: Algorithms',
    ],
    internships: ['Google STEP Intern', 'Microsoft Explore Intern'],
    clubs: ['ACM Student Chapter', 'Hackathon Club'],
    relatedCareers: ['web-developer', 'data-scientist', 'systems-architect'],
    links: [
        { label: 'Occupational Outlook Handbook', url: 'https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm' },
    ],
    status: 'PUBLISHED' as const,
    lastUpdatedISO: new Date().toISOString(),
    updatedBy: { name: 'Guidance Team', id: 'admin1' },
};

export const Default: Story = {
    args: {
        career: mockCareer,
        open: true,
        onClose: () => { },
    },
};

export const AdvisorView: Story = {
    args: {
        career: mockCareer,
        open: true,
        onClose: () => { },
        isAdvisor: true,
    },
};
