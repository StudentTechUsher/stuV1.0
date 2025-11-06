'use client';

import { useState, useEffect, useRef } from 'react';
import { StuLoader } from '@/components/ui/StuLoader';
import { X, Plus, Download, Zap } from 'lucide-react';

interface InstitutionRow {
  name: string;
  website: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  category: string;
  stu_fit_score: number;
  classification_confidence: number;
  registrar_name: string | null;
  registrar_email: string | null;
  registrar_department_email: string | null;
  provost_name: string | null;
  provost_email: string | null;
  provost_department_email: string | null;
  main_office_email: string | null;
  main_office_phone: string | null;
  source_urls: string[];
  notes: string | null;
}

// Helper function to get category color and styling
function getCategoryColor(category: string): { bg: string; text: string; badge: string; gradient: string } {
  const categoryMap: Record<string, { bg: string; text: string; badge: string; gradient: string }> = {
    'Community College/Junior College': {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      gradient: 'from-emerald-400 to-teal-500'
    },
    'Mid-Tier State University': {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
      gradient: 'from-blue-400 to-cyan-500'
    },
    'Large Private/Public University': {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      badge: 'bg-purple-100 text-purple-700 border-purple-200',
      gradient: 'from-purple-400 to-pink-500'
    },
    'Small Private Non-Profits': {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      gradient: 'from-amber-400 to-orange-500'
    },
    'Elite Private University': {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      badge: 'bg-rose-100 text-rose-700 border-rose-200',
      gradient: 'from-rose-400 to-pink-500'
    },
    'For-Profit/Technical College': {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      badge: 'bg-gray-100 text-gray-700 border-gray-200',
      gradient: 'from-gray-400 to-slate-500'
    }
  };
  return categoryMap[category] || categoryMap['Small Private Non-Profits'];
}

// Helper function to get score color based on value
function getScoreColor(score: number): { text: string; bg: string; gradient: string; bar: string } {
  if (score >= 80) {
    return {
      text: 'text-green-700',
      bg: 'bg-green-50',
      gradient: 'from-green-400 to-emerald-500',
      bar: 'from-green-500 to-emerald-600'
    };
  }
  if (score >= 60) {
    return {
      text: 'text-blue-700',
      bg: 'bg-blue-50',
      gradient: 'from-blue-400 to-cyan-500',
      bar: 'from-blue-500 to-cyan-600'
    };
  }
  if (score >= 40) {
    return {
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      gradient: 'from-amber-400 to-orange-500',
      bar: 'from-amber-500 to-orange-600'
    };
  }
  if (score >= 20) {
    return {
      text: 'text-orange-700',
      bg: 'bg-orange-50',
      gradient: 'from-orange-400 to-red-500',
      bar: 'from-orange-500 to-red-600'
    };
  }
  return {
    text: 'text-gray-700',
    bg: 'bg-gray-50',
    gradient: 'from-gray-400 to-slate-500',
    bar: 'from-gray-500 to-slate-600'
  };
}

