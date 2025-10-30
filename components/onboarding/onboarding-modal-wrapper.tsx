import { OnboardingModal } from "./onboarding-modal"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

interface OnboardingModalWrapperProps {
  userName?: string
}

// Helper function to decode JWT payload on the server
function decodeJwtPayload(token?: string): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    // base64url -> base64 and pad
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
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

  // Get user metadata to extract name information
  const { data: { user } } = await supabase.auth.getUser()
  const tokenPayload = decodeJwtPayload(user?.app_metadata?.access_token)
  const fullName = tokenPayload?.name as string || ""
  const nameParts = fullName.split(' ')

  const firstNameFromToken = (
    tokenPayload?.given_name ||
    tokenPayload?.first_name ||
    tokenPayload?.fname ||
    nameParts[0] ||
    ""
  ) as string

  const lastNameFromToken = (
    tokenPayload?.family_name ||
    tokenPayload?.last_name ||
    tokenPayload?.lname ||
    nameParts.slice(1).join(' ') ||
    ""
  ) as string

  return (
    <OnboardingModal
      universities={universities || []}
      isOpen={true}
      userName={userName}
      initialFirstName={firstNameFromToken}
      initialLastName={lastNameFromToken}
    />
  )
}