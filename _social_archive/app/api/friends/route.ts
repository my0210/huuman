import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: friendships, error } = await supabase
    .from('friendships')
    .select(`
      id,
      requester_id,
      recipient_id,
      status,
      created_at,
      accepted_at,
      requester:user_profiles!friendships_requester_id_fkey(id, display_name, username, email),
      recipient:user_profiles!friendships_recipient_id_fkey(id, display_name, username, email)
    `)
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .in('status', ['pending', 'active']);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const friends: typeof formatted = [];
  const pendingReceived: typeof formatted = [];
  const pendingSent: typeof formatted = [];

  const formatted = (friendships ?? []).map((f) => {
    const isRequester = f.requester_id === user.id;
    const otherUser = isRequester ? f.recipient : f.requester;
    return {
      friendshipId: f.id,
      status: f.status,
      createdAt: f.created_at,
      acceptedAt: f.accepted_at,
      user: otherUser,
      direction: isRequester ? 'sent' : 'received',
    };
  });

  for (const f of formatted) {
    if (f.status === 'active') {
      friends.push(f);
    } else if (f.direction === 'received') {
      pendingReceived.push(f);
    } else {
      pendingSent.push(f);
    }
  }

  return NextResponse.json({ friends, pendingReceived, pendingSent });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { recipientId } = await request.json();

  if (!recipientId || typeof recipientId !== 'string') {
    return NextResponse.json({ error: 'recipientId is required' }, { status: 400 });
  }

  if (recipientId === user.id) {
    return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(
      `and(requester_id.eq.${user.id},recipient_id.eq.${recipientId}),` +
      `and(requester_id.eq.${recipientId},recipient_id.eq.${user.id})`,
    )
    .not('status', 'eq', 'removed')
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'Friendship already exists', status: existing.status },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, recipient_id: recipientId, status: 'pending' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ friendship: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { friendshipId, action } = await request.json();

  if (!friendshipId || !action) {
    return NextResponse.json({ error: 'friendshipId and action are required' }, { status: 400 });
  }

  if (!['accept', 'remove'].includes(action)) {
    return NextResponse.json({ error: 'action must be "accept" or "remove"' }, { status: 400 });
  }

  const { data: friendship, error: fetchError } = await supabase
    .from('friendships')
    .select('*')
    .eq('id', friendshipId)
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .single();

  if (fetchError || !friendship) {
    return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
  }

  if (action === 'accept') {
    if (friendship.recipient_id !== user.id) {
      return NextResponse.json({ error: 'Only the recipient can accept' }, { status: 403 });
    }
    if (friendship.status !== 'pending') {
      return NextResponse.json({ error: 'Can only accept pending requests' }, { status: 400 });
    }
  }

  const updatePayload =
    action === 'accept'
      ? { status: 'active', accepted_at: new Date().toISOString() }
      : { status: 'removed' };

  const { data, error } = await supabase
    .from('friendships')
    .update(updatePayload)
    .eq('id', friendshipId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ friendship: data });
}
