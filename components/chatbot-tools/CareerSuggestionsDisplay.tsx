'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Briefcase, TrendingUp, DollarSign, GraduationCap, CheckCircle2 } from 'lucide-react';
import { CareerSuggestionsInput, CareerSuggestion } from '@/lib/chatbot/tools/careerSuggestionsTool';

interface CareerSuggestionsDisplayProps {
  suggestions: CareerSuggestionsInput;
  onSelectCareer: (careerTitle: string) => void;
}

export default function CareerSuggestionsDisplay({
  suggestions,
  onSelectCareer,
}: Readonly<CareerSuggestionsDisplayProps>) {
  const [selectedCareer, setSelectedCareer] = useState<string | null>(null);

  const handleSelect = (career: CareerSuggestion) => {
    setSelectedCareer(career.title);
    onSelectCareer(career.title);
  };

  // Sort by match score descending
  const sortedCareers = [...suggestions.careers].sort((a, b) => b.match_score - a.match_score);

  return (
    <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
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
            career.match_score >= 80 ? 'text-green-600' :
            career.match_score >= 60 ? 'text-blue-600' :
            'text-orange-600';

          return (
            <div
              key={career.title}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${isSelected
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                  : 'border-gray-200 hover:border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900'
                }
              `}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-base">{career.title}</h4>
                    {index === 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-[var(--primary)] text-primary-foreground rounded-full">
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
              <p className="text-sm text-gray-700 mb-3">
                <span className="font-medium">Why this fits:</span> {career.reason}
              </p>

              {/* Details */}
              <div className="space-y-2 mb-3">
                {/* Job Growth */}
                <div className="flex items-start gap-2 text-sm">
                  <TrendingUp size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-700">Job Outlook:</span>{' '}
                    <span className="text-gray-600">{career.job_growth}</span>
                  </div>
                </div>

                {/* Salary */}
                {career.median_salary && (
                  <div className="flex items-start gap-2 text-sm">
                    <DollarSign size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">Typical Salary:</span>{' '}
                      <span className="text-gray-600">{career.median_salary}</span>
                    </div>
                  </div>
                )}

                {/* Related Programs */}
                {career.related_programs && career.related_programs.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <GraduationCap size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">Related Programs:</span>{' '}
                      <span className="text-gray-600">{career.related_programs.join(', ')}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Select Button */}
              <Button
                variant="primary"
                onClick={() => handleSelect(career)}
                disabled={isSelected}
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
