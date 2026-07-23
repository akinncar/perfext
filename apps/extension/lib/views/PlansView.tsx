import { useEffect, useMemo, useState } from "react";
import {
  ApiClientError,
  createCheckout,
  createPortal,
  getAccount,
  getPlans,
} from "../api-client";
import { Account, Plan, Session } from "../types";
import "../settings-form.css";

/** Marketing copy per plan id; structural data (prices, limits) comes from the API. */
const PLAN_COPY: Record<string, string[]> = {
  free: ["Bring your own API key", "No account needed"],
  pro: ["Perfext AI included", "Everyday writing allowance"],
  advanced: ["Perfext AI included", "High-volume allowance"],
  custom: ["Tailored limits and features", "Priority support"],
};

function formatPrice(amountCents: number): string {
  const value = amountCents / 100;
  return `$${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

/** "save 50%" — derived from real prices so dashboard changes stay truthful. */
function yearlyDiscount(plan: Plan): number | null {
  const monthly = plan.prices?.monthly?.amount;
  const yearly = plan.prices?.yearly?.amount;
  if (!monthly || !yearly) return null;
  return Math.round((1 - yearly / 12 / monthly) * 100);
}

export function PlansView({
  session,
  onRequestAuth,
}: {
  session: Session | null;
  onRequestAuth: () => void;
}) {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [interval, setInterval] = useState<"monthly" | "yearly">("yearly");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const accessToken = session?.accessToken ?? null;

  useEffect(() => {
    getPlans().then(setPlans).catch(() => setError("Couldn't load plans. Try again later."));
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setAccount(null);
      return;
    }
    getAccount(accessToken).then(setAccount).catch(() => setAccount(null));
  }, [accessToken]);

  const currentPlanId = account?.plan?.id ?? (session ? "free" : null);

  async function onBuy(plan: Plan) {
    if (!accessToken) {
      onRequestAuth();
      return;
    }
    setBusy(plan.id);
    setError("");
    try {
      const url = await createCheckout(accessToken, plan.id, interval);
      window.open(url, "_blank", "noreferrer");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Checkout failed. Try again.");
    } finally {
      setBusy("");
    }
  }

  async function onManage() {
    if (!accessToken) return;
    setBusy("manage");
    setError("");
    try {
      const url = await createPortal(accessToken);
      window.open(url, "_blank", "noreferrer");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't open billing. Try again.");
    } finally {
      setBusy("");
    }
  }

  const usage = account?.usage ?? null;
  const usagePct = useMemo(() => {
    if (!usage || usage.tokensPerMonth <= 0) return 0;
    return Math.min(100, Math.round((usage.tokensUsedThisPeriod / usage.tokensPerMonth) * 100));
  }, [usage]);

  return (
    <div className="plans">
      <h2 className="page-title">Plans</h2>

      {usage && account?.plan && (
        <div className="plan-usage">
          <div className="plan-usage-head">
            <strong>{account.plan.name}</strong>
            <span className="hint">
              {usage.tokensUsedThisPeriod.toLocaleString()} / {usage.tokensPerMonth.toLocaleString()} tokens this period
            </span>
          </div>
          <div className="plan-usage-bar">
            <div className="plan-usage-fill" style={{ width: `${usagePct}%` }} />
          </div>
          <button className="linklike" onClick={onManage} disabled={busy === "manage"}>
            Manage subscription
          </button>
        </div>
      )}

      <div className="plan-toggle">
        <button
          className={interval === "monthly" ? "seg active" : "seg"}
          onClick={() => setInterval("monthly")}
        >
          Monthly
        </button>
        <button
          className={interval === "yearly" ? "seg active" : "seg"}
          onClick={() => setInterval("yearly")}
        >
          Yearly
        </button>
      </div>

      {!plans && !error && <p className="hint">Loading plans…</p>}
      {error && <p className="error">{error}</p>}

      <div className="plan-grid">
        {(plans ?? []).map((plan) => {
          const price = plan.prices?.[interval];
          const discount = interval === "yearly" ? yearlyDiscount(plan) : null;
          const isCurrent = currentPlanId === plan.id;
          const perMonth = price
            ? interval === "yearly"
              ? formatPrice(Math.round(price.amount / 12))
              : formatPrice(price.amount)
            : null;
          return (
            <div key={plan.id} className={isCurrent ? "plan-card current" : "plan-card"}>
              <div className="plan-card-head">
                <h3>{plan.name}</h3>
                {discount != null && discount > 0 && (
                  <span className="badge save">save {discount}%</span>
                )}
                {isCurrent && <span className="badge sm">current</span>}
              </div>
              <p className="plan-price">
                {plan.contactEmail ? "Let's talk" : perMonth ? `${perMonth}/mo` : "$0"}
                {price && interval === "yearly" && (
                  <span className="hint"> billed {formatPrice(price.amount)}/yr</span>
                )}
              </p>
              <ul className="plan-features">
                {(PLAN_COPY[plan.id] ?? plan.features).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {plan.contactEmail ? (
                <a className="save plan-cta" href={`mailto:${plan.contactEmail}`}>
                  Email us
                </a>
              ) : plan.prices ? (
                <button
                  className="save plan-cta"
                  disabled={isCurrent || busy === plan.id || !price}
                  onClick={() => onBuy(plan)}
                >
                  {isCurrent ? "Your plan" : session ? "Upgrade" : "Log in to upgrade"}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
