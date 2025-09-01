import CreateAccountClient from "@/components/create-account/create-account-client";
import {
  listUniversities,
  listMajors,
  listMinors,
  listStudentInterests,
  listCareerOptions,
  listClassPreferences,
} from "@/components/create-account/server-actions"; // your server-only queries

export default async function CreateAccountPage() {
  const [universities, majorsAll, minorsAll, interests, careers, classPrefs] =
    await Promise.all([
      listUniversities(),
      listMajors(),
      listMinors(),
      listStudentInterests(),
      listCareerOptions(),
      listClassPreferences(),
    ]);

  return (
    <main style={{ maxWidth: 720, margin: "3rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: 12 }}>Create your account</h1>

      <CreateAccountClient
        nextHref="/dashboard"
        preload={{ universities, majorsAll, minorsAll, interests, careers, classPrefs }}
        // optional: pass initial selection if you fetched it server-side
        // initial={studentRowOrNull}
      />
    </main>
  );
}
