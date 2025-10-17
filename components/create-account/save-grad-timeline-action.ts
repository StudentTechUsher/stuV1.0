"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

interface GradTimelinePayload {
  userId: string;
  est_grad_sem: string | null;
  est_grad_date: string | null;
  career_goals: string | null;
}

async function serverClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
}

export async function saveGradTimeline(payload: GradTimelinePayload): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await serverClient();
    const { userId, est_grad_sem, est_grad_date, career_goals } = payload;

    const { error } = await supabase
      .from("profiles")
      .update({
        est_grad_sem,
        est_grad_date,
        career_goals,
      })
      .eq("id", userId);

    if (error) {
      console.error("Error saving grad timeline:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return { ok: false, error: message };
  }
}
