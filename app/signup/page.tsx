"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

export default function SignUpPage() {
  const redirect =
    typeof window !== "undefined"
      ? `${window.location.origin}/create-account`
      : undefined;

  return (
    <main style={{ maxWidth: 420, margin: "4rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Sign Up</h1>

      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={["google", "apple"]}
        view="sign_up"
        redirectTo={redirect}
        showLinks={false}    // <= hide internal “sign in / sign up” switcher
      />

      <p style={{ marginTop: 12 }}>
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
