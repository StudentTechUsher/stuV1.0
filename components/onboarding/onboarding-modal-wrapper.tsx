import { OnboardingModal } from "./onboarding-modal"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

interface OnboardingModalWrapperProps {
  userName?: string
}

export async function OnboardingModalWrapper({ userName }: OnboardingModalWrapperProps) {
  // Fetch universities from the database
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          /* no-op in Server Components */
        },
      },
    }
  )

  const { data: universities, error } = await supabase
    .from("university")
    .select("id, name")
    .order("name")

  if (error) {
    console.error("Failed to fetch universities:", error)
    return null
  }

  return (
    <OnboardingModal
      universities={universities || []}
      isOpen={true}
      userName={userName}
    />
  )
}