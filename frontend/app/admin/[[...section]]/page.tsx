import {AdminApp} from '@/components/admin';
export const metadata = {title: 'Admin dashboard'};
export default async function AdminPage({params}: {params: Promise<{section?: string[]}>}) {
  const {section = []} = await params;
  return <AdminApp section={section[0] || ''} />;
}
