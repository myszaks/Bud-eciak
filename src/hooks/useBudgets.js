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

      // Fetch owned and shared in parallel and limit columns to needed fields
      const ownedPromise = supabase
        .from("budgets")
        .select("id,name,description,created_at,owner_id")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      const sharedPromise = supabase
        .from("budget_access")
        .select(`budget_id,access_level,budgets(id,name,description,created_at,owner_id)`)
        .eq("user_id", session.user.id);

      const [
        { data: ownedBudgets, error: ownedError },
        { data: sharedAccess, error: sharedError },
      ] = await Promise.all([ownedPromise, sharedPromise]);

      if (ownedError) {
        console.error("[useBudgets] Error fetching owned budgets:", ownedError);
        throw ownedError;
      }

      if (sharedError) {
        console.error("[useBudgets] Error fetching shared budgets:", sharedError);
      }

      const sharedBudgets = (sharedAccess || [])
        .filter((access) => access.budgets)
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

      setBudgets(allBudgets);
    } catch (error) {
      console.error("Błąd pobierania budżetów:", error);
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, triggerRefresh]);

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