# Rate limiting & abuse protection

This document provides deployment-time recommendations and Cloudflare examples to protect Supabase RPCs, Edge Functions and public endpoints from abuse.

IMPORTANT: client-side throttling (implemented in `src/lib/api.js`) helps reduce accidental client storms, but does NOT replace server/edge limits. Configure Cloudflare or your host to enforce limits at the edge.

## Cloudflare Rate Limiting (Dashboard)

- Match: Path -> `/*/rpc/*` or your Supabase function paths (for self-hosted or proxied endpoints).
- Threshold: `100` requests per `60` seconds (example)
- Action: `Challenge` or `Block` after limit exceeded (or `JS Challenge` for suspicious traffic).
- Scope: By IP address or `ip+country` depending on your needs.

Example: Protect RPCs under your proxy `https://app.example.com/api/rpc/*`

1. Go to Firewall > Tools > Rate Limiting
2. Create rule:
   - URL: `https://app.example.com/api/rpc/*`
   - Threshold: `30` requests per `60` seconds
   - Action: Challenge

## Cloudflare Firewall Rule (example)

Create a firewall rule to block obvious abuse (requests with many hits or suspicious UA):

Expression:

```
(http.request.uri.path contains "/rpc/" or http.request.uri.path contains "/.netlify/functions/") and cf.client.bot == false
```

Action: Log or Challenge depending on severity.

## Cloudflare API example to create a rate limit (curl)

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/rate_limits" \
  -H "X-Auth-Email: you@example.com" \
  -H "X-Auth-Key: {API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{
    "disabled": false,
    "description": "Rate limit RPC proxy",
    "match": {
      "request": {
        "methods": ["GET","POST","PUT","DELETE"],
        "schemes": ["HTTP","HTTPS"],
        "url": "https://app.example.com/api/rpc/*"
      }
    },
    "threshold": 30,
    "period": 60,
    "action": { "mode": "challenge", "timeout": 300 }
  }'
```

## Cloudflare Worker example (simple per-IP token bucket)

The Worker pattern below shows a simple approach; for production use, prefer Durable Objects or a managed KV with atomic operations.

```js
addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

const BUCKETS = new Map();

function getBucket(ip) {
  const now = Date.now();
  let b = BUCKETS.get(ip);
  if (!b) { b = { tokens: 10, last: now }; BUCKETS.set(ip, b); return b; }
  const elapsed = (now - b.last) / 1000;
  b.tokens = Math.min(10, b.tokens + elapsed * 2); // refill 2 r/s, burst 10
  b.last = now;
  return b;
}

async function handle(req) {
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/rpc/')) {
    const ip = req.headers.get('cf-connecting-ip') || 'unknown';
    const b = getBucket(ip);
    if (b.tokens < 1) return new Response('Rate limit', { status: 429 });
    b.tokens -= 1;
  }
  return fetch(req);
}
```

Notes:
- Prefer Durable Objects for accurate per-client state across workers.
- For Supabase-hosted endpoints (supabase.co domain), use Cloudflare in front of your own proxy or use the Supabase Edge Functions' built-in protections.

## Server-side quotas & best practices

- Implement server-side per-user quotas and short-term throttles in any Edge Function or proxy you control.
- Add a `Retry-After` header when returning `429` so clients can back off.
- Log rate-limit events to your monitoring (Sentry/Datadog) and alert on spikes.

## Vercel + Upstash (recommended for Vercel-only deployments)

If you're deploying only on Vercel, use a serverless proxy (Edge Function or Serverless Function) and a small Redis-backed counter store such as Upstash. This provides global, atomic counters without introducing Cloudflare.

Environment variables to set on Vercel:

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon key (server-side proxy forwards client token for RLS)
- `UPSTASH_REDIS_REST_URL` — Upstash REST API base URL (example: `https://eu1-upstash.redis.upstash.io`)
- `UPSTASH_REDIS_REST_TOKEN` — Upstash REST token (keep secret)
- Optional: `RATE_LIMIT_DEFAULT` and `RATE_LIMIT_WINDOW_SECONDS` to tune the policy

Example behavior implemented in `api/rpc-proxy.js`:

- Uses Upstash `INCR` and `EXPIRE` to implement a fixed-window counter per `rpc + clientId` key.
- If Upstash credentials are not provided, the proxy falls back to a per-instance in-memory limiter (not global) while still forwarding RPCs.
- Proxy forwards the client's `Authorization` header when present so Supabase can enforce RLS.

Notes on reliability and scale:

- Upstash is low-cost and simple to integrate for modest traffic. For very high scale or strict accuracy, consider a Redis cluster or a more advanced quota store.
- Always log and alert on rate-limit events; tune thresholds in staging.


## Staging tests

- Test in staging with aggressive low thresholds to verify behaviour.
- Ensure legitimate UX flows (e.g., bulk import) are whitelisted or use longer windows.

## References
- Cloudflare Rate Limiting docs: https://developers.cloudflare.com/rate-limits/
- Durable Objects: https://developers.cloudflare.com/workers/runtime-apis/durable-objects/

