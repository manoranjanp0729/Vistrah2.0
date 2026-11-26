import SandboxCheckoutPage from "../../features/membership/pages/SandboxCheckoutPage";

export default async function SandboxCheckoutRoute({ searchParams }: { searchParams: Promise<{ transaction?: string }> }) {
  const { transaction = "" } = await searchParams;
  return <SandboxCheckoutPage transactionId={transaction} />;
}
