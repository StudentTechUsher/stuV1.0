"use client";

import { useState, useRef } from "react";
import { Linkedin, Upload, CheckCircle2, X, FileText } from "lucide-react";
import { StuLoader } from "@/components/ui/StuLoader";

type UploadStatus = "idle" | "uploading" | "success" | "failed";

interface LinkedInShareButtonProps {
  studentId: string;
  onUploadSuccess?: (fileUrl: string) => void;
  existingProfileUrl?: string | null;
}

export default function LinkedInShareButton({
  studentId,
  onUploadSuccess,
  existingProfileUrl
}: LinkedInShareButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(existingProfileUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    setShowModal(true);
  };

  const handleGoToLinkedIn = () => {
    // Open LinkedIn profile in new tab
    window.open('https://www.linkedin.com/in/me/', '_blank');
  };

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB');
      return;
    }

    setStatus("uploading");
    setError(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("studentId", studentId);

      const response = await fetch("/api/profile/linkedin-upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result?.fileUrl) {
        setStatus("success");
        setUploadedUrl(result.fileUrl);
        onUploadSuccess?.(result.fileUrl);
      } else {
        const message = result?.error || "Upload failed. Please try again.";
        setError(message);
        setStatus("failed");
      }
    } catch (err) {
      console.error('LinkedIn PDF upload error:', err);
      setError(err instanceof Error ? err.message : "Unexpected error");
      setStatus("failed");
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileUpload(file);
    }
  };

  const resetUpload = () => {
    setStatus("idle");
    setError(null);
    setFileName(null);
  };

  return (
    <>
      {/* Main Button */}
      <button
        onClick={handleButtonClick}
        className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-body-semi text-sm text-[#0A0A0A] shadow-sm transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--primary)_90%,black)] hover:shadow-md"
      >
        <Linkedin size={16} className="flex-shrink-0" />
        <span>Share LinkedIn Profile</span>
      </button>

      {/* Modal Overlay */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-xl">
            {/* Modal Header - Black with rounded top */}
            <div className="border-b-2 border-[#0A0A0A] bg-[#0A0A0A] px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]">
                    <Linkedin size={20} className="text-[#0A0A0A]" />
                  </div>
                  <h2 className="truncate font-header-bold text-lg text-white sm:text-xl">
                    Share LinkedIn Profile
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-shrink-0 rounded-lg p-2 text-white transition-all hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Instructions */}
              <div className="mb-6 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4">
                <h3 className="font-body-semi text-sm text-[var(--foreground)]">
                  How to export your LinkedIn profile as PDF:
                </h3>
                <ol className="space-y-2.5 font-body text-sm text-[var(--muted-foreground)]">
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] font-body-semi text-xs text-[#0A0A0A]">
                      1
                    </span>
                    <span>Click the button below to open your LinkedIn profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] font-body-semi text-xs text-[#0A0A0A]">
                      2
                    </span>
                    <span>Click <strong>"Resources"</strong> on your LinkedIn profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] font-body-semi text-xs text-[#0A0A0A]">
                      3
                    </span>
                    <span>Click <strong>"Save to PDF"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] font-body-semi text-xs text-[#0A0A0A]">
                      4
                    </span>
                    <span>The PDF will download to your device</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] font-body-semi text-xs text-[#0A0A0A]">
                      5
                    </span>
                    <span>Upload the downloaded PDF below - Stu will automatically process it</span>
                  </li>
                </ol>

                {/* Go to LinkedIn Button */}
                <button
                  onClick={handleGoToLinkedIn}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0077B5] px-4 py-3 font-body-semi text-sm text-white shadow-sm transition-all duration-200 hover:bg-[#006399] hover:shadow-md"
                >
                  <Linkedin size={18} />
                  <span>Go to My LinkedIn Profile</span>
                </button>
              </div>

              {/* Upload Area */}
              {status === "idle" || status === "failed" ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-[var(--border)] bg-white p-8 text-center transition-all hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_3%,white)]"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--muted)]">
                    <Upload size={32} className="text-[var(--muted-foreground)]" />
                  </div>
                  <p className="font-body-semi text-sm text-[var(--foreground)]">
                    Drag & drop or click to upload your LinkedIn PDF
                  </p>
                  <p className="mt-2 font-body text-xs text-[var(--muted-foreground)]">
                    PDF only, max 10MB
                  </p>
                </div>
              ) : status === "uploading" ? (
                <div className="rounded-xl border border-[var(--border)] bg-white p-8 text-center">
                  <StuLoader variant="inline" text="Uploading your LinkedIn profile..." />
                </div>
              ) : status === "success" ? (
                <div className="rounded-xl border border-[color-mix(in_srgb,var(--primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--primary)_5%,white)] p-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)]">
                    <CheckCircle2 size={32} className="text-[#0A0A0A]" />
                  </div>
                  <h3 className="font-header-bold text-lg text-[var(--foreground)]">
                    LinkedIn Profile Uploaded Successfully!
                  </h3>
                  <p className="mt-2 font-body text-sm text-[var(--muted-foreground)]">
                    Your profile has been saved and is ready for analysis
                  </p>
                  {uploadedUrl && (
                    <a
                      href={uploadedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-4 py-2 font-body-semi text-sm text-[var(--foreground)] transition-all hover:bg-[var(--muted)]"
                    >
                      <FileText size={16} />
                      View Uploaded Profile
                    </a>
                  )}
                  <button
                    onClick={resetUpload}
                    className="mt-4 block w-full rounded-lg bg-[var(--primary)] px-4 py-2 font-body-semi text-sm text-[#0A0A0A] transition-all hover:bg-[color-mix(in_srgb,var(--primary)_90%,black)]"
                  >
                    Upload Another Profile
                  </button>
                </div>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Error Display */}
              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="font-body-semi text-sm text-red-800">Upload failed</p>
                  <p className="mt-1 font-body text-sm text-red-600">{error}</p>
                  <button
                    onClick={resetUpload}
                    className="mt-3 font-body-semi text-sm text-red-600 underline hover:text-red-800"
                  >
                    Try again
                  </button>
                </div>
              )}

              {fileName && status !== "success" && (
                <p className="mt-3 font-body text-xs text-[var(--muted-foreground)]">
                  {fileName}
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[var(--border)] px-6 py-4">
              <button
                onClick={() => setShowModal(false)}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-4 py-2 font-body-semi text-sm text-[var(--foreground)] transition-all hover:bg-[var(--muted)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
