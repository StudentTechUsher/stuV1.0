// app/onboarding/page.tsx
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { OnboardingPage, type OnboardingRole } from '@/components/onboarding/onboarding-page';
import { needsOnboarding } from '@/lib/utils/onboardingUtils';

export default async function OnboardingRoute() {
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role_id, onboarded, university_id, fname, lname')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login');
  }

  if (!needsOnboarding(profile)) {
    redirect('/dashboard');
  }

  const { data: universities, error: universitiesError } = await supabase
    .from('university')
    .select('id, name')
    .order('name');

  if (universitiesError) {
    console.error('Failed to fetch universities:', universitiesError);
  }

  const displayName =
    profile.fname &&
    profile.lname &&
    !(profile.fname.toLowerCase() === 'new' && profile.lname.toLowerCase() === 'user')
      ? `${profile.fname} ${profile.lname}`
      : undefined;

  const initialRole: OnboardingRole = profile.role_id === 2 ? 'advisor' : 'student';

  return (
    <OnboardingPage
      universities={universities ?? []}
      userName={displayName}
      initialRole={initialRole}
    />
  );
}
