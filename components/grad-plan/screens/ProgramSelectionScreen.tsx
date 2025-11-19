'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import WizardFormLayout from '../WizardFormLayout';
import {
  ProgramSelectionInput,
  ProgramOption,
  fetchProgramsByType,
} from '@/lib/chatbot/tools/programSelectionTool';

interface ProgramSelectionScreenProps {
  studentType: 'undergraduate' | 'graduate';
  universityId: number;
  onSubmit: (data: ProgramSelectionInput) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function ProgramSelectionScreen({
  studentType,
  universityId,
  onSubmit,
  onBack,
  isLoading = false,
}: Readonly<ProgramSelectionScreenProps>) {
  // Undergraduate state
  const [majors, setMajors] = useState<ProgramOption[]>([]);
  const [minors, setMinors] = useState<ProgramOption[]>([]);
  const [genEds, setGenEds] = useState<ProgramOption[]>([]);
  const [selectedMajors, setSelectedMajors] = useState<ProgramOption[]>([]);
  const [selectedMinors, setSelectedMinors] = useState<ProgramOption[]>([]);
  const [selectedGenEds, setSelectedGenEds] = useState<ProgramOption[]>([]);
  const [majorSearchTerm, setMajorSearchTerm] = useState('');
  const [minorSearchTerm, setMinorSearchTerm] = useState('');
  const [genEdSearchTerm, setGenEdSearchTerm] = useState('');

  // Graduate state
  const [graduatePrograms, setGraduatePrograms] = useState<ProgramOption[]>([]);
  const [selectedGraduatePrograms, setSelectedGraduatePrograms] = useState<ProgramOption[]>([]);
  const [graduateSearchTerm, setGraduateSearchTerm] = useState('');

  // Loading states
  const [loadingMajors, setLoadingMajors] = useState(false);
  const [loadingMinors, setLoadingMinors] = useState(false);
  const [loadingGenEds, setLoadingGenEds] = useState(false);
  const [loadingGraduate, setLoadingGraduate] = useState(false);

  // Fetch programs based on student type
  useEffect(() => {
    if (studentType === 'undergraduate') {
      // Fetch majors
      setLoadingMajors(true);
      fetchProgramsByType(universityId, 'major')
        .then(setMajors)
        .finally(() => setLoadingMajors(false));

      // Fetch minors
      setLoadingMinors(true);
      fetchProgramsByType(universityId, 'minor')
        .then(setMinors)
        .finally(() => setLoadingMinors(false));

      // Fetch gen eds
      setLoadingGenEds(true);
      fetchProgramsByType(universityId, 'gen_ed')
        .then((genEdPrograms) => {
          setGenEds(genEdPrograms);
          // Auto-select if only one gen ed option
          if (genEdPrograms.length === 1) {
            setSelectedGenEds(genEdPrograms);
          }
        })
        .finally(() => setLoadingGenEds(false));
    } else {
      // Fetch graduate programs
      setLoadingGraduate(true);
      fetchProgramsByType(universityId, 'graduate')
        .then(setGraduatePrograms)
        .finally(() => setLoadingGraduate(false));
    }
  }, [studentType, universityId]);

  // Filter programs based on search term
  const filterPrograms = (programs: ProgramOption[], searchTerm: string): ProgramOption[] => {
    if (!searchTerm.trim()) return programs;
    return programs.filter(program =>
      program.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredMajors = filterPrograms(majors, majorSearchTerm);
  const filteredMinors = filterPrograms(minors, minorSearchTerm);
  const filteredGenEds = filterPrograms(genEds, genEdSearchTerm);
  const filteredGraduatePrograms = filterPrograms(graduatePrograms, graduateSearchTerm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (studentType === 'undergraduate') {
      if (selectedMajors.length === 0) {
        alert('Please select at least one major');
        return;
      }

      onSubmit({
        studentType: 'undergraduate',
        programs: {
          majorIds: selectedMajors.map(m => m.id),
          minorIds: selectedMinors.map(m => m.id),
          genEdIds: selectedGenEds.map(g => g.id),
        },
      });
    } else {
      if (selectedGraduatePrograms.length === 0) {
        alert('Please select at least one graduate program');
        return;
      }

      onSubmit({
        studentType: 'graduate',
        programs: {
          graduateProgramIds: selectedGraduatePrograms.map(p => p.id),
        },
      });
    }
  };

  const isValid = studentType === 'undergraduate'
    ? selectedMajors.length > 0
    : selectedGraduatePrograms.length > 0;

  // Helper to render program selection list
  const ProgramList = ({
    programs,
    selected,
    onToggle,
    loading,
  }: {
    programs: ProgramOption[];
    selected: ProgramOption[];
    onToggle: (program: ProgramOption) => void;
    loading: boolean;
  }) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      );
    }

    if (programs.length === 0) {
      return (
        <div className="py-8 text-center text-gray-500">
          <p>No programs found</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {programs.map(program => {
          const isSelected = selected.some(p => p.id === program.id);
          return (
            <label
              key={program.id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(program)}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-900">{program.name}</span>
            </label>
          );
        })}
      </div>
    );
  };

  const renderUndergraduateContent = () => (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Majors */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Major(s) <span className="text-red-500">*</span></h3>
          <p className="text-xs text-gray-600 mb-3">Select at least one major</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search majors..."
            value={majorSearchTerm}
            onChange={(e) => setMajorSearchTerm(e.target.value)}
            className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* List */}
        <ProgramList
          programs={filteredMajors}
          selected={selectedMajors}
          onToggle={(program) => {
            setSelectedMajors(prev =>
              prev.some(p => p.id === program.id)
                ? prev.filter(p => p.id !== program.id)
                : [...prev, program]
            );
          }}
          loading={loadingMajors}
        />

        {/* Selected display */}
        {selectedMajors.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {selectedMajors.map(major => (
              <div
                key={major.id}
                style={{
                  backgroundColor: 'rgba(18, 249, 135, 0.15)',
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)'
                }}
                className="px-3 py-1 border rounded-full text-sm font-medium flex items-center gap-2"
              >
                {major.name}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMajors(prev => prev.filter(p => p.id !== major.id))
                  }
                  className="hover:opacity-80"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Minors - Optional */}
      {minors.length > 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Minor(s) <span className="text-xs text-gray-500">(Optional)</span></h3>
            <p className="text-xs text-gray-600 mb-3">Add any minors you're pursuing</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search minors..."
              value={minorSearchTerm}
              onChange={(e) => setMinorSearchTerm(e.target.value)}
              className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* List */}
          <ProgramList
            programs={filteredMinors}
            selected={selectedMinors}
            onToggle={(program) => {
              setSelectedMinors(prev =>
                prev.some(p => p.id === program.id)
                  ? prev.filter(p => p.id !== program.id)
                  : [...prev, program]
              );
            }}
            loading={loadingMinors}
          />

          {/* Selected display */}
          {selectedMinors.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {selectedMinors.map(minor => (
                <div
                  key={minor.id}
                  style={{
                    backgroundColor: 'rgba(18, 249, 135, 0.15)',
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)'
                  }}
                  className="px-3 py-1 border rounded-full text-sm font-medium flex items-center gap-2"
                >
                  {minor.name}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMinors(prev => prev.filter(p => p.id !== minor.id))
                    }
                    className="hover:opacity-80"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gen Eds - Only show if more than one option */}
      {genEds.length > 1 && (
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">General Education <span className="text-xs text-gray-500">(Optional)</span></h3>
            <p className="text-xs text-gray-600 mb-3">Add any general education requirements</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search gen ed..."
              value={genEdSearchTerm}
              onChange={(e) => setGenEdSearchTerm(e.target.value)}
              className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* List */}
          <ProgramList
            programs={filteredGenEds}
            selected={selectedGenEds}
            onToggle={(program) => {
              setSelectedGenEds(prev =>
                prev.some(p => p.id === program.id)
                  ? prev.filter(p => p.id !== program.id)
                  : [...prev, program]
              );
            }}
            loading={loadingGenEds}
          />

          {/* Selected display */}
          {selectedGenEds.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {selectedGenEds.map(genEd => (
                <div
                  key={genEd.id}
                  style={{
                    backgroundColor: 'rgba(18, 249, 135, 0.15)',
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)'
                  }}
                  className="px-3 py-1 border rounded-full text-sm font-medium flex items-center gap-2"
                >
                  {genEd.name}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedGenEds(prev => prev.filter(p => p.id !== genEd.id))
                    }
                    className="hover:opacity-80"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Auto-selected Gen Ed notice */}
      {genEds.length === 1 && selectedGenEds.length === 1 && (
        <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-700">
            <span className="font-medium">General Education:</span> {selectedGenEds[0].name}
            <span className="text-xs text-gray-500 ml-2">(auto-selected)</span>
          </p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-2 text-base font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className="px-6 py-2 text-base font-medium bg-primary text-white hover:hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Continuing...' : 'Continue →'}
        </Button>
      </div>
    </form>
  );

  const renderGraduateContent = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Graduate Programs */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Graduate Program(s) <span className="text-red-500">*</span></h3>
          <p className="text-xs text-gray-600 mb-3">Select your Master's, PhD, or other graduate program</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search graduate programs..."
            value={graduateSearchTerm}
            onChange={(e) => setGraduateSearchTerm(e.target.value)}
            className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* List */}
        <ProgramList
          programs={filteredGraduatePrograms}
          selected={selectedGraduatePrograms}
          onToggle={(program) => {
            setSelectedGraduatePrograms(prev =>
              prev.some(p => p.id === program.id)
                ? prev.filter(p => p.id !== program.id)
                : [...prev, program]
            );
          }}
          loading={loadingGraduate}
        />

        {/* Selected display */}
        {selectedGraduatePrograms.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {selectedGraduatePrograms.map(program => (
              <div
                key={program.id}
                style={{
                  backgroundColor: 'rgba(18, 249, 135, 0.15)',
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)'
                }}
                className="px-3 py-1 border rounded-full text-sm font-medium flex items-center gap-2"
              >
                {program.name}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedGraduatePrograms(prev => prev.filter(p => p.id !== program.id))
                  }
                  className="hover:opacity-80"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-2 text-base font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className="px-6 py-2 text-base font-medium bg-primary text-white hover:hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Continuing...' : 'Continue →'}
        </Button>
      </div>
    </form>
  );

  return (
    <WizardFormLayout
      title={studentType === 'undergraduate' ? "What's your major?" : 'Select your graduate program'}
      subtitle={studentType === 'undergraduate'
        ? 'Choose the degree program(s) for your goal.'
        : 'Choose your graduate program(s).'}
    >
      {studentType === 'undergraduate' ? renderUndergraduateContent() : renderGraduateContent()}
    </WizardFormLayout>
  );
}
