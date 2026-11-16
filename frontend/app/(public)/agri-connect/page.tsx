import {redirect} from 'next/navigation';

export default function AgriConnectRedirectPage() {
  redirect('/services?category=agriculture-and-farming');
}
