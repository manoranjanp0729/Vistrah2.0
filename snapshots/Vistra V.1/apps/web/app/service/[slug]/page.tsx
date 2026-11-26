import { CategoryPage } from "../../../features/catalogue";

export default async function CatalogueCategoryRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CategoryPage slug={slug} />;
}
