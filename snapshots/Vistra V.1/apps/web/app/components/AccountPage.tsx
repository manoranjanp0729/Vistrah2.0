"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AccountPageLayout from "./AccountPageLayout";
import MembershipAccountSummary from "../../features/membership/components/MembershipAccountSummary";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type AccountUser = {
  id?: string;
  full_name?: string;
  email?: string;
  phone?: string | null;
  referral_code?: string;
};

type Application = {
  application_number: string;
  status: string;
  service_name: string;
  created_at?: string;
  final_amount_paise?: number | null;
};

type AccountPageProps = {
  page: "applications" | "notifications" | "profile";
};

type AccountState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "ready"; user: AccountUser }
  | { status: "error"; message: string };

const pageContent = {
  applications: {
    title: "My Applications",
    description: "Track the service requests submitted from your account.",
  },
  notifications: {
    title: "Notifications",
    description: "Updates related to your VISTRAH activity.",
  },
  profile: {
    title: "Profile",
    description: "Manage your VISTRAH account.",
  },
} satisfies Record<AccountPageProps["page"], {
  title: string;
  description: string;
}>;

function readAccountState(): AccountState {
  if (!window.localStorage.getItem("vistrah_token")) {
    return { status: "signedOut" };
  }

  const storedUser = window.localStorage.getItem("vistrah_user");
  if (!storedUser) {
    return {
      status: "error",
      message: "Your account details are not available in this browser. Please sign in again.",
    };
  }

  try {
    const parsed: unknown = JSON.parse(storedUser);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Stored account details are invalid.");
    }

    const data = parsed as Record<string, unknown>;
    const user: AccountUser = {};
    for (const key of ["id", "full_name", "email", "referral_code"] as const) {
      if (typeof data[key] === "string") user[key] = data[key];
    }
    if (typeof data.phone === "string" || data.phone === null) {
      user.phone = data.phone;
    }
    return { status: "ready", user };
  } catch {
    return {
      status: "error",
      message: "Your saved account details could not be read. Please sign in again.",
    };
  }
}

export default function AccountPage({ page }: AccountPageProps) {
  const [account, setAccount] = useState<AccountState>({ status: "loading" });
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [applicationsError, setApplicationsError] = useState("");
  const content = pageContent[page];

  useEffect(() => {
    setAccount(readAccountState());
  }, []);

  useEffect(() => {
    if (page !== "applications" || account.status !== "ready") return;
    if (!account.user.id) {
      setApplicationsError("Your account ID is missing. Please sign in again to load applications.");
      return;
    }

    const controller = new AbortController();
    fetch(`${API}/applications?user_id=${encodeURIComponent(account.user.id)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Applications could not be loaded.");
        return response.json() as Promise<Application[]>;
      })
      .then(setApplications)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setApplicationsError(
            error instanceof Error ? error.message : "Applications could not be loaded."
          );
        }
      });

    return () => controller.abort();
  }, [account, page]);

  return (
    <AccountPageLayout
      title={content.title}
      description={content.description}
      activeHref={`/${page}`}
    >
      {account.status === "loading" ? (
        <p className="accountCard" role="status">Checking your account…</p>
      ) : account.status === "signedOut" ? (
        <section className="accountEmptyState">
          <span className="accountSectionLabel">ACCOUNT ACCESS</span>
          <h2>Sign in to continue</h2>
          <p>Log in to view information associated with your account.</p>
          <Link href="/login" className="primaryButton">Log in</Link>
        </section>
      ) : account.status === "error" ? (
        <p className="accountCard" role="alert">{account.message}</p>
      ) : page === "profile" ? (
        <>
        <MembershipAccountSummary />
        <section className="accountCard">
          <p className="accountSectionLabel">ACCOUNT INFORMATION</p>
          <dl className="accountDetails">
            {account.user.full_name && <div className="accountField"><dt>Name</dt><dd>{account.user.full_name}</dd></div>}
            {account.user.email && <div className="accountField"><dt>Email</dt><dd>{account.user.email}</dd></div>}
            {account.user.phone && <div className="accountField"><dt>Phone</dt><dd>{account.user.phone}</dd></div>}
            {account.user.referral_code && <div className="accountField accountFieldReferral"><dt>Referral code</dt><dd>{account.user.referral_code}</dd></div>}
          </dl>
          {!account.user.full_name && !account.user.email && !account.user.phone && !account.user.referral_code && (
            <p className="accountSupportingText">There is no account information saved in this browser.</p>
          )}
        </section>
        </>
      ) : page === "notifications" ? (
        <section className="accountEmptyState">
          <span className="accountSectionLabel">NOTIFICATIONS</span>
          <h2>No notifications yet</h2>
          <p>Notifications are not currently available in the application.</p>
        </section>
      ) : applicationsError ? (
        <p className="accountCard" role="alert">{applicationsError}</p>
      ) : applications === null ? (
        <p className="accountCard" role="status">Loading applications…</p>
      ) : applications.length === 0 ? (
        <section className="accountEmptyState">
          <span className="accountSectionLabel">MY APPLICATIONS</span>
          <h2>No applications yet</h2>
          <p>Your service requests will appear here after they have been submitted.</p>
          <Link href="/#category-results" className="primaryButton">Explore services</Link>
        </section>
      ) : (
        <section className="accountList">
          {applications.map((application) => (
            <article className="accountCard" key={application.application_number}>
              <h2>{application.service_name}</h2>
              <dl className="accountDetails">
                <div><dt>Application</dt><dd>{application.application_number}</dd></div>
                <div><dt>Status</dt><dd>{application.status}</dd></div>
                {application.created_at && (
                  <div><dt>Submitted</dt><dd>{application.created_at}</dd></div>
                )}
              </dl>
            </article>
          ))}
        </section>
      )}
    </AccountPageLayout>
  );
}
