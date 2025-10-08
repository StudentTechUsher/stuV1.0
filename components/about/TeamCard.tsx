/**
 * TeamCard Component
 *
 * Displays team member information with photo, name, role, bio, and LinkedIn link.
 * Uses tokenized CSS variables for consistent theming.
 */

import Image from "next/image"
import Link from "next/link"
import { Linkedin as LinkedinIcon } from "lucide-react"

interface TeamCardProps {
  name: string
  role: string
  bio: string
  photo: string
  linkedin: string
}

export function TeamCard({ name, role, bio, photo, linkedin }: TeamCardProps) {
  return (
    <div className="bg-[var(--card)] border-[var(--border)] rounded-2xl shadow-lg p-6 md:p-8 flex flex-col items-center text-center transition-all hover:shadow-xl">
      <div className="relative w-32 h-32 md:w-40 md:h-40 mb-6 rounded-full overflow-hidden border-4 border-[var(--primary)]">
        <Image
          src={photo}
          alt={`${name} headshot`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 128px, 160px"
        />
      </div>

      <h3 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] mb-2">
        {name}
      </h3>

      <p className="text-lg font-medium text-[var(--primary)] mb-4">
        {role}
      </p>

      <p className="text-[var(--muted-foreground)] mb-6 leading-relaxed">
        {bio}
      </p>

      <Link
        href={linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-[var(--primary)] hover:text-[var(--hover-green)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded-md px-3 py-2"
        aria-label={`${name}'s LinkedIn profile`}
      >
        <LinkedinIcon className="w-5 h-5" />
        <span className="font-medium">LinkedIn</span>
      </Link>
    </div>
  )
}
