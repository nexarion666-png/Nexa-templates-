'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export function DownloadButton({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await supabase.rpc('get_download_url', { p_slug: slug });
      if (error) throw new Error(error.message);
      const { data: urlData } = await supabase.storage
        .from('template-zips')
        .createSignedUrl(data as string, 60);
      if (urlData?.signedUrl) window.location.href = urlData.signedUrl;
      else throw new Error('Could not create download link');
    } catch (e: any) {
      setError(e.message === 'Not purchased' ? 'You need to purchase this template first' : e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleDownload} disabled={loading} className="button-primary w-full">
        {loading ? 'Preparing download...' : 'Download ZIP'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
