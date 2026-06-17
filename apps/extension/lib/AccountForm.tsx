import { useState } from "react";
import { ApiClientError, login, logout, signup } from "./api-client";
import { Settings } from "./types";
import "./settings-form.css";

interface AccountFormProps {
  settings: Settings;
  /** Receives the next settings (with updated `session`). */
  onChange: (next: Settings) => void;
}

/**
 * Email + password login / signup, and a signed-in summary with logout. Shared
 * by the popup and welcome page. Server AI requires a session; BYOK can use one
 * optionally (for higher rate limits).
 */
export function AccountForm({ settings, onChange }: AccountFormProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const session = settings.session;

  async function onSignOut() {
    await logout(settings.session);
    onChange({ ...settings, session: null });
  }

  async function onSubmit() {
    setBusy(true);
    setError("");
    try {
      const next =
        mode === "signup"
          ? await signup(email.trim(), password)
          : await login(email.trim(), password);
      onChange({ ...settings, session: next });
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (session?.user) {
    return (
      <div className="account">
        <p className="hint">
          Signed in as <strong>{session.user.email ?? "your account"}</strong>.
        </p>
        <button className="link-btn" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="account">
      <div className="seg">
        <button
          className={mode === "login" ? "seg-btn active" : "seg-btn"}
          onClick={() => setMode("login")}
        >
          Log in
        </button>
        <button
          className={mode === "signup" ? "seg-btn active" : "seg-btn"}
          onClick={() => setMode("signup")}
        >
          Sign up
        </button>
      </div>

      <div className="field">
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      <div className="field">
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder="••••••••"
        />
      </div>

      <button
        className="save"
        onClick={onSubmit}
        disabled={busy || !email.trim() || !password}
      >
        {busy ? "Working…" : mode === "signup" ? "Create account" : "Log in"}
      </button>
      <div className={error ? "status error" : "status"}>{error}</div>
    </div>
  );
}
