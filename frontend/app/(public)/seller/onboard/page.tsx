import { SelfOnboardingWizard } from '@/components/self-onboarding-wizard';

export const metadata = { title: 'List your business — 3-step self-onboarding' };

export default async function SellerOnboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const category = typeof params.category === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.category)
    ? params.category
    : undefined;
  const type = typeof params.type === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.type)
    ? params.type
    : typeof params.subcategory === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.subcategory)
    ? params.subcategory
    : undefined;
  const business = typeof params.business === 'string' && /^[1-9]\d*$/.test(params.business)
    ? Number(params.business)
    : undefined;
  return <SelfOnboardingWizard initialCategory={category} initialType={type} providerId={business} />;
}
