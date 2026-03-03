// Server-side proxy to Dune query results with simple in-memory cache.
// This proxy currently fixes the `queryId` to 4319 for consistent results.
// Usage: GET /api/dune/query
// Requires environment variable `DUNE_API_KEY` (store on server, do NOT expose in client).

const CACHE = new Map(); // cacheKey -> { ts, data }
const TTL = 1000 * 60 * 5; // 5 minutes cache

export async function GET(req) {
  try {
    // Force queryId to 4319 regardless of client-sent parameters
    const url = new URL(req.url)
    const queryId = '4319'
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const pageSize = Math.max(1, parseInt(url.searchParams.get('pageSize') || '26', 10))
    const DUNE_API_KEY = process.env.DUNE_API_KEY || process.env.NEXT_PUBLIC_DUNE_API_KEY;
    if (!DUNE_API_KEY) {
      return new Response(JSON.stringify({ error: 'DUNE_API_KEY not configured on server' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const cacheKey = `dune:${queryId}`;
    const now = Date.now();
    const cached = CACHE.get(cacheKey);
    if (cached && (now - cached.ts) < TTL) {
      // slice cached data for pagination
      const full = cached.data
      const rows = full?.result?.rows || full?.result?.data || full?.rows || full?.data || full?.result || []
      const total = Array.isArray(rows) ? rows.length : 0
      const start = (page - 1) * pageSize
      const sliced = Array.isArray(rows) ? rows.slice(start, start + pageSize) : []
      return new Response(JSON.stringify({ total, page, pageSize, rows: sliced }), { headers: { 'Content-Type': 'application/json' } });
    }

    const duneUrl = `https://api.dune.com/api/v1/query/${queryId}/results`;
    
    const res = await fetch(duneUrl, {
      headers: {
        Authorization: `Bearer ${DUNE_API_KEY}`,
        Accept: 'application/json',
        'X-DUNE-API-KEY': DUNE_API_KEY, // some Dune API versions expect the key here instead of Authorization header
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(text, { status: res.status, headers: { 'Content-Type': 'text/plain' } });
    }

    const data = await res.json();
    CACHE.set(cacheKey, { ts: now, data });

    const rows = data?.result?.rows || data?.result?.data || data?.rows || data?.data || data?.result || []
    const total = Array.isArray(rows) ? rows.length : 0
    const start = (page - 1) * pageSize
    const sliced = Array.isArray(rows) ? rows.slice(start, start + pageSize) : []

    return new Response(JSON.stringify({ total, page, pageSize, rows: sliced }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
