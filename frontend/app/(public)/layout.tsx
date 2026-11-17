import {MarketingPricingEntry} from '@/components/marketing-pricing-entry';
import {AskVistrahWidget} from '@/components/ask-vistrah-widget';
import {Suspense} from 'react';
import {EditVistrahContent} from '@/components/edit-vistrah-content';
import {Header,Footer} from '@/components/shell';
import {CustomerLocationProvider} from '@/components/customer-location';
export default function PublicLayout({children}:{children:React.ReactNode}) {return <CustomerLocationProvider><Header/><main id="main-content" className="vistrah-app"><MarketingPricingEntry/><Suspense fallback={children}><EditVistrahContent>{children}</EditVistrahContent></Suspense></main><Footer/><AskVistrahWidget/></CustomerLocationProvider>;}

