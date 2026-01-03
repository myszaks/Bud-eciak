import { supabase } from "./supabaseClient";

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
  return supabase.rpc("check_email_exists", { email_input: email });
}

export async function getUserIdByEmail(email) {
  return supabase.rpc("get_user_id_by_email", { email_input: email });
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
  return supabase.rpc("get_user_emails_by_ids", { user_ids: userIds });
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
