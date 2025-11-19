'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Search } from 'lucide-react';
import WizardFormLayout from '../WizardFormLayout';

interface StudentInterestsScreenProps {
  _defaultInterests?: string;
  onSubmit: (interests: string) => void;
  onSkip: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

const POPULAR_INTERESTS = [
  'Technology & Programming',
  'Business & Entrepreneurship',
  'Science & Research',
  'Arts & Design',
  'Sports & Fitness',
];

const ALL_INTERESTS = [
  // Technology
  'Technology & Programming',
  'Artificial Intelligence',
  'Data Science',
  'Cybersecurity',
  'Web Development',
  'Mobile App Development',
  'Cloud Computing',
  'Blockchain & Cryptocurrency',
  'Game Development',
  'Virtual Reality',
  'Robotics',
  'Internet of Things (IoT)',

  // Business & Finance
  'Business & Entrepreneurship',
  'Marketing & Sales',
  'Finance & Accounting',
  'Investing & Stock Market',
  'Real Estate',
  'Management & Leadership',
  'Economics',
  'Startups',
  'Supply Chain Management',
  'Business Analytics',

  // Science & Research
  'Science & Research',
  'Biology',
  'Chemistry',
  'Physics',
  'Astronomy',
  'Geology',
  'Environmental Science',
  'Genetics',
  'Biochemistry',

  // Medicine & Healthcare
  'Medicine & Healthcare',
  'Nursing',
  'Psychology',
  'Neuroscience',
  'Pharmacology',
  'Mental Health Counseling',
  'Public Health',
  'Dental Science',
  'Physical Therapy',
  'Sports Medicine',

  // Arts & Design
  'Arts & Design',
  'Graphic Design',
  'User Experience (UX)',
  'Animation & Visual Effects',
  'Photography & Film',
  'Fine Arts',
  'Painting',
  'Sculpture',
  'Architecture',
  'Interior Design',
  'Fashion Design',
  'Illustration',
  'Digital Art',
  'Art History',

  // Sports & Recreation
  'Sports & Fitness',
  'Athletic Training',
  'Exercise Science',
  'Sports Management',
  'Nutrition & Dietetics',
  'Yoga & Wellness',
  'Football',
  'Basketball',
  'Soccer',
  'Baseball',
  'Tennis',
  'Golf',
  'Swimming',
  'Track & Field',
  'Volleyball',
  'Martial Arts',
  'Surfing',
  'Skiing',
  'Rock Climbing',
  'Hiking & Outdoor Adventure',

  // Music & Performance
  'Music & Performance',
  'Music Production',
  'Sound Engineering',
  'Live Performance',
  'Composition & Songwriting',
  'Music Theory',
  'DJ & Electronic Music',
  'Classical Music',
  'Jazz',
  'Rock Music',
  'Hip-Hop & Rap',
  'Pop Music',
  'Dance & Choreography',
  'Theater & Acting',
  'Stand-up Comedy',
  'Musical Theater',

  // Environmental & Sustainability
  'Environmental Sustainability',
  'Climate Science',
  'Renewable Energy',
  'Conservation Biology',
  'Urban Sustainability',
  'Green Engineering',
  'Sustainable Agriculture',

  // Education & Language
  'Education & Teaching',
  'Elementary Education',
  'Secondary Education',
  'Special Education',
  'Language & Linguistics',
  'Foreign Languages',
  'Spanish',
  'French',
  'Chinese',
  'Japanese',
  'German',
  'Arabic',
  'Translation & Interpretation',

  // Writing & Communications
  'Literature & Writing',
  'Journalism',
  'Creative Writing',
  'Poetry',
  'Public Relations',
  'Communications',
  'Social Media Marketing',
  'Content Creation',
  'Podcasting',
  'Screenwriting',

  // Social Sciences & History
  'Social Sciences',
  'Sociology',
  'Anthropology',
  'Political Science',
  'International Relations',
  'Public Policy',
  'History',
  'World History',
  'American History',
  'Ancient History',
  'Medieval History',
  'Philosophy',
  'Ethics',

  // Law & Criminal Justice
  'Criminal Justice',
  'Law & Legal Studies',
  'Criminology',
  'Forensic Science',

  // Engineering
  'Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Chemical Engineering',
  'Aerospace Engineering',
  'Biomedical Engineering',
  'Manufacturing & Production',
  'Construction Management',

  // Hospitality & Travel
  'Hospitality & Tourism',
  'Hotel Management',
  'Event Planning',
  'Culinary Arts',
  'Chef & Cooking',
  'Wine & Beverage Management',
  'Travel & Adventure',
  'International Travel',

  // Agriculture & Animal Science
  'Agriculture & Food Science',
  'Agriculture',
  'Food Science',
  'Horticulture',
  'Forestry',
  'Marine Biology',
  'Aquaculture',
  'Veterinary Science',
  'Animal Science',
  'Pet Care',

  // Government & Service
  'Government & Public Service',
  'Military & Defense',
  'Social Work & Human Services',
  'Non-Profit Management',
  'Community Development',

  // Human Resources & Organization
  'Human Resources',
  'Organizational Development',
  'Leadership Development',

  // Personal Development & Wellness
  'Personal Development & Wellness',
  'Meditation & Mindfulness',
  'Life Coaching',
  'Counseling & Therapy',
  'Self-Help & Personal Growth',
  'Mindfulness',
  'Holistic Health',
  'Wellness & Prevention',

  // Hobbies & Interests
  'Reading & Books',
  'Board Games & Tabletop RPG',
  'Video Games',
  'Anime & Manga',
  'Comics & Graphic Novels',
  'Science Fiction & Fantasy',
  'Horror',
  'Mystery & Thriller',
  'Movies & Film',
  'Television Shows',
  'Documentaries',
  'Podcasts',
  'Collecting & Memorabilia',
  'DIY & Crafts',
  'Woodworking',
  'Model Building',
  'Gardening',
  'Aquarium Keeping',
  'Cooking & Baking',
  'Coffee & Tea Culture',
  'Wine Tasting',
  'Beer Brewing',
  'Photography',
  'Videography',
  'Astronomy & Stargazing',
  'Diving & Underwater Exploration',
];

export default function StudentInterestsScreen({
  _defaultInterests = '',
  onSubmit,
  onSkip,
  onBack,
  isLoading = false,
}: Readonly<StudentInterestsScreenProps>) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddInterest = useCallback((interest: string) => {
    const trimmed = interest.trim();
    if (trimmed && !selectedInterests.includes(trimmed)) {
      setSelectedInterests(prev => [...prev, trimmed]);
      setSearchTerm('');
    }
  }, [selectedInterests]);

