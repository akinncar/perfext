import { useEffect, useState } from "react";
import { ApiClientError, getMe, updateDisplayName } from "../api-client";
import { withValidSession } from "../auth-session";
import { Session } from "../types";
import "../settings-form.css";

interface AccountPanelProps {
  session: Session;
  onSignOut: () => void;
}

/** Signed-in account view: email, editable display name, sign-out. */
export function AccountPanel({ session, onSignOut }: AccountPanelProps) {
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    withValidSession(getMe)
      .then((me) => {
        if (!cancelled) setDisplayName(me.displayName ?? "");
      })
      .catch(() => {
        // Leave the field editable; a failed prefetch shouldn't block the page.
      });
    return () => {
      cancelled = true;
    };
  }, [session.accessToken]);

  async function onSave() {
    setSaving(true);
    setStatus("");
    try {
      const me = await withValidSession((token) =>
        updateDisplayName(token, displayName),
      );
      setDisplayName(me.displayName ?? "");
      setStatus("Saved");
      setTimeout(() => setStatus(""), 1500);
    } catch (err) {
      setStatus(
        err instanceof ApiClientError ? err.message : "Couldn't save your name.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="account">
      <p className="hint">
        Signed in as <strong>{session.user?.email ?? "your account"}</strong>.
      </p>

      <div className="field">
        <label htmlFor="display-name">Display name</label>
        <input
          id="display-name"
          type="text"
          maxLength={120}
          placeholder="How should we call you?"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      <button className="save" onClick={onSave} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
      <div className="status">{status}</div>

      <button className="save" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
