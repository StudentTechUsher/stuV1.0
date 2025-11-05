'use client';

import { useState, useEffect, useRef } from 'react';
import { SchoolRow } from '@/lib/gemini';
import { StuLoader } from '@/components/ui/StuLoader';

interface StoredData {
  lastUrl: string;
  lastSchools: string[];
  lastResult: {
    rows: SchoolRow[];
    timestamp: number;
  } | null;
}

const STORAGE_KEY = 'stu-gemini-scan-v1';

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-green-100 text-green-900';
  if (confidence >= 0.6) return 'bg-emerald-100 text-emerald-900';
  if (confidence >= 0.4) return 'bg-yellow-100 text-yellow-900';
  if (confidence >= 0.2) return 'bg-orange-100 text-orange-900';
  return 'bg-red-100 text-red-900';
}

function getICPScore(school: SchoolRow): { score: number; tier: string; color: string } {
  const name = (school.name || '').toLowerCase();
  let score = 50;

  const avoidKeywords = ['for-profit', 'western governors', 'university of phoenix', 'online'];

  if (avoidKeywords.some(kw => name.includes(kw))) {
    return { score: 0, tier: 'Not Fit', color: 'bg-gray-100 text-gray-700' };
  }

  const eliteKeywords = ['harvard', 'stanford', 'yale', 'princeton', 'mit', 'penn', 'duke', 'dartmouth', 'columbia', 'cornell'];
  if (eliteKeywords.some(kw => name.includes(kw))) {
    score -= 30;
  }

  const communityCollegeKeywords = ['community college', 'cc', 'junior college'];
  if (communityCollegeKeywords.some(kw => name.includes(kw))) {
    score += 35;
  }

  const specificHighPriority = ['slcc', 'snow college', 'northern arizona', 'boise state', 'uvu', 'weber state', 'southern utah'];
  if (specificHighPriority.some(kw => name.includes(kw))) {
    score += 25;
  }

  const stateUniversityKeywords = ['state university', 'state college', 'university of'];
  if (stateUniversityKeywords.some(kw => name.includes(kw))) {
    score += 15;
  }

  const privateKeywords = ['institute', 'academy'];
  if (privateKeywords.some(kw => name.includes(kw))) {
    score -= 15;
  }

  score += Math.min(20, Math.round((school.state_confidence || 0) * 20));
  score += Math.min(30, Math.round((school.contact_confidence || 0) * 30));

  if (school.registrar_email || school.registrar_name) score += 15;
  if (school.provost_email || school.provost_name) score += 15;

  const finalScore = Math.max(0, Math.min(100, score));

  if (finalScore >= 80) return { score: finalScore, tier: '🔥 Ideal Target', color: 'bg-green-100 text-green-900 font-bold' };
  if (finalScore >= 65) return { score: finalScore, tier: '✅ Excellent Fit', color: 'bg-emerald-100 text-emerald-900' };
  if (finalScore >= 50) return { score: finalScore, tier: '✅ Good Fit', color: 'bg-emerald-100 text-emerald-900' };
  if (finalScore >= 35) return { score: finalScore, tier: '⚪ Neutral', color: 'bg-yellow-100 text-yellow-900' };
  if (finalScore >= 20) return { score: finalScore, tier: '⚠️ Explore', color: 'bg-orange-100 text-orange-900' };
  return { score: finalScore, tier: '❌ Skip', color: 'bg-red-100 text-red-900' };
}

