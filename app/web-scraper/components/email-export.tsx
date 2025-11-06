'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Upload, Mail, Copy, Check } from 'lucide-react';
import { StuLoader } from '@/components/ui/StuLoader';

interface InstitutionRowData {
  name: string;
  registrar_email?: string | null;
  registrar_department_email?: string | null;
  provost_email?: string | null;
  provost_department_email?: string | null;
  main_office_email?: string | null;
  __uploadedFileContent?: string;
  __uploadedFile?: File;
  __pastedText?: string;
  [key: string]: unknown;
}

interface EmailExportProps {
  rows: InstitutionRowData[];
  onBack: () => void;
}

type ExportMode = 'emails-only' | 'name-email' | 'from-file' | 'paste-text' | null;

export function EmailExport({ rows, onBack }: EmailExportProps) {
  const [mode, setMode] = useState<ExportMode>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [rawExtractedEmails, setRawExtractedEmails] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'emails-only' | 'name-email' | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Check if we have uploaded file or pasted text from Step 1
  const hasUploadedFile = rows.length > 0 && rows[0].__uploadedFile;
  const hasPastedText = rows.length > 0 && rows[0].__pastedText;

  const handleExtractFromPastedText = useCallback(async (textContent: string) => {
    setLoading(true);
    setError(null);
    setMode('paste-text');
    setExportFormat(null);

    try {
      const response = await fetch('/api/web-scraper/extract-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'from-text',
          textContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as Record<string, unknown>;
        throw new Error((errorData.error as string) || 'Failed to clean emails');
      }

      const data = (await response.json()) as { result: string };
      setRawExtractedEmails(data.result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error extracting emails:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExtractFromUploadedFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setMode('from-file');
    setExportFormat(null);
    setUploadedFile(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/web-scraper/extract-emails', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json() as Record<string, unknown>;
        throw new Error((errorData.error as string) || 'Failed to extract emails');
      }

      const data = (await response.json()) as { result: string };
      setRawExtractedEmails(data.result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error extracting emails:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // If we have uploaded file or pasted text, automatically extract emails
  useEffect(() => {
    if (hasUploadedFile && !result) {
      const uploadedFile = rows[0].__uploadedFile;
      if (uploadedFile) {
        handleExtractFromUploadedFile(uploadedFile);
      }
    } else if (hasPastedText && !result) {
      const textContent = rows[0].__pastedText;
      if (textContent) {
        handleExtractFromPastedText(textContent);
      }
    }
  }, [hasUploadedFile, hasPastedText, rows, result, handleExtractFromUploadedFile, handleExtractFromPastedText]);

  const handleDownloadEmails = async (exportMode: 'emails-only' | 'name-email') => {
    setLoading(true);
    setError(null);
    setMode(exportMode);

    try {
      const response = await fetch('/api/web-scraper/extract-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: exportMode,
          rows,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as Record<string, unknown>;
        throw new Error((errorData.error as string) || 'Failed to extract emails');
      }

      const data = (await response.json()) as { result: string };
      setResult(data.result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error extracting emails:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setMode('from-file');
    setExportFormat(null);
    setUploadedFile(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/web-scraper/extract-emails', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json() as Record<string, unknown>;
        throw new Error((errorData.error as string) || 'Failed to extract emails');
      }

      const data = (await response.json()) as { result: string };
      setRawExtractedEmails(data.result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error processing file:', err);
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy to clipboard');
    }
  };

  const handleDownloadFile = () => {
    if (!result) return;

    const isNameEmail = mode === 'name-email';
    const fileName = isNameEmail
      ? `contacts-${new Date().toISOString().split('T')[0]}.csv`
      : `emails-${new Date().toISOString().split('T')[0]}.txt`;

    const blob = new Blob([result], {
      type: isNameEmail ? 'text/csv' : 'text/plain',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  const handlePastedText = async () => {
    if (!pastedText.trim()) {
      setError('Please paste some text');
      return;
    }

    setLoading(true);
    setError(null);
    setMode('paste-text');
    setExportFormat(null);
    setUploadedFile(null);

    try {
      const response = await fetch('/api/web-scraper/extract-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'from-text',
          textContent: pastedText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as Record<string, unknown>;
        throw new Error((errorData.error as string) || 'Failed to clean emails');
      }

      const data = (await response.json()) as { result: string };
      setRawExtractedEmails(data.result);
      setPastedText('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error processing text:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormatWithNames = async () => {
    setLoading(true);

    try {
      // If we have an uploaded file, send it to extract names paired with emails
      if (uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('format', 'name-email');

        const response = await fetch('/api/web-scraper/extract-emails-with-names', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json() as Record<string, unknown>;
          throw new Error((errorData.error as string) || 'Failed to extract names and emails');
        }

        const data = (await response.json()) as { result: string };
        setResult(data.result);
      } else {
        // For pasted text without file, create a CSV with emails and empty names
        const lines: string[] = ['Email,Name'];
        const emails = rawExtractedEmails.split(',').map(e => e.trim()).filter(e => e);

        for (const email of emails) {
          lines.push(`"${email}",""`);
        }

        setResult(lines.join('\n'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error formatting with names:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMode(null);
    setResult('');
    setError(null);
    setCopied(false);
    setPastedText('');
    setRawExtractedEmails('');
    setExportFormat(null);
  };

  // If we have raw extracted emails and no format chosen, show format selection
  if (rawExtractedEmails && !exportFormat && !result) {
    const emailCount = rawExtractedEmails.split(',').filter((e) => e.trim()).length;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Emails Extracted
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Found {emailCount} unique emails. Choose how you'd like to export them.
          </p>
        </div>

        {/* Export Format Options */}
        <div className="space-y-3">
          {/* Emails Only */}
          <button
            onClick={() => {
              setExportFormat('emails-only');
              setResult(rawExtractedEmails);
            }}
            className="w-full text-left p-5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/40 transition-colors hover:border-blue-400 group"
          >
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="flex-1">
                <h4 className="font-semibold text-[var(--foreground)] mb-1">Emails Only</h4>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Get a simple comma-separated list of all unique emails. Perfect for pasting into email clients or marketing software. All duplicate emails are already removed.
                </p>
              </div>
            </div>
          </button>

          {/* Emails with Names CSV */}
          <button
            onClick={() => {
              setExportFormat('name-email');
              handleFormatWithNames();
            }}
            disabled={loading}
            className="w-full text-left p-5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/40 transition-colors hover:border-green-400 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-green-600 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="flex-1">
                <h4 className="font-semibold text-[var(--foreground)] mb-1">Extract as CSV (Name & Email)</h4>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Create a 2-column CSV file. Column 1: Email, Column 2: Extracted from file. If a person has multiple emails, they appear multiple times.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Back Button */}
        <button
          onClick={() => {
            setRawExtractedEmails('');
            setExportFormat(null);
            setMode(null);
          }}
          className="w-full px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--foreground)] text-sm font-semibold hover:bg-[var(--muted)]/40 transition-colors"
        >
          ← Back
        </button>
      </div>
    );
  }

  // If we have a result, show the result view
  if (result) {
    const emailCount = mode === 'emails-only' || mode === 'paste-text' || mode === 'from-file'
      ? result.split(',').filter((e) => e.trim()).length
      : result.split('\n').filter((line) => line.trim() && !line.startsWith('Name')).length;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            {mode === 'paste-text' || mode === 'from-file' ? 'Ready to Export' : 'Extraction Complete'}
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            {mode === 'emails-only' && `Found ${emailCount} unique emails`}
            {mode === 'name-email' && `Extracted ${emailCount} contacts with names and emails`}
            {(mode === 'from-file' || mode === 'paste-text') && `Found ${emailCount} unique emails`}
          </p>
        </div>

        {/* Result Display */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
          <textarea
            readOnly
            value={result}
            className="w-full h-64 p-3 text-xs font-mono rounded bg-[var(--muted)]/30 border border-[var(--border)] text-[var(--foreground)] resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleCopyToClipboard}
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <button
            onClick={handleDownloadFile}
            className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download File
          </button>
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--foreground)] text-sm font-semibold hover:bg-[var(--muted)]/40 transition-colors"
          >
            Try Another
          </button>
        </div>
      </div>
    );
  }

  // If loading, show loading state
  if (loading) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="inline-block">
          <StuLoader speed={1.5} />
        </div>
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {mode === 'from-file' ? 'Processing file...' : mode === 'paste-text' ? 'Cleaning emails...' : 'Extracting emails...'}
        </p>
      </div>
    );
  }

  // Main mode selection view
  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-red-200/50 bg-red-50 px-5 py-4 text-sm">
          <div className="font-semibold text-red-900 mb-1">Error</div>
          <div className="text-red-700/80 text-xs leading-relaxed">{error}</div>
        </div>
      )}

      {/* Option 1: Download Emails Only */}
      <button
        onClick={() => handleDownloadEmails('emails-only')}
        disabled={loading}
        className="w-full text-left p-5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/40 transition-colors hover:border-blue-400 group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
          <div className="flex-1">
            <h4 className="font-semibold text-[var(--foreground)] mb-1">Emails Only</h4>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Download all unique emails separated by commas. Perfect for pasting into mass email marketing software or email clients.
            </p>
          </div>
        </div>
      </button>

      {/* Option 2: Download Name & Email CSV */}
      <button
        onClick={() => handleDownloadEmails('name-email')}
        disabled={loading}
        className="w-full text-left p-5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/40 transition-colors hover:border-green-400 group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-green-600 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
          <div className="flex-1">
            <h4 className="font-semibold text-[var(--foreground)] mb-1">Emails with Names (CSV)</h4>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Download a CSV file with Name in column 1 and Email in column 2. Includes department info (Registrar, Provost, Main Office) for better organization.
            </p>
          </div>
        </div>
      </button>

      {/* Option 3: Upload & Extract */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        className="w-left text-left p-5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/40 transition-colors hover:border-purple-400 group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-start gap-3">
          <Upload className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
          <div className="flex-1">
            <h4 className="font-semibold text-[var(--foreground)] mb-1">Upload Excel File</h4>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Upload the Excel file you just downloaded to extract and deduplicate all emails. Great for combining data from multiple exports.
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.txt"
          onChange={handleFileUpload}
          className="hidden"
          aria-label="Upload Excel file for email extraction"
        />
      </button>

      {/* Option 4: Paste Text */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-orange-600" />
            Paste Emails or Text
          </label>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste emails, text, or any content here. Emails will be extracted and cleaned automatically. Example: contact@example.com, user@test.org or person1@email.com person2@email.com"
            className="w-full p-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none h-24"
          />
          <p className="text-xs text-[var(--muted-foreground)] mt-2">
            Paste any text or list of emails. We'll extract valid emails, remove duplicates, and clean up any extra symbols.
          </p>
        </div>
        <button
          onClick={handlePastedText}
          disabled={!pastedText.trim() || loading}
          className="w-full px-5 py-2.5 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:bg-[var(--muted)] disabled:text-[var(--muted-foreground)] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Mail className="w-4 h-4" />
          Clean & Extract Emails
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-xs text-[var(--muted-foreground)]">Or</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      {/* Back Button */}
      <button
        onClick={onBack}
        className="w-full px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--foreground)] text-sm font-semibold hover:bg-[var(--muted)]/40 transition-colors"
      >
        ← Back to Results
      </button>
    </div>
  );
}
