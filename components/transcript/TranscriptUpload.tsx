"use client";

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

type UploadStatus = 'idle' | 'uploaded' | 'parsing' | 'parsed' | 'failed';

type Document = {
  id: string;
  status: UploadStatus;
};

interface TranscriptUploadProps {
  onUploadComplete?: (documentId: string) => void;
  onParseComplete?: (documentId: string) => void;
  onUploadSuccess?: () => void;
}

export default function TranscriptUpload({
  onUploadComplete,
  onParseComplete,
  onUploadSuccess,
}: TranscriptUploadProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll document status
  const pollDocumentStatus = useCallback(async (docId: string) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, status')
        .eq('id', docId)
        .single();

      if (error) {
        console.error('Polling error:', error);
        return;
      }

      if (data?.status === 'parsed') {
        setStatus('parsed');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        onParseComplete?.(docId);
      } else if (data?.status === 'failed') {
        setStatus('failed');
        setError('Parsing failed. Please try again.');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, [onParseComplete]);

  // Start polling
  const startPolling = useCallback((docId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(() => {
      pollDocumentStatus(docId);
    }, 3000); // Poll every 3 seconds

    // Initial poll
    pollDocumentStatus(docId);
  }, [pollDocumentStatus]);

  const handleFileUpload = async (file: File) => {
    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    // Validate file size (10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError('File size must be less than 10MB');
      return;
    }

    setError(null);
    setFileName(file.name);
    setStatus('uploaded');

    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/uploads/transcript', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setDocumentId(data.documentId);
      setStatus(data.status);

      onUploadComplete?.(data.documentId);
      onUploadSuccess?.();

      // Start polling if parsing
      if (data.status === 'parsing') {
        startPolling(data.documentId);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStatus('idle');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const resetUpload = () => {
    setStatus('idle');
    setError(null);
    setDocumentId(null);
    setFileName(null);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Drag & drop your transcript PDF here, or click to browse';
      case 'uploaded':
        return 'File uploaded successfully';
      case 'parsing':
        return 'Parsing transcript...';
      case 'parsed':
        return 'Transcript parsed successfully!';
      case 'failed':
        return 'Parsing failed';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'parsed':
        return 'text-primary';
      case 'failed':
        return 'text-destructive';
      case 'parsing':
        return 'text-blue-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="font-brand-bold text-lg mb-4">Upload Transcript</h3>

      {status === 'idle' || status === 'failed' ? (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={openFileDialog}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-200
              ${isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }
            `}
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
            <p className="font-body-medium text-sm mb-1">
              {getStatusText()}
            </p>
            <p className="font-body text-xs text-muted-foreground">
              PDF only, max 10MB
            </p>
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
        <div className="text-center py-8">
          {status === 'parsing' && (
            <div className="mb-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          {status === 'parsed' && (
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
          <p className={`font-body-medium text-sm mb-2 ${getStatusColor()}`}>
            {getStatusText()}
          </p>
          {fileName && (
            <p className="font-body text-xs text-muted-foreground mb-4">
              {fileName}
            </p>
          )}
          <button
            onClick={resetUpload}
            className="font-body-medium text-sm text-primary hover:text-hover-green transition-colors"
          >
            Upload another file
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="font-body text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
