'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Check, X } from 'lucide-react';
import TranscriptUpload from '@/components/transcript/TranscriptUpload';
import TranscriptReviewDisplay from './TranscriptReviewDisplay';
import { TranscriptCheckInput } from '@/lib/chatbot/tools/transcriptCheckTool';
import type { AcademicTermsConfig } from '@/lib/services/gradPlanGenerationService';
import { useAuth } from '@/hooks/useAuth';
import { fetchUserCoursesAction, fetchUserCoursesMetadataAction } from '@/lib/services/server-actions';

interface TransferCreditInfo {
  institution: string;
  originalSubject: string;
  originalNumber: string;
  originalTitle: string;
  originalCredits: number;
  originalGrade: string;
}

interface ParsedCourse {
  courseCode: string;
  title: string;
  credits: number;
  grade: string | null;
  term?: string | null;
  section?: string | null;
  professor?: string | null;
  origin?: 'parsed' | 'manual' | 'transfer';
  transfer?: TransferCreditInfo;
}

interface TranscriptCheckFormProps {
  hasCourses: boolean;
  onSubmit: (data: TranscriptCheckInput) => void;
  academicTerms?: AcademicTermsConfig;
}

export default function TranscriptCheckForm({
  hasCourses,
  onSubmit,
  academicTerms,
}: Readonly<TranscriptCheckFormProps>) {
  const { user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [parsedCourses, setParsedCourses] = useState<ParsedCourse[] | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showStartTermPrompt, setShowStartTermPrompt] = useState(false);
  const [startTerm, setStartTerm] = useState('');
  const [startYear, setStartYear] = useState('');
  const [startTermError, setStartTermError] = useState<string | null>(null);

  const termOptions = useMemo(() => {
    const fallbackTerms = ['Fall', 'Winter', 'Spring', 'Summer'];
    if (!academicTerms) {
      return fallbackTerms.map(term => ({
        id: term.toLowerCase(),
        label: term,
      }));
    }

    const allTerms = [...academicTerms.terms.primary, ...academicTerms.terms.secondary];
    const ordering = academicTerms.ordering && academicTerms.ordering.length > 0
      ? academicTerms.ordering
      : allTerms.map(term => term.id);

    const options = ordering.map(termId => {
      const match = allTerms.find(term =>
        term.id.toLowerCase() === termId.toLowerCase() ||
        term.label.toLowerCase() === termId.toLowerCase()
      );
      const label = match?.label || termId.charAt(0).toUpperCase() + termId.slice(1);
      return {
        id: match?.id || termId,
        label,
      };
    });

    const seen = new Set<string>();
    return options.filter(option => {
      const key = option.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [academicTerms]);

  const defaultStartTerm = useMemo(() => {
    if (!termOptions.length) return '';
    const preferred = academicTerms?.academic_year_start;
    if (preferred) {
      const match = termOptions.find(option =>
        option.id.toLowerCase() === preferred.toLowerCase() ||
        option.label.toLowerCase() === preferred.toLowerCase()
      );
      if (match) return match.label;
    }
    return termOptions[0].label;
  }, [academicTerms, termOptions]);

  useEffect(() => {
    if (!showStartTermPrompt) return;
    if (!startTerm && defaultStartTerm) {
      setStartTerm(defaultStartTerm);
    }
    if (!startYear) {
      setStartYear(String(new Date().getFullYear()));
    }
  }, [showStartTermPrompt, startTerm, startYear, defaultStartTerm]);

  // Fetch last updated date when component mounts if user has courses
  useEffect(() => {
    if (hasCourses && user?.id) {
      fetchUserCoursesMetadataAction(user.id)
        .then(result => {
          if (result.success && result.hasData && result.lastUpdated) {
            setLastUpdated(result.lastUpdated);
          }
        })
        .catch(error => {
          console.error('Error fetching courses metadata:', error);
        });
    }
  }, [hasCourses, user?.id]);

  const handleUploadClick = () => {
    setShowStartTermPrompt(false);
    setStartTermError(null);
    setShowUpload(true);
  };

  const handleSkip = () => {
    setShowStartTermPrompt(false);
    setStartTermError(null);
    onSubmit({
      hasTranscript: hasCourses,
      wantsToUpload: false,
      wantsToUpdate: false,
    });
  };

  const handleUpdateClick = () => {
    setShowStartTermPrompt(false);
    setStartTermError(null);
    setShowUpload(true);
  };

  const handleUploadComplete = async () => {
    setHasUploaded(true);
    setShowUpload(false);

    // Fetch the uploaded courses from database
    if (user?.id) {
      setIsLoadingCourses(true);
      try {
        const result = await fetchUserCoursesAction(user.id);
        if (result.success && result.courses && result.courses.length > 0) {
          // Transform to ParsedCourse format
          const courses: ParsedCourse[] = result.courses.map(c => ({
            courseCode: c.code,
            title: c.title,
            credits: c.credits,
            grade: c.grade,
            term: c.term,
            section: null, // Not stored in user_courses
            professor: null, // Not stored in user_courses
            origin: c.origin,
            transfer: c.transfer,
          }));

          setParsedCourses(courses);
          setShowReview(true);
        } else {
          // No courses found - just continue
          onSubmit({
            hasTranscript: true,
            wantsToUpload: true,
            wantsToUpdate: hasCourses,
          });
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        // Continue anyway
        onSubmit({
          hasTranscript: true,
          wantsToUpload: true,
          wantsToUpdate: hasCourses,
        });
      } finally {
        setIsLoadingCourses(false);
      }
    } else {
      // No user - just continue
      onSubmit({
        hasTranscript: true,
        wantsToUpload: true,
        wantsToUpdate: hasCourses,
      });
    }
  };

  const handleReviewConfirm = () => {
    setShowReview(false);
    setShowStartTermPrompt(false);
    setStartTermError(null);
    onSubmit({
      hasTranscript: true,
      wantsToUpload: true,
      wantsToUpdate: hasCourses,
    });
  };

  const handleCancelUpload = () => {
    setShowUpload(false);
  };

  const handleContinueWithoutTranscript = () => {
    setShowStartTermPrompt(true);
    setStartTermError(null);
  };

  const handleStartTermBack = () => {
    setShowStartTermPrompt(false);
    setStartTermError(null);
  };

  const handleStartTermSubmit = () => {
    const parsedYear = Number.parseInt(startYear, 10);
    if (!startTerm || Number.isNaN(parsedYear)) {
      setStartTermError('Please select a start term and year to continue.');
      return;
    }
    onSubmit({
      hasTranscript: false,
      wantsToUpload: false,
      wantsToUpdate: false,
      startTerm,
      startYear: parsedYear,
    });
  };

  const parsedStartYear = Number.parseInt(startYear, 10);
  const isStartSelectionValid = !!startTerm && !Number.isNaN(parsedStartYear);

  // If loading courses after upload
  if (isLoadingCourses) {
    return (
      <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading your courses...</p>
          </div>
        </div>
      </div>
    );
  }

  // If showing review display
  if (showReview && parsedCourses) {
    return (
      <TranscriptReviewDisplay
        courses={parsedCourses}
        onConfirm={handleReviewConfirm}
      />
    );
  }

  // If showing upload interface
  if (showUpload) {
    return (
      <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Upload Transcript</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCancelUpload}
            className="gap-2"
          >
            <X size={16} />
            Cancel
          </Button>
        </div>

        <TranscriptUpload onParsingComplete={handleUploadComplete} />
      </div>
    );
  }

  // If user has uploaded in this session
  if (hasUploaded) {
    return (
      <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
        <div className="flex items-center gap-3 text-green-600">
          <Check size={24} />
          <div>
            <h3 className="text-lg font-semibold">Transcript Uploaded Successfully!</h3>
            <p className="text-sm text-muted-foreground">
              Your courses have been processed and saved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main options screen
  return (
    <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Transcript Status</h3>
        <p className="text-sm text-muted-foreground">
          {hasCourses
            ? 'You have courses on file. Would you like to update your transcript with any new courses?'
            : "I don't see any courses on file yet. Uploading your transcript will help create a more accurate graduation plan."}
        </p>
      </div>

      {hasCourses ? (
        // User has courses - show current status and update option
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg flex items-start gap-3">
            <FileText size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Transcript on File</p>
              <p className="text-xs text-muted-foreground">
                Your courses have been uploaded and processed
              </p>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated: {new Date(lastUpdated).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={handleUpdateClick}
                className="flex-1 gap-2"
              >
                <Upload size={18} />
                Update Transcript
              </Button>
              <Button
                variant="secondary"
                onClick={handleSkip}
                className="flex-1"
              >
                Continue with Current
              </Button>
            </div>

            {showStartTermPrompt ? (
              <div className="rounded-lg border border-[var(--border)] bg-white p-4">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Where should we start your plan?
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Choose the first term you want to plan for.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                      Start Term
                    </label>
                    <select
                      value={startTerm}
                      onChange={(e) => {
                        setStartTerm(e.target.value);
                        setStartTermError(null);
                      }}
                      className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    >
                      <option value="" disabled>Select term</option>
                      {termOptions.map(option => (
                        <option key={option.id} value={option.label}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                      Start Year
                    </label>
                    <input
                      type="number"
                      value={startYear}
                      onChange={(e) => {
                        setStartYear(e.target.value);
                        setStartTermError(null);
                      }}
                      min={new Date().getFullYear() - 1}
                      max={new Date().getFullYear() + 10}
                      className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    />
                  </div>
                </div>
                {startTermError && (
                  <p className="mt-2 text-xs text-red-600">{startTermError}</p>
                )}
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={handleStartTermBack}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleStartTermSubmit}
                    disabled={!isStartSelectionValid}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleContinueWithoutTranscript}
                className="text-sm text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground underline-offset-4 hover:underline transition-colors text-center"
              >
                Continue without transcript
              </button>
            )}
          </div>
        </div>
      ) : (
        // User has no courses - show upload option
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Uploading your transcript allows me to:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                See which courses you've already completed
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                Avoid recommending courses you've taken
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                Create a more accurate graduation timeline
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={handleUploadClick}
                className="flex-1 gap-2"
              >
                <Upload size={18} />
                Upload Transcript
              </Button>
            </div>

            {showStartTermPrompt ? (
              <div className="rounded-lg border border-[var(--border)] bg-white p-4">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Where should we start your plan?
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Choose the first term you want to plan for.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                      Start Term
                    </label>
                    <select
                      value={startTerm}
                      onChange={(e) => {
                        setStartTerm(e.target.value);
                        setStartTermError(null);
                      }}
                      className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    >
                      <option value="" disabled>Select term</option>
                      {termOptions.map(option => (
                        <option key={option.id} value={option.label}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                      Start Year
                    </label>
                    <input
                      type="number"
                      value={startYear}
                      onChange={(e) => {
                        setStartYear(e.target.value);
                        setStartTermError(null);
                      }}
                      min={new Date().getFullYear() - 1}
                      max={new Date().getFullYear() + 10}
                      className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    />
                  </div>
                </div>
                {startTermError && (
                  <p className="mt-2 text-xs text-red-600">{startTermError}</p>
                )}
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={handleStartTermBack}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleStartTermSubmit}
                    disabled={!isStartSelectionValid}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleContinueWithoutTranscript}
                className="text-sm text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground underline-offset-4 hover:underline transition-colors text-center"
              >
                Continue without transcript
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
