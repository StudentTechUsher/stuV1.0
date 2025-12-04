"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Menu, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useUniversityTheme } from "@/contexts/university-theme-context"

interface NavbarProps {
  variant?: "universities" | "students" | "about"
}

export function Navbar({ variant = "universities" }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { university } = useUniversityTheme()

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
    <header className="sticky top-0 z-40 glass-effect">
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
                <span className="text-xl font-bold text-gray-400">×</span>
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
              <span className="text-4xl font-bold tracking-tight">stu.</span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-base font-medium hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-md px-2 py-1"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {variant === "students" ? (
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-base font-medium hover:text-primary transition-colors">
              For Universities
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-700 hover:bg-zinc-700 hover:text-white font-medium px-6 py-2.5 text-base transition-all"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-[var(--hover-green)] text-zinc-900 hover:text-white border-none font-medium px-6 py-2.5 text-base transition-all">
                Get Started
              </Button>
            </Link>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-base font-medium hover:text-primary transition-colors">
              For Students
            </Link>
            <Link href="/demo">
              <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium px-6 py-2.5 text-base">
                Request a demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-100">
          <div className="container mx-auto px-6 py-6 flex flex-col gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-base font-medium hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-4 pt-4 border-t border-zinc-100">
              {variant === "students" ? (
                <>
                  <Link
                    href="/"
                    className="text-base font-medium hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    For Universities
                  </Link>
                  <div className="flex flex-col gap-3 mt-4">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant="outline"
                        className="w-full border-zinc-700 text-zinc-700 hover:bg-zinc-700 hover:text-white font-medium"
                      >
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-primary hover:bg-[var(--hover-green)] text-zinc-900 hover:text-white border-none font-medium transition-all">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/"
                    className="text-base font-medium hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    For Students →
                  </Link>
                  <Link href="/demo" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium w-full py-2.5 text-base">
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
