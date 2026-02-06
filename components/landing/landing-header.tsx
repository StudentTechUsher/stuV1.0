"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Menu, X } from "lucide-react"
import { landingNavLinks, landingPageBg } from "./landing-data"
import type { LandingNavLink } from "./landing-data"

export type LandingHeaderProps = {
  navLinks?: LandingNavLink[]
  pageBg?: string
  logoSrc?: string
  logoAlt?: string
  logoHref?: string
  ctaHref?: string
  ctaLabel?: string
  onCtaClick?: (source: string) => void
}

export function LandingHeader({
  navLinks = landingNavLinks,
  pageBg = landingPageBg,
  logoSrc = "/favicon-96x96.png",
  logoAlt = "stu. logo",
  logoHref = "/",
  ctaHref = "/demo",
  ctaLabel = "Request a demo",
  onCtaClick,
}: LandingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header
      className="sticky top-0 z-30 border-b-2 border-border/60 backdrop-blur-md"
      style={{ backgroundColor: pageBg }}
    >
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-12">
        <Link href={logoHref} className="flex items-center gap-3 font-bold tracking-tight text-3xl">
          <Image
            src={logoSrc}
            alt={logoAlt}
            width={56}
            height={56}
            className="rounded-md"
            priority
          />
          <span>stu.</span>
        </Link>

        <nav className="hidden items-center gap-10 lg:flex">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-base font-semibold text-foreground/70 hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href={ctaHref}
            onClick={() => onCtaClick?.("header")}
          >
            <Button
              size="lg"
              className="rounded-full px-8 py-6 text-lg font-semibold leading-tight tracking-tight bg-foreground hover:bg-foreground/90"
              style={{ color: pageBg }}
            >
              {ctaLabel}
            </Button>
          </Link>
        </div>

        <button
          className="rounded-md p-2 text-foreground lg:hidden"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t-2 border-border/60 lg:hidden" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto flex flex-col gap-3 px-4 py-4 md:px-8">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-4 py-3 text-base font-medium text-foreground hover:bg-primary/5"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={ctaHref}
              onClick={() => {
                setMobileMenuOpen(false)
                onCtaClick?.("mobile_header")
              }}
            >
              <Button className="w-full rounded-full px-6 py-3 text-base">
                {ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
