export type MembershipPlan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  amount_paise: number;
  currency: "INR";
  billing_interval: "MONTHLY";
  status: "ACTIVE" | "INACTIVE";
};

export type Membership = {
  id: string;
  status: "PENDING" | "ACTIVE" | "PAYMENT_FAILED" | "CANCELLED" | "EXPIRED" | "SUSPENDED";
  start_date: string | null;
  renewal_date: string | null;
  cancellation_date: string | null;
  cancel_at_period_end: boolean;
  plan_id: string;
  plan_slug: string;
  plan_name: string;
  amount_paise: number;
  currency: "INR";
  billing_interval: "MONTHLY";
};

export type MembershipPayment = {
  id: string;
  transaction_number: string;
  amount_paise: number;
  currency: string;
  status: string;
  succeeded_at: string | null;
  created_at: string;
  transaction_kind: "INITIAL" | "RENEWAL";
};

export type MembershipOffer = {
  id: string;
  name: string;
  description: string;
  benefit_type: "PERCENTAGE" | "FIXED_AMOUNT" | "MEMBER_PRICE";
  benefit_value: number;
  currency: "INR";
  starts_at: string;
  ends_at: string | null;
  terms: string;
};
