"use client"

import Image from "next/image"

export default function LandingHero() {
  return (
    <section id="hero" className="relative overflow-hidden py-16 md:py-24">
      {/* full-bleed glow */}
      <div className="absolute inset-0 primary-glow opacity-80 py-16 pointer-events-none" />

      {/* centered content */}
      <div className="page-wrap relative">
        <br />
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
              Revolutionize Academic Planning at Your University
            </h1>
            <p className="max-w-[620px] text-zinc-600 md:text-xl">
              Empower your students with an intelligent course scheduling platform that ensures smoother degree progression and higher graduation rates.
            </p>
          </div>

          <div className="relative w-full">
            <div
              className="relative w-full max-w-md md:max-w-lg aspect-[4/3] rounded-2xl overflow-hidden"
            >
              <Image
                src="/hero-graduation.jpg"
                alt="Students celebrating graduation, tossing caps"
                fill
                sizes="(min-width: 512px) 30vw, 82vw"
                className="object-cover py-1"
              />
            </div>
          </div>
        </div>
        <br />
      </div>
    </section>
  )
}
