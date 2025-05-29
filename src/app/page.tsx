import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/login');
  // The redirect function should be called unconditionally at the top level of the component.
  // It's a terminal action, so no need to return null explicitly after it in most cases.
}
