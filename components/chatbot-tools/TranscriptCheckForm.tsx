'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Check, X } from 'lucide-react';
import TranscriptUpload from '@/components/transcript/TranscriptUpload';
import TranscriptReviewDisplay from './TranscriptReviewDisplay';
import { TranscriptCheckInput } from '@/lib/chatbot/tools/transcriptCheckTool';
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
}

export default function TranscriptCheckForm({
  hasCourses,
  onSubmit,
}: Readonly<TranscriptCheckFormProps>) {
  const { user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [parsedCourses, setParsedCourses] = useState<ParsedCourse[] | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

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
    setShowUpload(true);
  };

  const handleSkip = () => {
    onSubmit({
      hasTranscript: hasCourses,
      wantsToUpload: false,
      wantsToUpdate: false,
    });
  };

  const handleUpdateClick = () => {
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
    onSubmit({
      hasTranscript: true,
      wantsToUpload: true,
      wantsToUpdate: hasCourses,
    });
  };

  const handleCancelUpload = () => {
    setShowUpload(false);
  };

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
            variant="ghost"
            size="sm"
            onClick={handleCancelUpload}
            className="gap-2 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                onClick={handleUpdateClick}
                className="flex-1 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 gap-2"
              >
                <Upload size={18} />
                Update Transcript
              </Button>
              <Button
                variant="outline"
                onClick={handleSkip}
                className="flex-1 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Continue with Current
              </Button>
            </div>

            <button
              type="button"
              onClick={() => onSubmit({
                hasTranscript: false,
                wantsToUpload: false,
                wantsToUpdate: false,
              })}
              className="text-sm text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground underline-offset-4 hover:underline transition-colors text-center"
            >
              Continue without transcript
            </button>
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
                onClick={handleUploadClick}
                className="flex-1 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 gap-2"
              >
                <Upload size={18} />
                Upload Transcript
              </Button>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground underline-offset-4 hover:underline transition-colors text-center"
            >
              Continue without transcript
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
