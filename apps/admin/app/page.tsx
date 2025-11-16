import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect root URL to login page
  redirect('/login');
}
