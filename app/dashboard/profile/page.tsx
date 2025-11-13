import { redirect } from 'next/navigation';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import CreateAccountClient from "@/components/create-account/create-account-client";
import TranscriptUploadSectionWrapper from "@/components/transcript/TranscriptUploadSectionWrapper";
import LinkedInShareButton from "@/components/profile/LinkedInShareButton";
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

  // LinkedIn profile URL - currently not stored in profile data
  const linkedInProfileUrl = null;

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        {/* Header Section - Modern, clean design */}
        <div className="mb-6 sm:mb-8">
          <h1 className="font-header-bold mb-2 text-3xl sm:text-4xl text-[#0A0A0A]">
            Profile Settings
          </h1>
          <p className="font-body text-sm sm:text-base text-[var(--muted-foreground)]">
            Manage your account information, preferences, and career profile
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {/* Account Information Card */}
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A0A0A]">
                <svg className="h-5 w-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="font-header-bold text-lg text-[var(--foreground)]">
                  Account Information
                </h2>
                <p className="font-body text-xs text-[var(--muted-foreground)]">
                  Update your personal details and academic preferences
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4 mb-4">
              <p className="font-body text-sm text-[var(--muted-foreground)] flex items-start gap-2">
                <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Your university cannot be changed after account creation</span>
              </p>
            </div>

            <CreateAccountClient
              nextHref="/dashboard"
              preload={{ universities, majorsAll, minorsAll, interests, careers, classPrefs }}
              initial={profileWithEmail}
              isEditMode={true}
            />
          </div>

          {/* LinkedIn Profile Card */}
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A0A0A]">
                <svg className="h-5 w-5 text-[var(--primary)]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <div>
                <h2 className="font-header-bold text-lg text-[var(--foreground)]">
                  LinkedIn Profile
                </h2>
                <p className="font-body text-xs text-[var(--muted-foreground)]">
                  Connect your LinkedIn to unlock personalized career insights
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4 transition-all hover:border-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
              <div className="flex items-center gap-3">
                {linkedInProfileUrl ? (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] shadow-sm">
                      <svg className="h-6 w-6 text-[#0A0A0A]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-body-semi text-sm text-[var(--foreground)]">
                        Profile Connected
                      </p>
                      <p className="font-body text-xs text-[var(--muted-foreground)]">
                        Click to update or view
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-[var(--border)] bg-white">
                      <svg className="h-6 w-6 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-body-semi text-sm text-[var(--foreground)]">
                        Not Connected
                      </p>
                      <p className="font-body text-xs text-[var(--muted-foreground)]">
                        Upload your LinkedIn profile
                      </p>
                    </div>
                  </>
                )}
              </div>
              <LinkedInShareButton
                studentId={user.id}
                existingProfileUrl={linkedInProfileUrl}
              />
            </div>
          </div>

          {/* Transcript Upload Card */}
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A0A0A]">
                <svg className="h-5 w-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="font-header-bold text-lg text-[var(--foreground)]">
                  Academic Transcript
                </h2>
                <p className="font-body text-xs text-[var(--muted-foreground)]">
                  Upload your transcript for personalized course recommendations
                </p>
              </div>
            </div>

            <TranscriptUploadSectionWrapper />
          </div>
        </div>
      </div>
    </main>
  );
}
