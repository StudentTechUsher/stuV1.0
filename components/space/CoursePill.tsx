import { ReqDot } from './ReqDot';

export interface CourseItem {
  id: string;
  code: string;
  title: string;
  credits: number;
  requirements: string[];
}

interface CoursePillProps {
  course: CourseItem;
}

export function CoursePill({ course }: CoursePillProps) {
  return (
    <div
      className="grid grid-cols-[1fr_auto] items-center gap-2 px-2 py-1 rounded-lg bg-white border border-gray-200 shadow-sm"
      title={`${course.code} - ${course.title}`}
    >
      {/* Left: requirement dots + course info */}
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Requirement dots */}
        {course.requirements && course.requirements.length > 0 && (
          <div className="flex items-center gap-0.5 shrink-0">
            {course.requirements.map((req, idx) => (
              <ReqDot key={idx} tag={req} size={8} />
            ))}
          </div>
        )}

        {/* Course code and title */}
        <div className="min-w-0 flex-1">
          <span className="text-[11px] text-gray-900 font-medium truncate block max-w-[180px] sm:max-w-[200px]">
            {course.code} - {course.title}
          </span>
        </div>
      </div>

      {/* Right: credits */}
      <div className="shrink-0">
        <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-mono text-gray-700">
          {course.credits}
        </span>
      </div>
    </div>
  );
}
