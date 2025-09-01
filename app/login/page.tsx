"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

export default function LogInPage() {
  const redirect =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard`
      : undefined;

  return (
    <main style={{ maxWidth: 420, margin: "4rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Log In</h1>

      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={["google"]}
        view="sign_in"
        redirectTo={redirect}   // send signed-in users to your app, not create-account
        showLinks={false}
      />

      <p style={{ marginTop: 12 }}>
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
