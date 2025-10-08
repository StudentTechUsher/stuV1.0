/**
 * Assumptions:
 * - File-based persistence to data/careers.json for PoC
 * - In-memory store with periodic flush to disk simulation
 * - Real implementation would use database
 * - TODO: Replace with BLS/O*NET API for salary/outlook data
 * - TODO: Replace with LinkedIn/Handbook for skills and job titles
 * - TODO: Replace with institutional API for major mappings
 */

import type { Career } from '@/types/career';

let careers: Career[] = [];
let seeded = false;

const SAMPLE_CAREERS: Career[] = [
  {
    id: 'car_001',
    slug: 'data-analyst',
    title: 'Data Analyst',
    shortOverview:
      'Transform raw data into actionable insights that drive business decisions.',
    overview: `Data Analysts collect, process, and analyze large datasets to help organizations make informed decisions. They work across industries to identify trends, create visualizations, and communicate findings to stakeholders.

This role combines technical skills with business acumen, requiring proficiency in statistical analysis, data visualization, and database querying. Data Analysts often serve as the bridge between technical teams and business leadership.`,
    education: {
      typicalLevel: 'BACHELOR',
      certifications: [
        'Google Data Analytics Certificate',
        'Microsoft Certified: Data Analyst Associate',
        'Tableau Desktop Specialist',
      ],
    },
    bestMajors: [
      { id: 'maj_stats', name: 'Statistics' },
      { id: 'maj_cs', name: 'Computer Science' },
      { id: 'maj_math', name: 'Mathematics' },
      { id: 'maj_econ', name: 'Economics' },
      { id: 'maj_bus_analytics', name: 'Business Analytics' },
    ],
    locationHubs: [
      'San Francisco Bay Area, CA',
      'New York City, NY',
      'Seattle, WA',
      'Austin, TX',
      'Boston, MA',
    ],
    salaryUSD: {
      entry: 55000,
      median: 75000,
      p90: 110000,
      source: 'Bureau of Labor Statistics, 2024',
    },
    outlook: {
      growthLabel: 'Hot',
      notes:
        '23% growth expected through 2031, much faster than average. High demand across all industries as data-driven decision making becomes standard.',
      source: 'BLS Occupational Outlook Handbook',
    },
    topSkills: [
      'SQL',
      'Python',
      'R',
      'Excel',
      'Tableau',
      'Power BI',
      'Statistics',
      'Data Visualization',
      'Critical Thinking',
      'Communication',
    ],
    dayToDay: [
      'Query databases to extract relevant datasets',
      'Clean and prepare data for analysis',
      'Perform statistical analysis to identify trends and patterns',
      'Create dashboards and visualizations using Tableau or Power BI',
      'Present findings to stakeholders in meetings',
      'Collaborate with teams to understand business questions',
      'Automate recurring reports and data pipelines',
      'Document analysis methods and results',
    ],
    recommendedCourses: [
      'STAT 3000 - Statistical Methods',
      'CS 2420 - Data Structures',
      'MATH 2210 - Calculus III',
      'BUS 3500 - Business Analytics',
      'CS 4400 - Database Systems',
    ],
    internships: [
      'Data Analytics Intern - Fortune 500 companies',
      'Business Intelligence Intern - Tech startups',
      'Research Assistant - University labs',
    ],
    clubs: [
      'Data Science Club',
      'Analytics Society',
      'Women in Data',
      'Consulting Club',
    ],
    relatedCareers: [
      'data-scientist',
      'business-analyst',
      'data-engineer',
      'market-research-analyst',
    ],
    links: [
      {
        label: 'BLS Occupational Outlook',
        url: 'https://www.bls.gov/ooh/math/data-scientists.htm',
      },
      {
        label: 'r/DataAnalysis Community',
        url: 'https://www.reddit.com/r/DataAnalysis/',
      },
    ],
    lastUpdatedISO: new Date().toISOString(),
    status: 'PUBLISHED',
    updatedBy: {
      id: 'usr_admin_001',
      name: 'Stu Team',
      role: 'STU',
    },
  },
  {
    id: 'car_002',
    slug: 'ux-designer',
    title: 'UX Designer',
    shortOverview:
      'Create intuitive, user-centered digital experiences that delight customers.',
    overview: `UX Designers research user needs, design interfaces, and test prototypes to create digital products that are both functional and enjoyable to use. They combine psychology, design thinking, and technical skills to solve complex user problems.

The role involves collaborating with product managers, developers, and stakeholders to balance user needs with business goals. UX Designers are advocates for the end user throughout the product development process.`,
    education: {
      typicalLevel: 'BACHELOR',
      certifications: [
        'Google UX Design Certificate',
        'Nielsen Norman Group UX Certification',
        'Interaction Design Foundation Certification',
      ],
    },
    bestMajors: [
      { id: 'maj_design', name: 'Graphic Design' },
      { id: 'maj_hci', name: 'Human-Computer Interaction' },
      { id: 'maj_psych', name: 'Psychology' },
      { id: 'maj_cs', name: 'Computer Science' },
      { id: 'maj_comm', name: 'Communication' },
    ],
    locationHubs: [
      'San Francisco Bay Area, CA',
      'New York City, NY',
      'Seattle, WA',
      'Los Angeles, CA',
      'Austin, TX',
    ],
    salaryUSD: {
      entry: 60000,
      median: 85000,
      p90: 130000,
      source: 'Glassdoor, 2024',
    },
    outlook: {
      growthLabel: 'Growing',
      notes:
        '13% growth expected through 2031. Increasing demand as companies prioritize digital experience and customer satisfaction.',
      source: 'BLS Web Developers and Digital Designers',
    },
    topSkills: [
      'Figma',
      'Adobe XD',
      'Sketch',
      'User Research',
      'Wireframing',
      'Prototyping',
      'Usability Testing',
      'Information Architecture',
      'Visual Design',
      'Empathy',
    ],
    dayToDay: [
      'Conduct user interviews and usability testing sessions',
      'Analyze user research data to identify pain points',
      'Create wireframes and prototypes in Figma',
      'Collaborate with product managers on feature requirements',
      'Present design concepts to stakeholders',
      'Work with developers to ensure design implementation',
      'Iterate designs based on user feedback',
      'Maintain design systems and component libraries',
    ],
    recommendedCourses: [
      'ART 3000 - User Interface Design',
      'PSY 2100 - Cognitive Psychology',
      'CS 3540 - Web Development',
      'COMM 3200 - Visual Communication',
      'MKT 3400 - Consumer Behavior',
    ],
    internships: [
      'UX Design Intern - Tech companies',
      'Product Design Intern - Startups',
      'Design Research Intern - Agencies',
    ],
    clubs: [
      'UX Design Club',
      'AIGA Student Chapter',
      'Women in Design',
      'Product Development Club',
    ],
    relatedCareers: [
      'ui-designer',
      'product-designer',
      'ux-researcher',
      'interaction-designer',
    ],
    links: [
      {
        label: 'Nielsen Norman Group',
        url: 'https://www.nngroup.com/',
      },
      {
        label: 'UX Collective on Medium',
        url: 'https://uxdesign.cc/',
      },
    ],
    lastUpdatedISO: new Date().toISOString(),
    status: 'PUBLISHED',
    updatedBy: {
      id: 'usr_admin_001',
      name: 'Stu Team',
      role: 'STU',
    },
  },
  {
    id: 'car_003',
    slug: 'mechanical-engineer',
    title: 'Mechanical Engineer',
    shortOverview:
      'Design, develop, and test mechanical systems from concept to production.',
    overview: `Mechanical Engineers apply principles of physics and materials science to design, analyze, and manufacture mechanical systems. They work on everything from small components to large-scale infrastructure projects.

The role requires strong problem-solving skills and the ability to work across the entire product lifecycle, from initial concept through testing and manufacturing. Mechanical Engineers collaborate with multidisciplinary teams to bring innovative solutions to life.`,
    education: {
      typicalLevel: 'BACHELOR',
      certifications: [
        'Fundamentals of Engineering (FE) Exam',
        'Professional Engineer (PE) License',
        'SOLIDWORKS Certification',
        'Six Sigma Green Belt',
      ],
    },
    bestMajors: [
      { id: 'maj_me', name: 'Mechanical Engineering' },
      { id: 'maj_aero', name: 'Aerospace Engineering' },
      { id: 'maj_materials', name: 'Materials Science' },
    ],
    locationHubs: [
      'Detroit, MI',
      'Houston, TX',
      'Los Angeles, CA',
      'Seattle, WA',
      'Boston, MA',
    ],
    salaryUSD: {
      entry: 65000,
      median: 90000,
      p90: 136000,
      source: 'Bureau of Labor Statistics, 2024',
    },
    outlook: {
      growthLabel: 'Stable',
      notes:
        '2% growth expected through 2031, slower than average but steady demand in manufacturing, automotive, and aerospace sectors.',
      source: 'BLS Occupational Outlook Handbook',
    },
    topSkills: [
      'CAD (SOLIDWORKS, AutoCAD)',
      'Thermodynamics',
      'Mechanics',
      'Finite Element Analysis',
      'Materials Science',
      'Manufacturing Processes',
      'Project Management',
      'Problem Solving',
      'MATLAB',
      'Technical Writing',
    ],
    dayToDay: [
      'Design mechanical components using CAD software',
      'Run simulations to test design performance',
      'Collaborate with manufacturing teams on production feasibility',
      'Conduct experiments and analyze test data',
      'Create technical documentation and specifications',
      'Review designs for safety and compliance',
      'Participate in design review meetings',
      'Optimize designs for cost and performance',
    ],
    recommendedCourses: [
      'ME 3300 - Thermodynamics',
      'ME 3450 - Mechanics of Materials',
      'ME 4200 - Machine Design',
      'ME 3500 - Fluid Mechanics',
      'ME 4800 - Senior Design Project',
    ],
    internships: [
      'Engineering Intern - Automotive companies',
      'R&D Intern - Aerospace firms',
      'Product Development Intern - Manufacturing',
    ],
    clubs: [
      'Society of Automotive Engineers (SAE)',
      'American Society of Mechanical Engineers (ASME)',
      'Formula SAE Racing Team',
      'Robotics Club',
    ],
    relatedCareers: [
      'aerospace-engineer',
      'manufacturing-engineer',
      'robotics-engineer',
      'materials-engineer',
    ],
    links: [
      {
        label: 'ASME Career Center',
        url: 'https://www.asme.org/career-education',
      },
      {
        label: 'BLS Mechanical Engineers',
        url: 'https://www.bls.gov/ooh/architecture-and-engineering/mechanical-engineers.htm',
      },
    ],
    lastUpdatedISO: new Date().toISOString(),
    status: 'PUBLISHED',
    updatedBy: {
      id: 'usr_admin_001',
      name: 'Stu Team',
      role: 'STU',
    },
  },
  {
    id: 'car_004',
    slug: 'nurse-practitioner',
    title: 'Nurse Practitioner',
    shortOverview:
      'Provide advanced nursing care and primary healthcare services to patients.',
    overview: `Nurse Practitioners (NPs) are advanced practice registered nurses who provide comprehensive healthcare services. They can diagnose conditions, prescribe medications, and manage patient care independently or in collaboration with physicians.

NPs work in various settings including hospitals, clinics, private practices, and community health centers. They often specialize in areas such as family practice, pediatrics, gerontology, or acute care.`,
    education: {
      typicalLevel: 'MASTER',
      certifications: [
        'Registered Nurse (RN) License',
        'Master of Science in Nursing (MSN)',
        'Board Certification (AANP or ANCC)',
        'State NP License',
        'DEA Prescriptive Authority',
      ],
    },
    bestMajors: [
      { id: 'maj_nursing', name: 'Nursing (BSN)' },
      { id: 'maj_health_sci', name: 'Health Sciences' },
    ],
    locationHubs: [
      'New York City, NY',
      'Los Angeles, CA',
      'Chicago, IL',
      'Houston, TX',
      'Phoenix, AZ',
    ],
    salaryUSD: {
      entry: 95000,
      median: 115000,
      p90: 150000,
      source: 'Bureau of Labor Statistics, 2024',
    },
    outlook: {
      growthLabel: 'Hot',
      notes:
        '46% growth expected through 2031, much faster than average. Driven by aging population and increased demand for healthcare services.',
      source: 'BLS Occupational Outlook Handbook',
    },
    topSkills: [
      'Patient Assessment',
      'Diagnosis',
      'Pharmacology',
      'Clinical Procedures',
      'Electronic Health Records (EHR)',
      'Patient Education',
      'Critical Thinking',
      'Communication',
      'Evidence-Based Practice',
      'Empathy',
    ],
    dayToDay: [
      'Conduct comprehensive patient assessments',
      'Diagnose acute and chronic conditions',
      'Prescribe medications and treatments',
      'Order and interpret diagnostic tests',
      'Provide patient education and counseling',
      'Perform minor procedures',
      'Collaborate with physicians and specialists',
      'Maintain detailed medical records',
    ],
    recommendedCourses: [
      'NURS 3100 - Advanced Pathophysiology',
      'NURS 3200 - Advanced Pharmacology',
      'NURS 3300 - Advanced Health Assessment',
      'NURS 4100 - Evidence-Based Practice',
      'NURS 4500 - Clinical Practicum',
    ],
    internships: [
      'Clinical Rotations - Hospitals',
      'Preceptorship - Primary Care Clinics',
      'Specialty Care Practicum - Specialty clinics',
    ],
    clubs: [
      'Student Nurses Association',
      'Sigma Theta Tau (Nursing Honor Society)',
      'NP Student Organization',
      'Healthcare Policy Club',
    ],
    relatedCareers: [
      'physician-assistant',
      'clinical-nurse-specialist',
      'certified-nurse-midwife',
      'psychiatric-nurse-practitioner',
    ],
    links: [
      {
        label: 'American Association of Nurse Practitioners',
        url: 'https://www.aanp.org/',
      },
      {
        label: 'BLS Nurse Practitioners',
        url: 'https://www.bls.gov/ooh/healthcare/nurse-anesthetists-nurse-midwives-and-nurse-practitioners.htm',
      },
    ],
    lastUpdatedISO: new Date().toISOString(),
    status: 'PUBLISHED',
    updatedBy: {
      id: 'usr_admin_001',
      name: 'Stu Team',
      role: 'STU',
    },
  },
  {
    id: 'car_005',
    slug: 'software-engineer',
    title: 'Software Engineer',
    shortOverview:
      'Build and maintain software systems that power modern applications and services.',
    overview: `Software Engineers design, develop, test, and maintain software applications and systems. They work across the full stack, from frontend user interfaces to backend servers and databases.

The role requires strong problem-solving skills, coding proficiency, and the ability to work in collaborative teams using agile methodologies. Software Engineers continually learn new technologies and adapt to evolving industry standards.`,
    education: {
      typicalLevel: 'BACHELOR',
      certifications: [
        'AWS Certified Developer',
        'Microsoft Certified: Azure Developer',
        'Oracle Certified Professional',
        'Google Cloud Professional Developer',
      ],
    },
    bestMajors: [
      { id: 'maj_cs', name: 'Computer Science' },
      { id: 'maj_se', name: 'Software Engineering' },
      { id: 'maj_ce', name: 'Computer Engineering' },
      { id: 'maj_is', name: 'Information Systems' },
    ],
    locationHubs: [
      'San Francisco Bay Area, CA',
      'Seattle, WA',
      'Austin, TX',
      'New York City, NY',
      'Boston, MA',
    ],
    salaryUSD: {
      entry: 75000,
      median: 110000,
      p90: 160000,
      source: 'Bureau of Labor Statistics & Glassdoor, 2024',
    },
    outlook: {
      growthLabel: 'Hot',
      notes:
        '25% growth expected through 2031, much faster than average. Strong demand across all industries as digital transformation accelerates.',
      source: 'BLS Occupational Outlook Handbook',
    },
    topSkills: [
      'JavaScript/TypeScript',
      'Python',
      'Java',
      'React',
      'Node.js',
      'SQL',
      'Git',
      'AWS/Cloud',
      'Algorithms',
      'System Design',
    ],
    dayToDay: [
      'Write clean, efficient code following best practices',
      'Participate in code reviews with team members',
      'Debug and fix software defects',
      'Design system architecture and APIs',
      'Write unit and integration tests',
      'Collaborate in agile sprints and standups',
      'Deploy code to production environments',
      'Optimize application performance',
    ],
    recommendedCourses: [
      'CS 2420 - Data Structures & Algorithms',
      'CS 3500 - Software Practice',
      'CS 4400 - Database Systems',
      'CS 4550 - Web Development',
      'CS 4500 - Senior Capstone',
    ],
    internships: [
      'Software Engineering Intern - FAANG companies',
      'Full Stack Developer Intern - Startups',
      'Backend Engineer Intern - Enterprise companies',
    ],
    clubs: [
      'Association for Computing Machinery (ACM)',
      'Hackathon Club',
      'Women in Computing',
      'Open Source Club',
    ],
    relatedCareers: [
      'frontend-developer',
      'backend-developer',
      'devops-engineer',
      'mobile-developer',
    ],
    links: [
      {
        label: 'Stack Overflow Developer Survey',
        url: 'https://survey.stackoverflow.co/',
      },
      {
        label: 'BLS Software Developers',
        url: 'https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm',
      },
    ],
    lastUpdatedISO: new Date().toISOString(),
    status: 'PUBLISHED',
    updatedBy: {
      id: 'usr_admin_001',
      name: 'Stu Team',
      role: 'STU',
    },
  },
];

