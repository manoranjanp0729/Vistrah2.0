import {AdminReviewFrame} from '@/components/admin-navigation';
import {CommerceReviews} from '@/components/commerce-reviews';
export const metadata={title:'Product & package approvals'};
export default function CommercePage(){return <AdminReviewFrame><CommerceReviews/></AdminReviewFrame>;}
