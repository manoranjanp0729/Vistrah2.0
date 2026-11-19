import { AskVistrahWidget } from '@/components/ask-vistrah-widget';
import { CustomerLocationProvider } from '@/components/customer-location';
import { Footer, Header } from '@/components/shell';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerLocationProvider>
      <Header />
      <main id="main-content" className="vistrah-app">
        {children}
      </main>
      <Footer />
      <AskVistrahWidget />
    </CustomerLocationProvider>
  );
}
