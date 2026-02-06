"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useMemo } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useAnalytics } from "@/lib/hooks/useAnalytics"
import { ANALYTICS_EVENTS } from "@/lib/services/analyticsService"

export default function DemoPageClient() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { track, isReady } = useAnalytics()

  const utmProperties = useMemo(() => {
    const utm_source = searchParams.get("utm_source") || undefined
    const utm_medium = searchParams.get("utm_medium") || undefined
    const utm_campaign = searchParams.get("utm_campaign") || undefined
    const utm_content = searchParams.get("utm_content") || undefined
    const utm_term = searchParams.get("utm_term") || undefined

    return {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
    }
  }, [searchParams])

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
              onSubmit={(event) => {
                if (!isReady) return

                event.preventDefault()
                track(ANALYTICS_EVENTS.DEMO_FORM_SUBMITTED, {
                  page_path: pathname,
                  form_id: "demo_request",
                  success: true,
                  ...utmProperties,
                })

                // Give the analytics request a moment, then continue the POST.
                // No PII is captured (we do NOT read form values).
                window.setTimeout(() => {
                  ;(event.currentTarget as HTMLFormElement).submit()
                }, 150)
              }}
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

              <Button type="submit" variant="primary" className="w-full py-2.5">
                Request a demo
              </Button>

            <div className="flex justify-center">
              <Link
                href="/signup"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (!isReady) return
                  track(ANALYTICS_EVENTS.DEMO_TRY_FREE_CLICKED, {
                    page_path: pathname,
                    cta_location: "demo_page",
                    cta_label: "Try stu. for FREE",
                    cta_href: "/signup",
                    cta_target: "_blank",
                    ...utmProperties,
                  })
                }}
              >
                <Button variant="primary" className="px-6 py-2.5 flex items-center gap-2">
                  Try
                  <Image
                    src="/stu_icon_black.png"
                    alt="stu logo"
                    width={20}
                    height={20}
                  />
                  <span className="font-semibold">stu.</span>for FREE
                </Button>
              </Link>
            </div>

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
        </div>
      </div>
    </div>
  )
}
