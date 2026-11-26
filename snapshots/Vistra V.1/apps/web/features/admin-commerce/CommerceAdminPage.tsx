"use client";

import { FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { membershipApi } from "../membership/api/client";
import { formatINR } from "../membership/api/client";
import styles from "./CommerceAdminPage.module.css";

type Row = Record<string, unknown>;
type PageKind = "membership" | "payments";
type DataState = Record<string, unknown>;

const membershipEndpoints: Record<string, string> = {
  plans: "/admin/membership/plans", members: "/admin/membership/members",
  transactions: "/admin/membership/transactions", offers: "/admin/membership/offers",
};
const paymentEndpoints: Record<string, string> = {
  overview: "/admin/payments/overview", transactions: "/admin/payments/transactions",
  allocations: "/admin/payments/allocations", rules: "/admin/settlement-rules",
  recipients: "/admin/payment-recipients", settlements: "/admin/payments/settlements",
  refunds: "/admin/payment-refunds", reconciliation: "/admin/reconciliation/runs", providers: "/admin/providers",
};

function displayValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number" && /(amount|paise|gross|refund)/i.test(key)) return formatINR(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return "Details available";
  if (/(date|_at)$/i.test(key) && typeof value === "string") return new Date(value).toLocaleString("en-IN");
  return String(value);
}

function DataTable({ title, rows, columns, children }: { title: string; rows: Row[]; columns?: string[]; children?: (row: Row) => ReactNode }) {
  const keys = columns || (rows[0] ? Object.keys(rows[0]).filter((key) => !["metadata", "allocation_snapshot", "payload"].includes(key)).slice(0, 8) : []);
  return <section className={styles.panel}><h2>{title}</h2>{rows.length ? <div className={styles.tableWrap}><table><thead><tr>{keys.map((key) => <th key={key}>{key.replaceAll("_", " ")}</th>)}{children && <th>Actions</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id || row.transaction_number || index)}>{keys.map((key) => <td key={key}>{displayValue(key, row[key])}</td>)}{children && <td>{children(row)}</td>}</tr>)}</tbody></table></div> : <p className={styles.empty}>No records returned by the backend.</p>}</section>;
}

