"use client"

import { ArrowLeft, Menu, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export default function StudentPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 glass-effect">
        <div className="container mx-auto px-6 flex h-20 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/favicon-96x96.png"
                alt="stu. logo" 
                width={32}
                height={32}
                className="rounded-full -mb-2"
                priority
              />
              <span className="text-4xl font-bold tracking-tight">stu.</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/students#features" className="text-base font-medium hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="/how-it-works" className="text-base font-medium hover:text-primary transition-colors">
              How It Works
            </Link>
            <Link href="/students#testimonials" className="text-base font-medium hover:text-primary transition-colors">
              Student Stories
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/" className="text-base font-medium hover:text-primary transition-colors">
              For Universities
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-100">
            <div className="container mx-auto px-6 py-6 flex flex-col gap-6">
              <Link
                href="/students#features"
                className="text-base font-medium hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-base font-medium hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link
                href="/students#testimonials"
                className="text-base font-medium hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Student Stories
              </Link>
              <div className="flex flex-col gap-4 pt-4 border-t border-zinc-100">
                <Link
                  href="/"
                  className="text-base font-medium hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  For Universities
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Link href="/students" className="self-start mb-8 text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="inline-block mr-2 h-4 w-4" />
          Back
        </Link>
        {/* How It Works Section */}
        <section id="how-it-works" className="py-20">
          <div className="container mx-auto px-4 md:px-6 flex flex-col items-center justify-center text-center">
            <div className="flex flex-col items-center justify-center gap-4 text-center md:gap-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                  How stu Works
                </h2>
                <p className="mx-auto max-w-[700px] text-zinc-600 md:text-xl">
                  Get started in minutes and plan your perfect semester.
                </p>
              </div>
              <div className="grid gap-8 md:grid-cols-3">
                {[
                  {
                    step: "1",
                    title: "Import Your Progress",
                    description: "Connect with your university's system to automatically import your completed courses and requirements.",
                    image: "../Import Your Progress Image.png",
                  },
                  {
                    step: "2",
                    title: "Plan Your Schedule",
                    description: "Use our smart scheduling tool to create the perfect balance of classes each semester.",
                    image: "../Generate Your Plan Image.png",
                  },
                  {
                    step: "3",
                    title: "Stay on Track",
                    description: "Get notifications about registration deadlines and track your progress toward graduation.",
                    image: "../Stay on Track Image.png",
                  },
                ].map((step, i) => (
                  <div key={i} className="flex flex-col items-center gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white font-bold text-lg">
                      {step.step}
                    </div>
                    <h3 className="text-xl font-bold">{step.title}</h3>
                    <p className="text-zinc-600">{step.description}</p>
                    <Image
                      src={step.image}
                      alt={`${step.title} illustration`}
                      width={320}
                      height={240}
                      className="h-40 w-auto object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
            <Link href="https://www.figma.com/proto/z9xbhwsGp5AvRkDgP6fWPR/stu?node-id=683-4371&t=D5BlhoZEEIGoKcvA-1">
              <button className="container px-4 md:px-6 text-black hover:text-primary"> Explore stu’s Wireframe </button> 
            </Link>  
          </div>
          </div>
        </section>

      </main>

      <footer className="border-t py-6 md:py-8">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-2 font-bold">
                <Image
                  src="/favicon-96x96.png"
                  alt="stu. logo" 
                  width={32}
                  height={32}
                  className="rounded-full"
                  priority
                />
                <span>stu.</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                Making Academic Planning Simple and Smart
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/students#features" className="text-muted-foreground hover:text-primary">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#how-it-works" className="text-muted-foreground hover:text-primary">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/students#testimonials" className="text-muted-foreground hover:text-primary">
                    Student Stories
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/" className="text-muted-foreground hover:text-primary">
                    For Universities
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Stu Inc. All rights reserved.</p>
            <div className="flex gap-4">
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
} 
