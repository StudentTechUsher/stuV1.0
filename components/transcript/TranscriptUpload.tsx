"use client";

import { useState, useRef, useEffect } from "react";
import { StuLoader } from "@/components/ui/StuLoader";

type UploadStatus = "idle" | "extracting" | "extracted" | "failed";

interface TranscriptUploadProps {
  onTextExtracted?: (text: string) => void;
  onParsingComplete?: () => void | Promise<void>;
}

export default function TranscriptUpload({ onTextExtracted, onParsingComplete }: Readonly<TranscriptUploadProps>) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [aiParseError, setAiParseError] = useState<string | null>(null);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsingMessageIndex, setParsingMessageIndex] = useState(0);
  // PDF upload is currently disabled - defaulting to text paste mode
  const [uploadMode, setUploadMode] = useState<'pdf' | 'text'>('text');
  const [pastedText, setPastedText] = useState<string>('');

  const parsingMessages = [
    'Reading your transcript PDF...',
    'Analyzing course information with AI...',
    'Extracting course codes and titles...',
    'Processing grades and credits...',
    'Validating course patterns...',
    'Saving courses to your profile...',
  ];

  // Rotate parsing messages every 7 seconds
  useEffect(() => {
    if (status !== "extracting") return;

    const interval = setInterval(() => {
      setParsingMessageIndex((prev) => (prev + 1) % parsingMessages.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [status, parsingMessages.length]);

  const handleFileUpload = async (file: File) => {
    setStatus("extracting");
    setError(null);
    setFileName(file.name);
    setSuccessMessage(null);
    setAiParseError(null);
    setIsAiParsing(true); // Start as parsing immediately

    try {
      // Store the PDF file locally as a data URL for viewing later
      const reader = new FileReader();
      const pdfDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Store PDF URL in sessionStorage for this session
      sessionStorage.setItem('transcript_pdf_url', pdfDataUrl);

      // Send PDF directly to the new BYU parser API
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/transcript/parse', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.report) {
        const report = result.report;

        // Show success - courses were parsed and saved
        if (report.courses_found > 0) {
          setAiParseError(null);

          // Create a summary message
          let summaryMessage = `✅ Successfully parsed ${report.courses_found} course${report.courses_found !== 1 ? 's' : ''} from ${report.terms_detected?.length || 0} semester${report.terms_detected?.length !== 1 ? 's' : ''}.`;

          if (report.used_byu_parser) {
            summaryMessage += ' (BYU-specific parser)';
          }

          // Check for validation issues
          if (report.validation_report && report.validation_report.invalidCourses > 0) {
            summaryMessage += `\n\n⚠️ ${report.validation_report.invalidCourses} course${report.validation_report.invalidCourses !== 1 ? 's' : ''} failed validation and were excluded.`;
          }

          setSuccessMessage(summaryMessage);

          // Call completion callback
          await onParsingComplete?.();
        } else {
          setAiParseError("No courses were detected in the uploaded transcript.");
        }

        setStatus("extracted");
      } else {
        throw new Error(result.error || "Parsing failed");
      }
    } catch (err) {
      console.error('Transcript parsing failed:', err);
      const errorMessage = err instanceof Error ? err.message : "Failed to parse transcript";
      setError(errorMessage);
      setAiParseError(`Failed to parse transcript: ${errorMessage}`);
      setStatus("failed");
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileUpload(file);
    }
  };

  const handleTextPaste = async () => {
    if (!pastedText || pastedText.trim().length < 100) {
      setError('Please paste at least 100 characters of transcript text');
      return;
    }

    setStatus("extracting");
    setError(null);
    setFileName('Pasted Text');
    setSuccessMessage(null);
    setAiParseError(null);
    setIsAiParsing(true);

    try {
      // Send text directly to the API
      const response = await fetch('/api/transcript/parse?mode=text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: pastedText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.report) {
        const report = result.report;

        if (report.courses_found > 0) {
          setAiParseError(null);

          let summaryMessage = `✅ Successfully parsed ${report.courses_found} course${report.courses_found !== 1 ? 's' : ''} from ${report.terms_detected?.length || 0} semester${report.terms_detected?.length !== 1 ? 's' : ''}.`;

          if (report.used_byu_parser) {
            summaryMessage += ' (BYU-specific parser)';
          }

          if (report.validation_report && report.validation_report.invalidCourses > 0) {
            summaryMessage += `\n\n⚠️ ${report.validation_report.invalidCourses} course${report.validation_report.invalidCourses !== 1 ? 's' : ''} failed validation and were excluded.`;
          }

          setSuccessMessage(summaryMessage);
          await onParsingComplete?.();
        } else {
          setAiParseError("No courses were detected in the pasted text.");
        }

        setStatus("extracted");
      } else {
        throw new Error(result.error || "Parsing failed");
      }
    } catch (err) {
      console.error('Transcript parsing failed:', err);
      const errorMessage = err instanceof Error ? err.message : "Failed to parse transcript";
      setError(errorMessage);
      setAiParseError(`Failed to parse transcript: ${errorMessage}`);
      setStatus("failed");
    } finally {
      setIsAiParsing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="font-semibold text-lg mb-4 text-center">Upload Transcript</h3>

      {status === "idle" || status === "failed" ? (
        <>
          {/* Mode Toggle - PDF upload temporarily disabled */}
          {/* <div className="flex gap-2 mb-4 justify-center">
            <button
              onClick={() => setUploadMode('pdf')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                uploadMode === 'pdf'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Upload PDF
            </button>
            <button
              onClick={() => setUploadMode('text')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                uploadMode === 'text'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Paste Text
            </button>
          </div> */}

          {/* PDF upload mode - temporarily disabled
          {uploadMode === 'pdf' ? (
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
          ) : ( */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Copy relevant text from your transcript and paste it below
              </p>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your transcript text here..."
                className="w-full h-64 p-4 rounded-lg border border-border bg-background text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleTextPaste}
                disabled={!pastedText || pastedText.trim().length < 100}
                className="w-full py-3 px-4 rounded-lg bg-primary text-zinc-900 font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Parse Transcript
              </button>
            </div>
          {/* )} */}
        </>
      ) : (
        <div className="py-8">
          {status === "extracting" && (
            <div className="flex items-center justify-center">
              <StuLoader
                variant="card"
                text={parsingMessages[parsingMessageIndex]}
                speed={2.5}
              />
            </div>
          )}
          {status === "extracted" && (
            <div>
              <div className="text-center mb-4">
                <p className="text-primary font-semibold text-lg mb-2">✅ Transcript parsed successfully!</p>
                {successMessage && (
                  <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200 text-left">
                    <pre className="text-sm text-green-900 whitespace-pre-wrap font-sans">
                      {successMessage}
                    </pre>
                  </div>
                )}
                <div className="flex gap-2 justify-center mt-4">
                  <button
                    onClick={() => {
                      setStatus("idle");
                      setFileName(null);
                      setSuccessMessage(null);
                      setAiParseError(null);
                      setIsAiParsing(false);
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Upload another transcript
                  </button>
                </div>
              </div>

              {aiParseError && (
                <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-left">
                  <p className="text-sm font-semibold text-amber-900">⚠️ Parsing Notice</p>
                  <p className="text-sm text-amber-800 mt-1 whitespace-pre-wrap">{aiParseError}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-left">
          <p className="text-sm text-destructive font-semibold">Parsing failed</p>
          <p className="text-sm text-destructive/80 mt-1">{error}</p>
          {/* PDF upload mode suggestion - disabled since PDF mode is not available
          {uploadMode === 'pdf' && (
            <div className="mt-3 pt-3 border-t border-destructive/20">
              <p className="text-sm text-destructive/90 font-medium mb-2">💡 Try an alternative method:</p>
              <button
                onClick={() => {
                  setUploadMode('text');
                  setError(null);
                  setStatus('idle');
                }}
                className="text-sm text-black hover:underline font-medium"
              >
                Switch to "Paste Text" option →
              </button>
              <p className="text-xs text-destructive/70 mt-1">
                Copy text directly from your PDF and paste it instead of uploading the file.
              </p>
            </div>
          )} */}
        </div>
      )}

      {fileName && (
        <p className="text-xs text-muted-foreground mt-2 text-center">{fileName}</p>
      )}
    </div>
  );
}
