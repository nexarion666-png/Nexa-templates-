import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
 * Stripe webhook setup:
 *   Endpoint URL : https://<NEXT_PUBLIC_SITE_URL>/api/webhooks/stripe
 *   Event        : checkout.session.completed
 */

async function findUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  const target = email.trim().toLowerCase();
  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    const match = users.find((u) => (u.email || '').toLowerCase() === target);
    if (match) return match.id;
    if (users.length < perPage) break;
  }
  return null;
}

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    console.error('[stripe-webhook] missing environment variables');
    return new NextResponse('Server not configured', { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new NextResponse('Missing stripe-signature', { status: 400 });

  const body = await req.text();
  const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' as any });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e: any) {
    console.error('[stripe-webhook] signature verification failed:', e?.message);
    return new NextResponse('Invalid signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const templateId = session.metadata?.template_id;
    const email = session.customer_details?.email || session.customer_email;

    if (!templateId || !email) {
      console.error('[stripe-webhook] missing template_id or email on session', session.id);
      return new NextResponse('ok', { status: 200 });
    }

    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const userId = await findUserIdByEmail(supabaseAdmin, email);
      if (!userId) {
        // No account with this email yet. Return 200 so Stripe doesn't retry forever; check logs.
        console.warn('[stripe-webhook] no Supabase user for email', email, 'session', session.id);
        return new NextResponse('ok', { status: 200 });
      }

      const { data: existing } = await supabaseAdmin
        .from('purchases')
        .select('user_id')
        .eq('user_id', userId)
        .eq('template_id', templateId)
        .limit(1);

      if (!existing || existing.length === 0) {
        const { error } = await supabaseAdmin
          .from('purchases')
          .insert({ user_id: userId, template_id: templateId } as any);
        if (error) {
          console.error('[stripe-webhook] insert failed:', error.message);
          return new NextResponse('Insert failed', { status: 500 }); // Stripe will retry
        }
      }
    } catch (e: any) {
      console.error('[stripe-webhook] handler error:', e?.message || e);
      return new NextResponse('Handler error', { status: 500 });
    }
  }

  return new NextResponse('ok', { status: 200 });
}
