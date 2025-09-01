"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CreateAccountForm from "@/components/create-account/create-account-form";

type Option = { id: number; name: string; university_id?: number | null };
type Preload = {
  universities: Option[];
  majorsAll: Option[];
  minorsAll: Option[];
  interests: Option[];
  careers: Option[];
  classPrefs: Option[];
};

export default function CreateAccountClient({
  preload,
  nextHref,
  initial, // optional
}: Readonly<{
  preload: Preload;
  nextHref: string;
  initial?: {
    university_id: number | null;
    selected_majors: number[] | null;
    selected_minors: number[] | null;
    selected_interests: number[] | null;
    career_options: number[] | null;
    class_preferences: number[] | null;
  } | null;
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

  return (
    <CreateAccountForm
      userId={userId}
      nextHref={nextHref}
      preload={preload}
      initial={initial}
    />
  );
}
