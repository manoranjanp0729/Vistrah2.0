import { SelfOnboardingWizard } from '@/components/self-onboarding-wizard';

export const metadata = { title: 'List your business — 3-step self-onboarding' };

export default async function SellerOnboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const category =
    typeof params.category === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.category)
      ? params.category
      : undefined;
  const subcategory =
    typeof params.subcategory === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.subcategory)
      ? params.subcategory
      : undefined;
  const type =
    typeof params.type === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.type)
      ? params.type
      : subcategory;
  const rawBiz = typeof params.business === 'string' ? params.business.trim() : '';
  const providerId = /^[1-9]\d*$/.test(rawBiz) ? Number(rawBiz) : undefined;
  const initialBusinessName = !providerId && rawBiz ? rawBiz.slice(0, 150) : undefined;
  const initialLocality =
    typeof params.locality === 'string' && params.locality.trim()
      ? params.locality.trim().slice(0, 120)
      : undefined;

  return (
    <SelfOnboardingWizard
      initialCategory={category}
      initialSubcategory={subcategory}
      initialType={type}
      providerId={providerId}
      initialBusinessName={initialBusinessName}
      initialLocality={initialLocality}
    />
  );
}
