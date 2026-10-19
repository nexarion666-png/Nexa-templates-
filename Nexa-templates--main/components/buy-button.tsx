'use client';
import { useState } from 'react';

export function BuyButton({ slug, price }: { slug: string; price: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout');
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleBuy} disabled={loading} className="button-primary w-full">
        {loading ? 'Redirecting to checkout...' : `Buy for $${Number(price).toFixed(0)}`}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
