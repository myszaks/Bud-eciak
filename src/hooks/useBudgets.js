import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export function useBudgets(session, triggerRefresh = 0) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBudgets = useCallback(async () => {
    if (!session?.user?.id) {
      setBudgets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("[useBudgets] Fetching budgets...");

      // ✅ Pobierz budżety własne
      const { data: ownedBudgets, error: ownedError } = await supabase
        .from("budgets")
        .select("*")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      if (ownedError) {
        console.error("[useBudgets] Error fetching owned budgets:", ownedError);
        throw ownedError;
      }

      console.log("[useBudgets] Owned budgets:", ownedBudgets);

      // ✅ Pobierz budżety udostępnione
      const { data: sharedAccess, error: sharedError } = await supabase
        .from("budget_access")
        .select(`
          budget_id,
          access_level,
          budgets (*)
        `)
        .eq("user_id", session.user.id);

      if (sharedError) {
        console.error("[useBudgets] Error fetching shared budgets:", sharedError);
      }

      console.log("[useBudgets] Shared access:", sharedAccess);

      const sharedBudgets = (sharedAccess || [])
        .filter(access => access.budgets) // ✅ Filtruj null budgets
        .map((access) => ({
          ...access.budgets,
          is_shared: true,
          access_level: access.access_level,
        }));

      const ownedWithFlag = (ownedBudgets || []).map((b) => ({
        ...b,
        is_owner: true,
      }));

      const allBudgets = [...ownedWithFlag, ...sharedBudgets].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      console.log("[useBudgets] All budgets:", allBudgets);
      setBudgets(allBudgets);
    } catch (error) {
      console.error("Błąd pobierania budżetów:", error);
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, triggerRefresh]); // ✅ Dodaj triggerRefresh do dependencies

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const createBudget = async (name, description) => {
    if (!session?.user?.id) return null;

    try {
      const { data, error } = await supabase
        .from("budgets")
        .insert([{ 
          name, 
          description: description || null,
          owner_id: session.user.id 
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchBudgets();

      return { ...data, is_owner: true };
    } catch (error) {
      console.error("Błąd tworzenia budżetu:", error);
      throw error;
    }
  };

  const deleteBudget = async (budgetId) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budgetId)
        .eq("owner_id", session.user.id);

      if (error) throw error;

      await fetchBudgets();
    } catch (error) {
      console.error("Błąd usuwania budżetu:", error);
      throw error;
    }
  };

  return {
    budgets,
    loading,
    createBudget,
    deleteBudget,
    refreshBudgets: fetchBudgets,
  };
}