import { useState } from "react";
import { ApiClientError, login, signup } from "../api-client";
import { Session } from "../types";
import "../settings-form.css";

interface AuthViewProps {
  /** Called with the new session on a successful login/signup. */
  onAuthenticated: (session: Session) => void;
  /** Optional back action (popup); omit to hide. */
  onBack?: () => void;
}

/**
 * Single-page email + password authentication: toggle between Log in and
 * Create account. On success, hands the session up to the caller to persist.
 */
export function AuthView({ onAuthenticated, onBack }: AuthViewProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit() {
    setBusy(true);
    setError("");
    try {
      const session =
        mode === "signup"
          ? await signup(email.trim(), password)
          : await login(email.trim(), password);
      onAuthenticated(session);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-view">
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
          Create account
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && email.trim() && password) onSubmit();
          }}
        />
      </div>

      <button className="save" onClick={onSubmit} disabled={busy || !email.trim() || !password}>
        {busy ? "Working…" : mode === "signup" ? "Create account" : "Log in"}
      </button>
      <div className={error ? "status error" : "status"}>{error}</div>

      {onBack && (
        <button className="link-btn" onClick={onBack}>
          ← Back
        </button>
      )}
    </div>
  );
}
