// Helper function to get color for a requirement type (matches graduation-planner.tsx logic)
function getRequirementColor(requirement: string): string {
  const req = requirement.toLowerCase().trim();

  // Direct matches first
  const REQUIREMENT_COLORS: Record<string, string> = {
    'major': '#12F987', // var(--primary)
    'minor': '#001F54',
    'general education': '#2196f3',
    'gen ed': '#2196f3',
    'religion': '#5E35B1',
    'electives': '#9C27B0',
    'elective': '#9C27B0',
  };

  if (REQUIREMENT_COLORS[req]) {
    return REQUIREMENT_COLORS[req];
  }

  // Pattern matching for specific requirement categories
  // Religion-related requirements
  if (req.includes('book of mormon') ||
      req.includes('doctrine and covenants') ||
      req.includes('teachings') ||
      req.includes('jesus christ') ||
      req.includes('christ') ||
      req.includes('gospel') ||
      req.includes('eternal family') ||
      req.includes('old testament') ||
      req.includes('new testament') ||
      req.includes('pearl of great price') ||
      req.includes('restoration') ||
      req.includes('religion') ||
      req.includes('rel ')) {
    return '#5E35B1';
  }

  // General Education patterns
  if (req.includes('skills') ||
      req.includes('first-year writing') ||
      req.includes('adv written') ||
      req.includes('global and cultural awareness') ||
      req.includes('quantitative reasoning') ||
      req.includes('science') ||
      req.includes('social science') ||
      req.includes('humanities') ||
      req.includes('fine arts') ||
      req.includes('american heritage') ||
      req.includes('languages of learning') ||
      req.includes('gen ed') ||
      req.includes('general education')) {
    return '#2196f3';
  }

  // Major-related (including generic "requirement" patterns)
  if (req.includes('major') ||
      req.includes('core') ||
      req.includes('capstone') ||
      req.includes('requirement') ||
      req.includes('subrequirement') ||
      /^requirement\s*\d*$/.test(req) ||
      /^subrequirement\s*\d*$/.test(req)) {
    return '#12F987';
  }

  // Minor-related
  if (req.includes('minor')) {
    return '#001F54';
  }

  // Elective-related
  if (req.includes('elective')) {
    return '#9C27B0';
  }

  return '#6b7280'; // gray default
}

interface ReqDotProps {
  tag: string;
  size?: number;
}

export function ReqDot({ tag, size = 8 }: ReqDotProps) {
  const color = getRequirementColor(tag);

  return (
    <span
      className="inline-block rounded-full"
      style={{ width: size, height: size, backgroundColor: color }}
      aria-label={`Fulfills ${tag} requirement`}
      title={`Fulfills ${tag} requirement`}
    />
  );
}
