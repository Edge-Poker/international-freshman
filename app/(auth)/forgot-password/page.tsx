"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCaptcha } from "@/components/captcha";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const captcha = useCaptcha();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const email = new FormData(e.currentTarget).get("email") as string;
    await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password`,
      captchaToken: captcha.token,
    });
    captcha.reset();
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="card p-5 sm:p-8">
      <h1 className="text-xl font-bold">Reset your password</h1>
      {sent ? (
        <p className="mt-4 text-sm text-dim">
          If an account exists for that email, you will receive a link to create a new password.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="text-dim">Email</span>
            <input
              name="email"
              type="email"
              required
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 outline-none focus:border-accent"
            />
          </label>
          {captcha.widget}

          <Button className="w-full" disabled={loading || !captcha.pronto}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      )}
    </div>
  );
}
