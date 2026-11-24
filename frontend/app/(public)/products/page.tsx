import type { Metadata } from 'next';
import { CommerceBrowser } from '@/components/commerce';

export const metadata: Metadata = {
  title: 'Products | VISTRAH',
  description:
    'Browse verified physical products and fixed-price service packages from local businesses across India.',
};

export default function ProductsPage() {
  return <CommerceBrowser />;
}
