import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }
  
  return <DashboardClient />;
}
