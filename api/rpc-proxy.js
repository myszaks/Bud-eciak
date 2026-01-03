// Vercel Serverless proxy for Supabase RPCs with server-side rate limiting.
// Prefer configuring Upstash Redis (recommended) via `UPSTASH_REDIS_REST_URL` and
// `UPSTASH_REDIS_REST_TOKEN`. If unavailable, falls back to an in-memory limiter
// per-instance (only suitable as a temporary measure).

const RATE_LIMIT_WINDOW_SECONDS = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10);
const DEFAULT_LIMIT = parseInt(process.env.RATE_LIMIT_DEFAULT || '30', 10);

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function upstashIncr(key) {
  // INCR key
  const url = `${UPSTASH_URL.replace(/\/$/, '')}/incr/${encodeURIComponent(key)}`;
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
  if (!r.ok) throw new Error('upstash_incr_failed');
  const j = await r.json();
  return j.result;
}

async function upstashExpire(key, seconds) {
  const url = `${UPSTASH_URL.replace(/\/$/, '')}/expire/${encodeURIComponent(key)}/${seconds}`;
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
  return r.ok;
}

module.exports = async (req, res) => {
  // Handle CORS preflight (even if same-origin, browsers may send OPTIONS with custom headers)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-id');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  let body;
  try {
    body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
  } catch (e) {
    return res.status(400).json({ error: 'invalid_json' });
  }

  const { rpc, params } = body;
  if (!rpc) return res.status(400).json({ error: 'missing_rpc' });

  // Identify client key: prefer explicit `x-client-id`, fallback to IP
  const clientId = req.headers['x-client-id'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const key = `rl:${rpc}:${clientId}`;

  try {
    if (UPSTASH_URL && UPSTASH_TOKEN) {
      // Use Upstash Redis for global counters
      const count = await upstashIncr(key);
      if (count === 1) {
        // set expiry for the bucket
        await upstashExpire(key, RATE_LIMIT_WINDOW_SECONDS);
      }
      if (count > DEFAULT_LIMIT) {
        // Ask client to retry after window (best-effort)
        res.setHeader('Retry-After', String(RATE_LIMIT_WINDOW_SECONDS));
        return res.status(429).json({ error: 'rate_limit_exceeded', retry_after: RATE_LIMIT_WINDOW_SECONDS });
      }
    } else {
      // Fallback: per-instance in-memory limiter (not global)
      if (!global.__BUDZECIAK_RATE) global.__BUDZECIAK_RATE = new Map();
      const now = Date.now();
      const entry = global.__BUDZECIAK_RATE.get(key) || { count: 0, reset: now + RATE_LIMIT_WINDOW_SECONDS * 1000 };
      if (now > entry.reset) {
        entry.count = 0;
        entry.reset = now + RATE_LIMIT_WINDOW_SECONDS * 1000;
      }
      entry.count += 1;
      global.__BUDZECIAK_RATE.set(key, entry);
      if (entry.count > DEFAULT_LIMIT) {
        const retryAfter = Math.ceil((entry.reset - now) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({ error: 'rate_limit_exceeded', retry_after: retryAfter });
      }
    }
  } catch (err) {
    // If Upstash errors, fail closed? We choose to fail open to avoid availability issues.
    console.error('rate-limiter-error', String(err));
  }

  // Forward to Supabase RPC endpoint. Prefer server env vars to avoid exposing service keys in client.
  // Read Supabase envs; fall back to VITE_* names if only those are configured
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'server_misconfigured', missing: {
      SUPABASE_URL: !SUPABASE_URL,
      SUPABASE_ANON_KEY: !SUPABASE_ANON_KEY
    }});
  }

  try {
    const forwardUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rpc/${rpc}`;
    const forwardHeaders = {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    };
    // If client supplied an Authorization header, forward it so Supabase can enforce RLS by user.
    if (req.headers.authorization) forwardHeaders.Authorization = req.headers.authorization;

    const r = await fetch(forwardUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(params || {}),
    });

    const contentType = r.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await r.json().catch(() => null) : await r.text().catch(() => null);
    const status = r.status === 204 ? 200 : r.status;
    if (status >= 400) {
      return res.status(status).json({ error: 'supabase_rpc_error', status, rpc, upstream: payload });
    }
    res.status(status).json(payload ?? {});
  } catch (err) {
    res.status(502).json({ error: 'upstream_error', rpc, message: String(err) });
  }
};
