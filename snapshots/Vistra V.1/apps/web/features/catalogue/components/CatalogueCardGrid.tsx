import { PublicCardGrid, type PublicCard } from "../../../app/components/PublicPageTemplates";

export default function CatalogueCardGrid({ cards }: { cards: PublicCard[] }) {
  return <PublicCardGrid cards={cards} />;
}