export default function WebScraperClient() {
  const [step, setStep] = useState<'input' | 'review' | 'contact-scan'>('input');
  const [url, setUrl] = useState('');
  const [schools, setSchools] = useState<string[]>([]);
  const [rows, setRows] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [queued, setQueued] = useState(0);
  const [running, setRunning] = useState(0);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) return;

    const timer = setInterval(() => {
      if (startTime) {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, startTime]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: StoredData = JSON.parse(stored);
        setUrl(data.lastUrl || '');
        setSchools(data.lastSchools || []);
        if (data.lastResult?.rows) {
          setRows(data.lastResult.rows);
          setDone(data.lastResult.rows.length);
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error);
      }
    }
  }, []);

  const handleExtractSchools = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setExtracting(true);
    setError(null);

    try {
      const response = await fetch('/api/web-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedUrls: [url] }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract schools');
      }

      const data = (await response.json()) as {
        rows: Array<{ name: string }>;
      };

      const extractedSchools = data.rows.map((r) => r.name).filter(Boolean);
      if (extractedSchools.length === 0) {
        setError('No schools found on the page');
        setExtracting(false);
        return;
      }

      setSchools(extractedSchools);
      setStep('review');
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          lastUrl: url,
          lastSchools: extractedSchools,
          lastResult: null,
        } as StoredData)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error extracting schools:', err);
    } finally {
      setExtracting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const estimateRemainingTime = (): number => {
    if (done === 0) return 0;
    const avgTimePerSchool = elapsedTime / done;
    const remaining = (queued + running) * avgTimePerSchool;
    return Math.ceil(remaining);
  };

  const getProgressPercentage = (): number => {
    const total = queued + running + done;
    return total === 0 ? 0 : Math.round((done / total) * 100);
  };

  const handleScanContacts = async () => {
    if (schools.length === 0) {
      setError('No schools to scan');
      return;
    }

    setLoading(true);
    setError(null);
    setStep('contact-scan');
    setQueued(schools.length);
    setRunning(1);
    setDone(0);
    setFailed(0);
    setStartTime(Date.now());
    setElapsedTime(0);

    try {
      const response = await fetch('/api/gemini-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schools }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        rows: SchoolRow[];
        xlsxBase64: string;
      };

      setRows(data.rows);
      setDone(data.rows.length);
      setQueued(0);
      setRunning(0);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          lastUrl: url,
          lastSchools: schools,
          lastResult: {
            rows: data.rows,
            timestamp: Date.now(),
          },
        } as StoredData)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setFailed(1);
      console.error('Error during scan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (rows.length === 0) {
      setError('No data to download');
      return;
    }

    try {
      const response = await fetch('/api/gemini-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schools: rows.map((r) => r.name) }),
      });

      if (!response.ok) throw new Error('Failed to generate Excel');

      const data = (await response.json()) as {
        rows: SchoolRow[];
        xlsxBase64: string;
      };

      const binaryString = atob(data.xlsxBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schools-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading Excel:', err);
      setError(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRemoveSchool = (index: number) => {
    const updated = schools.filter((_, i) => i !== index);
    setSchools(updated);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lastUrl: url,
        lastSchools: updated,
        lastResult: null,
      } as StoredData)
    );
  };

  const handleEditSchools = () => {
    setStep('review');
  };

  const columns: (keyof SchoolRow)[] = [
    'name',
    'website',
    'city',
    'state',
    'registrar_name',
    'registrar_email',
    'registrar_phone',
    'registrar_page_url',
    'provost_name',
    'provost_email',
    'provost_phone',
    'provost_page_url',
    'dept_email',
    'dept_phone',
    'main_office_email',
    'main_office_phone',
    'state_confidence',
    'contact_confidence',
    'source_urls',
    'notes',
  ];

  const columnLabels: Record<string, string> = {
    name: 'School Name',
    website: 'Website',
    city: 'City',
    state: 'State',
    registrar_name: 'Registrar Name',
    registrar_email: 'Registrar Email',
    registrar_phone: 'Registrar Phone',
    registrar_page_url: 'Registrar Page',
    provost_name: 'Provost Name',
    provost_email: 'Provost Email',
    provost_phone: 'Provost Phone',
    provost_page_url: 'Provost Page',
    dept_email: 'Dept Email',
    dept_phone: 'Dept Phone',
    main_office_email: 'Main Office Email',
    main_office_phone: 'Main Office Phone',
    state_confidence: 'State Conf.',
    contact_confidence: 'Contact Conf.',
    source_urls: 'Source URLs',
    notes: 'Notes',
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) return value.join('; ');
    if (typeof value === 'number') return value.toFixed(2);
    return String(value);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--foreground)]">
            College Contact Discovery
          </h1>
          <p className="text-base text-[var(--muted-foreground)]">
            Extract and research registrar & provost contacts from educational institutions
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="animate-in fade-in duration-200">
            <div className="rounded-xl border border-red-200/30 bg-red-50/50 backdrop-blur-sm p-4 text-sm text-red-700">
              <div className="font-semibold mb-1">Error</div>
              <div className="text-red-600/90">{error}</div>
            </div>
          </div>
        )}

        {/* Step 1: Input URL */}
        {step === 'input' && (
          <div className="animate-in fade-in duration-300">
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm p-0 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-50/50 px-6 sm:px-8 py-6 border-b border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">Paste URL</h2>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] ml-11">
                  Enter a URL containing a list of colleges or universities
                </p>
              </div>

              <div className="p-6 sm:p-8 flex flex-col gap-4">
                <div className="relative">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/colleges-list"
                    className="w-full px-4 py-3 text-sm font-mono rounded-lg border border-[color-mix(in_srgb,var(--muted-foreground)_20%,transparent)] bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--muted-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                  />
                </div>

                <button
                  onClick={handleExtractSchools}
                  disabled={extracting || !url.trim()}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:bg-[var(--muted-foreground)] disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {extracting ? (
                    <>
                      <StuLoader variant="inline" speed={1.5} />
                      Extracting Schools...
                    </>
                  ) : (
                    <>
                      <span>→</span>
                      Extract Schools from URL
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Review Schools */}
        {step === 'review' && (
          <div className="animate-in fade-in duration-300">
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm p-0 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-50/50 px-6 sm:px-8 py-6 border-b border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">Review Schools</h2>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] ml-11">
                  We found {schools.length} school{schools.length !== 1 ? 's' : ''}. Remove any you don&apos;t need.
                </p>
              </div>

              <div className="p-6 sm:p-8 flex flex-col gap-4">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {schools.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-[var(--muted-foreground)]">No schools to display</p>
                    </div>
                  ) : (
                    schools.map((school, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg border border-[color-mix(in_srgb,var(--muted-foreground)_15%,transparent)] bg-[var(--background)] hover:border-[color-mix(in_srgb,var(--muted-foreground)_25%,transparent)] transition-colors group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-xs font-semibold text-[var(--muted-foreground)] flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium text-[var(--foreground)] truncate">
                            {school}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveSchool(idx)}
                          className="ml-2 px-3 py-1 rounded text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50/50 transition-colors flex-shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)]">
                  <button
                    onClick={() => setStep('input')}
                    className="px-4 py-2.5 rounded-lg border border-[color-mix(in_srgb,var(--muted-foreground)_30%,transparent)] text-[var(--foreground)] font-semibold hover:bg-[var(--muted)]/50 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleScanContacts}
                    disabled={schools.length === 0 || loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:bg-[var(--muted-foreground)] disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {loading ? (
                      <>
                        <StuLoader variant="inline" speed={1.5} />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <span>→</span>
                        Scan {schools.length} School{schools.length !== 1 ? 's' : ''} for Contacts
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Contact Scanning */}
        {step === 'contact-scan' && (
          <div className="animate-in fade-in duration-300">
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm p-0 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-50/50 px-6 sm:px-8 py-6 border-b border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">Discovering Contacts</h2>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] ml-11">
                  Using Gemini AI to extract registrar & provost contacts from school websites
                </p>
              </div>

              <div className="p-6 sm:p-8 flex flex-col gap-6">
                {loading && (
                  <div className="space-y-6">
                    {/* Progress Card */}
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-[var(--muted-foreground)] mb-1">
                            Progress
                          </div>
                          <div className="text-sm text-[var(--muted-foreground)]">
                            {done} of {queued + running + done} completed
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-bold text-primary">{getProgressPercentage()}%</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="h-3 bg-[var(--muted)]/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all duration-500"
                            style={{ width: `${getProgressPercentage()}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                          <span>{elapsedTime > 0 ? `${formatTime(elapsedTime)} elapsed` : 'Starting...'}</span>
                          {estimateRemainingTime() > 0 && <span>{formatTime(estimateRemainingTime())} remaining</span>}
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-[color-mix(in_srgb,var(--muted-foreground)_15%,transparent)] bg-[var(--background)] p-3 text-center">
                        <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                          Elapsed
                        </div>
                        <div className="text-lg font-bold text-[var(--foreground)]">
                          {formatTime(elapsedTime)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[color-mix(in_srgb,var(--muted-foreground)_15%,transparent)] bg-[var(--background)] p-3 text-center">
                        <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                          ETA
                        </div>
                        <div className="text-lg font-bold text-[var(--foreground)]">
                          {formatTime(estimateRemainingTime())}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[color-mix(in_srgb,var(--muted-foreground)_15%,transparent)] bg-[var(--background)] p-3 text-center">
                        <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                          Avg/School
                        </div>
                        <div className="text-lg font-bold text-[var(--foreground)]">
                          {done > 0 ? formatTime(Math.ceil(elapsedTime / done)) : '—'}
                        </div>
                      </div>
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                        <div className="text-xs font-semibold text-primary mb-1">
                          Status
                        </div>
                        <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                          <StuLoader variant="inline" speed={1.5} />
                        </div>
                      </div>
                    </div>

                    {/* Status Indicators */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-100/50 text-yellow-700 text-xs font-medium">
                        <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
                        <span>Queued: {queued}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        <span>Running: {running}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100/50 text-green-700 text-xs font-medium">
                        <div className="w-2 h-2 rounded-full bg-green-600"></div>
                        <span>Done: {done}</span>
                      </div>
                      {failed > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100/50 text-red-700 text-xs font-medium">
                          <div className="w-2 h-2 rounded-full bg-red-600"></div>
                          <span>Failed: {failed}</span>
                        </div>
                      )}
                    </div>

                    {/* Info Banner */}
                    <div className="rounded-lg border border-amber-200/30 bg-amber-50/50 p-3 text-xs text-amber-900">
                      <div className="font-semibold mb-1">API Quota Note</div>
                      <p className="text-amber-800/80">
                        Gemini API free tier allows 200 requests/day. If quota is exceeded, wait until tomorrow or upgrade to a paid plan.
                      </p>
                    </div>
                  </div>
                )}

                {!loading && rows.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)]">
                    <button
                      onClick={handleEditSchools}
                      className="px-4 py-2.5 rounded-lg border border-[color-mix(in_srgb,var(--muted-foreground)_30%,transparent)] text-[var(--foreground)] font-semibold hover:bg-[var(--muted)]/50 transition-colors"
                    >
                      ← Back to Schools
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
                    >
                      ↓ Download Excel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results: ICP Ranking */}
        {rows.length > 0 && step === 'contact-scan' && (
          <div className="animate-in fade-in duration-300">
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm p-0 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-50/50 px-6 sm:px-8 py-6 border-b border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)]">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">🎯 Prospect Ranking by ICP Fit</h2>
                <p className="text-sm text-[var(--muted-foreground)] mt-2">
                  Top {Math.min(10, rows.length)} prospects ranked by fit to our ICP
                </p>
              </div>

              <div className="p-6 sm:p-8">
                <div className="space-y-2">
                  {[...rows]
                    .sort((a, b) => getICPScore(b).score - getICPScore(a).score)
                    .slice(0, 10)
                    .map((row, idx) => {
                      const icp = getICPScore(row);
                      return (
                        <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] ${icp.color}`}>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{row.name}</div>
                            <div className="text-xs opacity-75 mt-1">
                              State: {row.state || 'N/A'} · Registrar: {row.registrar_email ? '✓' : '✗'} · Provost: {row.provost_email ? '✓' : '✗'}
                            </div>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className="text-sm font-bold">{icp.tier}</div>
                            <div className="text-xs opacity-75 mt-1">{icp.score}/100</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results: Complete Data Table */}
        {rows.length > 0 && step === 'contact-scan' && (
          <div className="animate-in fade-in duration-300">
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm p-0 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-50/50 px-6 sm:px-8 py-6 border-b border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)]">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">📊 Complete Contact Data</h2>
                <p className="text-sm text-[var(--muted-foreground)] mt-2">
                  Confidence scores color-coded: Green (80%+) → Yellow (40%) → Red (0%)
                </p>
              </div>

              <div className="overflow-x-auto" ref={tableContainerRef}>
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-[var(--muted)]/50 sticky top-0 border-b border-[color-mix(in_srgb,var(--muted-foreground)_20%,transparent)]">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-[var(--foreground)] whitespace-nowrap border-r border-[color-mix(in_srgb,var(--muted-foreground)_15%,transparent)] w-32">ICP Fit</th>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left font-semibold text-[var(--foreground)] whitespace-nowrap border-r border-[color-mix(in_srgb,var(--muted-foreground)_15%,transparent)]"
                        >
                          {columnLabels[col] || col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const icp = getICPScore(row);
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-[var(--background)]' : 'bg-[var(--muted)]/20'}>
                          <td className={`px-3 py-2 font-semibold whitespace-nowrap border-r border-[color-mix(in_srgb,var(--muted-foreground)_15%,transparent)] text-xs ${icp.color}`}>
                            {icp.tier}
                          </td>
                          {columns.map((col) => {
                            const value = row[col];
                            const isConfidence = col === 'state_confidence' || col === 'contact_confidence';
                            const confidenceNum = typeof value === 'number' ? value : 0;
                            const colorClass = isConfidence ? getConfidenceColor(confidenceNum) : '';

                            return (
                              <td
                                key={col}
                                className={`px-3 py-2 border-r border-[color-mix(in_srgb,var(--muted-foreground)_15%,transparent)] whitespace-nowrap overflow-hidden text-ellipsis text-xs ${colorClass}`}
                                title={
                                  col === 'source_urls' && Array.isArray(value)
                                    ? (value as string[]).join(', ')
                                    : formatValue(value)
                                }
                              >
                                {isConfidence && typeof value === 'number' ? `${(value * 100).toFixed(0)}%` : formatValue(value)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
