"use client";

import Link from "next/link";
import Image from "next/image";
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
      <Image
        src="/stu_icon_black.png"
        alt="Logo"
        width={75}
        height={75}
        style={{ marginBottom: "2rem", display: "block", marginLeft: "auto", marginRight: "auto" }}
      />

      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={["google"]}
        onlyThirdPartyProviders
        view="sign_up"
        redirectTo={redirect}
        showLinks={true}    // <= hide internal “sign in / sign up” switcher
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
