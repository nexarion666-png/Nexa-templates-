import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { DownloadButton } from '@/components/download-button';

export const revalidate = 60;

async function getTemplate(slug: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key);
  const { data } = await supabase.from('templates_public').select('*').eq('slug', slug).single();
  return data;
}

export default async function Page({ params }: { params: { slug: string } }) {
  const p: any = await getTemplate(params.slug);
  
  if (!p) notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/templates" className="text-sm text-gray-500 hover:text-gray-800">
        ← Back to templates
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div>
          <img
            src={p.thumbnail_url || p.preview_image_url || '/placeholder.png'}
            alt={p.name}
            className="w-full rounded-2xl border object-cover"
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-500">{p.category}</p>
          <h1 className="mt-2 text-3xl font-extrabold">{p.name}</h1>
          {p.tagline && <p className="mt-2 text-gray-600">{p.tagline}</p>}
          {p.description && <p className="mt-4 text-sm leading-6 text-gray-600">{p.description}</p>}

          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">${Number(p.price).toFixed(0)}</span>
            <span className="text-sm text-gray-500">{p.currency || 'USD'}</span>
          </div>

          <div id="purchase" className="mt-6 scroll-mt-24">
            <DownloadButton slug={p.slug} />
          </div>
          <p className="mt-3 text-center text-xs text-gray-400">Secure download - only available after purchase.</p>

          {p.features && p.features.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-bold">Features</h3>
              <ul className="mt-3 space-y-2">
                {p.features.map((f: string) => (
                  <li key={f} className="flex gap-2 text-sm text-gray-600">
                    <Check size={16} className="mt-0.5 shrink-0 text-green-600" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.technologies && p.technologies.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-bold">Technologies</h3>
              <p className="mt-2 text-sm text-gray-600">{p.technologies.join(', ')}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
