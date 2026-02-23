import { NextResponse } from 'next/server';
import { setWebhook, deleteWebhook, setMyCommands } from '@/lib/telegram/api';

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

  const [webhookResult, commandsResult] = await Promise.all([
    setWebhook(webhookUrl, process.env.TELEGRAM_WEBHOOK_SECRET!),
    setMyCommands([
      { command: 'today', description: "Today's sessions" },
      { command: 'week', description: 'Weekly plan overview' },
      { command: 'progress', description: "This week's progress" },
      { command: 'log', description: 'Log steps, sleep, nutrition' },
      { command: 'web', description: 'Open web dashboard' },
    ]),
  ]);

  return NextResponse.json({ ...webhookResult, registeredUrl: webhookUrl, commands: commandsResult.ok });
}
