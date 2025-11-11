'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Zap, Clock, Database, Mail } from 'lucide-react';

interface SummaryStatsProps {
  totalRows: number;
  filteredCount: number;
  eta: {
    scrape: number;
    organize: number;
    contacts: number;
    total: number;
  };
  summary: string;
}

export function SummaryStats({ totalRows, filteredCount, eta }: SummaryStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Institutions Card */}
      <Card className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Found</p>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-3xl font-bold text-foreground">{totalRows}</p>
              <p className="text-xs text-muted-foreground">Institutions discovered</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Currently Viewing Card */}
      <Card className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Showing</p>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-3xl font-bold text-foreground">{filteredCount}</p>
              <p className="text-xs text-muted-foreground">Based on filters</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Time Card */}
      <Card className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Processing</p>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-3xl font-bold text-foreground">{eta.total}s</p>
              <p className="text-xs text-muted-foreground">Total processing time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Discovery Card */}
      <Card className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Breakdown</p>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Mail className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Scrape:</span>
                  <span className="font-semibold text-foreground">{eta.scrape}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Organize:</span>
                  <span className="font-semibold text-foreground">{eta.organize}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Contacts:</span>
                  <span className="font-semibold text-foreground">{eta.contacts}s</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
