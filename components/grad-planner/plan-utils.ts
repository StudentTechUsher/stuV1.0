import type { 
  SemesterId, 
  Course, 
  SemesterMeta, 
  GraduationPlan, 
  Semester 
} from '@/types/graduation-plan';

export const buildSemesterList = (n: number): Semester[] => [
  ...Array.from({ length: Math.max(1, n) }, (_, i) => ({
    id: (i + 1) as SemesterId,
    label: `Semester ${i + 1}`,
  })),
];

export const semFromLabel = (term?: string): SemesterId => {
  if (!term) return 1;
  const m = term.match(/semester\s*(\d+)/i);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n >= 1 ? (n as SemesterId) : 1;
};

let idCounter = 0;
export const newId = (prefix: string) =>
  `${prefix}-${++idCounter}-${Math.random().toString(36).slice(2, 8)}`;

export function normalizePlan(plan: GraduationPlan): {
  courses: Course[];
  semestersMeta: Record<SemesterId, SemesterMeta>;
  leftovers: Record<string, unknown>;
  termsPlanned: number;
} {
  const semestersMeta: Record<SemesterId, SemesterMeta> = {};
  const courses: Course[] = [];
  let maxSeen = 1;

  for (const t of plan.plan || []) {
    const sid = semFromLabel(t.term);
    if (sid > maxSeen) maxSeen = sid;

    const notesArr =
      typeof t.notes === 'string' ? [t.notes] :
      Array.isArray(t.notes) ? t.notes :
      undefined;

    if (!semestersMeta[sid]) semestersMeta[sid] = {};
    if (notesArr?.length) {
      semestersMeta[sid].notes = [...(semestersMeta[sid].notes || []), ...notesArr];
    }

    for (const pc of t.courses || []) {
      const requirement = pc.requirement
        ?? (Array.isArray(pc.fulfills) && pc.fulfills.length ? pc.fulfills[0] : '—');

      const credits = typeof pc.credits === 'number'
        ? pc.credits
        : Number(pc.credits) || 0;

      const c: Course = {
        id: newId(pc.code || 'course'),
        code: pc.code || 'TBD',
        title: pc.title || '',
        credits,
        requirement,
        semester: sid,
        prerequisite: pc.prerequisite as string | undefined,
        meta: Object.fromEntries(
          Object.entries(pc).filter(([k]) =>
            !['code', 'title', 'credits', 'fulfills', 'requirement', 'prerequisite'].includes(k)
          )
        ),
      };
      courses.push(c);
    }
  }

  for (const cp of plan.checkpoints || []) {
    const sid = semFromLabel(cp.term);
    if (sid > maxSeen) maxSeen = sid;
    if (!semestersMeta[sid]) semestersMeta[sid] = {};
    const arr = semestersMeta[sid].checkpoints || [];
    arr.push({ action: cp.action, conditions: cp.conditions, notes: cp.notes });
    semestersMeta[sid].checkpoints = arr;
  }

  const leftovers: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(plan)) {
    if (!['program', 'duration_years', 'assumptions', 'checkpoints', 'plan', 'terms_planned'].includes(k)) {
      leftovers[k] = v;
    }
  }

  const termsPlanned =
    typeof plan.terms_planned === 'number' && plan.terms_planned > 0
      ? Math.max(plan.terms_planned, maxSeen)
      : Math.max(1, maxSeen);

  return { courses, semestersMeta, leftovers, termsPlanned };
}
