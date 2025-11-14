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

  // 1) Get user securely
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const userId = userError || !user ? null : user.id;

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

      <div className="min-h-screen bg-background px-6 py-8 flex flex-col items-center justify-start pt-42">

        {/* Top Left Links */}
        <>
          <a
            href="/students"
            className="absolute top-6 left-6 text-foreground text-4xl"
            style={{fontFamily: "var(--font-geist-sans)", fontWeight: 700}}
          >
            stu.
          </a>

          <a
            href="/login"
            className="absolute top-[62px] left-6 text-[var(--primary)] text-base hover:text-[var(--hover-green)] font-body-semi"
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
            className="text-center text-xl text-foreground mb-0"
            style={{fontFamily: "var(--font-geist-sans)", fontWeight: 800}}
          >
            welcome to stu.
          </h2>
          <p className="text-muted-foreground text-xs" style={{fontFamily: "var(--font-geist-sans)"}}>
            how can I help you today?
          </p>
        </div>

        {/* Action Cards */}
        <div className="max-w-4xl w-full mx-auto">
          {/* Dashboard Card - Always visible */}
          <Link href="/" className="block mb-3">
            <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
              <h3 className="text-lg text-card-foreground" style={{fontFamily: "var(--font-geist-sans)", fontWeight: 800}}>
                View my {role} dashboard
              </h3>
              <p className="text-muted-foreground text-sm" style={{fontFamily: "var(--font-geist-sans)"}}>
                Access your complete academic overview and tools
              </p>
            </div>
          </Link>

          {/* Student-specific cards */}
          {role === "student" && (
            <>
              <Link href="/grad-plan" className="block mb-3">
                <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <h3 className="text-lg text-card-foreground" style={{fontFamily: "var(--font-geist-sans)", fontWeight: 800}}>
                    Create a four-year graduation map
                  </h3>
                  <p className="text-muted-foreground text-sm" style={{fontFamily: "var(--font-geist-sans)"}}>
                    that gives me my personalized path to finish when I want
                  </p>
                </div>
              </Link>

              <Link href="/major-choice" className="block mb-3">
                <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <h3 className="text-lg text-card-foreground" style={{fontFamily: "var(--font-geist-sans)", fontWeight: 800}}>
                    Help me choose a major
                  </h3>
                  <p className="text-muted-foreground text-sm" style={{fontFamily: "var(--font-geist-sans)"}}>
                    based on my preferences and previous coursework
                  </p>
                </div>
              </Link>

              <Link href="/semester-scheduler" className="block mb-3">
                <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <h3 className="text-lg text-card-foreground" style={{fontFamily: "var(--font-geist-sans)", fontWeight: 800}}>
                    Plan my schedule for next semester
                  </h3>
                  <p className="text-muted-foreground text-sm" style={{fontFamily: "var(--font-geist-sans)"}}>
                    using my current four-year graduation plan
                  </p>
                </div>
              </Link>

              <Link href="/meet-with-advisor" className="block mb-3">
                <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <h3 className="text-lg text-card-foreground" style={{fontFamily: "var(--font-geist-sans)", fontWeight: 800}}>
                    Help me connect with my advisor
                  </h3>
                  <p className="text-muted-foreground text-sm" style={{fontFamily: "var(--font-geist-sans)"}}>
                    to discuss my academic goals and course planning
                  </p>
                </div>
              </Link>
            </>
          )}

          {/* Advisor-specific cards */}
          {role === "advisor" && (
            <>
              <Link href="/approve-grad-plans" className="block mb-3">
                <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <h3 className="text-lg text-card-foreground" style={{fontFamily: "var(--font-geist-sans)", fontWeight: 800}}>
                    Approve graduation plans
                  </h3>
                  <p className="text-muted-foreground text-sm" style={{fontFamily: "var(--font-geist-sans)"}}>
                    Review and approve student graduation plans awaiting your feedback
                  </p>
                </div>
              </Link>

              <Link href="/my-advisees" className="block mb-3">
                <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <h3 className="text-lg text-card-foreground" style={{fontFamily: "var(--font-geist-sans)", fontWeight: 800}}>
                    My advisees
                  </h3>
                  <p className="text-muted-foreground text-sm" style={{fontFamily: "var(--font-geist-sans)"}}>
                    View and manage your assigned students and their academic progress
                  </p>
                </div>
              </Link>

              <Link href="/appointments" className="block mb-3">
                <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <h3 className="text-lg text-card-foreground" style={{fontFamily: "var(--font-geist-sans)", fontWeight: 800}}>
                    Appointments
                  </h3>
                  <p className="text-muted-foreground text-sm" style={{fontFamily: "var(--font-geist-sans)"}}>
                    Manage your appointment schedule and meet with students
                  </p>
                </div>
              </Link>

              <Link href="/reports" className="block mb-3">
                <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <h3 className="text-lg text-card-foreground" style={{fontFamily: "var(--font-geist-sans)", fontWeight: 800}}>
                    Reports
                  </h3>
                  <p className="text-muted-foreground text-sm" style={{fontFamily: "var(--font-geist-sans)"}}>
                    View academic reports and analytics for your advisees
                  </p>
                </div>
              </Link>
            </>
          )}

          {/* Admin-specific cards */}
          {role === "admin" && (
            <>
              <Link href="/users" className="block mb-3">
                <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <h3 className="text-lg text-card-foreground" style={{fontFamily: "var(--font-geist-sans)", fontWeight: 800}}>
                    Manage users
                  </h3>
                  <p className="text-muted-foreground text-sm" style={{fontFamily: "var(--font-geist-sans)"}}>
                    Add, edit, and manage user accounts and permissions
                  </p>
                </div>
              </Link>

              <Link href="/programs" className="block mb-3">
                <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <h3 className="text-lg text-card-foreground" style={{fontFamily: "var(--font-geist-sans)", fontWeight: 800}}>
                    Manage programs
                  </h3>
                  <p className="text-muted-foreground text-sm" style={{fontFamily: "var(--font-geist-sans)"}}>
                    Configure academic programs and degree requirements
                  </p>
                </div>
              </Link>

              <Link href="/system" className="block mb-3">
                <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <h3 className="text-lg text-card-foreground" style={{fontFamily: "var(--font-geist-sans)", fontWeight: 800}}>
                    System settings
                  </h3>
                  <p className="text-muted-foreground text-sm" style={{fontFamily: "var(--font-geist-sans)"}}>
                    Configure system-wide settings and administrative options
                  </p>
                </div>
              </Link>

              <Link href="/reports" className="block mb-3">
                <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <h3 className="text-lg text-card-foreground" style={{fontFamily: "var(--font-geist-sans)", fontWeight: 800}}>
                    System reports
                  </h3>
                  <p className="text-muted-foreground text-sm" style={{fontFamily: "var(--font-geist-sans)"}}>
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
