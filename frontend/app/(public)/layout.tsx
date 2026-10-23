import {MarketingPricingEntry} from '@/components/marketing-pricing-entry';
import {Suspense} from 'react';
import {EditVistrahContent} from '@/components/edit-vistrah-content';
import {Header} from '@/components/shell';
import {CustomerLocationProvider} from '@/components/customer-location';
export default function PublicLayout({children}:{children:React.ReactNode}) {return <CustomerLocationProvider><Header/><main id="main-content" className="vistrah-app"><MarketingPricingEntry/><Suspense fallback={children}><EditVistrahContent>{children}</EditVistrahContent></Suspense></main></CustomerLocationProvider>;}

