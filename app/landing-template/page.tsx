import type { Metadata } from "next"
import { UnifiedLandingClient } from "../unified-landing-client"

export const metadata: Metadata = {
  title: "STU - Template Version (Internal)",
  description: "Landing page template with placeholders - for internal review only",
  robots: "noindex, nofollow", // Prevent search engine indexing
}

export default function LandingTemplatePage() {
  return <UnifiedLandingClient />
}
