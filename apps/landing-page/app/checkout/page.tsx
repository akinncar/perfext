"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createCheckout, login, signup } from "@/lib/api";

function CheckoutForm() {
  const params = useSearchParams();
  const planId = params.get("plan") ?? "pro";
  const interval = params.get("interval") === "monthly" ? "monthly" : "yearly";

  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session =
        mode === "login" ? await login(email, password) : await signup(email, password);
      const url = await createCheckout(session.accessToken, planId, interval);
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  const planName = planId.charAt(0).toUpperCase() + planId.slice(1);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Get Perfext {planName}
      </h1>
      <p className="mt-2 text-muted">
        {mode === "signup" ? "Create your account" : "Sign in"} to continue to secure checkout
        ({interval}).
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-border bg-surface px-4 py-3 text-white placeholder:text-muted focus:outline-none"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-border bg-surface px-4 py-3 text-white placeholder:text-muted focus:outline-none"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-white px-6 py-3 font-medium text-black transition hover:bg-neutral-200 disabled:opacity-60"
        >
          {busy ? "Redirecting…" : "Continue to checkout"}
        </button>
      </form>

      <button
        className="mt-6 text-sm text-muted underline"
        onClick={() => setMode(mode === "signup" ? "login" : "signup")}
      >
        {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutForm />
    </Suspense>
  );
}
