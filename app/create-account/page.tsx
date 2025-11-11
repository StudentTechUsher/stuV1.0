import { redirect } from 'next/navigation';
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import CreateAccountClient from "@/components/create-account/create-account-client";
import {
  listUniversities,
  listMajors,
  listMinors,
  listStudentInterests,
  listCareerOptions,
  listClassPreferences,
} from "@/components/create-account/server-actions";

// Force dynamic rendering for this page because it uses cookies
export const dynamic = 'force-dynamic';

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

export default async function CreateAccountPage() {
  // Get current user and session
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* no-op in Server Components */ },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }

  // Extract name information from JWT token if available
  const tokenPayload = decodeJwtPayload(session?.access_token);
  const fullName = tokenPayload?.name as string || "";
  const nameParts = fullName.split(' ');
  
  const firstNameFromToken = (
    tokenPayload?.given_name || 
    tokenPayload?.first_name || 
    tokenPayload?.fname ||
    nameParts[0] || 
    ""
  ) as string;
  
  const lastNameFromToken = (
    tokenPayload?.family_name || 
    tokenPayload?.last_name || 
    tokenPayload?.lname ||
    nameParts.slice(1).join(' ') || 
    ""
  ) as string;

  // Fetch all data in parallel
  const [universities, majorsAll, minorsAll, interests, careers, classPrefs] =
    await Promise.all([
      listUniversities(),
      listMajors(),
      listMinors(),
      listStudentInterests(),
      listCareerOptions(),
      listClassPreferences(),
    ]);

  // Create initial data structure with email and name from JWT
  const initialData = {
    fname: firstNameFromToken,
    lname: lastNameFromToken,
    email: user.email || "",
    university_id: null,
    selected_majors: null,
    selected_minors: null,
    selected_interests: null,
    career_options: null,
    class_preferences: null,
  };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-3xl p-4 sm:p-6 py-8 sm:py-12">
        {/* Welcome Header - Modern, engaging design */}
        <div className="mb-8 sm:mb-10 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0A0A0A] shadow-lg">
            <svg className="h-8 w-8 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="font-header-bold mb-3 text-3xl sm:text-4xl text-[#0A0A0A]">
            Welcome to Stu
          </h1>
          <p className="font-body mx-auto max-w-xl text-sm sm:text-base text-[var(--muted-foreground)]">
            Let&apos;s set up your account. Tell us about yourself so we can personalize your academic journey and help you achieve your goals.
          </p>
        </div>

        {/* Progress Indicator - Clean, minimal */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] shadow-sm">
              <span className="font-body-semi text-sm text-[#0A0A0A]">1</span>
            </div>
            <div className="h-0.5 w-12 sm:w-20 bg-[var(--border)]"></div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--border)] bg-white">
              <span className="font-body-semi text-sm text-[var(--muted-foreground)]">2</span>
            </div>
            <div className="h-0.5 w-12 sm:w-20 bg-[var(--border)]"></div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--border)] bg-white">
              <span className="font-body-semi text-sm text-[var(--muted-foreground)]">3</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-center">
            <p className="font-body text-xs sm:text-sm text-[var(--muted-foreground)]">
              <span className="font-body-semi text-[var(--foreground)]">Step 1:</span> Basic Information
            </p>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white p-6 sm:p-8 shadow-sm">
          <CreateAccountClient
            nextHref="/dashboard"
            preload={{ universities, majorsAll, minorsAll, interests, careers, classPrefs }}
            initial={initialData}
            isEditMode={false}
          />
        </div>

        {/* Help Text */}
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4 text-center">
          <p className="font-body text-xs sm:text-sm text-[var(--muted-foreground)]">
            You can update any of this information later in your profile settings
          </p>
        </div>
      </div>
    </main>
  );
}
