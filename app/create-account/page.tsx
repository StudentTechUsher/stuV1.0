"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import CreateAccountForm from "@/components/create-account/CreateAccountForm";

export default function CreateAccount() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace("/login");
        return;
      }
      setUserId(session.user.id);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;
  if (!userId) return null;

  return (
    <main style={{ maxWidth: 560, margin: "3rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: 12 }}>Create your account</h1>
      <p style={{ color: "#666", marginBottom: 16 }}>
        Tell us a bit about your academic interests. You can change this later.
      </p>

      <CreateAccountForm userId={userId} nextHref="/dashboard" />
      {/* change nextHref to whatever the next section is */}
    </main>
  );
}
