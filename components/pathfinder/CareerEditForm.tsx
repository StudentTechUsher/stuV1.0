/**
 * Assumptions:
 * - Controlled form with all career fields
 * - Markdown textarea with preview toggle
 * - Chip editors for arrays (skills, majors, etc.)
 * - Save Draft / Publish / Discard actions
 * - Uses design tokens from globals.css
 */

'use client';

import React, { useState } from 'react';
import type { Career, EducationLevel, GrowthLabel } from '@/types/career';

interface CareerEditFormProps {
  initialCareer: Career;
  onSave: (career: Career, publish: boolean) => Promise<void>;
  onCancel: () => void;
}

export default function CareerEditForm({
  initialCareer,
  onSave,
  onCancel,
}: CareerEditFormProps) {
  const [career, setCareer] = useState<Career>(initialCareer);
  const [isSaving, setIsSaving] = useState(false);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);

  // Chip input states
  const [skillInput, setSkillInput] = useState('');
  const [majorInput, setMajorInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [certInput, setCertInput] = useState('');
  const [activityInput, setActivityInput] = useState('');
  const [courseInput, setCourseInput] = useState('');
  const [internshipInput, setInternshipInput] = useState('');
  const [clubInput, setClubInput] = useState('');
  const [relatedInput, setRelatedInput] = useState('');
  const [linkLabelInput, setLinkLabelInput] = useState('');
  const [linkUrlInput, setLinkUrlInput] = useState('');

  const handleSave = async (publish: boolean) => {
    setIsSaving(true);
    try {
      await onSave(career, publish);
    } finally {
      setIsSaving(false);
    }
  };

  const addChip = (
    value: string,
    field: keyof Career,
    reset: () => void
  ) => {
    if (!value.trim()) return;
    const current = career[field] as string[];
    setCareer({ ...career, [field]: [...current, value.trim()] });
    reset();
  };

  const removeChip = (index: number, field: keyof Career) => {
    const current = career[field] as string[];
    setCareer({ ...career, [field]: current.filter((_, i) => i !== index) });
  };

  const addMajor = () => {
    if (!majorInput.trim()) return;
    setCareer({
      ...career,
      bestMajors: [
        ...career.bestMajors,
        { id: `maj_${Date.now()}`, name: majorInput.trim() },
      ],
    });
    setMajorInput('');
  };

  const removeMajor = (index: number) => {
    setCareer({
      ...career,
      bestMajors: career.bestMajors.filter((_, i) => i !== index),
    });
  };

  const addLink = () => {
    if (!linkLabelInput.trim() || !linkUrlInput.trim()) return;
    setCareer({
      ...career,
      links: [
        ...(career.links || []),
        { label: linkLabelInput.trim(), url: linkUrlInput.trim() },
      ],
    });
    setLinkLabelInput('');
    setLinkUrlInput('');
  };

  const removeLink = (index: number) => {
    setCareer({
      ...career,
      links: career.links?.filter((_, i) => i !== index),
    });
  };

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* Title & Slug */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
            Title *
          </label>
          <input
            type="text"
            value={career.title}
            onChange={(e) => setCareer({ ...career, title: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
            Slug *
          </label>
          <input
            type="text"
            value={career.slug}
            onChange={(e) => setCareer({ ...career, slug: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            required
          />
        </div>
      </div>

      {/* Short Overview */}
      <div>
        <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
          Short Overview (1-2 sentences) *
        </label>
        <textarea
          value={career.shortOverview}
          onChange={(e) =>
            setCareer({ ...career, shortOverview: e.target.value })
          }
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          required
        />
      </div>

      {/* Overview (Markdown) */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-body-semi text-[var(--foreground)]">
            Overview (Markdown supported) *
          </label>
          <button
            type="button"
            onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
            className="text-sm text-[var(--primary)] hover:underline"
          >
            {showMarkdownPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
        {showMarkdownPreview ? (
          <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] min-h-[200px] whitespace-pre-line">
            {career.overview}
          </div>
        ) : (
          <textarea
            value={career.overview}
            onChange={(e) => setCareer({ ...career, overview: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-mono text-sm"
            required
          />
        )}
      </div>

      {/* Education */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
            Typical Education Level *
          </label>
          <select
            value={career.education.typicalLevel}
            onChange={(e) =>
              setCareer({
                ...career,
                education: {
                  ...career.education,
                  typicalLevel: e.target.value as EducationLevel,
                },
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            <option value="BACHELOR">Bachelor&apos;s Degree</option>
            <option value="MASTER">Master&apos;s Degree</option>
            <option value="PHD">PhD</option>
            <option value="VARIES">Varies</option>
          </select>
        </div>
      </div>

      {/* Certifications (chips) */}
      <div>
        <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
          Certifications
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addChip(
                  certInput,
                  'education',
                  () => setCertInput('')
                );
              }
            }}
            placeholder="Add certification..."
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <button
            type="button"
            onClick={() => {
              if (!certInput.trim()) return;
              setCareer({
                ...career,
                education: {
                  ...career.education,
                  certifications: [
                    ...(career.education.certifications || []),
                    certInput.trim(),
                  ],
                },
              });
              setCertInput('');
            }}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi hover:bg-[var(--hover-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {career.education.certifications?.map((cert, idx) => (
            <span
              key={idx}
              className="px-3 py-1 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm flex items-center gap-2"
            >
              {cert}
              <button
                type="button"
                onClick={() => {
                  setCareer({
                    ...career,
                    education: {
                      ...career.education,
                      certifications: career.education.certifications?.filter(
                        (_, i) => i !== idx
                      ),
                    },
                  });
                }}
                className="text-[var(--destructive)] hover:text-[var(--destructive-foreground)]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Best Majors */}
      <div>
        <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
          Best-Fit Majors
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={majorInput}
            onChange={(e) => setMajorInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addMajor();
              }
            }}
            placeholder="Add major..."
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <button
            type="button"
            onClick={addMajor}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi hover:bg-[var(--hover-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {career.bestMajors.map((major, idx) => (
            <span
              key={idx}
              className="px-3 py-1 rounded-lg bg-[var(--primary-15)] text-[var(--foreground)] text-sm flex items-center gap-2 font-body-semi"
            >
              {major.name}
              <button
                type="button"
                onClick={() => removeMajor(idx)}
                className="text-[var(--destructive)] hover:text-[var(--destructive-foreground)]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Location Hubs */}
      <div>
        <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
          Location Hubs
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addChip(locationInput, 'locationHubs', () =>
                  setLocationInput('')
                );
              }
            }}
            placeholder="Add location (e.g., San Francisco, CA)..."
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <button
            type="button"
            onClick={() =>
              addChip(locationInput, 'locationHubs', () => setLocationInput(''))
            }
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi hover:bg-[var(--hover-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {career.locationHubs.map((loc, idx) => (
            <span
              key={idx}
              className="px-3 py-1 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm flex items-center gap-2"
            >
              📍 {loc}
              <button
                type="button"
                onClick={() => removeChip(idx, 'locationHubs')}
                className="text-[var(--destructive)] hover:text-[var(--destructive-foreground)]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Salary */}
      <div>
        <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
          Salary (USD)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">
              Entry
            </label>
            <input
              type="number"
              value={career.salaryUSD.entry || ''}
              onChange={(e) =>
                setCareer({
                  ...career,
                  salaryUSD: {
                    ...career.salaryUSD,
                    entry: e.target.value ? Number(e.target.value) : undefined,
                  },
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">
              Median
            </label>
            <input
              type="number"
              value={career.salaryUSD.median || ''}
              onChange={(e) =>
                setCareer({
                  ...career,
                  salaryUSD: {
                    ...career.salaryUSD,
                    median: e.target.value ? Number(e.target.value) : undefined,
                  },
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">
              90th %ile
            </label>
            <input
              type="number"
              value={career.salaryUSD.p90 || ''}
              onChange={(e) =>
                setCareer({
                  ...career,
                  salaryUSD: {
                    ...career.salaryUSD,
                    p90: e.target.value ? Number(e.target.value) : undefined,
                  },
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-xs text-[var(--muted-foreground)] mb-1">
            Source
          </label>
          <input
            type="text"
            value={career.salaryUSD.source || ''}
            onChange={(e) =>
              setCareer({
                ...career,
                salaryUSD: { ...career.salaryUSD, source: e.target.value },
              })
            }
            placeholder="e.g., Bureau of Labor Statistics, 2024"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
      </div>

      {/* Outlook */}
      <div>
        <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
          Job Outlook
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">
              Growth Label
            </label>
            <select
              value={career.outlook.growthLabel || ''}
              onChange={(e) =>
                setCareer({
                  ...career,
                  outlook: {
                    ...career.outlook,
                    growthLabel: e.target.value as GrowthLabel,
                  },
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="">Select...</option>
              <option value="Hot">Hot</option>
              <option value="Growing">Growing</option>
              <option value="Stable">Stable</option>
              <option value="Declining">Declining</option>
            </select>
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-xs text-[var(--muted-foreground)] mb-1">
            Notes
          </label>
          <textarea
            value={career.outlook.notes || ''}
            onChange={(e) =>
              setCareer({
                ...career,
                outlook: { ...career.outlook, notes: e.target.value },
              })
            }
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <div className="mt-2">
          <label className="block text-xs text-[var(--muted-foreground)] mb-1">
            Source
          </label>
          <input
            type="text"
            value={career.outlook.source || ''}
            onChange={(e) =>
              setCareer({
                ...career,
                outlook: { ...career.outlook, source: e.target.value },
              })
            }
            placeholder="e.g., BLS Occupational Outlook Handbook"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
      </div>

      {/* Top Skills */}
      <div>
        <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
          Top Skills
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addChip(skillInput, 'topSkills', () => setSkillInput(''));
              }
            }}
            placeholder="Add skill..."
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <button
            type="button"
            onClick={() => addChip(skillInput, 'topSkills', () => setSkillInput(''))}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi hover:bg-[var(--hover-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {career.topSkills.map((skill, idx) => (
            <span
              key={idx}
              className="px-3 py-1 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm flex items-center gap-2"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeChip(idx, 'topSkills')}
                className="text-[var(--destructive)] hover:text-[var(--destructive-foreground)]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Day-to-Day Activities */}
      <div>
        <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
          Day-to-Day Activities
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={activityInput}
            onChange={(e) => setActivityInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addChip(activityInput, 'dayToDay', () => setActivityInput(''));
              }
            }}
            placeholder="Add activity..."
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <button
            type="button"
            onClick={() =>
              addChip(activityInput, 'dayToDay', () => setActivityInput(''))
            }
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi hover:bg-[var(--hover-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            Add
          </button>
        </div>
        <ul className="space-y-2">
          {career.dayToDay.map((activity, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 p-2 rounded-lg bg-[var(--muted)]"
            >
              <span className="flex-1 text-sm text-[var(--foreground)]">
                {activity}
              </span>
              <button
                type="button"
                onClick={() => removeChip(idx, 'dayToDay')}
                className="text-[var(--destructive)] hover:text-[var(--destructive-foreground)]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Recommended Courses */}
      <div>
        <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
          Recommended Courses
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={courseInput}
            onChange={(e) => setCourseInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setCareer({
                  ...career,
                  recommendedCourses: [
                    ...(career.recommendedCourses || []),
                    courseInput.trim(),
                  ],
                });
                setCourseInput('');
              }
            }}
            placeholder="Add course..."
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <button
            type="button"
            onClick={() => {
              if (!courseInput.trim()) return;
              setCareer({
                ...career,
                recommendedCourses: [
                  ...(career.recommendedCourses || []),
                  courseInput.trim(),
                ],
              });
              setCourseInput('');
            }}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi hover:bg-[var(--hover-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {career.recommendedCourses?.map((course, idx) => (
            <span
              key={idx}
              className="px-3 py-1 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] text-sm flex items-center gap-2"
            >
              {course}
              <button
                type="button"
                onClick={() => {
                  setCareer({
                    ...career,
                    recommendedCourses: career.recommendedCourses?.filter(
                      (_, i) => i !== idx
                    ),
                  });
                }}
                className="text-[var(--destructive)] hover:text-[var(--destructive-foreground)]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Internships */}
      <div>
        <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
          Internships
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={internshipInput}
            onChange={(e) => setInternshipInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setCareer({
                  ...career,
                  internships: [
                    ...(career.internships || []),
                    internshipInput.trim(),
                  ],
                });
                setInternshipInput('');
              }
            }}
            placeholder="Add internship..."
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <button
            type="button"
            onClick={() => {
              if (!internshipInput.trim()) return;
              setCareer({
                ...career,
                internships: [
                  ...(career.internships || []),
                  internshipInput.trim(),
                ],
              });
              setInternshipInput('');
            }}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi hover:bg-[var(--hover-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {career.internships?.map((intern, idx) => (
            <span
              key={idx}
              className="px-3 py-1 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] text-sm flex items-center gap-2"
            >
              {intern}
              <button
                type="button"
                onClick={() => {
                  setCareer({
                    ...career,
                    internships: career.internships?.filter((_, i) => i !== idx),
                  });
                }}
                className="text-[var(--destructive)] hover:text-[var(--destructive-foreground)]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Clubs */}
      <div>
        <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
          Clubs
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={clubInput}
            onChange={(e) => setClubInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setCareer({
                  ...career,
                  clubs: [...(career.clubs || []), clubInput.trim()],
                });
                setClubInput('');
              }
            }}
            placeholder="Add club..."
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <button
            type="button"
            onClick={() => {
              if (!clubInput.trim()) return;
              setCareer({
                ...career,
                clubs: [...(career.clubs || []), clubInput.trim()],
              });
              setClubInput('');
            }}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi hover:bg-[var(--hover-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {career.clubs?.map((club, idx) => (
            <span
              key={idx}
              className="px-3 py-1 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] text-sm flex items-center gap-2"
            >
              {club}
              <button
                type="button"
                onClick={() => {
                  setCareer({
                    ...career,
                    clubs: career.clubs?.filter((_, i) => i !== idx),
                  });
                }}
                className="text-[var(--destructive)] hover:text-[var(--destructive-foreground)]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Related Careers */}
      <div>
        <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
          Related Careers (slugs)
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={relatedInput}
            onChange={(e) => setRelatedInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setCareer({
                  ...career,
                  relatedCareers: [
                    ...(career.relatedCareers || []),
                    relatedInput.trim(),
                  ],
                });
                setRelatedInput('');
              }
            }}
            placeholder="Add related career slug..."
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <button
            type="button"
            onClick={() => {
              if (!relatedInput.trim()) return;
              setCareer({
                ...career,
                relatedCareers: [
                  ...(career.relatedCareers || []),
                  relatedInput.trim(),
                ],
              });
              setRelatedInput('');
            }}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi hover:bg-[var(--hover-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {career.relatedCareers?.map((rel, idx) => (
            <span
              key={idx}
              className="px-3 py-1 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] text-sm flex items-center gap-2"
            >
              {rel}
              <button
                type="button"
                onClick={() => {
                  setCareer({
                    ...career,
                    relatedCareers: career.relatedCareers?.filter(
                      (_, i) => i !== idx
                    ),
                  });
                }}
                className="text-[var(--destructive)] hover:text-[var(--destructive-foreground)]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Links */}
      <div>
        <label className="block text-sm font-body-semi text-[var(--foreground)] mb-2">
          Sources & Links
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={linkLabelInput}
            onChange={(e) => setLinkLabelInput(e.target.value)}
            placeholder="Label..."
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <input
            type="url"
            value={linkUrlInput}
            onChange={(e) => setLinkUrlInput(e.target.value)}
            placeholder="URL..."
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <button
            type="button"
            onClick={addLink}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi hover:bg-[var(--hover-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            Add
          </button>
        </div>
        <ul className="space-y-2">
          {career.links?.map((link, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 p-2 rounded-lg bg-[var(--muted)]"
            >
              <span className="flex-1 text-sm">
                <strong>{link.label}:</strong>{' '}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--primary)] hover:underline"
                >
                  {link.url}
                </a>
              </span>
              <button
                type="button"
                onClick={() => removeLink(idx)}
                className="text-[var(--destructive)] hover:text-[var(--destructive-foreground)]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 bg-[var(--card)] border-t border-[var(--border)] pt-4 flex gap-3">
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={isSaving}
          className="px-6 py-3 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] font-body-semi hover:bg-[var(--muted)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={isSaving}
          className="px-6 py-3 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi hover:bg-[var(--hover-green)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
        >
          {isSaving ? 'Publishing...' : 'Publish'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-6 py-3 rounded-lg bg-[var(--destructive)] text-[var(--destructive-foreground)] font-body-semi hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
        >
          Discard Changes
        </button>
      </div>

      {/* Last Updated Info */}
      <div className="text-sm text-[var(--muted-foreground)] mt-4">
        Last updated: {new Date(career.lastUpdatedISO).toLocaleString()}
        {career.updatedBy && ` by ${career.updatedBy.name} (${career.updatedBy.role})`}
      </div>
    </form>
  );
}
