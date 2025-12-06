import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useBudgets(session) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchBudgets();
    } else {
      setBudgets([]);
      setLoading(false);
    }
  }, [session?.user?.id]);

  async function fetchBudgets() {
    if (!session?.user?.id) {
      console.warn("useBudgets: brak session");
      setBudgets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("[useBudgets] Pobieranie budżetów dla user:", session.user.id);

      // 1. Pobierz budżety własne
      const { data: ownedBudgets, error: ownedError } = await supabase
        .from("budgets")
        .select("*")
        .eq("owner_id", session.user.id);

      if (ownedError) {
        console.error("[useBudgets] Błąd pobierania własnych budżetów:", ownedError);
        throw ownedError;
      }

      console.log("[useBudgets] Własne budżety:", ownedBudgets);

      // 2. Pobierz rekordy dostępu
      const { data: accessRecords, error: accessError } = await supabase
        .from("budget_access")
        .select("budget_id, access_level")
        .eq("user_id", session.user.id);

      if (accessError) {
        console.error("[useBudgets] Błąd pobierania dostępów:", accessError);
        throw accessError;
      }

      console.log("[useBudgets] Rekordy dostępu:", accessRecords);

      // 3. Pobierz udostępnione budżety
      let sharedBudgets = [];
      if (accessRecords && accessRecords.length > 0) {
        const sharedBudgetIds = accessRecords.map(a => a.budget_id);
        
        console.log("[useBudgets] IDs udostępnionych budżetów:", sharedBudgetIds);

        const { data: budgetsData, error: budgetsError } = await supabase
          .from("budgets")
          .select("*")
          .in("id", sharedBudgetIds);

        if (budgetsError) {
          console.error("[useBudgets] Błąd pobierania udostępnionych budżetów:", budgetsError);
          throw budgetsError;
        }

        console.log("[useBudgets] Udostępnione budżety:", budgetsData);

        // Dodaj informacje o poziomie dostępu
        sharedBudgets = budgetsData.map(budget => {
          const access = accessRecords.find(a => a.budget_id === budget.id);
          return {
            ...budget,
            access_level: access?.access_level || "view",
            is_shared: true,
          };
        });
      }

      // 4. Połącz wszystkie budżety
      const allBudgets = [
        ...ownedBudgets.map(b => ({ ...b, is_owner: true })),
        ...sharedBudgets,
      ];

      console.log("[useBudgets] Wszystkie budżety:", allBudgets);

      setBudgets(allBudgets);
    } catch (err) {
      console.error("[useBudgets] Błąd pobierania budżetów:", err);
      setError(err.message || "Nie udało się pobrać budżetów");
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }

  async function createBudget(name, description) {
    if (!session?.user?.id) {
      throw new Error("Nie jesteś zalogowany");
    }

    const { data, error } = await supabase
      .from("budgets")
      .insert([
        {
          owner_id: session.user.id,
          name: name.trim(),
          description: description?.trim() || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Odśwież listę budżetów
    await fetchBudgets();
    return data;
  }

  async function deleteBudget(budgetId) {
    if (!session?.user?.id) {
      throw new Error("Nie jesteś zalogowany");
    }

    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", budgetId)
      .eq("owner_id", session.user.id);

    if (error) throw error;

    // Odśwież listę budżetów
    await fetchBudgets();
  }

  return { budgets, loading, error, createBudget, deleteBudget, refetch: fetchBudgets };
}