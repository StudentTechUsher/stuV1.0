// app/create-account/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function CreateAccount() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;

  return (
    <main style={{ maxWidth: 560, margin: "3rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: 12 }}>Create your account</h1>
      {/* put your onboarding form here */}
    </main>
  );
}
