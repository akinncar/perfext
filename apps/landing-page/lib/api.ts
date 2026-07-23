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

export interface AuthSession { accessToken: string; refreshToken: string }

async function postJson<T>(path: string, body: unknown, accessToken?: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Request failed (${res.status}).`);
  }
  return data as T;
}

export function login(email: string, password: string): Promise<AuthSession> {
  return postJson<{ session: AuthSession }>("/v1/auth/login", { email, password }).then((r) => r.session);
}

export function signup(email: string, password: string): Promise<AuthSession> {
  return postJson<{ session: AuthSession }>("/v1/auth/signup", { email, password }).then((r) => r.session);
}

export function createCheckout(
  accessToken: string,
  planId: string,
  interval: string,
): Promise<string> {
  return postJson<{ url: string }>("/v1/billing/checkout", { planId, interval }, accessToken).then((r) => r.url);
}
