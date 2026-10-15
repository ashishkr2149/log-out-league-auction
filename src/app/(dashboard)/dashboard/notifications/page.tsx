import { redirect } from 'next/navigation';

/** Notifications open from the header modal — keep this route as a soft landing. */
export default function NotificationsPage() {
  redirect('/dashboard');
}
