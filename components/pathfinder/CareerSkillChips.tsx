/**
 * Assumptions:
 * - Displays skill tags/chips
 * - Uses design tokens
 */

'use client';

import React from 'react';

interface CareerSkillChipsProps {
  skills: string[];
}

export default function CareerSkillChips({ skills }: CareerSkillChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill, idx) => (
        <span
          key={idx}
          className="px-3 py-1 text-sm rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] font-body"
        >
          {skill}
        </span>
      ))}
    </div>
  );
}
