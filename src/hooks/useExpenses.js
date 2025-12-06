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

    // realtime subscription
    const channel = supabase
      .channel("public:expenses")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        (payload) => {
          // proste zachowanie: refetch (dla prostoty; można bardziej granularnie)
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      // usuń subskrypcję
      supabase.removeChannel(channel);
    };
  }, [fetchExpenses]);

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
