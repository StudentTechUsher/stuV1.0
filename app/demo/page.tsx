"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="container max-w-[600px] mx-auto px-4 py-16 flex flex-col items-center">
        <Link href="/" className="self-start mb-8 text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="inline-block mr-2 h-4 w-4" />
          Back to Home
        </Link>

        <div className="w-full space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Request a demo
            </h1>
            <p className="text-zinc-600 md:text-lg">
              See how stu can transform academic planning at your university.
            </p>
          </div>

          <form
              action="https://formsubmit.co/66b8aa7ea31d50fdc07b4ff95885e251"
              method="POST"
              className="space-y-4"
            >
              <input type="hidden" name="_subject" value="New Demo Request from stu" />
              <input type="hidden" name="_template" value="table" />
              <input type="hidden" name="_captcha" value="false" />
              <input type="hidden" name="_next" value="http://stuplanning.com/demo/demo-thanks" />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium">
                    First Name
                  </label>
                  <Input
                    id="firstName"
                    name="firstName"
                    required
                    className="border-primary/20 focus:border-primary focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium">
                    Last Name
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    required
                    className="border-primary/20 focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Work Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="border-primary/20 focus:border-primary focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="university" className="text-sm font-medium">
                  University
                </label>
                <Input
                  id="university"
                  name="university"
                  required
                  className="border-primary/20 focus:border-primary focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="position" className="text-sm font-medium">
                  Position
                </label>
                <Input
                  id="position"
                  name="position"
                  required
                  placeholder="e.g. Registrar, Dean, Department Head"
                  className="border-primary/20 focus:border-primary focus:ring-primary"
                />
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium py-2.5">
                Request a demo
              </Button>

              <p className="text-xs text-center text-zinc-500">
                By requesting a demo, you agree to our{" "}
                <Link href="#" className="underline underline-offset-2 hover:text-primary">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="#" className="underline underline-offset-2 hover:text-primary">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
             <div className="flex justify-center">
                <Link href="/signup" className="w-1/2 flex justify-center">
                  <Button
                    variant="outline"
                    className="flex items-center justify-center gap-2 w-full bg-white border border-primary text-zinc-900 font-medium py-2.5 rounded-lg transition-all duration-200 hover:bg-primary hover:text-white"
                  >
                    Try
                    <Image
                      src="/stu_icon_black.png"
                      alt="stu. logo"
                      width={70}
                      height={70}
                      priority
                      className="w-auto h-5"
                    />
                    stu. for FREE
                  </Button>
                </Link>
              </div>
        </div>
      </div>
    </div>
  )
import { Metadata } from 'next'
import DemoPageClient from './demo-page-client'

export const metadata: Metadata = {
  title: 'Request a Demo - See Stu in Action',
  description: 'Request a personalized demo of Stu\'s academic planning and forecasting platform. See how we help universities improve graduation rates, reduce advisor workload, and forecast course demand with precision.',
  keywords: [
    'academic planning demo',
    'university software demo',
    'graduation planning demo',
    'forecasting software demo',
    'advisor tools demo',
    'student success platform demo'
  ],
  openGraph: {
    title: 'Request a Demo - See Stu in Action',
    description: 'See how Stu transforms academic planning at your university. Request a personalized demo today.',
    url: 'https://stuplanning.com/demo',
    type: 'website',
  },
  alternates: {
    canonical: 'https://stuplanning.com/demo',
  },
}

export default function DemoPage() {
  return <DemoPageClient />
}