export default function WebScraperClient() {
  const [step, setStep] = useState<'input' | 'school-lookup' | 'contact-discovery'>('input');
  const [url, setUrl] = useState('');
  const [urls, setUrls] = useState<string[]>([]);
  const [rows, setRows] = useState<InstitutionRow[]>([]);
  const [scraping, setScraping] = useState(false);
  const [contactDiscoveryRunning, setContactDiscoveryRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [_sessionId, setSessionId] = useState<string | null>(null);
  const [contactProgress, setContactProgress] = useState<{
    total: number;
    processed: number;
    elapsedSeconds: number;
    estimatedTimeRemaining: number;
    estimatedCreditsUsed: string;
    currentInstitution: string;
    withRegistrar: number;
    withProvost: number;
    withBoth: number;
  } | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scraping && !contactDiscoveryRunning) return;

    const timer = setInterval(() => {
      if (startTime) {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [scraping, contactDiscoveryRunning, startTime]);

  const handleAddUrl = () => {
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }
    if (urls.includes(url)) {
      setError('This URL is already added');
      return;
    }
    setUrls([...urls, url]);
    setUrl('');
    setError(null);
  };

  const handleRemoveUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const handleStartScraping = async () => {
    if (urls.length === 0) {
      setError('Please add at least one URL');
      return;
    }

    setScraping(true);
    setError(null);
    setStartTime(Date.now());
    setElapsedTime(0);
    setProgressMessage('Starting school lookup...');
    setStep('school-lookup');

    try {
      setProgressMessage('Scraping institutions from URLs...');
      const response = await fetch('/api/web-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedUrls: urls }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scrape institutions');
      }

      const data = (await response.json()) as {
        rows: InstitutionRow[];
        summary: string;
      };

      if (data.rows.length === 0) {
        setError('No schools found on the provided URLs');
        setScraping(false);
        return;
      }

      setRows(data.rows);
      setScraping(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error scraping:', err);
    } finally {
      setScraping(false);
    }
  };

  const handleStartContactDiscovery = async () => {
    setContactDiscoveryRunning(true);
    setError(null);
    setStartTime(Date.now());
    setElapsedTime(0);
    setStep('contact-discovery');
    setProgressMessage('Initializing contact discovery...');

    try {
      // Generate session ID
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);

      // Sort rows by fit score (highest first) so best schools are processed first
      const sortedRows = [...rows].sort((a, b) => b.stu_fit_score - a.stu_fit_score);

      // Start contact discovery in background
      const initResponse = await fetch('/api/web-scraper-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: sortedRows,
          sessionId: newSessionId,
        }),
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json() as Record<string, unknown>;
        throw new Error((errorData.error as string) || 'Failed to start contact discovery');
      }

      // Poll for progress updates
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`/api/web-scraper-contacts?sessionId=${newSessionId}`);
          if (!progressResponse.ok) {
            clearInterval(pollInterval);
            return;
          }

          const progress = (await progressResponse.json()) as Record<string, unknown>;
          setContactProgress({
            total: (progress.total as number) || 0,
            processed: (progress.processed as number) || 0,
            elapsedSeconds: (progress.elapsedSeconds as number) || 0,
            estimatedTimeRemaining: (progress.estimatedTimeRemaining as number) || 0,
            estimatedCreditsUsed: (progress.estimatedCreditsUsed as string) || '0.0000',
            currentInstitution: (progress.currentInstitution as string) || '',
            withRegistrar: (progress.withRegistrar as number) || 0,
            withProvost: (progress.withProvost as number) || 0,
            withBoth: (progress.withBoth as number) || 0,
          });

          // Update progress message
          const processed = progress.processed as number;
          const total = progress.total as number;
          const current = progress.currentInstitution as string;
          setProgressMessage(`Processing ${current}... (${processed}/${total})`);

          // Update rows with discovered contact info in real-time
          if (progress.rows && Array.isArray(progress.rows)) {
            setRows(progress.rows as InstitutionRow[]);
          }

          // Check if complete
          if ((progress.isComplete as boolean) === true) {
            clearInterval(pollInterval);
            setContactDiscoveryRunning(false);
            setProgressMessage('✅ Contact discovery complete!');
          }
        } catch (err) {
          console.error('Error polling progress:', err);
        }
      }, 2000); // Poll every 2 seconds

      // Set timeout to stop polling after 2 hours (safety measure)
      setTimeout(() => {
        clearInterval(pollInterval);
        if (contactDiscoveryRunning) {
          setContactDiscoveryRunning(false);
          setError('Contact discovery took too long and was stopped');
        }
      }, 2 * 60 * 60 * 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error starting contact discovery:', err);
      setContactDiscoveryRunning(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (rows.length === 0) {
      setError('No data to download');
      return;
    }

    try {
      const response = await fetch('/api/web-scraper/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      if (!response.ok) throw new Error('Failed to generate Excel');

      const data = (await response.json()) as {
        xlsx_base64: string;
      };

      if (!data.xlsx_base64) {
        throw new Error('No Excel file generated');
      }

      const binaryString = atob(data.xlsx_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `institutions-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Download failed: ${message}`);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="flex flex-col gap-6 p-4 sm:p-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-[var(--primary)]" />
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--foreground)]">
              Institution Lookup
            </h1>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] max-w-2xl leading-relaxed">
            Extract institution data including names, locations, websites, and contact information by providing URLs to college directories and lists.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="rounded-xl border border-red-200/50 bg-red-50 px-5 py-4 text-sm">
              <div className="font-semibold text-red-900 mb-1">Error</div>
              <div className="text-red-700/80 text-xs leading-relaxed">{error}</div>
            </div>
          </div>
        )}

        {/* Step 1: Add URLs */}
        {step === 'input' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm transition-shadow hover:shadow-md">
              {/* Bold Black Header */}
              <div className="border-b-2 px-6 sm:px-8 py-4" style={{ backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' }}>
                <h3 className="font-header text-sm font-bold uppercase tracking-wider text-white">
                  Step 1: Add URLs
                </h3>
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8 space-y-5">
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Enter links to college directories, lists, or any pages containing institution information
                </p>

                {/* URL Input */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                    placeholder="https://example.com/colleges"
                    className="flex-1 px-4 py-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all"
                  />
                  <button
                    onClick={handleAddUrl}
                    disabled={!url.trim()}
                    className="px-6 py-3 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary)]/90 disabled:bg-[var(--muted)] disabled:text-[var(--muted-foreground)] disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {/* URLs List */}
                {urls.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">URLs Added ({urls.length})</p>
                      <span className="text-xs text-[var(--muted-foreground)]">Max 50 URLs</span>
                    </div>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {urls.map((u, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3.5 rounded-lg border border-[var(--border)] bg-[var(--background)]/60 hover:bg-[var(--background)] transition-colors group"
                        >
                          <span className="text-xs font-mono text-[var(--muted-foreground)] truncate flex-1">{u}</span>
                          <button
                            onClick={() => handleRemoveUrl(idx)}
                            className="ml-3 p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-red-600 hover:bg-red-50/50 transition-all opacity-0 group-hover:opacity-100"
                            title="Remove URL"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Start Button */}
                <button
                  onClick={handleStartScraping}
                  disabled={urls.length === 0 || scraping}
                  className="w-full px-6 py-3 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary)]/90 disabled:bg-[var(--muted)] disabled:text-[var(--muted-foreground)] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2.5 mt-4"
                >
                  {scraping ? (
                    <>
                      <StuLoader variant="inline" speed={1.5} />
                      <span>Extracting Data...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Start School Lookup</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: School Lookup Results */}
        {step === 'school-lookup' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm transition-shadow hover:shadow-md">
              {/* Bold Black Header */}
              <div className="border-b-2 px-6 sm:px-8 py-4" style={{ backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' }}>
                <h3 className="font-header text-sm font-bold uppercase tracking-wider text-white">
                  Step 2: School Lookup Results
                </h3>
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8 flex flex-col gap-6">
                {/* Loading State */}
                {scraping ? (
                  <div className="text-center py-12 px-4">
                    <div className="inline-block mb-5">
                      <StuLoader speed={1.5} />
                    </div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{progressMessage}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-3">Elapsed: {formatTime(elapsedTime)}</p>
                  </div>
                ) : (
                  <>
                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <button
                        onClick={() => setStep('input')}
                        className="px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--foreground)] text-sm font-semibold hover:bg-[var(--muted)]/40 transition-colors"
                      >
                        ← Back to URLs
                      </button>
                      <button
                        onClick={handleDownloadExcel}
                        className="flex-1 px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export as Excel
                      </button>
                      <button
                        onClick={handleStartContactDiscovery}
                        className="flex-1 px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary)]/90 transition-colors flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Find Contacts
                      </button>
                    </div>

                    {/* Summary Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                      {/* Total Institutions - Vibrant Gradient */}
                      <div className="group relative overflow-hidden rounded-xl border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)] via-emerald-500 to-[var(--hover-green)] p-4.5 shadow-md transition-all hover:-translate-y-1.5 hover:shadow-lg">
                        <div className="absolute inset-0 bg-white/5" />
                        <div className="relative z-10 text-center">
                          <div className="font-header-bold text-3xl font-extrabold text-white">
                            {rows.length}
                          </div>
                          <div className="font-body mt-1.5 text-xs font-semibold uppercase tracking-wider text-white/90">
                            Total Institutions
                          </div>
                        </div>
                      </div>

                      {/* With Location - Blue Gradient */}
                      <div className="group relative overflow-hidden rounded-xl border border-blue-200/50 bg-gradient-to-br from-blue-400 to-cyan-500 p-4.5 shadow-md transition-all hover:-translate-y-1.5 hover:shadow-lg">
                        <div className="absolute inset-0 bg-white/5" />
                        <div className="relative z-10 text-center">
                          <div className="font-header-bold text-3xl font-extrabold text-white">
                            {rows.filter(r => r.city && r.state).length}
                          </div>
                          <div className="font-body mt-1.5 text-xs font-semibold uppercase tracking-wider text-blue-50/90">
                            With Location
                          </div>
                        </div>
                      </div>

                      {/* With Website - Purple Gradient */}
                      <div className="group relative overflow-hidden rounded-xl border border-purple-200/50 bg-gradient-to-br from-purple-400 to-pink-500 p-4.5 shadow-md transition-all hover:-translate-y-1.5 hover:shadow-lg">
                        <div className="absolute inset-0 bg-white/5" />
                        <div className="relative z-10 text-center">
                          <div className="font-header-bold text-3xl font-extrabold text-white">
                            {rows.filter(r => r.website).length}
                          </div>
                          <div className="font-body mt-1.5 text-xs font-semibold uppercase tracking-wider text-purple-50/90">
                            With Website
                          </div>
                        </div>
                      </div>

                      {/* High Fit - Amber Gradient */}
                      <div className="group relative overflow-hidden rounded-xl border border-amber-200/50 bg-gradient-to-br from-amber-400 to-orange-500 p-4.5 shadow-md transition-all hover:-translate-y-1.5 hover:shadow-lg">
                        <div className="absolute inset-0 bg-white/5" />
                        <div className="relative z-10 text-center">
                          <div className="font-header-bold text-3xl font-extrabold text-white">
                            {rows.filter(r => r.stu_fit_score >= 50).length}
                          </div>
                          <div className="font-body mt-1.5 text-xs font-semibold uppercase tracking-wider text-amber-50/90">
                            High Fit (50+)
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Results Table */}
                    <div ref={tableContainerRef} className="overflow-x-auto rounded-lg border border-[var(--border)] -mx-6 sm:-mx-8">
                      <div className="px-6 sm:px-8">
                        <table className="w-full text-xs sm:text-sm">
                          <thead>
                            <tr style={{ backgroundColor: 'color-mix(in srgb, var(--muted) 30%, transparent)' }}>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--foreground)] first:pl-0">Institution</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Location</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Website</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Registrar</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Registrar Email (Person)</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Registrar Dept Email</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Provost</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Provost Email (Person)</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Provost Dept Email</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Type</th>
                              <th className="text-center px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)] last:pr-0">Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {[...rows].sort((a, b) => b.stu_fit_score - a.stu_fit_score).map((row, idx) => {
                              const categoryColor = getCategoryColor(row.category);
                              const scoreColor = getScoreColor(row.stu_fit_score);
                              return (
                                <tr key={idx} className="hover:bg-[var(--muted)]/10 transition-colors">
                                  <td className="px-4 py-3.5 text-[var(--foreground)] font-medium first:pl-0">{row.name}</td>
                                  <td className="px-4 py-3.5 text-[var(--foreground)] text-sm">{row.city && row.state ? `${row.city}, ${row.state}` : '—'}</td>
                                  <td className="px-4 py-3.5">
                                    {row.website ? (
                                      <a href={row.website} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline text-xs font-medium">
                                        {row.website.replace('https://', '')}
                                      </a>
                                    ) : (
                                      <span className="text-[var(--muted-foreground)] text-xs">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-xs text-[var(--foreground)]">
                                    {row.registrar_name || '—'}
                                  </td>
                                  <td className="px-4 py-3.5 text-xs">
                                    {row.registrar_email ? (
                                      <a href={`mailto:${row.registrar_email}`} className="text-blue-600 hover:underline">
                                        {row.registrar_email}
                                      </a>
                                    ) : (
                                      <span className="text-[var(--muted-foreground)]">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-xs">
                                    {row.registrar_department_email ? (
                                      <a href={`mailto:${row.registrar_department_email}`} className="text-green-600 hover:underline">
                                        {row.registrar_department_email}
                                      </a>
                                    ) : (
                                      <span className="text-[var(--muted-foreground)]">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-xs text-[var(--foreground)]">
                                    {row.provost_name || '—'}
                                  </td>
                                  <td className="px-4 py-3.5 text-xs">
                                    {row.provost_email ? (
                                      <a href={`mailto:${row.provost_email}`} className="text-blue-600 hover:underline">
                                        {row.provost_email}
                                      </a>
                                    ) : (
                                      <span className="text-[var(--muted-foreground)]">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-xs">
                                    {row.provost_department_email ? (
                                      <a href={`mailto:${row.provost_department_email}`} className="text-green-600 hover:underline">
                                        {row.provost_department_email}
                                      </a>
                                    ) : (
                                      <span className="text-[var(--muted-foreground)]">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${categoryColor.badge}`}>
                                      {row.category}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 last:pr-0">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="relative w-8 h-1.5 bg-[var(--muted)]/30 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full bg-gradient-to-r ${scoreColor.bar} transition-all duration-500 ease-out rounded-full`}
                                          style={{ width: `${row.stu_fit_score}%` }}
                                        />
                                      </div>
                                      <span className={`font-header font-bold text-xs ${scoreColor.text}`}>
                                        {row.stu_fit_score}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Contact Discovery */}
        {step === 'contact-discovery' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm transition-shadow hover:shadow-md">
              {/* Bold Black Header */}
              <div className="border-b-2 px-6 sm:px-8 py-4" style={{ backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' }}>
                <h3 className="font-header text-sm font-bold uppercase tracking-wider text-white">
                  Step 3: Contact Discovery
                </h3>
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Current Task & Progress */}
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-block mb-4">
                      <StuLoader speed={1.5} />
                    </div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {progressMessage || 'Finding registrar and provost contact information...'}
                    </p>
                  </div>

                  {contactProgress && (
                    <>
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase">Progress</span>
                          <span className="text-sm font-bold text-[var(--foreground)]">
                            {contactProgress.processed} / {contactProgress.total}
                          </span>
                        </div>
                        <div className="h-2.5 bg-[var(--muted)]/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 ease-out rounded-full"
                            style={{
                              width: `${(contactProgress.processed / Math.max(contactProgress.total, 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Statistics Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-[var(--muted)]/10 border border-[var(--border)]">
                          <div className="text-xs text-[var(--muted-foreground)] uppercase font-semibold">Time Elapsed</div>
                          <div className="text-lg font-bold text-[var(--foreground)] mt-1">
                            {formatTime(contactProgress.elapsedSeconds)}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--muted)]/10 border border-[var(--border)]">
                          <div className="text-xs text-[var(--muted-foreground)] uppercase font-semibold">Remaining</div>
                          <div className="text-lg font-bold text-amber-600 mt-1">
                            {formatTime(contactProgress.estimatedTimeRemaining)}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--muted)]/10 border border-[var(--border)]">
                          <div className="text-xs text-[var(--muted-foreground)] uppercase font-semibold">With Registrar</div>
                          <div className="text-lg font-bold text-green-600 mt-1">
                            {contactProgress.withRegistrar}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--muted)]/10 border border-[var(--border)]">
                          <div className="text-xs text-[var(--muted-foreground)] uppercase font-semibold">API Credits Used</div>
                          <div className="text-lg font-bold text-orange-600 mt-1">
                            ${contactProgress.estimatedCreditsUsed}
                          </div>
                        </div>
                      </div>

                      {/* Countdown Timer */}
                      <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/50">
                        <div className="text-center">
                          <div className="text-xs font-semibold text-blue-700 uppercase mb-2">Est. Completion In</div>
                          <div className="text-3xl font-extrabold text-blue-900 font-header-bold">
                            {formatTime(contactProgress.estimatedTimeRemaining)}
                          </div>
                        </div>
                      </div>

                      {/* Contact Summary */}
                      <div className="p-4 rounded-lg bg-[var(--muted)]/10 border border-[var(--border)]">
                        <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase mb-2">Contact Summary</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-foreground)]">With Registrar Department:</span>
                            <span className="font-semibold text-green-600">{contactProgress.withRegistrar}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-foreground)]">With Provost Department:</span>
                            <span className="font-semibold text-green-600">{contactProgress.withProvost}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-foreground)]">With Both Departments:</span>
                            <span className="font-semibold text-blue-600">{contactProgress.withBoth}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Live Results Table During Discovery */}
                {rows.length > 0 && (
                  <div className="mt-8 border-t pt-6">
                    <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4">Live Results (Best Fit First)</h4>
                    <div ref={tableContainerRef} className="overflow-x-auto rounded-lg border border-[var(--border)]">
                      <div>
                        <table className="w-full text-xs sm:text-sm">
                          <thead>
                            <tr style={{ backgroundColor: 'color-mix(in srgb, var(--muted) 30%, transparent)' }}>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--foreground)] first:pl-0">Institution</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Location</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Website</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Registrar</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Registrar Email (Person)</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Registrar Dept Email</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Provost</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Provost Email (Person)</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Provost Dept Email</th>
                              <th className="text-left px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)]">Type</th>
                              <th className="text-center px-4 py-3.5 font-header font-semibold text-[var(--muted-foreground)] last:pr-0">Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {[...rows].sort((a, b) => b.stu_fit_score - a.stu_fit_score).map((row, idx) => {
                              const categoryColor = getCategoryColor(row.category);
                              const scoreColor = getScoreColor(row.stu_fit_score);
                              return (
                                <tr key={idx} className="hover:bg-[var(--muted)]/10 transition-colors">
                                  <td className="px-4 py-3.5 text-[var(--foreground)] font-medium first:pl-0">{row.name}</td>
                                  <td className="px-4 py-3.5 text-[var(--foreground)] text-sm">{row.city && row.state ? `${row.city}, ${row.state}` : '—'}</td>
                                  <td className="px-4 py-3.5">
                                    {row.website ? (
                                      <a href={row.website} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline text-xs font-medium">
                                        {row.website.replace('https://', '')}
                                      </a>
                                    ) : (
                                      <span className="text-[var(--muted-foreground)] text-xs">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-xs text-[var(--foreground)]">
                                    {row.registrar_name || '—'}
                                  </td>
                                  <td className="px-4 py-3.5 text-xs">
                                    {row.registrar_email ? (
                                      <a href={`mailto:${row.registrar_email}`} className="text-blue-600 hover:underline">
                                        {row.registrar_email}
                                      </a>
                                    ) : (
                                      <span className="text-[var(--muted-foreground)]">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-xs">
                                    {row.registrar_department_email ? (
                                      <a href={`mailto:${row.registrar_department_email}`} className="text-green-600 hover:underline">
                                        {row.registrar_department_email}
                                      </a>
                                    ) : (
                                      <span className="text-[var(--muted-foreground)]">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-xs text-[var(--foreground)]">
                                    {row.provost_name || '—'}
                                  </td>
                                  <td className="px-4 py-3.5 text-xs">
                                    {row.provost_email ? (
                                      <a href={`mailto:${row.provost_email}`} className="text-blue-600 hover:underline">
                                        {row.provost_email}
                                      </a>
                                    ) : (
                                      <span className="text-[var(--muted-foreground)]">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-xs">
                                    {row.provost_department_email ? (
                                      <a href={`mailto:${row.provost_department_email}`} className="text-green-600 hover:underline">
                                        {row.provost_department_email}
                                      </a>
                                    ) : (
                                      <span className="text-[var(--muted-foreground)]">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${categoryColor.badge}`}>
                                      {row.category}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 last:pr-0">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="relative w-8 h-1.5 bg-[var(--muted)]/30 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full bg-gradient-to-r ${scoreColor.bar} transition-all duration-500 ease-out rounded-full`}
                                          style={{ width: `${row.stu_fit_score}%` }}
                                        />
                                      </div>
                                      <span className={`font-header font-bold text-xs ${scoreColor.text}`}>
                                        {row.stu_fit_score}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  {!contactDiscoveryRunning && (
                    <button
                      onClick={() => setStep('school-lookup')}
                      className="flex-1 px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--foreground)] text-sm font-semibold hover:bg-[var(--muted)]/40 transition-colors"
                    >
                      ← Back to Results
                    </button>
                  )}
                  {rows.length > 0 && (
                    <button
                      onClick={handleDownloadExcel}
                      disabled={contactDiscoveryRunning}
                      className="flex-1 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      Download Current Data
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
