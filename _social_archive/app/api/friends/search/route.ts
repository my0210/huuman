import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim();

  if (!q || q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const pattern = `%${q}%`;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, display_name, email')
    .neq('id', user.id)
    .or(`display_name.ilike.${pattern},email.ilike.${pattern}`)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}
