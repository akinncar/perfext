export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.perfext.ai";

export interface PlanPrice {
  amount: number;
  currency: string;
}

export interface Plan {
  id: string;
  name: string;
  features: string[];
  prices: { monthly?: PlanPrice; yearly?: PlanPrice } | null;
  limits: { tokensPerMonth: number; tokensPerDay: number } | null;
  contactEmail?: string;
}

export async function fetchPlans(): Promise<Plan[]> {
  const res = await fetch(`${API_BASE_URL}/v1/plans`);
  if (!res.ok) throw new Error(`plans request failed (${res.status})`);
  const data = (await res.json()) as { plans: Plan[] };
  return data.plans;
}
