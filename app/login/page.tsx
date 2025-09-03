"use client";

import Link from "next/link";
import Image from "next/image";
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
