import type { MembershipOffer } from "../types";

export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function getAccessToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("vistrah_token") || "";
}

export async function membershipApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function getActiveServiceOffers(params: {
  categorySlug: string;
  subcategorySlug?: string;
  serviceSlug: string;
  providerId?: string;
}) {
  const query = new URLSearchParams({ category_slug: params.categorySlug, service_slug: params.serviceSlug });
  if (params.subcategorySlug) query.set("subcategory_slug", params.subcategorySlug);
  if (params.providerId) query.set("provider_id", params.providerId);
  return membershipApi<MembershipOffer[]>(`/membership/offers?${query.toString()}`);
}

export function formatINR(amountPaise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })
    .format(amountPaise / 100);
}
