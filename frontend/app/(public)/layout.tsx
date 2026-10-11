import {Header} from '@/components/shell';
import {CustomerLocationProvider} from '@/components/customer-location';
export default function PublicLayout({children}:{children:React.ReactNode}) {return <CustomerLocationProvider><Header/><main id="main-content">{children}</main></CustomerLocationProvider>;}

