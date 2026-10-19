import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');

    if (!secretKey || !supabaseUrl || !anonKey || !siteUrl) {
      return NextResponse.json({ error: 'Server is not configured for payments' }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    const slug = typeof body?.slug === 'string' ? body.slug : '';
    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, anonKey);
    const { data: template, error } = await supabase
      .from('templates_public')
      .select('id, name, price, slug')
      .eq('slug', slug)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const price = Number(template.price);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'Invalid template price' }, { status: 400 });
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' as any });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: template.name as string },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/templates/${slug}?success=true`,
      cancel_url: `${siteUrl}/templates/${slug}?canceled=true`,
      metadata: { slug, template_id: String(template.id) },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error('[checkout] error:', e?.message || e);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
  }
}
