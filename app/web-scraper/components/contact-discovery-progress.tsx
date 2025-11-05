'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock, AlertCircle, Mail, User } from 'lucide-react';

interface ContactDiscoveryProgressProps {
  totalSchools: number;
  schoolsProcessed: number;
  schoolsWithRegistrar: number;
  schoolsWithProvost: number;
  schoolsWithBoth: number;
  isActive: boolean;
}

export function ContactDiscoveryProgress({
  totalSchools,
  schoolsProcessed,
  schoolsWithRegistrar,
  schoolsWithProvost,
  schoolsWithBoth,
  isActive,
}: ContactDiscoveryProgressProps) {
  const percentage = totalSchools > 0 ? Math.round((schoolsProcessed / totalSchools) * 100) : 0;
  const estimatedTimePerSchool = 3; // seconds
  const estimatedTimeRemaining = (totalSchools - schoolsProcessed) * estimatedTimePerSchool;
  const minutesRemaining = Math.ceil(estimatedTimeRemaining / 60);

  return (
    <Card className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] overflow-hidden shadow-sm p-0">
      <div className="rounded-t-2xl px-6 py-5" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-header-bold text-lg font-bold text-white flex items-center gap-3">
            {isActive ? (
              <>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center animate-pulse">
                  <Mail className="w-5 h-5 text-emerald-600 animate-pulse" />
                </div>
                <span>Discovering Contacts</span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <span>Contact Discovery Complete</span>
              </>
            )}
          </h2>
          <span className="text-xs font-semibold text-white/70 bg-white/10 px-2.5 py-1 rounded-full">
            {percentage}%
          </span>
        </div>
      </div>
      <CardContent className="flex flex-col gap-5 pt-6 px-6 pb-6">
        {/* Main Progress Bar with improved styling */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Progress</p>
            <p className="text-sm font-semibold text-foreground">
              {schoolsProcessed} / {totalSchools} schools processed
            </p>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden border border-border/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Stats Grid - Enhanced layout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Registrar Card */}
          <div className="rounded-lg p-4 bg-blue-50/50 border border-blue-200/50 hover:border-blue-300/70 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="text-xs text-blue-700 font-semibold">Registrar Found</p>
            </div>
            <p className="text-2xl font-bold text-blue-900">{schoolsWithRegistrar}</p>
          </div>

          {/* Provost Card */}
          <div className="rounded-lg p-4 bg-purple-50/50 border border-purple-200/50 hover:border-purple-300/70 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <p className="text-xs text-purple-700 font-semibold">Provost Found</p>
            </div>
            <p className="text-2xl font-bold text-purple-900">{schoolsWithProvost}</p>
          </div>

          {/* Both Contacts Card */}
          <div className="rounded-lg p-4 bg-emerald-50/50 border border-emerald-200/50 hover:border-emerald-300/70 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xs text-emerald-700 font-semibold">Both Contacts</p>
            </div>
            <p className="text-2xl font-bold text-emerald-900">{schoolsWithBoth}</p>
          </div>

          {/* Time Estimate Card */}
          <div className="rounded-lg p-4 bg-amber-50/50 border border-amber-200/50 hover:border-amber-300/70 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <p className="text-xs text-amber-700 font-semibold">Est. Time Left</p>
            </div>
            <p className="text-2xl font-bold text-amber-900">
              {minutesRemaining > 0 ? `${minutesRemaining}m` : '< 1m'}
            </p>
          </div>
        </div>

        {/* Info Message - Enhanced styling */}
        {isActive && (
          <div className="flex gap-3 p-4 rounded-lg bg-emerald-50/60 border border-emerald-200/50">
            <AlertCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-700 leading-relaxed">
              Searching across the web for registrar and provost contact information. This comprehensive search may take several minutes depending on the number of institutions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
