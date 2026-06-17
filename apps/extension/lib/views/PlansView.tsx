import "../settings-form.css";

/** Placeholder for future paid plans. */
export function PlansView() {
  return (
    <div className="plans">
      <h2 className="page-title">Plans</h2>
      <p className="hint">
        Paid plans are coming soon. For now, use your own API key or the
        included Perfext AI.
      </p>
      <span className="badge">Coming soon</span>
    </div>
  );
}
