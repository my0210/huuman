import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TimezoneSync } from '@/components/TimezoneSync';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    redirect('/onboarding');
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TimezoneSync />
      {children}
    </div>
  );
}
