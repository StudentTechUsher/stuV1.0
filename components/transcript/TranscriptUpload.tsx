"use client";

import { useState, useRef } from "react";
import { StuLoader } from "@/components/ui/StuLoader";
import {
  parseTranscriptText,
  validateCourse,
  type CourseRow,
  type ParseResult,
} from "@/lib/transcript/byuParser";
import { parseTranscriptCoursesAction } from "@/lib/services/server-actions";
import { useAuth } from "@/hooks/useAuth";

// Type for parsed transcript course (matching openaiService.ts)
interface ParsedTranscriptCourse {
  courseCode: string;
  title: string;
  credits: number;
  grade: string | null;
}

type UploadStatus = "idle" | "extracting" | "extracted" | "failed";

interface TranscriptUploadProps {
  onTextExtracted?: (text: string) => void;
}

export default function TranscriptUpload({ onTextExtracted }: Readonly<TranscriptUploadProps>) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [cleanedText, setCleanedText] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false); // Default to showing cleaned text
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [aiCourses, setAiCourses] = useState<ParsedTranscriptCourse[]>([]);
  const [aiParseError, setAiParseError] = useState<string | null>(null);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const formatCredits = (credits: number) =>
    Number.isInteger(credits) ? credits.toFixed(0) : credits.toFixed(2);

  const coursesByTerm = useMemo<Record<string, CourseRow[]>>(() => {
    if (!parseResult) return {};
    return parseResult.courses.reduce<Record<string, CourseRow[]>>((acc, course) => {
      const termKey = course.term && course.term.trim().length > 0 ? course.term : "Unknown";
      if (!acc[termKey]) {
        acc[termKey] = [];
      }
      acc[termKey].push(course);
      return acc;
    }, {});
  }, [parseResult]);

  const orderedTerms = useMemo(() => {
    const metadataTerms = parseResult?.metadata.termsFound ?? [];
    const groupedTerms = Object.keys(coursesByTerm);
    const extras = groupedTerms.filter(term => !metadataTerms.includes(term));
    return [...metadataTerms, ...extras].filter((term, index, arr) => arr.indexOf(term) === index);
  }, [coursesByTerm, parseResult]);

  const handleFileUpload = async (file: File) => {
    setStatus("extracting");
    setError(null);
    setFileName(file.name);
    setRawText(null);
    setCleanedText(null);
    setParseResult(null);
    setParseError(null);
    setAiCourses([]);
    setAiParseError(null);
    setIsAiParsing(false);
    setShowRaw(false);

    try {
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Import pdfjs dynamically
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

      // Set the worker source to local file
      pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/pdf.worker.min.mjs';

      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdfDocument = await loadingTask.promise;

      const textPages: string[] = [];

      // Extract text from each page
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ');
        textPages.push(pageText);
      }

      // Join pages without PAGE BREAK markers
      const fullText = textPages.join('\n\n');
      setRawText(fullText);
      const trimmedText = fullText.slice(200).trimStart();
      const displayText = trimmedText;
      setCleanedText(displayText);

      try {
        const result = parseTranscriptText(displayText);
        const validCourses = result.courses.filter(validateCourse);
        const sanitizedResult: ParseResult = {
          courses: validCourses,
          metadata: {
            ...result.metadata,
            coursesFound: validCourses.length,
            termsFound: result.metadata.termsFound
              .filter((term, index, arr) => arr.indexOf(term) === index)
              .sort(),
          },
        };

        setParseResult(sanitizedResult);

        if (sanitizedResult.courses.length === 0) {
          setParseError("No courses were detected in the uploaded transcript.");
        } else if (validCourses.length !== result.courses.length) {
          setParseError("Some rows could not be validated and were skipped.");
        }
      } catch (parseErr) {
        console.error("Transcript parsing failed:", parseErr);
        setParseResult(null);
        setParseError("We couldn't interpret the transcript contents. Please review the extracted text.");
      }

      setIsAiParsing(true);
      setAiParseError(null);
      try {
        const result = await parseTranscriptCoursesAction({
          transcriptText: displayText,
          userId: user?.id || null,
        });

        if (result.success && result.courses) {
          setAiCourses(result.courses);

          // Handle different result states
          if (result.courses.length === 0) {
            setAiParseError("The AI couldn't find any course entries in the transcript.");
          } else if (result.isPartial) {
            setAiParseError(
              `⚠️ Partial results shown (${result.courses.length} courses found). ` +
              `The transcript may contain more courses. Try uploading a shorter section if some are missing.`
            );
          }

          // Log database save status for debugging
          if (result.savedToDb === false) {
            console.warn('⚠️ Transcript parsing succeeded but failed to save to database');
          }
        } else {
          throw new Error(result.error || "Unknown error during AI parsing");
        }
      } catch (aiErr) {
        console.error("AI transcript parsing failed:", aiErr);
        setAiCourses([]);
        const errorMessage = aiErr instanceof Error ? aiErr.message : "We couldn't parse the course list automatically.";
        setAiParseError(`Failed to parse transcript: ${errorMessage}`);
      } finally {
        setIsAiParsing(false);
      }

      setStatus("extracted");
      onTextExtracted?.(fullText);
    } catch (err) {
      console.error('PDF extraction failed:', err);
      setError(err instanceof Error ? err.message : "Failed to extract text from PDF");
      setStatus("failed");
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileUpload(file);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="font-semibold text-lg mb-4 text-center">Upload Transcript</h3>

      {status === "idle" || status === "failed" ? (
        <>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all text-center"
          >
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm mb-1">Drag &amp; drop or click to upload your transcript PDF</p>
            <p className="text-xs text-muted-foreground">PDF only, max 10MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </>
      ) : (
        <div className="py-8">
          {status === "extracting" && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2" />
              <p className="text-blue-600">Extracting text from PDF...</p>
            </div>
          )}
          {status === "extracted" && cleanedText && (
            <div>
              <div className="text-center mb-4">
                <p className="text-primary font-semibold text-lg mb-2">Text extracted successfully!</p>
                <p className="text-sm text-muted-foreground">
                  {cleanedText.length} characters (cleaned) / {rawText?.length || 0} characters (raw)
                </p>
                <div className="flex gap-2 justify-center mt-3">
                  <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {showRaw ? "Show Cleaned Text" : "Show Raw Text"}
                  </button>
                  <span className="text-muted-foreground">|</span>
                  <button
                    onClick={() => {
                      setStatus("idle");
                      setRawText(null);
                      setCleanedText(null);
                      setFileName(null);
                      setShowRaw(false);
                      setParseResult(null);
                      setParseError(null);
                      setAiCourses([]);
                      setAiParseError(null);
                      setIsAiParsing(false);
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Upload another transcript
                  </button>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-lg bg-muted border border-border text-left max-h-96 overflow-y-auto">
                <p className="text-xs font-semibold mb-2 text-muted-foreground">
                  {showRaw ? "Raw Extracted Text:" : "Cleaned Text:"}
                </p>
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {showRaw ? rawText : cleanedText}
                </pre>
              </div>

              <div className="mt-6 text-left">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-muted-foreground">AI Parsed Courses</p>
                  {isAiParsing && (
                    <span className="text-xs text-blue-600 animate-pulse">Analyzing...</span>
                  )}
                </div>

                {aiParseError && (
                  <div className="mb-3 p-3 rounded-lg bg-amber-100 border border-amber-200 text-left">
                    <p className="text-sm font-semibold text-amber-900">AI parsing notice</p>
                    <p className="text-sm text-amber-800 mt-1">{aiParseError}</p>
                  </div>
                )}

                {!isAiParsing && aiCourses.length > 0 && (
                  <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {aiCourses.map((course, index) => (
                      <li
                        key={`${course.courseCode}-${course.title}-${index}`}
                        className="rounded-md border border-border/70 bg-muted/40 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold tracking-wide">
                            {course.courseCode}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">
                            {formatCredits(course.credits)} credit{course.credits === 1 ? "" : "s"}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-1">{course.title}</p>
                        {course.grade && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Grade:{" "}
                            <span className="font-medium text-foreground">{course.grade}</span>
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {!isAiParsing && aiCourses.length === 0 && !aiParseError && (
                  <p className="text-xs text-muted-foreground">
                    No courses detected yet. Confirm the transcript text looks correct above.
                  </p>
                )}
              </div>

              {parseResult && parseResult.courses.length > 0 && (
                <div className="mt-6 text-left">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-muted-foreground">
                      Parsed {parseResult.courses.length} course{parseResult.courses.length === 1 ? "" : "s"} across {orderedTerms.length} term{orderedTerms.length === 1 ? "" : "s"}.
                    </p>
                    {parseResult.metadata.unknownLines > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {parseResult.metadata.unknownLines} line{parseResult.metadata.unknownLines === 1 ? "" : "s"} could not be matched to a course.
                      </p>
                    )}
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                    {orderedTerms.map((term) => {
                      const coursesForTerm = coursesByTerm[term] ?? [];
                      if (coursesForTerm.length === 0) {
                        return null;
                      }

                      return (
                        <div key={term} className="rounded-lg border border-border bg-background/60 p-3 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-foreground">{term}</h4>
                            <span className="text-xs text-muted-foreground">
                              {coursesForTerm.length} course{coursesForTerm.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <ul className="space-y-2">
                            {coursesForTerm.map((course) => (
                              <li
                                key={`${term}-${course.subject}-${course.number}-${course.title}`}
                                className="rounded-md border border-border/70 bg-muted/40 p-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-sm font-semibold tracking-wide">
                                    {course.subject} {course.number}
                                  </span>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {formatCredits(course.credits)} credit{course.credits === 1 ? "" : "s"}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground mt-1">{course.title}</p>
                                {course.grade && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Grade:{" "}
                                    <span className="font-medium text-foreground">{course.grade}</span>
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-left">
          <p className="text-sm text-destructive font-semibold">Extraction failed</p>
          <p className="text-sm text-destructive/80 mt-1">{error}</p>
        </div>
      )}

      {fileName && (
        <p className="text-xs text-muted-foreground mt-2 text-center">{fileName}</p>
      )}
    </div>
  );
}
