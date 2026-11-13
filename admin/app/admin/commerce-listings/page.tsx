import {AdminReviewFrame} from '@/components/admin-workspace';
import {CommerceReviews} from '@/components/commerce-reviews';
export const metadata={title:'Product & package approvals'};
export default function CommercePage(){return <AdminReviewFrame><CommerceReviews/></AdminReviewFrame>;}