export function seedCareers(): void {
  if (seeded) return;
  careers = [...SAMPLE_CAREERS];
  seeded = true;
}

export function listCareers(): Career[] {
  return [...careers];
}

export function getCareerBySlug(slug: string): Career | undefined {
  return careers.find((c) => c.slug === slug);
}

export function searchCareers(query: string): Career[] {
  if (!query) return careers;

  const q = query.toLowerCase();
  return careers.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.shortOverview.toLowerCase().includes(q) ||
      c.topSkills.some((s) => s.toLowerCase().includes(q)) ||
      c.bestMajors.some((m) => m.name.toLowerCase().includes(q))
  );
}

export function saveCareerDraft(career: Career): Career {
  const existing = careers.findIndex((c) => c.id === career.id);

  const updated = {
    ...career,
    status: 'DRAFT' as const,
    lastUpdatedISO: new Date().toISOString(),
  };

  if (existing >= 0) {
    careers[existing] = updated;
  } else {
    careers.push(updated);
  }

  return updated;
}

export function publishCareer(id: string): Career {
  const career = careers.find((c) => c.id === id);
  if (!career) throw new Error('Career not found');

  const published = {
    ...career,
    status: 'PUBLISHED' as const,
    lastUpdatedISO: new Date().toISOString(),
  };

  const idx = careers.findIndex((c) => c.id === id);
  careers[idx] = published;

  return published;
}

export function resetCareers(): void {
  careers = [];
  seeded = false;
}
