'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StuLoader } from '@/components/ui/StuLoader';
import { InstitutionRow } from '@/lib/services/webScraperService';
import { UrlInput } from './components/url-input';
import { ProgressIndicator } from './components/progress-indicator';
import { SummaryStats } from './components/summary-stats';
import { ResultsDataTable } from './components/results-data-table';
import { ContactDiscoveryProgress } from './components/contact-discovery-progress';
import { AlertCircle, Search, Download, Zap } from 'lucide-react';

interface ScraperResponse {
  rows: InstitutionRow[];
  eta: {
    scrape: number;
    organize: number;
    search: number;
    contacts: number;
    total: number;
  };
  xlsx_base64: string;
  summary: string;
  table_markdown: string;
}

type SortField = keyof InstitutionRow;

export function WebScraperClient() {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{
    stage: 'idle' | 'scraping' | 'organizing' | 'contacts' | 'complete';
    percentage: number;
  }>({ stage: 'idle', percentage: 0 });
  const [contactProgress, setContactProgress] = useState({
    totalSchools: 0,
    processed: 0,
    withRegistrar: 0,
    withProvost: 0,
    withBoth: 0,
  });
  const [contactDiscoverySessionId, setContactDiscoverySessionId] = useState<string | null>(null);
  const [results, setResults] = useState<ScraperResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name' as SortField);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleScrape = useCallback(async () => {
    if (urls.length === 0) {
      setError('Please enter at least one URL');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress({ stage: 'scraping', percentage: 10 });
    setContactProgress({ totalSchools: 0, processed: 0, withRegistrar: 0, withProvost: 0, withBoth: 0 });

    try {
      setTimeout(() => setProgress({ stage: 'organizing', percentage: 35 }), 800);
      setTimeout(() => setProgress({ stage: 'contacts', percentage: 70 }), 2000);

      const response = await fetch('/api/web-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedUrls: urls }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Scraping failed');
      }

      const data: ScraperResponse = await response.json();
      setResults(data);
      setProgress({ stage: 'contacts', percentage: 70 });

      // Initialize contact progress
      const totalSchools = data.rows.length;
      setContactProgress({
        totalSchools,
        processed: 0,
        withRegistrar: 0,
        withProvost: 0,
        withBoth: 0,
      });

      // Start background contact discovery
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setContactDiscoverySessionId(sessionId);

      // Start discovery in background
      fetch('/api/web-scraper-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: data.rows, sessionId }),
      }).catch((err) => console.error('Failed to start contact discovery:', err));

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const progressRes = await fetch(
            `/api/web-scraper-contacts?sessionId=${sessionId}`
          );
          if (progressRes.ok) {
            const progressData = await progressRes.json();
            setContactProgress({
              totalSchools: progressData.total,
              processed: progressData.processed,
              withRegistrar: progressData.withRegistrar,
              withProvost: progressData.withProvost,
              withBoth: progressData.withBoth,
            });

            // Update results with new contact info
            if (progressData.rows) {
              setResults((prev) =>
                prev ? { ...prev, rows: progressData.rows } : null
              );
            }

            if (progressData.isComplete) {
              clearInterval(pollInterval);
              setProgress({ stage: 'complete', percentage: 100 });
            }
          }
        } catch (err) {
          console.error('Failed to get contact discovery progress:', err);
        }
      }, 500); // Poll every 500ms
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      setProgress({ stage: 'idle', percentage: 0 });
    } finally {
      setLoading(false);
    }
  }, [urls]);

  // Deduplicate schools by name and normalize for comparison
  const deduplicateRows = (rows: InstitutionRow[]): InstitutionRow[] => {
    const seen = new Map<string, InstitutionRow>();

    rows.forEach((row) => {
      // Create a normalized key for comparison (lowercase name, trimmed)
      const normalizedName = row.name.trim().toLowerCase();
      const key = normalizedName;

      // Keep the first occurrence, skip duplicates
      if (!seen.has(key)) {
        seen.set(key, row);
      }
    });

    return Array.from(seen.values());
  };

  const filteredAndSortedRows = useMemo(() => {
    if (!results?.rows) return [];

    // First deduplicate the results
    const dedupedRows = deduplicateRows(results.rows);

    const filtered = dedupedRows.filter((row) => {
      if (stateFilter && row.state !== stateFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          row.name.toLowerCase().includes(term) ||
          row.city?.toLowerCase().includes(term) ||
          row.website?.toLowerCase().includes(term)
        );
      }
      return true;
    });

    return filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }

      return 0;
    });
  }, [results?.rows, sortField, sortDirection, stateFilter, searchTerm]);

  const states = useMemo(
    () => [...new Set((results?.rows.map((r) => r.state).filter(Boolean) || []) as string[])].sort(),
    [results?.rows]
  );

  const handleDownloadExcel = useCallback(() => {
    if (!results?.xlsx_base64) {
      setError('Excel file not available');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${results.xlsx_base64}`;
      link.download = `institutions_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (_err) {
      setError('Failed to download Excel file');
    }
  }, [results?.xlsx_base64]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col gap-8 px-6 py-8 max-w-7xl mx-auto">
        {/* Header Section - Modern, clean design */}
        <div className="flex flex-col gap-3 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Institution Scraper</h1>
              <p className="text-base text-muted-foreground">
                Discover and research educational institutions with intelligent data extraction
              </p>
            </div>
          </div>
        </div>

        {/* Input Card - Black header with white text, modern design */}
        <Card className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] overflow-hidden shadow-sm hover:shadow-md transition-shadow p-0">
          <div className="rounded-t-2xl px-6 py-5" style={{ backgroundColor: '#0A0A0A' }}>
            <h2 className="font-header-bold text-lg font-bold text-white">Enter URLs to Scrape</h2>
            <p className="text-sm text-white/70 mt-1">Paste URLs containing lists of colleges, universities, or educational institutions</p>
          </div>
          <CardContent className="flex flex-col gap-6 pt-6">
            <UrlInput urls={urls} onUrlsChange={setUrls} />
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleScrape}
                disabled={loading || urls.length === 0}
                size="lg"
                className="sm:w-auto rounded-lg font-medium"
              >
                {loading ? (
                  <>
                    <StuLoader variant="inline" speed={1.5} />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Start Scraping
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setUrls([])}
                disabled={urls.length === 0 || loading}
                className="rounded-lg"
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress Indicator - Enhanced visibility */}
        {(loading || (progress.stage !== 'idle' && progress.percentage > 0)) && (
          <div className="animate-in fade-in duration-300">
            <ProgressIndicator stage={progress.stage} percentage={progress.percentage} />
          </div>
        )}

        {/* Contact Discovery Progress - Real-time feedback */}
        {(loading || progress.stage === 'contacts') && contactProgress.totalSchools > 0 && (
          <div className="animate-in fade-in duration-300">
            <ContactDiscoveryProgress
              totalSchools={contactProgress.totalSchools}
              schoolsProcessed={contactProgress.processed}
              schoolsWithRegistrar={contactProgress.withRegistrar}
              schoolsWithProvost={contactProgress.withProvost}
              schoolsWithBoth={contactProgress.withBoth}
              isActive={loading || progress.stage === 'contacts'}
            />
          </div>
        )}

        {/* Error Message - Better visual hierarchy */}
        {error && (
          <div className="animate-in fade-in duration-300">
            <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
              <CardContent className="pt-6 flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 flex-1">
                  <p className="text-sm font-medium text-destructive">Error occurred</p>
                  <p className="text-sm text-destructive/80">{error}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results Section - Clean, organized layout */}
        {results && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* Summary Stats - Grid layout for better scanning */}
            <div className="pt-4">
              <h2 className="text-lg font-semibold mb-4">Overview</h2>
              <SummaryStats
                totalRows={deduplicateRows(results.rows).length}
                filteredCount={filteredAndSortedRows.length}
                eta={results.eta}
                summary={results.summary}
              />
            </div>

            {/* Filters & Search - Black header, modern design */}
            <Card className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] overflow-hidden shadow-sm hover:shadow-md transition-shadow p-0">
              <div className="rounded-t-2xl px-6 py-5" style={{ backgroundColor: '#0A0A0A' }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-header-bold text-lg font-bold text-white">Search & Filter</h2>
                  <span className="text-xs font-semibold text-white bg-white/10 px-2.5 py-1 rounded-full">
                    {filteredAndSortedRows.length} results
                  </span>
                </div>
              </div>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 px-6 pb-6">
                {/* Search Input with Icon */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type="text"
                      placeholder="Find institution, city, or website..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* State Filter */}
                {states.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">State</label>
                    <select
                      value={stateFilter ?? ''}
                      onChange={(e) => setStateFilter(e.target.value === '' ? null : e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                    >
                      <option value="">All States</option>
                      {states.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Download Button */}
                <div className="flex flex-col gap-2 md:col-span-1 md:justify-end">
                  <Button
                    onClick={handleDownloadExcel}
                    variant="outline"
                    className="w-full rounded-lg font-medium"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results Table - Black header, modern design */}
            <Card className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] overflow-hidden shadow-sm p-0">
              <div className="rounded-t-2xl px-6 py-5" style={{ backgroundColor: '#0A0A0A' }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-header-bold text-lg font-bold text-white">Results</h2>
                  <span className="text-xs font-semibold text-white/70">
                    {filteredAndSortedRows.length} of {deduplicateRows(results.rows).length} institutions
                  </span>
                </div>
              </div>
              <CardContent className="p-0 pt-0">
                {filteredAndSortedRows.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                    <Search className="w-10 h-10 text-muted-foreground/30" />
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-muted-foreground">No institutions found</p>
                      <p className="text-xs text-muted-foreground/60">Try adjusting your filters</p>
                    </div>
                  </div>
                ) : (
                  <ResultsDataTable
                    rows={filteredAndSortedRows}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={(field: SortField) => {
                      if (sortField === field) {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField(field);
                        setSortDirection('asc');
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
