"use client";

import { useEffect, useState } from "react";
import { fetchPlans, type Plan } from "@/lib/api";

type Interval = "monthly" | "yearly";

const FALLBACK_PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    features: [],
    prices: null,
    limits: null,
  },
  {
    id: "pro",
    name: "Pro",
    features: [],
    prices: {
      monthly: { amount: 2990, currency: "usd" },
      yearly: { amount: 17880, currency: "usd" },
    },
    limits: null,
  },
  {
    id: "advanced",
    name: "Advanced",
    features: [],
    prices: {
      monthly: { amount: 9990, currency: "usd" },
      yearly: { amount: 83880, currency: "usd" },
    },
    limits: null,
  },
  {
    id: "custom",
    name: "Custom",
    features: [],
    prices: null,
    limits: null,
    contactEmail: "sales@perfext.ai",
  },
];

/** Marketing copy per plan id; structural data (prices, limits) comes from the API. */
const PLAN_BULLETS: Record<string, string[]> = {
  free: ["Use your own API key", "No account needed"],
  pro: ["Perfext AI included", "Everyday writing allowance"],
  advanced: ["Perfext AI included", "High-volume allowance"],
  custom: ["Tailored limits & features", "Priority support"],
};

const primaryCta =
  "mt-auto inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-200";
const secondaryCta =
  "mt-auto inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-white transition hover:border-neutral-500";

function formatMoney(value: number): string {
  return value.toFixed(2);
}

/** "Save N%" — derived from real prices so the badge always stays truthful. */
function yearlySavingsPercent(plan: Plan): number | null {
  const monthly = plan.prices?.monthly?.amount;
  const yearly = plan.prices?.yearly?.amount;
  if (!monthly || !yearly) return null;
  return Math.round((1 - yearly / 12 / monthly) * 100);
}

export function Pricing() {
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [interval, setInterval] = useState<Interval>("yearly");

  useEffect(() => {
    fetchPlans()
      .then(setPlans)
      .catch(() => setPlans(FALLBACK_PLANS));
  }, []);

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24">
      <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight">
        Pricing
      </h2>

      <div className="mb-10 flex justify-center">
        <div className="inline-flex rounded-lg border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={
              interval === "monthly"
                ? "rounded-md bg-white px-4 py-1.5 text-sm font-medium text-black transition"
                : "rounded-md px-4 py-1.5 text-sm font-medium text-muted transition hover:text-white"
            }
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("yearly")}
            className={
              interval === "yearly"
                ? "rounded-md bg-white px-4 py-1.5 text-sm font-medium text-black transition"
                : "rounded-md px-4 py-1.5 text-sm font-medium text-muted transition hover:text-white"
            }
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const price = plan.prices?.[interval];
          const savePercent =
            interval === "yearly" ? yearlySavingsPercent(plan) : null;
          const bullets = PLAN_BULLETS[plan.id] ?? plan.features;

          return (
            <div
              key={plan.id}
              className="flex flex-col rounded-xl border border-border bg-surface p-8"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-medium text-white">
                  {plan.name}
                </h3>
                {savePercent != null && savePercent > 0 && (
                  <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-400">
                    Save {savePercent}%
                  </span>
                )}
              </div>

              {price ? (
                <>
                  <p className="mt-4 text-4xl font-semibold tracking-tight text-white">
                    $
                    {formatMoney(
                      interval === "yearly"
                        ? price.amount / 12 / 100
                        : price.amount / 100
                    )}
                    <span className="text-base font-normal text-muted">
                      /mo
                    </span>
                  </p>
                  {interval === "yearly" && (
                    <p className="mt-1 text-sm text-muted">
                      billed ${formatMoney(price.amount / 100)}/yr
                    </p>
                  )}
                </>
              ) : plan.contactEmail ? (
                <p className="mt-4 text-4xl font-semibold tracking-tight text-white">
                  Let&apos;s talk
                </p>
              ) : (
                <p className="mt-4 text-4xl font-semibold tracking-tight text-white">
                  $0
                </p>
              )}

              <ul className="mt-6 flex flex-col gap-3 text-sm leading-6 text-muted">
                {bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>

              {plan.id === "free" ? (
                <a href="#download" className={`${secondaryCta} mt-8`}>
                  Get the extension
                </a>
              ) : plan.id === "custom" ? (
                <a
                  href="mailto:sales@perfext.ai"
                  className={`${secondaryCta} mt-8`}
                >
                  Email us
                </a>
              ) : (
                <a
                  href={`/checkout?plan=${plan.id}&interval=${interval}`}
                  className={`${primaryCta} mt-8`}
                >
                  Get {plan.name}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
