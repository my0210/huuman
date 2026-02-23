import { NextResponse } from 'next/server';
import { setWebhook, deleteWebhook } from '@/lib/telegram/api';

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const action = searchParams.get('action');

  if (action === 'delete') {
    const result = await deleteWebhook();
    return NextResponse.json(result);
  }

  if (!url) {
    return NextResponse.json({ error: 'Missing ?url= parameter' }, { status: 400 });
  }

  const webhookUrl = url.endsWith('/api/telegram/webhook')
    ? url
    : `${url.replace(/\/$/, '')}/api/telegram/webhook`;

  const result = await setWebhook(webhookUrl, process.env.TELEGRAM_WEBHOOK_SECRET!);
  return NextResponse.json({ ...result, registeredUrl: webhookUrl });
}
