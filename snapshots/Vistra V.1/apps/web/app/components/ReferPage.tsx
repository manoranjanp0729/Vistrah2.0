"use client";

import Link from "next/link";
import AccountPageLayout from "./AccountPageLayout";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type ReferralAccount = {
  id?: string;
  referral_code?: string;
};

type ReferralSummary = {
  reward_rule: string;
  summary: { status: string; count: number }[];
};

export default function ReferPage() {
  const [account, setAccount] = useState<ReferralAccount | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    if (!window.localStorage.getItem("vistrah_token")) {
      setSignedOut(true);
      return;
    }

    const storedUser = window.localStorage.getItem("vistrah_user");
    if (!storedUser) {
      setError("Referral account details are not available. Please sign in again.");
      return;
    }

    try {
      const parsed: unknown = JSON.parse(storedUser);
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid account details.");
      const data = parsed as Record<string, unknown>;
      const referralAccount: ReferralAccount = {};
      if (typeof data.id === "string") referralAccount.id = data.id;
      if (typeof data.referral_code === "string") referralAccount.referral_code = data.referral_code;
      if (!referralAccount.id) {
        setError("Your account ID is not available for referral details. Please sign in again.");
        return;
      }
      setAccount(referralAccount);
    } catch {
      setError("Saved referral account details could not be read. Please sign in again.");
    }
  }, []);

  useEffect(() => {
    if (!account?.id) return;

    const controller = new AbortController();
    fetch(`${API}/referrals?user_id=${encodeURIComponent(account.id)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Referral details could not be loaded.");
        return response.json() as Promise<ReferralSummary>;
      })
      .then(setSummary)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Referral details could not be loaded."
          );
        }
      });

    return () => controller.abort();
  }, [account]);

  const copyReferralCode = async () => {
    if (!account?.referral_code) return;
    try {
      await navigator.clipboard.writeText(account.referral_code);
      setCopyMessage("Referral code copied.");
    } catch {
      setCopyMessage("Could not copy the code. You can select and copy it manually.");
    }
  };

  return (
    <AccountPageLayout
      title="Refer & Earn"
      description="Referral details are managed through your account. Any reward terms shown here come from the existing VISTRAH referral service."
      activeHref="/refer"
    >
        {signedOut ? (
          <section className="accountEmptyState">
            <span className="accountSectionLabel">REFERRALS</span>
            <h2>Sign in to view your referral details</h2>
            <Link href="/login" className="primaryButton">Log in</Link>
          </section>
        ) : error ? (
          <p className="accountCard" role="alert">{error}</p>
        ) : !account ? (
          <p className="accountCard" role="status">Loading referral details…</p>
        ) : (
          <section className="accountCard">
            <p className="accountSectionLabel">REFERRAL DETAILS</p>
            {account.referral_code && (
              <div className="referralCodeRow">
                <p><strong>Your referral code</strong><span>{account.referral_code}</span></p>
                <button type="button" className="primaryButton" onClick={copyReferralCode}>
                  Copy code
                </button>
              </div>
            )}
            {summary ? (
              <>
                <p>{summary.reward_rule}</p>
                {summary.summary.length > 0 ? (
                  <ul className="referralSummary">
                    {summary.summary.map((item) => (
                      <li key={item.status}>{item.status}: {item.count}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="accountSupportingText">No referral activity is recorded yet.</p>
                )}
              </>
            ) : !error ? (
              <p className="accountSupportingText" role="status">Loading your referral summary…</p>
            ) : null}
            {copyMessage && <p className="accountSupportingText" role="status">{copyMessage}</p>}
            {!account.referral_code && (
              <p className="accountSupportingText">No referral code is saved with this account.</p>
            )}
          </section>
        )}
    </AccountPageLayout>
  );
}
