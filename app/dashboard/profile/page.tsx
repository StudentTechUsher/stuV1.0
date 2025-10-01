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
    <main style={{ maxWidth: 720, margin: "3rem auto", padding: "0 1rem" }}>
      <h1 style={{
        fontFamily: '"Red Hat Display", sans-serif',
        fontWeight: 800,
        color: 'black',
        fontSize: '2rem',
        margin: 0,
        marginBottom: '24px'
      }}>Edit your profile</h1>
      <p style={{ marginBottom: "2rem", color: "#666" }}>
        Update your account information and preferences below. Note: Your university cannot be changed after account creation.
      </p>

      <CreateAccountClient
        nextHref="/dashboard"
        preload={{ universities, majorsAll, minorsAll, interests, careers, classPrefs }}
        initial={profileWithEmail}
        isEditMode={true}
      />

      {/* Transcript Upload Section */}
      <div style={{ marginTop: '3rem' }}>
        <TranscriptUploadSectionWrapper />
      </div>
    </main>
  );
}
