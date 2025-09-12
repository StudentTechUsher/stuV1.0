// ./plan-utils.ts
import type { Course } from '@/types/graduation-plan';

// Extend SemesterMeta to include optional creditsPlanned property
type SemesterMeta = {
  notes?: string[];
  checkpoints?: {
    action: string;
    conditions?: string[];
    notes?: string;
  }[];
  creditsPlanned?: number;
};

/* ---------- input shapes (from your JSON) ---------- */
type InputPlanTerm = {
  term: string | number;
  notes?: string | string[];
  courses: {
    code: string;
    title: string;
    credits: number | string;
    fulfills?: string[];
  }[];
  credits_planned?: number | string;
};

type InputCheckpoint = {
  term: string | number;
  action: string;
  conditions?: string[];
  notes?: string;
};

type RawPlan = {
  plan?: InputPlanTerm[];
  program?: string;
  assumptions?: string[];
  checkpoints?: InputCheckpoint[];
  duration_years?: number;
  requirement_buckets_covered?: Record<string, string[]>;
  [k: string]: unknown;
};

/* ---------- public API ---------- */
export function buildSemesterList(termsPlanned: number) {
  // Labels kept simple; swap in Fall/Spring if you prefer
  return Array.from({ length: termsPlanned }, (_, i) => {
    const id = i + 1;
    return { id, label: `Semester ${id}` };
  });
}

/**
 * Accepts either:
 *  - your new raw JSON shape (with `plan`, `checkpoints`, etc.), or
 *  - an already-normalized object (courses + semestersMeta), which we pass through.
 */
export function normalizePlan(source: unknown): {
  courses: Course[];
  semestersMeta: Record<number, SemesterMeta>;
  leftovers: Record<string, unknown>;
  termsPlanned: number;
} {
  // pass-through if already normalized
  const s = source as { courses?: Course[]; semestersMeta?: Record<number, SemesterMeta>; termsPlanned?: number; leftovers?: Record<string, unknown> } | RawPlan;
  if (s?.courses && s?.semestersMeta) {
    const termsPlanned =
      s.termsPlanned ??
      Math.max(1, ...((s.courses as Course[]) || []).map(c => Number(c.semester) || 1));
    return {
      courses: s.courses as Course[],
      semestersMeta: s.semestersMeta as Record<number, SemesterMeta>,
      leftovers: s.leftovers ?? Object.create(null),
      termsPlanned: Number(termsPlanned),
    };
  }

  const raw = (source ?? {}) as RawPlan;
  const terms: InputPlanTerm[] = Array.isArray(raw.plan) ? [...raw.plan] : [];
  terms.sort((a, b) => Number(a.term) - Number(b.term));

  // group checkpoints by term
  const checkpointsByTerm = new Map<number, InputCheckpoint[]>();
  for (const cp of raw.checkpoints ?? []) {
    const t = Number(cp.term);
    if (!checkpointsByTerm.has(t)) checkpointsByTerm.set(t, []);
    checkpointsByTerm.get(t)!.push(cp);
  }

  const semestersMeta: Record<number, SemesterMeta> = {};
  const courses: Course[] = [];

  for (const t of terms) {
    const termNum = Number(t.term);
    if (!Number.isFinite(termNum) || termNum <= 0) continue;

    // notes + checkpoints into meta
    let notesArray: string[] | undefined;
    if (t.notes == null) {
      notesArray = undefined;
    } else if (Array.isArray(t.notes)) {
      notesArray = t.notes;
    } else {
      notesArray = [t.notes];
    }

    const meta: SemesterMeta = {};
    if (notesArray?.length) meta.notes = notesArray;

    // Add checkpoints if present
    const cps = checkpointsByTerm.get(termNum);
    if (cps?.length) {
      meta.checkpoints = cps.map(c => ({
        action: c.action,
        conditions: c.conditions,
        notes: c.notes,
      }));
    }

    // Add creditsPlanned if present and valid
    if (t.credits_planned != null) {
      const n = Number(t.credits_planned);
      if (!Number.isNaN(n)) meta.creditsPlanned = n; // optional; not required by UI
    }

    if (Object.keys(meta).length) semestersMeta[termNum] = meta;

    // push courses for this term
    (t.courses || []).forEach((c, idx) => {
      // ensure unique id even for repeated codes like "Free Elective"
      const safeCode = (c.code || 'UNK').replace(/\s+/g, '_');
      const id = `${termNum}-${safeCode}-${idx}`;
      courses.push({
        id,
        code: c.code,
        title: c.title,
        credits: Number(c.credits) || 0,
        semester: termNum,
        // keep requirement short; UX looks best with first item
        requirement: (Array.isArray(c.fulfills) && c.fulfills[0]) || '—',
      } as Course);
    });
  }

  const termsPlanned =
    terms.reduce((m, t) => Math.max(m, Number(t.term) || 0), 0) || 8;

  // anything extra we want to keep around for debugging / preview
  const leftovers: Record<string, unknown> = {};
  if (raw.assumptions) leftovers.assumptions = raw.assumptions;
  if (raw.requirement_buckets_covered)
    leftovers.requirement_buckets_covered = raw.requirement_buckets_covered;
  if (raw.duration_years) leftovers.duration_years = raw.duration_years;

  return { courses, semestersMeta, leftovers, termsPlanned };
}