  const handleRemoveInterest = useCallback((interest: string) => {
    setSelectedInterests(prev => prev.filter(i => i !== interest));
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return ALL_INTERESTS.filter(
      interest =>
        interest.toLowerCase().includes(term) &&
        !selectedInterests.includes(interest)
    ).slice(0, 10);
  }, [searchTerm, selectedInterests]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddInterest(searchTerm);
    }
  }, [searchTerm, handleAddInterest]);

  const handleSubmit = () => {
    if (selectedInterests.length === 0) {
      return;
    }
    const finalInterests = selectedInterests.join(' | ');
    onSubmit(finalInterests);
  };

  const isValid = selectedInterests.length > 0;

  return (
    <WizardFormLayout
      title="What are your interests?"
      subtitle="Search and add interests that match your hobbies, sports, passions, or academic focus. Press Enter to add custom interests."
      footerButtons={
        <div className="flex gap-3 justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="px-6 py-2 text-base font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onSkip}
              disabled={isLoading}
              className="px-6 py-2 text-base font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isLoading}
              className="px-6 py-2 text-base font-medium bg-primary text-white hover:hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Continuing...' : 'Continue →'}
            </Button>
          </div>
        </div>
      }
    >
      <form className="space-y-4">
        {/* Popular Interests Quick Select */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Quick select:</label>
          <div className="flex flex-wrap gap-2">
            {POPULAR_INTERESTS.map(interest => (
              <button
                key={interest}
                type="button"
                onClick={() => handleAddInterest(interest)}
                disabled={selectedInterests.includes(interest) || isLoading}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedInterests.includes(interest)
                    ? 'bg-primary text-white cursor-not-allowed opacity-50'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                } disabled:cursor-not-allowed`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search interests (e.g., Football, Travel, Investing, History, Photography)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            disabled={isLoading}
            autoFocus
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-400"
          />

          {/* Autocomplete Suggestions Dropdown */}
          {filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
              {filteredSuggestions.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleAddInterest(suggestion)}
                  className="w-full text-left px-4 py-2 hover:bg-primary bg-opacity-10 text-sm text-gray-900 border-b border-gray-200 last:border-b-0"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Helper Text */}
        <p className="text-xs text-gray-500">
          💡 Tip: Type to search our list of 160+ interests, or press Enter to add a custom interest
        </p>

        {/* Selected Interests Display */}
        {selectedInterests.length > 0 && (
          <div className="bg-primary bg-opacity-10 border border-gray-300 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 mb-3">Selected interests ({selectedInterests.length}):</p>
            <div className="flex flex-wrap gap-2">
              {selectedInterests.map(interest => (
                <div
                  key={interest}
                  className="inline-flex items-center gap-2 bg-white border border-primary text-gray-900 px-3 py-1 rounded-full text-sm"
                >
                  <span>{interest}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(interest)}
                    className="hover:opacity-80 flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </WizardFormLayout>
  );
}
