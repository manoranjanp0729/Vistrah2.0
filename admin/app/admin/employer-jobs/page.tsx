import {AdminReviewFrame} from '@/components/admin-navigation';
import {EmployerJobReviews} from '@/components/employer-job-reviews';
export const metadata={title:'Employer job approvals'};
export default function EmployerJobsPage(){return <AdminReviewFrame><EmployerJobReviews/></AdminReviewFrame>;}
