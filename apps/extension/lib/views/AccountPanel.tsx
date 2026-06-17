import { Session } from "../types";
import "../settings-form.css";

interface AccountPanelProps {
  session: Session;
  onSignOut: () => void;
}

/** Signed-in account summary with a sign-out action. */
export function AccountPanel({ session, onSignOut }: AccountPanelProps) {
  return (
    <div className="account">
      <p className="hint">
        Signed in as <strong>{session.user?.email ?? "your account"}</strong>.
      </p>
      <button className="save" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
