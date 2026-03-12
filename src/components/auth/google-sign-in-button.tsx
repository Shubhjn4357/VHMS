"use client";

import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  const [pending, setPending] = useState(false);

  async function handleSignIn() {
    setPending(true);
    await signIn("google", { redirectTo: "/dashboard" });
  }

  return (
    <Button
      className="mt-8 w-full"
      disabled={pending}
      onClick={handleSignIn}
      size="lg"
      type="button"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? "Redirecting to Google" : "Continue with Google"}
    </Button>
  );
}
