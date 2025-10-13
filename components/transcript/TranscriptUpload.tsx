"use client";

import { useState, useRef } from "react";

type UploadStatus = "idle" | "uploading" | "parsing" | "parsed" | "failed";

export interface ParseTranscriptReport {
  courses_found?: number;
  courses_upserted?: number;
  confidence_stats?: {
    low_confidence_count?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface TranscriptUploadProps {
  onUploadSuccess?: (report: ParseTranscriptReport) => void;
}

export default function TranscriptUpload({ onUploadSuccess }: TranscriptUploadProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseReport, setParseReport] = useState<ParseTranscriptReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setStatus("uploading");
    setError(null);
    setParseErrors([]);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setStatus("parsing");

      const response = await fetch("/api/transcript/parse", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      const reportedErrors = Array.isArray(result?.report?.errors) ? result.report.errors : [];

      if (response.ok && result?.report) {
        setStatus("parsed");
        setParseReport(result.report);
        onUploadSuccess?.(result.report);
        setParseErrors([]);
      } else {
        const message =
          result?.error ||
          result?.details ||
          (reportedErrors.length ? reportedErrors.join("; ") : "Parsing failed. Check logs for details.");

        setError(message);
        setParseErrors(reportedErrors);
        setParseReport(result?.report ?? null);
        setStatus("failed");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unexpected error");
      setParseErrors([]);
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
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-center">
      <h3 className="font-semibold text-lg mb-4">Upload Transcript</h3>

      {status === "idle" || status === "failed" ? (
        <>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
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
          {status === "uploading" && <p className="text-blue-600">Uploading your file…</p>}
          {status === "parsing" && (
            <>
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2" />
              <p className="text-blue-600">Parsing your transcript…</p>
            </>
          )}
          {status === "parsed" && parseReport && (
            <div className="text-center">
              <p className="text-primary font-semibold text-lg mb-2">Transcript parsed successfully!</p>
              <p className="text-sm text-muted-foreground">
                {parseReport.courses_found || parseReport.courses_upserted} courses added
              </p>
              {(parseReport.confidence_stats?.low_confidence_count ?? 0) > 0 && (
                <p className="text-sm text-orange-600 mt-1">
                  {parseReport.confidence_stats?.low_confidence_count ?? 0} courses need review
                </p>
              )}
              <button
                onClick={() => {
                  setStatus("idle");
                  setParseReport(null);
                  setFileName(null);
                }}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Upload another transcript
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-left">
          <p className="text-sm text-destructive font-semibold">Parsing failed</p>
          <p className="text-sm text-destructive/80 mt-1">{error}</p>
          {parseErrors.length > 0 && (
            <ul className="list-disc list-inside text-xs text-destructive/70 mt-2 space-y-1">
              {parseErrors.map((errMsg, index) => (
                <li key={index}>{errMsg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {fileName && (
        <p className="text-xs text-muted-foreground mt-2">{fileName}</p>
      )}
    </div>
  );
}
