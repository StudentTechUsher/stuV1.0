/**
 * Assumptions:
 * - Fall 2024 and Spring 2025 terms
 * - 5 colleges, 15 departments, 30 majors
 * - Add/drop deadlines are ~2 weeks into each term
 * - Withdrawals occur randomly throughout the term
 */

import type {
  Advisor,
  Student,
  Course,
  EnrollmentAction,
  WithdrawalRow,
  OrgScope,
} from '@/types/withdrawals';

// In-memory stores
let advisors: Advisor[] = [];
let students: Student[] = [];
let courses: Course[] = [];
let enrollmentActions: EnrollmentAction[] = [];
let seeded = false;

const colleges = ['COL_BUS', 'COL_ENG', 'COL_SCI', 'COL_ART', 'COL_HUM'];
const departments = [
  'DEPT_ACCT', 'DEPT_FIN', 'DEPT_MKT',
  'DEPT_CS', 'DEPT_EE', 'DEPT_ME',
  'DEPT_BIO', 'DEPT_CHEM', 'DEPT_PHYS',
  'DEPT_MUS', 'DEPT_ART', 'DEPT_THR',
  'DEPT_ENG', 'DEPT_HIST', 'DEPT_PHIL',
];
const majors = [
  'MAJ_ACCT', 'MAJ_FIN', 'MAJ_MKT', 'MAJ_MGMT', 'MAJ_ECON',
  'MAJ_CS', 'MAJ_SE', 'MAJ_EE', 'MAJ_ME', 'MAJ_CE',
  'MAJ_BIO', 'MAJ_CHEM', 'MAJ_PHYS', 'MAJ_MATH', 'MAJ_STAT',
  'MAJ_MUS', 'MAJ_ART', 'MAJ_THR', 'MAJ_DANCE', 'MAJ_FILM',
  'MAJ_ENG', 'MAJ_HIST', 'MAJ_PHIL', 'MAJ_POL', 'MAJ_SOC',
  'MAJ_PSY', 'MAJ_ANTH', 'MAJ_GEO', 'MAJ_ECON2', 'MAJ_COMM',
];

const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Elijah', 'Sophia', 'Lucas',
  'Isabella', 'Mason', 'Mia', 'Logan', 'Charlotte', 'Ethan', 'Amelia',
  'James', 'Harper', 'Alexander', 'Evelyn', 'Benjamin', 'Abigail', 'William',
  'Emily', 'Michael', 'Elizabeth', 'Daniel', 'Sofia', 'Henry', 'Avery', 'Jackson',
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
];

const courseSubjects = [
  'ACCT', 'FIN', 'MKT', 'MGMT', 'ECON',
  'CS', 'SE', 'EE', 'ME', 'CE',
  'BIO', 'CHEM', 'PHYS', 'MATH', 'STAT',
  'MUS', 'ART', 'THR', 'DANC', 'FILM',
  'ENGL', 'HIST', 'PHIL', 'POLS', 'SOC',
  'PSY', 'ANTH', 'GEOG', 'ECON', 'COMM',
];

