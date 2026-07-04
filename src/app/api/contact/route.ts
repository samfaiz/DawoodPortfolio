import { NextResponse } from 'next/server';

/**
 * Contact endpoint.
 *
 * Forwards the brief to the Laravel CMS (POST ${CMS_URL}/api/leads), where it
 * lands in the admin "Contact leads" inbox. The shoot type is folded into the
 * message so nothing is lost. If CMS_URL is not configured, it falls back to
 * logging the brief (dev mode) so the form still succeeds locally.
 */
const CMS_URL = process.env.CMS_URL?.replace(/\/$/, '');

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }

  const { name, email, message, type, phone } = body;
  if (!name || !email || !message) {
    return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 422 });
  }

  const fullMessage = type ? `Shoot type: ${type}\n\n${message}` : String(message);

  // No CMS configured (local dev without the backend): log and succeed.
  if (!CMS_URL) {
    console.log('[lead]', JSON.stringify({ name, email, phone, message: fullMessage }));
    return NextResponse.json({ ok: true });
  }

  try {
    const res = await fetch(`${CMS_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name, email, phone: phone ?? null, message: fullMessage }),
    });

    if (!res.ok) throw new Error(`CMS responded ${res.status}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Don't lose the lead: record it in the server log and tell the client to
    // reach out via WhatsApp/email (the form shows that fallback on error).
    console.error('[lead] CMS forward failed:', err);
    console.error('[lead] payload:', JSON.stringify({ name, email, phone, message: fullMessage }));
    return NextResponse.json({ ok: false, error: 'Could not submit right now' }, { status: 502 });
  }
}
