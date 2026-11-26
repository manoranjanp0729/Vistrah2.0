import { SubcategoryPage } from "../../../../features/catalogue";

export default async function MarketingSubcategoryRoute({ params }: { params: Promise<{ subslug: string }> }) {
  const { subslug } = await params;
  return <SubcategoryPage categorySlug="marketing" slug={subslug} />;
}
