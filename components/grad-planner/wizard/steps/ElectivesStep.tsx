/**
 * Step 6: Optional Electives
 * User can search and add optional elective courses
 */

import React, { useState, useCallback } from 'react';
import { WizardState, Elective } from '../types';
import { WizardHeader } from '../WizardHeader';
import { WizardFooter } from '../WizardFooter';
import { cn } from '@/lib/utils';

interface ElectivesStepProps {
  state: WizardState;
  onAddElective: (elective: Elective) => void;
  onRemoveElective: (code: string) => void;
  onNext: () => void;
  onBack: () => void;
  searchCourses?: (query: string) => Promise<Elective[]>;
  isSearching?: boolean;
}

export const ElectivesStep: React.FC<ElectivesStepProps> = ({
  state,
  onAddElective,
  onRemoveElective,
  onNext,
  onBack,
  searchCourses,
  isSearching = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Elective[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);

      if (!query.trim() || !searchCourses) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setSearching(true);
      try {
        const results = await searchCourses(query);
        // Filter out already added electives
        const filtered = results.filter(
          (course) =>
            !state.userElectives.some((e) => e.code === course.code)
        );
        setSearchResults(filtered);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching courses:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [searchCourses, state.userElectives]
  );

  const handleAddCourse = (course: Elective) => {
    onAddElective(course);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <>
      <WizardHeader
        title="Want to add any elective courses?"
        subtext="Search and add additional courses beyond your requirements."
      />

      <div className="space-y-6">
        {/* Search Input */}
        <div className="relative space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setShowResults(true)}
              placeholder="Search by course code or title..."
              className={cn(
                'w-full px-4 py-3 rounded-lg border',
                'font-body text-sm',
                'bg-background text-foreground placeholder:text-muted-foreground',
                'transition-all duration-200',
                'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-15',
                'border-border hover:border-primary'
              )}
            />
            {(searching || isSearching) && (
              <div className="absolute right-3 top-3">
                <svg
                  className="animate-spin h-5 w-5 text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-primary-15 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
              {searchResults.map((course) => (
                <button
                  key={course.code}
                  onClick={() => handleAddCourse(course)}
                  className="w-full px-4 py-3 text-left hover:bg-primary-15 transition-colors duration-150 border-b border-muted last:border-b-0"
                >
                  <p className="font-body-semi text-sm text-foreground">
                    {course.code} - {course.title}
                  </p>
                  <p className="text-xs font-body text-muted-foreground mt-1">
                    {course.credits} credits
                  </p>
                </button>
              ))}
            </div>
          )}

          {showResults && searchQuery && searchResults.length === 0 && !searching && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-muted rounded-lg p-4 z-10">
              <p className="text-sm font-body text-muted-foreground">
                No courses found matching "{searchQuery}"
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {state.error && state.error.includes('already been added') && (
          <div className="p-3 rounded-lg bg-destructive-foreground border border-destructive">
            <p className="text-sm font-body text-destructive">{state.error}</p>
          </div>
        )}

        {/* Added Electives */}
        {state.userElectives.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-body-semi text-sm text-foreground">
              Added Electives ({state.userElectives.length})
            </h3>
            <div className="space-y-2">
              {state.userElectives.map((elective) => (
                <div
                  key={elective.code}
                  className="flex items-center justify-between p-3 rounded-lg bg-primary-15 border border-primary-22"
                >
                  <div>
                    <p className="font-body-semi text-sm text-foreground">
                      {elective.code} - {elective.title}
                    </p>
                    <p className="text-xs font-body text-muted-foreground mt-0.5">
                      {elective.credits} credits
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveElective(elective.code)}
                    className="flex-shrink-0 ml-3 text-destructive hover:bg-destructive hover:text-white px-2 py-1 rounded transition-colors duration-150"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {state.userElectives.length === 0 && !showResults && (
          <div className="py-8 text-center opacity-60">
            <p className="text-sm font-body text-muted-foreground">
              No electives added yet. Search above to add courses!
            </p>
          </div>
        )}
      </div>

      <WizardFooter
        onContinue={onNext}
        onBack={onBack}
        continueLabel="Continue to Review"
      />
    </>
  );
};

export default ElectivesStep;
