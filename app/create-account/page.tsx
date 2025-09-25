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
    <main style={{ maxWidth: 720, margin: "3rem auto", padding: "0 1rem" }}>
      <h1 className="text-3xl mb-3 font-header">Create your account</h1>

      <CreateAccountClient
        nextHref="/dashboard"
        preload={{ universities, majorsAll, minorsAll, interests, careers, classPrefs }}
        initial={initialData}
        isEditMode={false}
      />
    </main>
  );
}
