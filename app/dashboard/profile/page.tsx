import { redirect } from 'next/navigation';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import CreateAccountClient from "@/components/create-account/create-account-client";
import TranscriptUploadSectionWrapper from "@/components/transcript/TranscriptUploadSectionWrapper";
import {
  listUniversities,
  listMajors,
  listMinors,
  listStudentInterests,
  listCareerOptions,
  listClassPreferences,
  getCurrentUserProfile,
} from "@/components/create-account/server-actions";

export default async function ProfilePage() {
  // Get current user
  const supabase = await createSupabaseServerComponentClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }

  // Fetch all data in parallel
  const [
    universities, 
    majorsAll, 
    minorsAll, 
    interests, 
    careers, 
    classPrefs,
    currentProfile
  ] = await Promise.all([
    listUniversities(),
    listMajors(),
    listMinors(),
    listStudentInterests(),
    listCareerOptions(),
    listClassPreferences(),
    getCurrentUserProfile(user.id),
  ]);

  // Add email from auth user to profile data
  const profileWithEmail = currentProfile ? {
    ...currentProfile,
    email: user.email,
  } : {
    fname: "",
    lname: "",
    email: user.email,
    university_id: null,
    selected_majors: null,
    selected_minors: null,
    selected_interests: null,
    career_options: null,
    class_preferences: null,
  };

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] shadow-sm">
            <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="font-header-bold text-3xl font-extrabold text-[var(--foreground)]">
            Profile Settings
          </h1>
        </div>
        <p className="font-body text-sm text-[var(--muted-foreground)] ml-[52px]">
          Update your account information and preferences below. Note: Your university cannot be changed after account creation.
        </p>
      </div>

      {/* Profile Form */}
      <CreateAccountClient
        nextHref="/dashboard"
        preload={{ universities, majorsAll, minorsAll, interests, careers, classPrefs }}
        initial={profileWithEmail}
        isEditMode={true}
      />

      {/* Transcript Upload Section */}
      <div className="mt-8">
        <TranscriptUploadSectionWrapper />
      </div>
    </main>
  );
}
