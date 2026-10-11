import {redirect} from 'next/navigation';
export default function AdminRedirect(){redirect((process.env.ADMIN_APP_URL||'http://localhost:3200').replace(/\/$/,'')+'/admin/ownership-claims');}
