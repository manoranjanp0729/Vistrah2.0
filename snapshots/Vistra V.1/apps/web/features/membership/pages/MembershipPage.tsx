"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { API, formatINR, getAccessToken, membershipApi } from "../api/client";
import type { Membership, MembershipPayment, MembershipPlan } from "../types";
import styles from "../Membership.module.css";

type MembershipResponse = { membership: Membership | null; transactions: MembershipPayment[] };

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";
}

export default function MembershipPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [account, setAccount] = useState<MembershipResponse | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    try {
      const [planRows, member] = await Promise.all([
        membershipApi<MembershipPlan[]>("/membership/plans"),
        getAccessToken() ? membershipApi<MembershipResponse>("/membership/me") : Promise.resolve(null),
      ]);
      setPlans(planRows);
      setAccount(member);
      setSignedIn(Boolean(getAccessToken()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Membership information is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const startCheckout = async (plan: MembershipPlan) => {
    if (!signedIn) {
      window.location.assign("/login?next=%2Fmembership");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const checkout = await membershipApi<{ transaction_id: string }>("/membership/checkout", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ plan_slug: plan.slug }),
      });
      window.location.assign(`/sandbox-checkout?transaction=${encodeURIComponent(checkout.transaction_id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Membership checkout could not be started.");
      setBusy(false);
    }
  };

  const cancelMembership = async () => {
    setBusy(true);
    setError("");
    try {
      await membershipApi("/membership/me/cancel", { method: "POST" });
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Membership could not be cancelled.");
    } finally {
      setBusy(false);
    }
  };

  const membership = account?.membership;
  const activePlan = plans.find((plan) => plan.id === membership?.plan_id) || plans[0];

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span aria-current="page">Membership</span></nav>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>VISTRAH MEMBERSHIP</p>
            <h1>More clarity as you explore services.</h1>
            <p>Get member information, provider discovery, and access to offers when participating services have an active benefit.</p>
            <p className={styles.notice}>Membership does not make service purchases free. Any service payment is a separate transaction.</p>
          </div>
          <div className={styles.planCard}>
            <span className={styles.planLabel}>MONTHLY PLAN</span>
            <h2>{activePlan?.name || "VISTRAH Membership"}</h2>
            {activePlan ? <p className={styles.price}>{formatINR(activePlan.amount_paise)}<span> / month</span></p> : <p role="status">{loading ? "Loading plan…" : "No active membership plan is available."}</p>}
            {membership?.status === "ACTIVE" ? (
              <Link className={styles.secondaryButton} href="/profile">Manage Membership</Link>
            ) : (
              <button className={styles.primaryButton} type="button" disabled={busy || loading || !activePlan} onClick={() => activePlan && void startCheckout(activePlan)}>
                {busy ? "Preparing checkout…" : signedIn ? "Become a Member" : "Sign in to become a member"}
              </button>
            )}
            <small>Secure checkout is currently in sandbox test mode.</small>
          </div>
        </header>

        {error && <p className={styles.error} role="alert">{error}</p>}
        {membership && <section className={styles.statusCard} aria-labelledby="membership-status-title">
          <div><p className={styles.eyebrow}>YOUR MEMBERSHIP</p><h2 id="membership-status-title">Membership Status: {membership.status.replaceAll("_", " ")}</h2></div>
          <dl><div><dt>Plan</dt><dd>{membership.plan_name}</dd></div><div><dt>Next billing date</dt><dd>{dateLabel(membership.renewal_date)}</dd></div><div><dt>Started</dt><dd>{dateLabel(membership.start_date)}</dd></div></dl>
          {membership.status === "ACTIVE" && <button className={styles.textButton} type="button" disabled={busy} onClick={() => void cancelMembership()}>Cancel Membership</button>}
        </section>}

        <section className={styles.benefits}>
          <h2>Membership includes</h2>
          <ul><li>Service information and provider discovery</li><li>Enhanced member information</li><li>Member-only offers when an active offer is configured</li><li>Selected category and service benefits</li></ul>
        </section>

        {account && <section className={styles.history}>
          <div className={styles.historyHeading}><h2>Payment history</h2><Link href="/profile">Manage your account</Link></div>
          {account.transactions.length ? <div className={styles.tableWrap}><table><thead><tr><th>Reference</th><th>When</th><th>Amount</th><th>Status</th></tr></thead><tbody>{account.transactions.map((payment) => <tr key={payment.id}><td>{payment.transaction_number}</td><td>{dateLabel(payment.succeeded_at || payment.created_at)}</td><td>{formatINR(payment.amount_paise)}</td><td>{payment.status}</td></tr>)}</tbody></table></div> : <p>No membership payments yet.</p>}
        </section>}
        <p className={styles.footnote}>Sandbox mode does not move real money. Live payment activation requires completed payment-provider onboarding and configuration.</p>
      </div>
    </main>
  );
}
