'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Briefcase, TrendingUp, DollarSign, GraduationCap, CheckCircle2 } from 'lucide-react';
import { CareerSuggestionsInput, CareerSuggestion } from '@/lib/chatbot/tools/careerSuggestionsTool';

interface CareerSuggestionsDisplayProps {
  suggestions: CareerSuggestionsInput;
  onSelectCareer: (careerTitle: string) => void;
  readOnly?: boolean;
  reviewMode?: boolean;
}

export default function CareerSuggestionsDisplay({
  suggestions,
  onSelectCareer,
  readOnly,
  reviewMode,
}: Readonly<CareerSuggestionsDisplayProps>) {
  const [selectedCareer, setSelectedCareer] = useState<string | null>(null);
  const isReadOnly = Boolean(readOnly || reviewMode);

  const handleSelect = (career: CareerSuggestion) => {
    if (isReadOnly) return;
    setSelectedCareer(career.title);
    onSelectCareer(career.title);
  };

  // Sort by match score descending
  const sortedCareers = [...suggestions.careers].sort((a, b) => b.match_score - a.match_score);

  return (
    <div className={`my-4 p-6 border rounded-xl bg-card shadow-sm ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase size={20} />
          Career Suggestions for You
        </h3>
        {suggestions.summary && (
          <p className="text-sm text-muted-foreground mt-2">
            {suggestions.summary}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {sortedCareers.map((career, index) => {
          const isSelected = selectedCareer === career.title;
          const matchColor =
            career.match_score >= 80 ? 'text-emerald-700 dark:text-emerald-300' :
            career.match_score >= 60 ? 'text-blue-700 dark:text-blue-300' :
            'text-orange-700 dark:text-orange-300';

          return (
            <div
              key={career.title}
              className={`
                p-4 rounded-lg border-2 transition-all bg-white dark:bg-zinc-900/60
                ${isSelected
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5 dark:bg-[var(--primary)]/15'
                  : 'border-gray-200 hover:border-gray-300 dark:border-zinc-700 dark:hover:border-zinc-500'
                }
              `}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-base text-foreground">{career.title}</h4>
                    {index === 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-[var(--primary)] text-black rounded-full">
                        Top Match
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-medium ${matchColor}`}>
                      {career.match_score}% Match
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2 size={24} className="text-[var(--primary)] flex-shrink-0" />
                )}
              </div>

              {/* Reason */}
              <p className="text-sm text-muted-foreground mb-3">
                <span className="font-medium text-foreground">Why this fits:</span> {career.reason}
              </p>

              {/* Details */}
              <div className="space-y-2 mb-3">
                {/* Job Growth */}
                <div className="flex items-start gap-2 text-sm">
                  <TrendingUp size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-foreground">Job Outlook:</span>{' '}
                    <span className="text-muted-foreground">{career.job_growth}</span>
                  </div>
                </div>

                {/* Salary */}
                {career.median_salary && (
                  <div className="flex items-start gap-2 text-sm">
                    <DollarSign size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">Typical Salary:</span>{' '}
                      <span className="text-muted-foreground">{career.median_salary}</span>
                    </div>
                  </div>
                )}

                {/* Related Programs */}
                {career.related_programs && career.related_programs.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <GraduationCap size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">Related Programs:</span>{' '}
                      <span className="text-muted-foreground">{career.related_programs.join(', ')}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Select Button */}
              <Button
                variant="primary"
                onClick={() => handleSelect(career)}
                disabled={isSelected || isReadOnly}
                className="w-full gap-2"
              >
                {isSelected ? (
                  <>
                    <CheckCircle2 size={18} />
                    Selected
                  </>
                ) : (
                  <>
                    <Briefcase size={18} />
                    Select {career.title}
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Helper Text */}
      {!selectedCareer && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          Select the career path that resonates most with you
        </p>
      )}
    </div>
  );
}
