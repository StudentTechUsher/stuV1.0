// lib/parseTranscript.ts
import { createClient } from "@supabase/supabase-js";

export type ParsedCourse = {
  term?: string | null;
  subject: string;
  number: string;
  title?: string | null;
  credits?: number | null;
  grade?: string | null;
  confidence?: number | null;
};

// Regex to match course patterns like "CS 142 - Intro to Programming - 3 credits - A"
// Using capture groups instead of named groups for ES2017 compatibility
// Groups: 1=subject, 2=number, 3=title, 4=credits, 5=grade
const COURSE_RE = /([A-Z]{2,4})\s*(\d{3,4})[\s\-–:]+([^-\n]+?)(?:[\s\-–:]+(\d+(?:\.\d+)?))?(?:[\s\-–:]+([A-F][+\-]?|P|NP|CR|NC|W))?/gi;

function guessTerm(context: string): string | null {
  const m = context.match(/(Fall|Spring|Summer|Winter)\s+20\d{2}/i);
  if (!m) return null;

  const [season, year] = m[0].split(/\s+/);
  return `${season.charAt(0).toUpperCase()}${season.slice(1).toLowerCase()} ${year}`;
}

export async function extractTranscriptCourses(pdfBuffer: Buffer): Promise<ParsedCourse[]> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Convert PDF to base64 for OpenAI
  const base64Pdf = pdfBuffer.toString('base64');

  // Call OpenAI GPT-4o with vision to extract courses
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a transcript parser. Extract all courses from the academic transcript. Return ONLY valid JSON array with this structure: [{"term":"Fall 2023","subject":"CS","number":"142","title":"Intro to Programming","credits":3,"grade":"A"}]. Use null for missing fields.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all courses from this transcript PDF. Return only the JSON array, no other text.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Pdf}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API failed: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '[]';

  // Parse JSON response
  let parsedCourses: any[];
  try {
    // Remove markdown code blocks if present
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsedCourses = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse OpenAI response:', content);
    throw new Error('Failed to parse course data from OpenAI');
  }

  // Convert to our format
  const courses: ParsedCourse[] = parsedCourses.map((c: any) => ({
    term: c.term || null,
    subject: c.subject || '',
    number: c.number || '',
    title: c.title || null,
    credits: c.credits ? Number(c.credits) : null,
    grade: c.grade || null,
    confidence: 0.95 // High confidence since OpenAI extracted it
  }));

  return courses;

  // Old regex-based parsing code (kept for reference):
  /*
  const courses: ParsedCourse[] = [];
  let m: RegExpExecArray | null;

  while ((m = COURSE_RE.exec(text)) !== null) {
    const subject = (m[1] || "").toUpperCase();
    const number = (m[2] || "").trim();
    const title = (m[3] || "").trim().replace(/^[\-–:\s]+|[\-–:\s]+$/g, "");
    const credits = m[4] ? parseFloat(m[4]) : null;
    const grade = m[5] ? m[5].toUpperCase() : null;

    // Look back ~200 chars to guess term
    const start = Math.max(0, m.index - 200);
    const ctx = text.slice(start, m.index);
    const term = guessTerm(ctx);

    // Confidence heuristic
    let confidence = 0.6;
    if (subject && number && title) confidence += 0.2;
    if (credits !== null) confidence += 0.1;
    if (grade) confidence += 0.1;

    // Basic sanity check
    if (!subject || !number) continue;

    courses.push({
      term,
      subject,
      number,
      title,
      credits,
      grade,
      confidence: Math.min(confidence, 0.99)
    });
  }

  return courses;
  */
}

export async function upsertCoursesDirect(
  supabaseServiceUrl: string,
  serviceRoleKey: string,
  payload: { userId: string; documentId: string; courses: ParsedCourse[] }
) {
  const sb = createClient(supabaseServiceUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Upsert one-by-one (respects unique constraint: user_id, subject, number, term)
  for (const c of payload.courses) {
    const { error } = await sb.from("user_courses").upsert(
      {
        user_id: payload.userId,
        term: c.term ?? null,
        subject: c.subject,
        number: c.number,
        title: c.title ?? null,
        credits: c.credits ?? null,
        grade: c.grade ?? null,
        confidence: c.confidence ?? null,
        source_document: payload.documentId,
      },
      { onConflict: "user_id,subject,number,term" }
    );
    if (error) throw error;
  }

  // Update document status to parsed
  await sb
    .from("documents")
    .update({ status: "parsed" })
    .eq("id", payload.documentId);
}
