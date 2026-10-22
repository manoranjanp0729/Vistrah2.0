import {AdminReviewFrame} from '@/components/admin-workspace';
import {AdminCommerceOrders} from '@/components/commerce-workspace';
export const metadata={title:'Purchase orders'};
export default function Page(){return <AdminReviewFrame><AdminCommerceOrders/></AdminReviewFrame>;}
