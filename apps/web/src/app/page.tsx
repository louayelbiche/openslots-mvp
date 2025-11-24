'use client';

import { useState, type FormEvent } from 'react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

type Offer = {
  id: string;
  providerName: string;
  time: string;
  price: number;
  matchScore: 'low' | 'medium' | 'high';
};

export default function Home() {
  const [location, setLocation] = useState('NYC');
  const [date, setDate] = useState('');
  const [timeWindow, setTimeWindow] = useState('17:00-21:00');
  const [budget, setBudget] = useState('70');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          date,
          timeWindow,
          budget: Number(budget),
        }),
      });

      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }

      const data = (await res.json()) as { offers: Offer[] };
      setOffers(data.offers ?? []);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function matchColor(score: Offer['matchScore']) {
    if (score === 'high') return 'bg-green-200';
    if (score === 'medium') return 'bg-yellow-200';
    return 'bg-orange-200';
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-6 bg-slate-50">
      <div className="w-full max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold">OpenSlots, early MVP</h1>
        <p className="text-sm text-slate-600">
          Enter a simple search, we will return mocked offers from the API.
        </p>

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 p-4 bg-white rounded-lg shadow-sm border grid-cols-1 md:grid-cols-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">
              Location
            </label>
            <input
              className="border rounded px-2 py-1 text-sm"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">Date</label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">
              Time window
            </label>
            <input
              className="border rounded px-2 py-1 text-sm"
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              placeholder="17:00-21:00"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700">Budget</label>
            <input
              type="number"
              className="border rounded px-2 py-1 text-sm"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>

          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm rounded bg-black text-white disabled:opacity-60"
            >
              {loading ? 'Searching...' : 'Search slots'}
            </button>
          </div>
        </form>

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="space-y-3">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className={
                'flex items-center justify-between p-4 rounded-lg border bg-white ' +
                matchColor(offer.matchScore)
              }
            >
              <div>
                <p className="font-medium text-sm">{offer.providerName}</p>
                <p className="text-xs text-slate-600">{offer.time}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">\${offer.price}</p>
                <p className="text-xs text-slate-600">
                  Match: {offer.matchScore}
                </p>
              </div>
            </div>
          ))}

          {offers.length === 0 && !loading && !error && (
            <p className="text-sm text-slate-500">
              No offers yet, submit a search.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
