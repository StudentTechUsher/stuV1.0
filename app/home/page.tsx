import Link from "next/link"
import Image from "next/image"
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Force dynamic rendering for this page because it uses cookies
export const dynamic = 'force-dynamic';

type Role = "student" | "advisor" | "admin";

const ROLE_MAP: Record<string, Role> = {
  1: "admin",
  2: "advisor",
  3: "student",
};

export default async function HomePage() {
  // ---- Supabase server client (reads cookies; no writes in RSC) ----
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

  // 1) Get session/user
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user.id;

  // 2) Query profiles for role_id (RLS lets users read only their own row)
  let roleId: string | null = null;
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role_id")
      .eq("id", userId)
      .maybeSingle();

    roleId = profile?.role_id ?? null;
  }

  // 3) Pick a Role string (you can also fetch role name via FK join)
  const role: Role = ROLE_MAP[roleId ?? "3"]; // sensible default to "student" if roleId is null or undefined

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Image
            src="/favicon-96x96.png"
            alt="stu. logo"
            width={32}
            height={32}
            className="rounded"
            priority
          />
          <h1 className="text-2xl font-bold">stu.</h1>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="max-w-2xl mx-auto text-center mb-12">
        <div className="bg-black text-white rounded-lg p-4 mb-6 inline-block">
          <div className="w-8 h-8 bg-white rounded text-black flex items-center justify-center text-lg mb-2 mx-auto">
            🎓
          </div>
          <h2 className="text-lg font-semibold mb-1">welcome to stu.</h2>
          <p className="text-sm text-gray-300">how can I help you today?</p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Dashboard Card - Always visible */}
        <Link href="/dashboard">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📊 View my {role} dashboard
            </h3>
            <p className="text-gray-600 text-sm">
              Access your complete academic overview and tools
            </p>
          </div>
        </Link>

        {/* Student-specific cards */}
        {role === "student" && (
          <>
            <Link href="/dashboard/grad-plan">
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🗺️ Create a four-year graduation map
                </h3>
                <p className="text-gray-600 text-sm">
                  that gives me my personalized path to finish when I want
                </p>
              </div>
            </Link>

            <Link href="/dashboard/meet-with-advisor">
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  👥 Help me connect with my advisor
                </h3>
                <p className="text-gray-600 text-sm">
                  to discuss my academic goals and course planning
                </p>
              </div>
            </Link>

            <Link href="/dashboard/semester-scheduler">
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  📅 Plan my schedule for next semester
                </h3>
                <p className="text-gray-600 text-sm">
                  using my current four-year graduation plan
                </p>
              </div>
            </Link>
          </>
        )}

        {/* Advisor-specific cards */}
        {role === "advisor" && (
          <>
            <Link href="/dashboard/approve-grad-plans">
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ✅ Approve graduation plans
                </h3>
                <p className="text-gray-600 text-sm">
                  Review and approve student graduation plans awaiting your feedback
                </p>
              </div>
            </Link>

            <Link href="/dashboard/my-advisees">
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  👥 My advisees
                </h3>
                <p className="text-gray-600 text-sm">
                  View and manage your assigned students and their academic progress
                </p>
              </div>
            </Link>

            <Link href="/dashboard/appointments">
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  📅 Appointments
                </h3>
                <p className="text-gray-600 text-sm">
                  Manage your appointment schedule and meet with students
                </p>
              </div>
            </Link>

            <Link href="/dashboard/reports">
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  📊 Reports
                </h3>
                <p className="text-gray-600 text-sm">
                  View academic reports and analytics for your advisees
                </p>
              </div>
            </Link>
          </>
        )}

        {/* Admin-specific cards */}
        {role === "admin" && (
          <>
            <Link href="/dashboard/users">
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  👤 Manage users
                </h3>
                <p className="text-gray-600 text-sm">
                  Add, edit, and manage user accounts and permissions
                </p>
              </div>
            </Link>

            <Link href="/dashboard/programs">
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🎓 Manage programs
                </h3>
                <p className="text-gray-600 text-sm">
                  Configure academic programs and degree requirements
                </p>
              </div>
            </Link>

            <Link href="/dashboard/system">
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ⚙️ System settings
                </h3>
                <p className="text-gray-600 text-sm">
                  Configure system-wide settings and administrative options
                </p>
              </div>
            </Link>

            <Link href="/dashboard/reports">
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  📈 System reports
                </h3>
                <p className="text-gray-600 text-sm">
                  View comprehensive system analytics and usage reports
                </p>
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}