"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X, ArrowRight } from "lucide-react"
import { useUniversityTheme } from "@/contexts/university-theme-context"

export default function LandingNavbar() {
  const [open, setOpen] = useState(false)
  const { university } = useUniversityTheme()

  return (
    <header className="sticky top-0 z-40 glass-effect border-b border-zinc-200">
      {/* centered row */}
      <div className="page-wrap flex h-20 items-center justify-between">
        {/* Logo first (left) */}
        <div className="flex items-center ml-1">
          <Link href="/" className="flex items-center gap-2">
            {/* University Logo */}
            {university?.logo_url && (
              <>
                <Image
                  src={university.logo_url}
                  alt={`${university.name} Logo`}
                  width={28}
                  height={28}
                  className="rounded"
                />
                <span className="text-xl text-muted-foreground mx-1">×</span>
              </>
            )}

            {/* STU Logo */}
            <Image
              src="/favicon.ico"
              alt="stu. logo"
              width={32}
              height={32}
              className="rounded-50 -mb-1"
              priority
            />
            <span className="text-4xl font-bold tracking-tight">stu.</span>
          </Link>
        </div>

        {/* Buttons + Mobile menu (right) */}
        <div className="flex items-center">
          {/* Desktop actions */}
          <nav className="hidden md:flex items-center gap-3 sm:gap-4 mr-1">
            {/* Log In — ghost/underline with visible hover + focus */}
            <Link href="/login">
              <span className="hover:text-green-600 font-bold">Log In</span>
            </Link>

            {/* New Student Sign Up — high contrast primary with real hover/active */}
            <Link href="/signup">
              <span className="hover:text-green-600">New Student Sign Up</span>
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            aria-label="Toggle menu"
            className="md:hidden p-2 ml-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
            onClick={() => setOpen(v => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown (also centered) */}
      {open && (
        <div className="md:hidden border-t border-zinc-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-sm">
          <div className="page-wrap py-6 flex flex-col gap-3">
            {/* Mobile: Log In as outline/ghost with clear hover */}
            <Link href="/login" onClick={() => setOpen(false)}>
              <Button
                variant="outline"
                className="
                  w-full rounded-lg bg-white text-foreground
                  ring-1 ring-zinc-300
                  hover:bg-zinc-50 hover:ring-zinc-400
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
                "
              >
                Log In
              </Button>
            </Link>

            {/* Mobile: Sign Up as primary with visible hover/active */}
            <Link href="/signup" onClick={() => setOpen(false)}>
              <Button
                className="
                  w-full rounded-lg bg-primary text-foreground
                  shadow-sm ring-1 ring-primary/30
                  hover:brightness-95 hover:shadow
                  active:brightness-90
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
                "
              >
                New Student Sign Up
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