const withdrawReasons = [
  'Medical leave',
  'Too difficult',
  'Schedule conflict',
  'Changed major',
  'Personal reasons',
  'Financial hardship',
  'Failed prerequisite',
  'Course not as expected',
  'Too much workload',
  'Family emergency',
  undefined, // Some withdrawals have no reason
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAdvisors(): Advisor[] {
  const result: Advisor[] = [];
  let id = 1;

  // 1 University-wide advisor
  result.push({
    id: `adv_${String(id++).padStart(3, '0')}`,
    name: 'Dr. University Dean',
    email: 'university.dean@university.edu',
    scope: 'UNIVERSITY',
  });

  // 5 College advisors (1 per college)
  colleges.forEach((collegeId) => {
    result.push({
      id: `adv_${String(id++).padStart(3, '0')}`,
      name: `Dr. ${collegeId} Dean`,
      email: `${collegeId.toLowerCase()}.dean@university.edu`,
      scope: 'COLLEGE',
      collegeId,
    });
  });

  // 10 Department advisors
  for (let i = 0; i < 10; i++) {
    const deptId = randomElement(departments);
    const collegeId = randomElement(colleges);
    result.push({
      id: `adv_${String(id++).padStart(3, '0')}`,
      name: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
      email: `${deptId.toLowerCase()}.advisor${i}@university.edu`,
      scope: 'DEPARTMENT',
      collegeId,
      departmentId: deptId,
    });
  }

  // 4 Major advisors
  for (let i = 0; i < 4; i++) {
    const majorId = randomElement(majors);
    const deptId = randomElement(departments);
    const collegeId = randomElement(colleges);
    result.push({
      id: `adv_${String(id++).padStart(3, '0')}`,
      name: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
      email: `${majorId.toLowerCase()}.advisor${i}@university.edu`,
      scope: 'MAJOR',
      collegeId,
      departmentId: deptId,
      majorId,
    });
  }

  return result;
}

function generateStudents(advisorList: Advisor[]): Student[] {
  const result: Student[] = [];
  for (let i = 1; i <= 300; i++) {
    const advisor = randomElement(advisorList);
    const collegeId = advisor.collegeId || randomElement(colleges);
    const departmentId = advisor.departmentId || randomElement(departments);
    const majorId = advisor.majorId || randomElement(majors);

    result.push({
      id: `stu_${String(i).padStart(4, '0')}`,
      name: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
      email: `student${i}@university.edu`,
      collegeId,
      departmentId,
      majorId,
      advisorId: advisor.id,
    });
  }
  return result;
}

function generateCourses(): Course[] {
  const result: Course[] = [];

  // Use current date for realistic data
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Current term deadline was 2 weeks ago
  const currentDeadline = new Date(now);
  currentDeadline.setDate(currentDeadline.getDate() - 14);

  // Previous term deadline was ~4 months ago
  const previousDeadline = new Date(now);
  previousDeadline.setMonth(previousDeadline.getMonth() - 4);

  const terms = [
    {
      name: currentMonth >= 8 ? `Fall ${currentYear}` : `Spring ${currentYear}`,
      addDropDeadline: currentDeadline.toISOString(),
      termStart: new Date(currentDeadline.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      termEnd: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      name: currentMonth >= 8 ? `Spring ${currentYear}` : `Fall ${currentYear - 1}`,
      addDropDeadline: previousDeadline.toISOString(),
      termStart: new Date(previousDeadline.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      termEnd: new Date(previousDeadline.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  let id = 1;
  terms.forEach((term) => {
    // Generate ~400 course sections per term
    for (let i = 0; i < 400; i++) {
      const subject = randomElement(courseSubjects);
      const courseNum = randomInt(1000, 4999);
      const sectionNum = String(randomInt(1, 10)).padStart(2, '0');

      result.push({
        id: `crs_${String(id++).padStart(5, '0')}`,
        code: `${subject} ${courseNum}`,
        title: `${subject} Course ${courseNum}`,
        section: sectionNum,
        credits: randomElement([3, 4, 1, 2]),
        instructor: `Prof. ${randomElement(lastNames)}`,
        term: term.name,
        addDropDeadlineISO: term.addDropDeadline,
      });
    }
  });

  return result;
}

function generateEnrollmentActions(
  studentList: Student[],
  courseList: Course[]
): EnrollmentAction[] {
  const result: EnrollmentAction[] = [];
  let id = 1;
  const now = new Date();

  // Group courses by term
  const termGroups = new Map<string, Course[]>();
  courseList.forEach((course) => {
    if (!termGroups.has(course.term)) {
      termGroups.set(course.term, []);
    }
    termGroups.get(course.term)!.push(course);
  });

  // Each student enrolls in 4-6 courses per term
  studentList.forEach((student) => {
    termGroups.forEach((termCourses) => {
      const numCourses = randomInt(4, 6);
      const selectedCourses = [];
      for (let i = 0; i < numCourses; i++) {
        selectedCourses.push(randomElement(termCourses));
      }

      selectedCourses.forEach((course) => {
        // Enroll at start of term (2 weeks before deadline)
        const deadline = new Date(course.addDropDeadlineISO);
        const enrollDate = new Date(deadline.getTime() - 14 * 24 * 60 * 60 * 1000);

        result.push({
          id: `enr_${String(id++).padStart(6, '0')}`,
          studentId: student.id,
          courseId: course.id,
          action: 'ENROLL',
          actionAtISO: enrollDate.toISOString(),
        });

        // 20% chance to withdraw (some before deadline, some after)
        if (Math.random() < 0.2) {
          const termEndDate = new Date(deadline.getTime() + 120 * 24 * 60 * 60 * 1000);

          // 70% withdraw after deadline
          const withdrawAfterDeadline = Math.random() < 0.7;

          let withdrawDate: Date;
          if (withdrawAfterDeadline) {
            // Random date between deadline and now (or term end if term ended)
            const deadlineMs = deadline.getTime();
            const maxDate = Math.min(now.getTime(), termEndDate.getTime());
            const randomMs = deadlineMs + Math.random() * (maxDate - deadlineMs);
            withdrawDate = new Date(randomMs);
          } else {
            // Random date between enroll and deadline
            const enrollMs = enrollDate.getTime();
            const deadlineMs = deadline.getTime();
            const randomMs = enrollMs + Math.random() * (deadlineMs - enrollMs);
            withdrawDate = new Date(randomMs);
          }

          result.push({
            id: `enr_${String(id++).padStart(6, '0')}`,
            studentId: student.id,
            courseId: course.id,
            action: 'WITHDRAW',
            actionAtISO: withdrawDate.toISOString(),
            reason: randomElement(withdrawReasons),
          });
        }
      });
    });
  });

  return result;
}

export function seedAll(): void {
  if (seeded) return;

  advisors = generateAdvisors();
  students = generateStudents(advisors);
  courses = generateCourses();
  enrollmentActions = generateEnrollmentActions(students, courses);

  seeded = true;
}

export function resetSeed(): void {
  seeded = false;
  advisors = [];
  students = [];
  courses = [];
  enrollmentActions = [];
}

export function getAdvisors(): Advisor[] {
  return advisors;
}

export function getStudents(): Student[] {
  return students;
}

export function getCourses(): Course[] {
  return courses;
}

export function getEnrollmentActions(): EnrollmentAction[] {
  return enrollmentActions;
}

export function listAdvisorWeeklyWithdrawals(
  advisorId: string,
  weekStartISO: string,
  weekEndISO: string
): WithdrawalRow[] {
  const advisor = advisors.find((a) => a.id === advisorId);
  if (!advisor) return [];

  const weekStart = new Date(weekStartISO);
  const weekEnd = new Date(weekEndISO);

  // Get students in advisor's scope
  const scopedStudents = students.filter((student) => {
    if (advisor.scope === 'UNIVERSITY') return true;
    if (advisor.scope === 'COLLEGE') return student.collegeId === advisor.collegeId;
    if (advisor.scope === 'DEPARTMENT')
      return student.departmentId === advisor.departmentId;
    if (advisor.scope === 'MAJOR') return student.majorId === advisor.majorId;
    return false;
  });

  const scopedStudentIds = new Set(scopedStudents.map((s) => s.id));

  // Find withdrawals after deadline in the date range
  const withdrawals = enrollmentActions.filter((action) => {
    if (action.action !== 'WITHDRAW') return false;
    if (!scopedStudentIds.has(action.studentId)) return false;

    const course = courses.find((c) => c.id === action.courseId);
    if (!course) return false;

    const actionDate = new Date(action.actionAtISO);
    const deadline = new Date(course.addDropDeadlineISO);

    // Must be after deadline
    if (actionDate <= deadline) return false;

    // Must be in date range
    return actionDate >= weekStart && actionDate <= weekEnd;
  });

  // Build withdrawal rows
  const rows: WithdrawalRow[] = withdrawals.map((action) => {
    const student = scopedStudents.find((s) => s.id === action.studentId)!;
    const course = courses.find((c) => c.id === action.courseId)!;
    const actionDate = new Date(action.actionAtISO);
    const deadline = new Date(course.addDropDeadlineISO);
    const daysAfterDeadline = Math.floor(
      (actionDate.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      student,
      course,
      actionAtISO: action.actionAtISO,
      daysAfterDeadline,
    };
  });

  return rows;
}
