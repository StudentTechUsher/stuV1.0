export type Course = {
  course_code: string;
  course_name: string;
  section: string;
  professor: string;
  schedule: string;
  location: string;
  credits: number;
  requirement: string;
};

export function parseCourseCSV(csvContent: string): Course[] {
  const lines = csvContent.trim().split('\n');
  const header = lines[0];

  // Validate header
  const expectedHeader = 'course_code,course_name,section,professor,schedule,location,credits,requirement';
  if (header !== expectedHeader) {
    console.warn('CSV header format may have changed');
  }

  return lines.slice(1).map((line, index) => {
    try {
      // Parse CSV line with proper comma handling
      const values = parseCSVLine(line);

      if (values.length !== 8) {
        throw new Error(`Expected 8 columns, got ${values.length}`);
      }

      return {
        course_code: values[0].trim(),
        course_name: values[1].trim(),
        section: values[2].trim(),
        professor: values[3].trim(),
        schedule: values[4].trim(),
        location: values[5].trim(),
        credits: parseFloat(values[6].trim()),
        requirement: values[7].trim(),
      };
    } catch (error) {
      console.warn(`Error parsing line ${index + 2}: ${line}`, error);
      throw error;
    }
  }).filter(course =>
    course.course_code &&
    course.schedule &&
    course.schedule.includes(' ') &&
    course.schedule.includes('-')
  );
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

export async function loadMockCourses(): Promise<Course[]> {
  try {
    const response = await fetch('/mock_courses_200.csv');
    if (!response.ok) {
      throw new Error(`Failed to fetch courses: ${response.status}`);
    }

    const csvContent = await response.text();
    return parseCourseCSV(csvContent);
  } catch (error) {
    console.error('Error loading mock courses:', error);
    return [];
  }
}

export function filterCoursesByRequirement(
  courses: Course[],
  requirement: string
): Course[] {
  return courses.filter(course => course.requirement === requirement);
}

export function validateScheduleFormat(schedule: string): boolean {
  // Expected format: "MWF 10:00-10:50" or "TTh 14:00-15:15"
  const pattern = /^[MTWFS]+(h)?\s+\d{1,2}:\d{2}-\d{1,2}:\d{2}$/;
  return pattern.test(schedule);
}