'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GraduationCap, TrendingUp, BookOpen, Award, CheckCircle2, Check } from 'lucide-react';
import type { ProgramSuggestion, ProgramSuggestionsInput } from '@/lib/chatbot/tools/programSuggestionsTool';

interface ProgramSuggestionsDisplayProps {
  suggestions: ProgramSuggestionsInput;
  onSelectProgram: (programs: Array<{ programName: string; programType: string }>) => void;
  readOnly?: boolean;
  reviewMode?: boolean;
  variant?: 'default' | 'versionB';
}

export default function ProgramSuggestionsDisplay({
  suggestions,
  onSelectProgram,
  readOnly,
  reviewMode,
  variant = 'default',
}: Readonly<ProgramSuggestionsDisplayProps>) {
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isReadOnly = Boolean(readOnly || reviewMode);
  const isVersionB = variant === 'versionB';

  const handleToggleSelect = (program: ProgramSuggestion) => {
    if (isReadOnly) return;
    setSelectedPrograms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(program.program_name)) {
        newSet.delete(program.program_name);
      } else {
        newSet.add(program.program_name);
      }
      return newSet;
    });
  };

  const handleSubmit = () => {
    if (isReadOnly) return;
    const selectedProgramData = suggestions
      .filter(p => selectedPrograms.has(p.program_name))
      .map(p => ({
        programName: p.program_name,
        programType: p.program_type,
      }));

    setIsSubmitted(true);
    onSelectProgram(selectedProgramData);
  };

  // Sort by match score (highest first)
  const sortedSuggestions = [...suggestions].sort((a, b) => b.match_score - a.match_score);

  // Get color based on match score
  const getMatchColor = (score: number) => {
    if (score >= 85) return 'text-emerald-700 dark:text-emerald-300';
    if (score >= 70) return 'text-blue-700 dark:text-blue-300';
    if (score >= 55) return 'text-amber-700 dark:text-amber-300';
    return 'text-muted-foreground';
  };

  // Get program type badge color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'major':
        return 'border-purple-300 bg-purple-100 text-purple-700 dark:border-purple-700 dark:bg-purple-950/40 dark:text-purple-200';
      case 'minor':
        return 'border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200';
      case 'certificate':
        return 'border-green-300 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-950/40 dark:text-green-200';
      default:
        return 'border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  return (
    <div className={`my-4 p-6 border rounded-xl bg-card shadow-sm ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <GraduationCap size={20} className="text-[var(--primary)]" />
          Recommended Programs for You
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Based on our conversation, here are some programs that align with your interests and goals.
        </p>
      </div>

      {/* Program Cards */}
      <div className={isVersionB ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3 auto-rows-fr' : 'space-y-4'}>
        {sortedSuggestions.map((program, index) => {
          const isTopMatch = index === 0;
          const isSelected = selectedPrograms.has(program.program_name);

          return (
            <div
              key={program.program_name}
              className={`cursor-pointer rounded-lg border bg-white p-5 transition-all dark:bg-zinc-900/70 ${isSelected
                ? 'border-[var(--primary)] bg-[var(--primary-10)] shadow-md dark:bg-[var(--primary)]/15'
                : 'border-gray-200 hover:border-[var(--primary)] hover:shadow-sm dark:border-zinc-700 dark:hover:border-[var(--primary)] dark:hover:bg-zinc-900/90'
                } ${isVersionB ? 'flex flex-col h-full min-h-[360px]' : ''}`}
              onClick={() => !isSubmitted && handleToggleSelect(program)}
            >
              <div className={isVersionB ? 'flex flex-col h-full' : ''}>
                <div className={isVersionB ? 'flex-1' : ''}>
                  {/* Program Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-semibold text-foreground">{program.program_name}</h4>
                        {isTopMatch && (
                          <span className="rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:border-green-700 dark:bg-green-950/40 dark:text-green-200">
                            Top Match
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${getTypeColor(program.program_type)}`}>
                          {program.program_type.charAt(0).toUpperCase() + program.program_type.slice(1)}
                        </span>
                        {program.estimated_credits && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Based on your interests in {program.reason || 'this field'}.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Match Score */}
                    <div className="text-right ml-4">
                      <div className={`text-2xl font-bold ${getMatchColor(program.match_score)}`}>
                        {program.match_score}%
                      </div>
                      <div className="text-xs text-muted-foreground">Match</div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="mb-3">
                    <p className="text-sm leading-relaxed text-muted-foreground">{program.reason}</p>
                  </div>

                  {/* Career Alignment */}
                  {program.career_alignment && (
                    <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/35">
                      <div className="flex items-start gap-2">
                        <TrendingUp size={16} className="mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-300" />
                        <div>
                          <p className="mb-1 text-xs font-semibold text-blue-900 dark:text-blue-100">Career Alignment</p>
                          <p className="text-xs text-blue-800 dark:text-blue-200">{program.career_alignment}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Typical Courses */}
                  {program.typical_courses && program.typical_courses.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1 mb-2">
                        <BookOpen size={14} className="text-muted-foreground" />
                        <p className="text-xs font-semibold text-foreground">Typical Courses:</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {program.typical_courses.slice(0, 4).map((course, idx) => (
                          <span
                            key={idx}
                            className="rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                          >
                            {course}
                          </span>
                        ))}
                        {program.typical_courses.length > 4 && (
                          <span className="px-2 py-1 text-xs text-muted-foreground">
                            +{program.typical_courses.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selection Indicator */}
                <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md border-2 ${isSelected
                  ? 'border-green-500 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/35 dark:text-green-200'
                  : 'border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300'
                  } ${isVersionB ? 'mt-auto' : ''}`}>
                  {isSelected ? (
                    <>
                      <Check size={18} className="font-bold" />
                      <span className="font-semibold">Selected</span>
                    </>
                  ) : (
                    <span className="font-medium">Click to Select</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection Summary and Submit */}
      {selectedPrograms.size > 0 && (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/35">
          <p className="mb-3 text-sm text-blue-900 dark:text-blue-100">
            <span className="font-semibold">{selectedPrograms.size} program{selectedPrograms.size !== 1 ? 's' : ''} selected.</span> Click below to continue with your selection.
          </p>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitted || isReadOnly}
            className="w-full gap-2"
          >
            {isSubmitted ? (
              <>
                <CheckCircle2 size={18} />
                Submitted
              </>
            ) : (
              <>
                <Award size={18} />
                Continue with Selected Programs
              </>
            )}
          </Button>
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">Tip:</span> You can select multiple programs. After submitting, I'll help you find the specific versions offered at your university and guide you through course selection.
        </p>
      </div>
    </div>
  );
}
