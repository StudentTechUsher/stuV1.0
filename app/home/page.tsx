import Link from "next/link"
import Image from "next/image"
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Force dynamic rendering for this page because it uses cookies
export const dynamic = 'force-dynamic';

type Role = "student" | "advisor" | "admin";

const ROLE_MAP: Record<number, Role> = {
  1: "admin",
  2: "advisor",
  3: "student",
};

export default async function HomePage() {
  // ---- Supabase server client (reads cookies; no writes in RSC) ----
  const cookieStore = cookies();
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
  let roleId: number | null = null;
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role_id")
      .eq("id", userId)
      .maybeSingle();

    roleId = (profile?.role_id ?? null) as number | null;
  }

  // 3) Pick a Role string (default to "student" if null/undefined)
  const role: Role = ROLE_MAP[roleId ?? 3];

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@700&family=Inter:wght@300;400;600&family=Work+Sans:wght@300;400;700&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen bg-white px-6 py-8 flex flex-col items-center justify-center">

        {/* Top Left Links */}
        <>
          <a
            href="/students"
            className="absolute top-6 left-6 text-black text-4xl"
            style={{ fontFamily: 'Red Hat Display, sans-serif', fontWeight: 700 }}
          >
            stu.
          </a>

          <a
            href="/login"
            className="absolute top-[62px] left-6 text-[#12F987] text-base hover:text-[#06C96C]"
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
          >
            Login.
          </a>
        </>

        {/* Welcome box */}
        <div className="flex flex-col items-center text-center mb-10">
          <Image
            src="/stu_icon_black.png"
            alt="stu. logo"
            width={48}
            height={48}
            className="mb-2"
          />
          <h2
            className="text-center text-xl text-black mb-0"
            style={{ fontFamily: 'Work Sans, sans-serif', fontWeight: 700 }}
          >
            welcome to stu.
          </h2>
          <p
            className="text-zinc-700 text-sm"
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '0.8rem' }}
          >
            how can I help you today?
          </p>
        </div>

        {/* Action Cards */}
        <div className="max-w-4xl w-full mx-auto space-y-6 font-['Work_Sans']">
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

              <Link href="/dashboard/major-choice">
                <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    🎯 Help me choose a major
                  </h3>
                  <p className="text-gray-600 text-sm">
                    based on my preferences and previous coursework
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
    </>
  )
}
