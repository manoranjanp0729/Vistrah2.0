"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatINR, getAccessToken, membershipApi } from "../api/client";
import type { Membership } from "../types";

export default function MembershipAccountSummary() {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAccessToken()) { setLoading(false); return; }
    membershipApi<{ membership: Membership | null }>("/membership/me")
      .then((response) => setMembership(response.membership))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Membership status is unavailable."))
      .finally(() => setLoading(false));
  }, []);

  return <section className="accountCard accountMembershipCard">
    <p className="accountSectionLabel">MEMBERSHIP</p>
    {loading ? <p role="status">Loading membership status…</p> : error ? <p role="alert">{error}</p> : membership ? <>
      <h2>{membership.plan_name}</h2>
      <p>Status: <strong>{membership.status.replaceAll("_", " ")}</strong></p>
      {membership.status === "ACTIVE" && <p>Next billing date: {membership.renewal_date ? new Date(membership.renewal_date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Not scheduled"}</p>}
      <p>{formatINR(membership.amount_paise)} / month</p>
      <Link href="/membership" className="primaryButton">Manage Membership</Link>
    </> : <>
      <h2>No active membership</h2><p>Explore membership access, provider information, and currently configured offers.</p>
      <Link href="/membership" className="primaryButton">View Membership</Link>
    </>}
  </section>;
}
