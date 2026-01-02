import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export default function useExpenses(userId) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExpenses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) setError(error);
    else setExpenses(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchExpenses();

    // realtime subscription — filter by user_id to avoid global refetches
    if (!userId) return;

    const channel = supabase
      .channel(`public:expenses:user:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // refetch only when relevant
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      // usuń subskrypcję
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        /* ignore */
      }
    };
  }, [fetchExpenses, userId]);

  async function addExpense({ title, amount }) {
    if (!userId) throw new Error("Brak userId");
    const { error } = await supabase
      .from("expenses")
      .insert([{ user_id: userId, title, amount: parseFloat(amount) }]);
    if (error) throw error;
    // fetchExpenses() zostanie wywołane przez subskrypcję
  }

  return { expenses, loading, error, fetchExpenses, addExpense };
}