export default function CommerceAdminPage({ page }: { page: PageKind }) {
  const [data, setData] = useState<DataState>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState({ slug: "", name: "", description: "", amount_paise: "", status: "ACTIVE" });
  const [planEdit, setPlanEdit] = useState({ id: "", amount_paise: "" });
  const [offer, setOffer] = useState({ name: "", description: "", category_slug: "", subcategory_slug: "", service_slug: "", benefit_type: "PERCENTAGE", benefit_value: "", starts_at: "", ends_at: "", terms: "" });
  const [rule, setRule] = useState({ name: "", transaction_type: "SERVICE", category_slug: "", subcategory_slug: "", service_slug: "" });
  const [ruleTargets, setRuleTargets] = useState([{ recipient_id: "", basis: "PERCENTAGE", basis_points: "", fixed_amount_paise: "" }]);
  const [providerOnboarding, setProviderOnboarding] = useState({ provider_id: "" });
  const [recipientForm, setRecipientForm] = useState({ recipient_key: "", recipient_type: "OTHER_APPROVED_RECIPIENT", provider_id: "", user_id: "" });
  const [refund, setRefund] = useState({ transaction_id: "", amount_paise: "", reason: "" });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const endpoints = page === "membership" ? membershipEndpoints : paymentEndpoints;
    const results = await Promise.all(Object.entries(endpoints).map(async ([key, path]) => {
      try { return [key, await membershipApi<unknown>(path)] as const; }
      catch (cause) { throw new Error(`${key}: ${cause instanceof Error ? cause.message : "request failed"}`); }
    }));
    setData(Object.fromEntries(results));
    setLoading(false);
  }, [page]);

  useEffect(() => { void load().catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : "Could not load admin data."); setLoading(false); }); }, [load]);

  const action = async (path: string, options: RequestInit, message: string) => {
    setBusy(true); setError(""); setNotice("");
    try { await membershipApi(path, options); setNotice(message); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The operation failed."); }
    finally { setBusy(false); }
  };

  const submitPlan = (event: FormEvent) => { event.preventDefault(); void action("/admin/membership/plans", { method: "POST", body: JSON.stringify({ ...plan, amount_paise: Number(plan.amount_paise) }) }, "Membership plan saved."); };
  const submitOffer = (event: FormEvent) => { event.preventDefault(); void action("/admin/membership/offers", { method: "POST", body: JSON.stringify({ ...offer, category_slug: offer.category_slug || null, subcategory_slug: offer.subcategory_slug || null, service_slug: offer.service_slug || null, benefit_value: Number(offer.benefit_value), starts_at: new Date(offer.starts_at).toISOString(), ends_at: offer.ends_at ? new Date(offer.ends_at).toISOString() : null, active: false }) }, "Offer created inactive; activate it after review."); };
  const submitRule = (event: FormEvent) => { event.preventDefault(); void action("/admin/settlement-rules", { method: "POST", body: JSON.stringify({ ...rule, category_slug: rule.category_slug || null, subcategory_slug: rule.subcategory_slug || null, service_slug: rule.service_slug || null, priority: 0, targets: ruleTargets.map((target) => target.basis === "PERCENTAGE" ? { recipient_id: target.recipient_id, basis: target.basis, basis_points: Number(target.basis_points) } : { recipient_id: target.recipient_id, basis: target.basis, fixed_amount_paise: Number(target.fixed_amount_paise) }) }) }, "Settlement rule created. Allocation is checked against the exact payment amount at checkout."); };
  const submitProviderOnboarding = (event: FormEvent) => { event.preventDefault(); void action(`/admin/payment-recipients/provider/${encodeURIComponent(providerOnboarding.provider_id)}/onboard`, { method: "POST" }, "Sandbox provider onboarding started. Verify the sandbox outcome from the recipients table."); };
  const submitRecipient = (event: FormEvent) => { event.preventDefault(); void action("/admin/payment-recipients", { method: "POST", body: JSON.stringify({ ...recipientForm, provider_id: recipientForm.provider_id || null, user_id: recipientForm.user_id || null, active: true }) }, "Payment recipient created as unverified."); };
  const submitRefund = (event: FormEvent) => { event.preventDefault(); void action(`/admin/payments/${encodeURIComponent(refund.transaction_id)}/refund`, { method: "POST", body: JSON.stringify({ amount_paise: Number(refund.amount_paise), reason: refund.reason }) }, "Refund request created; it remains pending until a signed gateway event arrives."); };

  const list = (key: string) => Array.isArray(data[key]) ? data[key] as Row[] : [];
  const overview = data.overview as { transactions?: Row; settlements?: Row[]; mode?: string } | undefined;
  const recipients = list("recipients");

  return <main className={styles.page}>
    <header className={styles.heading}><div><p className={styles.eyebrow}>ADMINISTRATION · SANDBOX</p><h1>{page === "membership" ? "Membership" : "Payments & Settlement"}</h1><p>All displayed records and status counts are loaded from the VISTRAH API.</p></div><span className={styles.mode}>SANDBOX ONLY</span></header>
    {loading && <p role="status">Loading backend records…</p>}{error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice} role="status">{notice}</p>}

    {page === "membership" ? <>
      <div className={styles.formsGrid}>
        <form className={styles.form} onSubmit={submitPlan}><h2>Add membership plan</h2><label>Slug<input required pattern="[a-z0-9-]+" value={plan.slug} onChange={(e) => setPlan({ ...plan, slug: e.target.value })} /></label><label>Name<input required value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} /></label><label>Description<textarea value={plan.description} onChange={(e) => setPlan({ ...plan, description: e.target.value })} /></label><label>Monthly amount (paise)<input required min="1" type="number" value={plan.amount_paise} onChange={(e) => setPlan({ ...plan, amount_paise: e.target.value })} /></label><button disabled={busy}>Create plan</button></form>
        <form className={styles.form} onSubmit={submitOffer}><h2>Create member offer</h2><label>Name<input required value={offer.name} onChange={(e) => setOffer({ ...offer, name: e.target.value })} /></label><label>Description<input value={offer.description} onChange={(e) => setOffer({ ...offer, description: e.target.value })} /></label><div className={styles.twoFields}><label>Category slug<input value={offer.category_slug} onChange={(e) => setOffer({ ...offer, category_slug: e.target.value })} /></label><label>Subcategory slug<input value={offer.subcategory_slug} onChange={(e) => setOffer({ ...offer, subcategory_slug: e.target.value })} /></label></div><label>Service slug<input value={offer.service_slug} onChange={(e) => setOffer({ ...offer, service_slug: e.target.value })} /></label><div className={styles.twoFields}><label>Benefit type<select value={offer.benefit_type} onChange={(e) => setOffer({ ...offer, benefit_type: e.target.value })}><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed amount (paise)</option><option value="MEMBER_PRICE">Member price (paise)</option></select></label><label>Benefit value<input required min="1" type="number" value={offer.benefit_value} onChange={(e) => setOffer({ ...offer, benefit_value: e.target.value })} /></label></div><div className={styles.twoFields}><label>Starts at<input required type="datetime-local" value={offer.starts_at} onChange={(e) => setOffer({ ...offer, starts_at: e.target.value })} /></label><label>Ends at (optional)<input type="datetime-local" value={offer.ends_at} onChange={(e) => setOffer({ ...offer, ends_at: e.target.value })} /></label></div><label>Terms<textarea value={offer.terms} onChange={(e) => setOffer({ ...offer, terms: e.target.value })} /></label><button disabled={busy}>Create inactive offer</button></form>
      </div>
      <DataTable title="Plans" rows={list("plans")} columns={["slug", "name", "amount_paise", "billing_interval", "status", "updated_at"]}>
        {(row) => planEdit.id === String(row.id) ? <span className={styles.inlineEdit}><input aria-label="Plan amount in paise" type="number" min="1" value={planEdit.amount_paise} onChange={(event) => setPlanEdit({ ...planEdit, amount_paise: event.target.value })} /><button className={styles.smallButton} disabled={busy} onClick={() => void action(`/admin/membership/plans/${row.id}`, { method: "PATCH", body: JSON.stringify({ amount_paise: Number(planEdit.amount_paise) }) }, "Plan amount updated.").then(() => setPlanEdit({ id: "", amount_paise: "" }))}>Save</button></span> : <button className={styles.smallButton} onClick={() => setPlanEdit({ id: String(row.id), amount_paise: String(row.amount_paise) })}>Change amount</button>}
      </DataTable>
      <DataTable title="Members and subscription status" rows={list("members")} />
      <DataTable title="Membership transactions" rows={list("transactions")} />
      <DataTable title="Member offers" rows={list("offers")} columns={["name", "category_slug", "subcategory_slug", "service_slug", "benefit_type", "benefit_value", "starts_at", "ends_at", "active", "terms"]}>
        {(row) => <button className={styles.smallButton} disabled={busy} onClick={() => void action(`/admin/membership/offers/${row.id}`, { method: "PATCH", body: JSON.stringify({ active: !row.active }) }, row.active ? "Offer deactivated." : "Offer activated.")}>{row.active ? "Deactivate" : "Activate"}</button>}
      </DataTable>
    </> : <>
      {overview && <div className={styles.stats}>{Object.entries(overview.transactions || {}).map(([key, value]) => <article key={key}><span>{key.replaceAll("_", " ")}</span><strong>{displayValue(key, value)}</strong></article>)}<article><span>Payment mode</span><strong>{overview.mode || "—"}</strong></article></div>}
      <div className={styles.formsGrid}>
        <form className={styles.form} onSubmit={submitRule}>
          <h2>Create allocation rule</h2>
          <label>Name<input required value={rule.name} onChange={(e) => setRule({ ...rule, name: e.target.value })} /></label>
          <label>Transaction type<select value={rule.transaction_type} onChange={(e) => setRule({ ...rule, transaction_type: e.target.value })}><option value="SERVICE">Service</option><option value="MEMBERSHIP">Membership</option></select></label>
          <div className={styles.twoFields}><label>Category slug<input value={rule.category_slug} onChange={(e) => setRule({ ...rule, category_slug: e.target.value })} /></label><label>Subcategory slug<input value={rule.subcategory_slug} onChange={(e) => setRule({ ...rule, subcategory_slug: e.target.value })} /></label></div>
          <label>Service slug<input value={rule.service_slug} onChange={(e) => setRule({ ...rule, service_slug: e.target.value })} /></label>
          {ruleTargets.map((target, index) => <div className={styles.ruleTarget} key={index}>
            <strong>Recipient target {index + 1}</strong>
            <label>Recipient<select required value={target.recipient_id} onChange={(e) => setRuleTargets(ruleTargets.map((item, i) => i === index ? { ...item, recipient_id: e.target.value } : item))}><option value="">Choose recipient</option>{recipients.filter((recipient) => Boolean(recipient.active)).map((recipient) => <option key={String(recipient.id)} value={String(recipient.id)}>{String(recipient.recipient_key)} · {String(recipient.recipient_type)}</option>)}</select></label>
            <div className={styles.twoFields}><label>Basis<select value={target.basis} onChange={(e) => setRuleTargets(ruleTargets.map((item, i) => i === index ? { ...item, basis: e.target.value } : item))}><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed amount</option></select></label>
            {target.basis === "PERCENTAGE" ? <label>Basis points<input required type="number" min="1" max="10000" value={target.basis_points} onChange={(e) => setRuleTargets(ruleTargets.map((item, i) => i === index ? { ...item, basis_points: e.target.value } : item))} /></label> : <label>Amount in paise<input required type="number" min="1" value={target.fixed_amount_paise} onChange={(e) => setRuleTargets(ruleTargets.map((item, i) => i === index ? { ...item, fixed_amount_paise: e.target.value } : item))} /></label>}</div>
            {ruleTargets.length > 1 && <button type="button" className={styles.linkButton} onClick={() => setRuleTargets(ruleTargets.filter((_, i) => i !== index))}>Remove target</button>}
          </div>)}
          <button type="button" className={styles.secondaryButton} onClick={() => setRuleTargets([...ruleTargets, { recipient_id: "", basis: "PERCENTAGE", basis_points: "", fixed_amount_paise: "" }])}>Add recipient target</button>
          <p className={styles.subtle}>Targets must balance the entire amount of each payment covered by this rule. Existing successful payments keep their allocation snapshot.</p>
          <button disabled={busy}>Create rule</button>
        </form>
        <div className={styles.form}><h2>Settlement operations</h2><p>Eligible allocations can be grouped into pending settlements. Submission is blocked until recipient verification and gateway references are configured.</p><button disabled={busy} onClick={() => void action("/admin/payment-settlements/run", { method: "POST" }, "Pending settlements were generated from ledger allocations.")}>Generate pending settlements</button><button className={styles.secondaryButton} disabled={busy} onClick={() => void action("/admin/reconciliation/run", { method: "POST" }, "Reconciliation completed; review the recorded issues below.")}>Run reconciliation</button><p className={styles.subtle}>Sandbox events are recorded with the same signature verification and idempotency path as payment callbacks.</p></div>
        <form className={styles.form} onSubmit={submitProviderOnboarding}>
          <h2>Provider payment onboarding</h2>
          <label>Provider<select required value={providerOnboarding.provider_id} onChange={(e) => setProviderOnboarding({ ...providerOnboarding, provider_id: e.target.value })}><option value="">Choose provider</option>{list("providers").map((provider) => <option key={String(provider.id)} value={String(provider.id)}>{String(provider.name)} · {String(provider.id)}</option>)}</select></label>
          <p className={styles.subtle}>This creates a sandbox gateway account reference. Verification and settlement eligibility change only after a signed sandbox event.</p>
          <button disabled={busy || !providerOnboarding.provider_id}>Start sandbox onboarding</button>
        </form>
        <form className={styles.form} onSubmit={submitRecipient}>
          <h2>Add approved recipient</h2>
          <label>Recipient key<input required pattern="[a-zA-Z0-9._:-]+" value={recipientForm.recipient_key} onChange={(e) => setRecipientForm({ ...recipientForm, recipient_key: e.target.value })} /></label>
          <label>Recipient type<select value={recipientForm.recipient_type} onChange={(e) => setRecipientForm({ ...recipientForm, recipient_type: e.target.value })}><option value="VISTRAH">VISTRAH</option><option value="SERVICE_PROVIDER">Service provider</option><option value="EMPLOYEE_INCENTIVE">Employee incentive</option><option value="OTHER_APPROVED_RECIPIENT">Other approved recipient</option></select></label>
          {recipientForm.recipient_type === "SERVICE_PROVIDER" && <label>Provider<select required value={recipientForm.provider_id} onChange={(e) => setRecipientForm({ ...recipientForm, provider_id: e.target.value })}><option value="">Choose provider</option>{list("providers").map((provider) => <option key={String(provider.id)} value={String(provider.id)}>{String(provider.name)}</option>)}</select></label>}
          {recipientForm.recipient_type === "EMPLOYEE_INCENTIVE" && <label>Employee user UUID<input required value={recipientForm.user_id} onChange={(e) => setRecipientForm({ ...recipientForm, user_id: e.target.value })} /></label>}
          <p className={styles.subtle}>Add only approved recipients. Do not enter bank account numbers, UPI credentials, card data, or passwords.</p>
          <button disabled={busy}>Create unverified recipient</button>
        </form>
      </div>
      <DataTable title="Transactions" rows={list("transactions")} columns={["transaction_number", "transaction_type", "email", "amount_paise", "refunded_amount_paise", "status", "gateway_transaction_id", "created_at"]}>
        {(row) => row.status === "SUCCEEDED" || row.status === "PARTIALLY_REFUNDED" ? <button className={styles.smallButton} onClick={() => setRefund({ transaction_id: String(row.id), amount_paise: "", reason: "" })}>Request refund</button> : null}
      </DataTable>
      {refund.transaction_id && <form className={styles.form} onSubmit={submitRefund}><h2>Request sandbox refund</h2><label>Amount (paise)<input required type="number" min="1" value={refund.amount_paise} onChange={(e) => setRefund({ ...refund, amount_paise: e.target.value })} /></label><label>Reason<input required value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} /></label><button disabled={busy}>Create refund request</button><button type="button" className={styles.secondaryButton} onClick={() => setRefund({ transaction_id: "", amount_paise: "", reason: "" })}>Close</button></form>}
      <DataTable title="Allocations and reversals" rows={list("allocations")} columns={["transaction_number", "recipient_key_snapshot", "recipient_type_snapshot", "amount_paise", "entry_type", "payment_status", "settlement_id", "created_at"]} />
      <DataTable title="Settlement rules" rows={list("rules")} columns={["name", "transaction_type", "category_slug", "subcategory_slug", "service_slug", "priority", "active", "targets"]} />
      <DataTable title="Payment recipients and onboarding" rows={recipients} columns={["recipient_key", "recipient_type", "gateway_account_reference", "onboarding_status", "verification_status", "settlement_eligible", "active"]}>
        {(row) => row.gateway_account_reference ? <button className={styles.smallButton} disabled={busy} onClick={() => void action(`/admin/payment-recipients/${row.id}/sandbox-outcome?outcome=success`, { method: "POST" }, "Signed sandbox verification recorded.")}>Simulate verification</button> : <button className={styles.smallButton} disabled={busy} onClick={() => void action(`/admin/payment-recipients/${row.id}/onboard`, { method: "POST" }, "Sandbox onboarding started.")}>Start onboarding</button>}
      </DataTable>
      <DataTable title="Pending, completed, and failed settlements" rows={list("settlements")} columns={["settlement_number", "recipient_key", "recipient_type", "amount_paise", "status", "gateway_settlement_reference", "failure_reason", "created_at"]}>
        {(row) => row.status === "PENDING" ? <button className={styles.smallButton} disabled={busy} onClick={() => void action(`/admin/payment-settlements/${row.id}/submit`, { method: "POST" }, "Settlement submitted to sandbox gateway.")}>Submit</button> : null}
      </DataTable>
      <DataTable title="Refunds" rows={list("refunds")} />
      <DataTable title="Reconciliation runs and findings" rows={list("reconciliation")} />
    </>}
  </main>;
}
