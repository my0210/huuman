const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function broadcast(
  topic: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ topic, event, payload }],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[broadcast] failed:", res.status, text);
    }
  } catch (err) {
    console.error("[broadcast] error:", err);
  }
}
