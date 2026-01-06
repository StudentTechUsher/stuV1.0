"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Menu, X, Moon, Sun } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useUniversityTheme } from "@/contexts/university-theme-context"
import { useDarkMode } from "@/contexts/dark-mode-context"

interface NavbarProps {
  variant?: "universities" | "students" | "about"
}

export function Navbar({ variant = "universities" }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { university } = useUniversityTheme()
  const { isDark, setMode } = useDarkMode()

  const navLinks =
    variant === "students"
      ? [
          { href: "#features", label: "Features" },
          { href: "#testimonials", label: "Testimonials" },
          { href: "#pricing", label: "Pricing" },
          { href: "#faq", label: "FAQ" },
          { href: "/about-us", label: "About Us" },
        ]
      : variant === "about"
      ? [
          { href: "/#features", label: "Features" },
          { href: "/", label: "For Students" },
          { href: "/demo", label: "Request Demo" },
          { href: "/about-us", label: "About Us" },
        ]
      : [
          { href: "#features", label: "Features" },
          { href: "#testimonials", label: "Testimonials" },
          { href: "#pricing", label: "Pricing" },
          { href: "#faq", label: "FAQ" },
          { href: "/about-us", label: "About Us" },
        ]

  return (
    <header className="sticky top-0 z-40 glass-effect border-b border-zinc-200 dark:border-zinc-800">
      <div className="container mx-auto px-6 flex h-20 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-3">
            {university?.logo_url && (
              <div className="flex items-center gap-2">
                <Image
                  src={university.logo_url}
                  alt={`${university.name} logo`}
                  width={32}
                  height={32}
                  className="rounded object-contain"
                />
                <span className="text-xl font-bold text-muted-foreground">×</span>
              </div>
            )}
            <div className="flex items-center">
              <Image
                src="/favicon-96x96.png"
                alt="stu. logo"
                width={32}
                height={32}
                className="rounded-50 -mb-2"
                priority
              />
              <span className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">stu.</span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-base font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {variant === "students" ? (
          <div className="hidden md:flex items-center gap-6">
            {/* Dark mode toggle */}
            <button
              onClick={() => setMode(isDark ? 'light' : 'dark')}
              className="p-2 rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link href="/" className="text-base font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all rounded-md px-3 py-2">
              For Universities
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="lg">
                Get Started
              </Button>
            </Link>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-6">
            {/* Dark mode toggle */}
            <button
              onClick={() => setMode(isDark ? 'light' : 'dark')}
              className="p-2 rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link href="/" className="text-base font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all rounded-md px-3 py-2">
              For Students
            </Link>
            <Link href="/demo">
              <Button variant="primary" size="lg">
                Request a demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-all"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-100 dark:border-zinc-800">
          <div className="container mx-auto px-6 py-6 flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-base font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all rounded-md px-3 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Dark mode toggle */}
            <button
              onClick={() => setMode(isDark ? 'light' : 'dark')}
              className="flex items-center gap-2 text-base font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all rounded-md px-3 py-2"
            >
              {isDark ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            <div className="flex flex-col gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              {variant === "students" ? (
                <>
                  <Link
                    href="/"
                    className="text-base font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all rounded-md px-3 py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    For Universities
                  </Link>
                  <div className="flex flex-col gap-3 mt-4">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="secondary" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="primary" className="w-full">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/"
                    className="text-base font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all rounded-md px-3 py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    For Students →
                  </Link>
                  <Link href="/demo" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" className="w-full">
                      Request a demo
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
