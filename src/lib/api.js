import { supabase } from "./supabaseClient";

// Simple in-memory client-side token-bucket throttle.
// This prevents accidental client storms and makes testing rate-limits
// locally easier. IMPORTANT: this does NOT replace server-side limits.
// Keep server/edge limits (Cloudflare, Supabase Edge Functions, DB RLS)
// for real protection — see docs/rate-limiting.md for Cloudflare examples.

const CLIENT_ID_KEY = "budzeciak_client_id";
const tokenBuckets = new Map();

function getClientId() {
  try {
    if (typeof localStorage !== "undefined") {
      let id = localStorage.getItem(CLIENT_ID_KEY);
      if (!id) {
        id = (crypto && crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random()}`;
        localStorage.setItem(CLIENT_ID_KEY, id);
      }
      return id;
    }
  } catch (e) {
    // localStorage may be unavailable in some environments
  }
  // Fallback to a per-process id
  if (!globalThis.__BUDZECIAK_CLIENT_ID) globalThis.__BUDZECIAK_CLIENT_ID = `${Date.now()}-${Math.random()}`;
  return globalThis.__BUDZECIAK_CLIENT_ID;
}

function getBucket(clientId, { rate = 5, burst = 10 } = {}) {
  let b = tokenBuckets.get(clientId);
  const now = Date.now();
  if (!b) {
    b = { tokens: burst, lastRefill: now, rate, burst };
    tokenBuckets.set(clientId, b);
    return b;
  }
  // Update rate/burst if changed
  b.rate = rate;
  b.burst = burst;
  // Refill
  const elapsedSec = Math.max(0, (now - b.lastRefill) / 1000);
  const refill = elapsedSec * b.rate;
  if (refill > 0) {
    b.tokens = Math.min(b.burst, b.tokens + refill);
    b.lastRefill = now;
  }
  return b;
}

function consumeToken(bucket) {
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}

async function rpcWithThrottle(rpcName, params, opts = {}) {
  try {
    const clientId = getClientId();
    const bucket = getBucket(clientId, opts);
    if (!consumeToken(bucket)) {
      return { data: null, error: new Error("Rate limit exceeded (client)") };
    }
  } catch (err) {
    // Fail open if throttle helpers error
  }
  return supabase.rpc(rpcName, params);
}

// Server-side proxied RPC helper: POSTs to the serverless proxy which applies
// server-side rate limits. The proxy will forward client Authorization if present.
async function serverRpc(rpcName, params) {
  try {
    const clientId = getClientId();
    const headers = { 'Content-Type': 'application/json', 'x-client-id': clientId };
    // if supabase client exposes a session, forward its access token so RLS is enforced
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
    } catch (e) {
      // ignore in non-browser environments
    }

    const res = await fetch('/api/rpc-proxy', {
      method: 'POST',
      headers,
      body: JSON.stringify({ rpc: rpcName, params }),
    });

    const json = await res.json().catch(() => null);
    // Normalize response shape like Supabase client: return { data, error }
    if (res.status >= 400) return { data: null, error: json || { message: 'server_rpc_error' } };
    return { data: json, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getExpenses(budgetId) {
  if (!budgetId) return { data: [], error: null };
  return supabase
    .from("expenses")
    .select("*")
    .eq("budget_id", budgetId)
    .order("date", { ascending: false });
}

export async function createExpense(payload) {
  if (!payload) return { data: null, error: new Error("No payload") };
  return supabase.from("expenses").insert([payload]).select().single();
}

export async function updateExpense(id, payload) {
  if (!id || !payload) return { data: null, error: new Error("Missing args") };
  return supabase.from("expenses").update(payload).eq("id", id);
}

export async function deleteExpense(id) {
  if (!id) return { data: null, error: new Error("Missing id") };
  return supabase.from("expenses").delete().eq("id", id);
}

export async function getExpensesInRange(budgetId, startDate, endDate) {
  if (!budgetId) return { data: [], error: null };
  let query = supabase.from("expenses").select("*").eq("budget_id", budgetId);
  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);
  return query.order("date", { ascending: false });
}

export async function getRecentExpenses(budgetId, limit = 5) {
  if (!budgetId) return { data: [], error: null };
  return supabase.from("expenses").select("*").eq("budget_id", budgetId).order("date", { ascending: false }).limit(limit);
}

export async function getIncomeInRange(budgetId, startDate, endDate) {
  if (!budgetId) return { data: [], error: null };
  let query = supabase.from("income").select("*").eq("budget_id", budgetId);
  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);
  return query.order("date", { ascending: false });
}

export async function getRecentIncome(budgetId, limit = 5) {
  if (!budgetId) return { data: [], error: null };
  return supabase.from("income").select("*").eq("budget_id", budgetId).order("date", { ascending: false }).limit(limit);
}

// Categories helper
export async function getCategories(budgetId, type = "expense", search = "", limit = 10) {
  if (!budgetId) return { data: [], error: null };
  const table = type === "expense" ? "expenses" : "income";
  let query = supabase.from(table).select("category").eq("budget_id", budgetId).not("category", "is", null);
  if (search) query = query.ilike("category", `%${search}%`);
  return query.limit(limit);
}

// Budget helpers
export async function getBudgetById(budgetId) {
  if (!budgetId) return { data: null, error: new Error("Missing budgetId") };
  return supabase.from("budgets").select("*").eq("id", budgetId).single();
}

export async function getBudgetAccessForUser(budgetId, userId) {
  if (!budgetId || !userId) return { data: null, error: new Error("Missing args") };
  return supabase.from("budget_access").select("access_level").eq("budget_id", budgetId).eq("user_id", userId).single();
}

// RPC helpers
export async function checkEmailExists(email) {
  // Use server-side proxy to enforce global rate-limits
  return serverRpc("check_email_exists", { email_input: email });
}

export async function getUserIdByEmail(email) {
  return serverRpc("get_user_id_by_email", { email_input: email });
}

// Budget access helpers
export async function addBudgetAccess(budgetId, userId, accessLevel) {
  return supabase.from("budget_access").insert([{ budget_id: budgetId, user_id: userId, access_level: accessLevel }]);
}

export async function deleteBudgetAccess(shareId, budgetId) {
  return supabase.from("budget_access").delete().eq("id", shareId).eq("budget_id", budgetId);
}

export async function updateBudgetAccess(shareId, budgetId, newLevel) {
  return supabase.from("budget_access").update({ access_level: newLevel }).eq("id", shareId).eq("budget_id", budgetId);
}

export async function getBudgetAccessList(budgetId) {
  if (!budgetId) return { data: [], error: null };
  return supabase.from("budget_access").select("id, user_id, access_level, created_at").eq("budget_id", budgetId);
}

export async function getUserEmailsByIds(userIds) {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) return { data: [], error: null };
  return serverRpc("get_user_emails_by_ids", { user_ids: userIds });
}

export async function updateBudgetById(budgetId, payload) {
  if (!budgetId || !payload) return { data: null, error: new Error("Missing args") };
  return supabase.from("budgets").update(payload).eq("id", budgetId);
}

export async function getBudgetAccessSingle(budgetId, userId) {
  if (!budgetId || !userId) return { data: null, error: new Error("Missing args") };
  return supabase.from("budget_access").select("id,access_level").eq("budget_id", budgetId).eq("user_id", userId).maybeSingle();
}

// Income helpers
export async function getIncome(budgetId) {
  if (!budgetId) return { data: [], error: null };
  return supabase
    .from("income")
    .select("*")
    .eq("budget_id", budgetId)
    .order("date", { ascending: false });
}

export async function createIncome(payload) {
  if (!payload) return { data: null, error: new Error("No payload") };
  return supabase.from("income").insert([payload]).select().single();
}

export async function updateIncome(id, payload) {
  if (!id || !payload) return { data: null, error: new Error("Missing args") };
  return supabase.from("income").update(payload).eq("id", id);
}

export async function deleteIncome(id) {
  if (!id) return { data: null, error: new Error("Missing id") };
  return supabase.from("income").delete().eq("id", id);
}

// Helpers used by hooks
export async function getExpensesByUser(userId) {
  if (!userId) return { data: [], error: null };
  return supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function addExpenseForUser(payload) {
  if (!payload) return { data: null, error: new Error("No payload") };
  return supabase.from("expenses").insert([payload]);
}

// Budgets helpers (owned + shared)
export async function fetchBudgetsForUser(userId) {
  if (!userId) return { data: [], error: null };

  const ownedPromise = supabase
    .from("budgets")
    .select("id,name,description,created_at,owner_id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  const sharedPromise = supabase
    .from("budget_access")
    .select(`budget_id,access_level,budgets(id,name,description,created_at,owner_id)`)
    .eq("user_id", userId);

  const [ownedRes, sharedRes] = await Promise.all([ownedPromise, sharedPromise]);
  return { ownedRes, sharedRes };
}

export async function createBudgetForUser(userId, name, description) {
  if (!userId) return { data: null, error: new Error("No userId") };
  return supabase
    .from("budgets")
    .insert([{ name, description: description || null, owner_id: userId }])
    .select()
    .single();
}

export async function deleteBudgetForUser(budgetId, ownerId) {
  if (!budgetId || !ownerId) return { data: null, error: new Error("Missing args") };
  return supabase.from("budgets").delete().eq("id", budgetId).eq("owner_id", ownerId);
}
