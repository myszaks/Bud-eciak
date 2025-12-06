import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useBudgets(session) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session) {
      fetchBudgets();
    }
  }, [session]);

  async function fetchBudgets() {
    try {
      setLoading(true);
      setError(null);

      // Pobierz własne budżety
      const { data: ownedBudgets, error: ownedError } = await supabase
        .from("budgets")
        .select("*")
        .eq("owner_id", session.user.id);

      if (ownedError) throw ownedError;

      // Pobierz dostępy
      const { data: accessRecords, error: accessError } = await supabase
        .from("budget_access")
        .select("budget_id, access_level")
        .eq("user_id", session.user.id);

      if (accessError) throw accessError;

      // Pobierz udostępnione budżety jednym zapytaniem
      const sharedBudgetIds = accessRecords.map(a => a.budget_id);
      let sharedBudgets = [];

      if (sharedBudgetIds.length > 0) {
        const { data: budgetsData, error: budgetsError } = await supabase
          .from("budgets")
          .select("*")
          .in("id", sharedBudgetIds);

        if (budgetsError) throw budgetsError;

        sharedBudgets = budgetsData.map(budget => {
          const access = accessRecords.find(a => a.budget_id === budget.id);
          return {
            ...budget,
            access_level: access.access_level,
            is_shared: true,
          };
        });
      }

      const allBudgets = [
        ...ownedBudgets.map((b) => ({ ...b, is_owner: true })),
        ...sharedBudgets,
      ];

      setBudgets(allBudgets);
    } catch (err) {
      console.error("Błąd pobierania budżetów:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createBudget(name, description) {
    try {
      const { data, error } = await supabase
        .from("budgets")
        .insert([
          {
            name: name.trim(),
            description: description?.trim() || null,
            owner_id: session.user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      await fetchBudgets();
      return { ...data, is_owner: true };
    } catch (err) {
      console.error("Błąd tworzenia budżetu:", err);
      throw err;
    }
  }

  return { budgets, loading, error, fetchBudgets, createBudget };
}