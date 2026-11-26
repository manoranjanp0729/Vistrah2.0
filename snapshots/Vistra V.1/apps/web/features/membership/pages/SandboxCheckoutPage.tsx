"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR, membershipApi } from "../api/client";
import styles from "../Membership.module.css";

type CheckoutTransaction = { id: string; transaction_number: string; amount_paise: number; currency: string; status: string };

export default function SandboxCheckoutPage({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [transaction, setTransaction] = useState<CheckoutTransaction | null>(null);

  useEffect(() => {
    if (!transactionId) return;
    membershipApi<CheckoutTransaction>(`/payments/${encodeURIComponent(transactionId)}`)
      .then(setTransaction)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Payment information could not be loaded."));
  }, [transactionId]);

  const complete = async (outcome: "success" | "failure") => {
    setBusy(true);
    setError("");
    setResult("");
    try {
      const response = await membershipApi<{ processed?: boolean; reason?: string }>(`/sandbox/payments/${encodeURIComponent(transactionId)}/complete`, {
        method: "POST", body: JSON.stringify({ outcome }),
      });
      if (response.processed === false) throw new Error(response.reason || "Sandbox payment event could not be processed.");
      setResult(outcome === "success" ? "The signed sandbox payment event was verified. Membership activation follows the webhook result." : "The sandbox payment failed. Membership has not been activated.");
      if (outcome === "success") window.setTimeout(() => router.push("/membership"), 1400);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sandbox payment could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  return <main className={styles.checkoutPage}><section className={styles.checkoutCard}>
    <p className={styles.eyebrow}>SANDBOX PAYMENT</p><h1>Test checkout</h1>
    <p>This local checkout is a payment-provider simulation. Selecting an outcome sends a signed test webhook; the browser does not mark the payment successful.</p>
    <p className={styles.notice}>No real payment will be taken.</p>
    {transaction && <p>{transaction.transaction_number} · {formatINR(transaction.amount_paise)}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}{result && <p className={styles.success} role="status">{result}</p>}
    <div className={styles.checkoutActions}>
      <button className={styles.primaryButton} disabled={busy || !transactionId} onClick={() => void complete("success")}>{busy ? "Processing…" : "Simulate successful payment"}</button>
      <button className={styles.secondaryButton} disabled={busy || !transactionId} onClick={() => void complete("failure")}>Simulate failed payment</button>
    </div>
    {!transactionId && <p className={styles.error}>Payment transaction reference is missing.</p>}
    <Link href="/membership">Return to Membership</Link>
  </section></main>;
}
