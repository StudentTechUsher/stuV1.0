"use client"

import LandingFeatures from "@/components/landing/landing-features"
import LandingHero from "@/components/landing/landing-hero"
import LandingNavbar from "@/components/landing/landing-navbar"



export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <br />
        <LandingFeatures />
      </main>
    </div>
  )
}
