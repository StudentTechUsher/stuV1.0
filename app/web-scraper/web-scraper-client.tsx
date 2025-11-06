'use client';

import { useState, useEffect, useRef } from 'react';
import { StuLoader } from '@/components/ui/StuLoader';

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
  provost_name: string | null;
  provost_email: string | null;
  main_office_email: string | null;
  main_office_phone: string | null;
  source_urls: string[];
  notes: string | null;
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
    setProgressMessage('Starting contact discovery (Phase 2)...');

    try {
      // TODO: Implement actual contact discovery API call
      setProgressMessage('Contact discovery feature coming soon!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error during contact discovery:', err);
    } finally {
      setContactDiscoveryRunning(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (rows.length === 0) {
      setError('No data to download');
      return;
    }

    try {
      const response = await fetch('/api/web-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedUrls: urls }),
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="flex flex-col gap-8 p-4 sm:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Institution Lookup
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] max-w-2xl">
            Extract institution data including names, locations, websites, and contact information by providing URLs to college directories and lists.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="animate-in fade-in duration-200">
            <div className="rounded-lg border border-red-200/40 bg-red-50/80 p-4 text-sm text-red-700 space-y-1">
              <div className="font-medium">Error</div>
              <div className="text-red-600/90 text-xs">{error}</div>
            </div>
          </div>
        )}

        {/* Step 1: Input URLs */}
        {step === 'input' && (
          <div className="animate-in fade-in duration-300">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xs">
              {/* Section Header */}
              <div className="px-6 sm:px-8 py-5 border-b border-[var(--border)]">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-primary">1</span>
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[var(--foreground)]">Add URLs</h2>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      Enter links to college directories or lists
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8 space-y-4">
                {/* URL Input */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                    placeholder="https://example.com/colleges"
                    className="flex-1 px-3.5 py-2.5 text-sm rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted-foreground)]/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                  />
                  <button
                    onClick={handleAddUrl}
                    disabled={!url.trim()}
                    className="px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:bg-[var(--muted)] disabled:text-[var(--muted-foreground)] disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* URLs List */}
                {urls.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">URLs ({urls.length})</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {urls.map((u, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-md border border-[var(--border)] bg-[var(--background)]/50 hover:bg-[var(--background)] transition-colors group"
                        >
                          <span className="text-xs font-mono text-[var(--muted-foreground)] truncate">{u}</span>
                          <button
                            onClick={() => handleRemoveUrl(idx)}
                            className="ml-3 px-2.5 py-1 rounded text-xs font-medium text-[var(--muted-foreground)] hover:text-red-600 hover:bg-red-50/50 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            Remove
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
                  className="w-full px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:bg-[var(--muted)] disabled:text-[var(--muted-foreground)] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  {scraping ? (
                    <>
                      <StuLoader variant="inline" speed={1.5} />
                      <span>Scraping...</span>
                    </>
                  ) : (
                    <>
                      <span>→</span>
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
          <div className="animate-in fade-in duration-300">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xs">
              {/* Section Header */}
              <div className="px-6 sm:px-8 py-5 border-b border-[var(--border)]">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 border border-blue-200/50 flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-blue-700">2</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-[var(--foreground)]">School Lookup</h2>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      {scraping ? `Extracting from ${urls.length} URL${urls.length !== 1 ? 's' : ''}...` : `Found ${rows.length} institutions`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8 flex flex-col gap-5">
                {/* Loading State or Action Buttons */}
                {scraping ? (
                  <div className="text-center py-8 px-4">
                    <div className="inline-block mb-4">
                      <StuLoader speed={1.5} />
                    </div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{progressMessage}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-2">Elapsed: {formatTime(elapsedTime)}</p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setStep('input')}
                      className="px-4 py-2 rounded-md border border-[var(--border)] text-[var(--foreground)] text-sm font-medium hover:bg-[var(--muted)]/40 transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleDownloadExcel}
                      className="flex-1 px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      📥 Export
                    </button>
                    <button
                      onClick={handleStartContactDiscovery}
                      className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>→</span>
                      <span>Find Contacts</span>
                    </button>
                  </div>
                )}

                {/* Summary Stats */}
                {!scraping && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-md border border-[var(--border)] bg-[var(--background)]/50">
                        <div className="text-xl font-semibold text-[var(--foreground)]">{rows.length}</div>
                        <div className="text-xs text-[var(--muted-foreground)] mt-1">Institutions</div>
                      </div>
                      <div className="p-3.5 rounded-md border border-[var(--border)] bg-[var(--background)]/50">
                        <div className="text-xl font-semibold text-[var(--foreground)]">{rows.filter(r => r.city && r.state).length}</div>
                        <div className="text-xs text-[var(--muted-foreground)] mt-1">With Location</div>
                      </div>
                      <div className="p-3.5 rounded-md border border-[var(--border)] bg-[var(--background)]/50">
                        <div className="text-xl font-semibold text-[var(--foreground)]">{rows.filter(r => r.website).length}</div>
                        <div className="text-xs text-[var(--muted-foreground)] mt-1">With Website</div>
                      </div>
                      <div className="p-3.5 rounded-md border border-[var(--border)] bg-[var(--background)]/50">
                        <div className="text-xl font-semibold text-[var(--foreground)]">{rows.filter(r => r.stu_fit_score >= 50).length}</div>
                        <div className="text-xs text-[var(--muted-foreground)] mt-1">High Fit</div>
                      </div>
                    </div>

                    {/* Results Table */}
                    <div ref={tableContainerRef} className="overflow-x-auto border border-[var(--border)] rounded-md -mx-6 sm:-mx-8">
                      <div className="px-6 sm:px-8">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="border-b border-[var(--border)]">
                            <tr>
                              <th className="text-left px-4 py-3.5 font-semibold text-[var(--foreground)] first:pl-0 last:pr-0">Institution</th>
                              <th className="text-left px-4 py-3.5 font-semibold text-[var(--muted-foreground)] first:pl-0 last:pr-0">Location</th>
                              <th className="text-left px-4 py-3.5 font-semibold text-[var(--muted-foreground)] first:pl-0 last:pr-0">Website</th>
                              <th className="text-left px-4 py-3.5 font-semibold text-[var(--muted-foreground)] first:pl-0 last:pr-0">Type</th>
                              <th className="text-center px-4 py-3.5 font-semibold text-[var(--muted-foreground)] first:pl-0 last:pr-0">Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {rows.map((row, idx) => (
                              <tr key={idx} className="hover:bg-[var(--muted)]/30 transition-colors">
                                <td className="px-4 py-3 text-[var(--foreground)] font-medium first:pl-0 last:pr-0">{row.name}</td>
                                <td className="px-4 py-3 text-[var(--foreground)] first:pl-0 last:pr-0">{row.city && row.state ? `${row.city}, ${row.state}` : '—'}</td>
                                <td className="px-4 py-3 first:pl-0 last:pr-0">
                                  {row.website ? (
                                    <a href={row.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all text-xs">
                                      {row.website.replace('https://', '')}
                                    </a>
                                  ) : (
                                    <span className="text-[var(--muted-foreground)]">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-[var(--foreground)] text-xs first:pl-0 last:pr-0">{row.category}</td>
                                <td className="px-4 py-3 text-center font-semibold text-primary first:pl-0 last:pr-0">{row.stu_fit_score}</td>
                              </tr>
                            ))}
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
          <div className="animate-in fade-in duration-300">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xs">
              {/* Section Header */}
              <div className="px-6 sm:px-8 py-5 border-b border-[var(--border)]">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-purple-50 border border-purple-200/50 flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-purple-700">3</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-[var(--foreground)]">Contact Discovery</h2>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      {contactDiscoveryRunning ? 'Finding registrar and provost contact information...' : progressMessage}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8 flex flex-col gap-5">
                <div className="text-center py-12 px-4">
                  <div className="inline-block mb-4">
                    <StuLoader speed={1.5} />
                  </div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{progressMessage}</p>
                  {contactDiscoveryRunning && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-3">Elapsed: {formatTime(elapsedTime)}</p>
                  )}
                </div>

                <button
                  onClick={() => setStep('school-lookup')}
                  className="px-4 py-2 rounded-md border border-[var(--border)] text-[var(--foreground)] text-sm font-medium hover:bg-[var(--muted)]/40 transition-colors"
                >
                  ← Back to Results
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
