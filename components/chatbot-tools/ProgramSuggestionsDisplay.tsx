'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GraduationCap, TrendingUp, BookOpen, Award, CheckCircle2, Check } from 'lucide-react';
import type { ProgramSuggestion, ProgramSuggestionsInput } from '@/lib/chatbot/tools/programSuggestionsTool';

interface ProgramSuggestionsDisplayProps {
  suggestions: ProgramSuggestionsInput;
  onSelectProgram: (programs: Array<{ programName: string; programType: string }>) => void;
}

export default function ProgramSuggestionsDisplay({
  suggestions,
  onSelectProgram,
}: Readonly<ProgramSuggestionsDisplayProps>) {
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleToggleSelect = (program: ProgramSuggestion) => {
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
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 55) return 'text-yellow-600';
    return 'text-gray-600';
  };

  // Get program type badge color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'major':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'minor':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'certificate':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
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
      <div className="space-y-4">
        {sortedSuggestions.map((program, index) => {
          const isTopMatch = index === 0;
          const isSelected = selectedPrograms.has(program.program_name);

          return (
            <div
              key={program.program_name}
              className={`p-5 border rounded-lg transition-all cursor-pointer ${
                isSelected
                  ? 'border-[var(--primary)] bg-[var(--primary-10)] shadow-md'
                  : 'border-gray-200 hover:border-[var(--primary)] hover:shadow-sm'
              }`}
              onClick={() => !isSubmitted && handleToggleSelect(program)}
            >
              {/* Program Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-lg">{program.program_name}</h4>
                    {isTopMatch && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700 border border-green-300">
                        Top Match
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${getTypeColor(program.program_type)}`}>
                      {program.program_type.charAt(0).toUpperCase() + program.program_type.slice(1)}
                    </span>
                    {program.estimated_credits && (
                      <span className="text-xs text-muted-foreground">
                        ~{program.estimated_credits} credits
                      </span>
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
                <p className="text-sm text-gray-700 leading-relaxed">{program.reason}</p>
              </div>

              {/* Career Alignment */}
              {program.career_alignment && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <TrendingUp size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-blue-900 mb-1">Career Alignment</p>
                      <p className="text-xs text-blue-800">{program.career_alignment}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Typical Courses */}
              {program.typical_courses && program.typical_courses.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-1 mb-2">
                    <BookOpen size={14} className="text-gray-600" />
                    <p className="text-xs font-semibold text-gray-700">Typical Courses:</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {program.typical_courses.slice(0, 4).map((course, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md border border-gray-200"
                      >
                        {course}
                      </span>
                    ))}
                    {program.typical_courses.length > 4 && (
                      <span className="px-2 py-1 text-xs text-gray-500">
                        +{program.typical_courses.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Selection Indicator */}
              <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md border-2 ${
                isSelected
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'bg-gray-50 border-gray-300 text-gray-600'
              }`}>
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
          );
        })}
      </div>

      {/* Selection Summary and Submit */}
      {selectedPrograms.size > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 mb-3">
            <span className="font-semibold">{selectedPrograms.size} program{selectedPrograms.size !== 1 ? 's' : ''} selected.</span> Click below to continue with your selection.
          </p>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitted}
            className={`w-full gap-2 ${
              isSubmitted
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#0a1f1a] hover:bg-[#043322]'
            }`}
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
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Tip:</span> You can select multiple programs. After submitting, I'll help you find the specific versions offered at your university and guide you through course selection.
        </p>
      </div>
    </div>
  );
}
