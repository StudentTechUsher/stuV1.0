/**Convenient wrapper to use for content that requires a user to be authorized first before accessing the content. */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ClientAuthGate({
  children,
}: Readonly<{
  children: (userId: string) => React.ReactNode;
}>) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id ?? null;
      if (!id) {
        router.replace("/login");
        return;
      }
      setUserId(id);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;
  if (!userId) return null;
  return <>{children(userId)}</>;
}
