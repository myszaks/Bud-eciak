import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export default function useExpenses(activeBudgetId) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ----------------------------
  // WALIDACJA
  // ----------------------------
  function validateExpense({ title, amount }) {
    if (!title || title.trim().length === 0)
      throw new Error("Title is required");

    if (title.length > 100)
      throw new Error("Title too long (max 100 chars)");

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0)
      throw new Error("Amount must be a positive number");
  }

  // ----------------------------
  // FETCH
  // ----------------------------
  const fetchExpenses = useCallback(async () => {
    if (!activeBudgetId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("budget_id", activeBudgetId)
      .order("created_at", { ascending: false });

    if (error) setError(error);
    else setExpenses(data ?? []);

    setLoading(false);
  }, [activeBudgetId]);

  useEffect(() => {
    fetchExpenses();

    // Realtime subscription (filtrowane po activeBudgetId)
    const channel = supabase
      .channel(`expenses:${activeBudgetId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `budget_id=eq.${activeBudgetId}`,
        },
        () => fetchExpenses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchExpenses, activeBudgetId]);

  // ----------------------------
  // ADD EXPENSE
  // ----------------------------
  async function addExpense({ title, amount }) {
    if (!activeBudgetId) throw new Error("No active budget selected");

    // WALIDACJA
    validateExpense({ title, amount });

    const { error } = await supabase.from("expenses").insert([
      {
        budget_id: activeBudgetId,
        title: title.trim(),
        amount: Number(amount),
      },
    ]);

    if (error) throw error;
    // fetchExpenses() zostanie wywołane przez subskrypcję
  }

  return { expenses, loading, error, fetchExpenses, addExpense };
}
