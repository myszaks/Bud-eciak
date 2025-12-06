import { useEffect, useState, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import Auth from "./components/Auth";
import Navigation from "./components/Navigation"; // ✅ ZMIANA: Navigation zamiast Navbar
import Dashboard from "./components/Dashboard";
import Expenses from "./components/Expenses";
import Income from "./components/Income";
import BudgetSettings from "./components/BudgetSettings";

export default function App() {
  const [session, setSession] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initializeSession() {
      try {
        setLoading(true);
        
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Błąd pobierania sesji:", error);
          setSession(null);
          return;
        }

        setSession(currentSession);

        if (currentSession) {
          const savedBudgetId = localStorage.getItem("selectedBudgetId");
          if (savedBudgetId) {
            const { data: budget, error: budgetError } = await supabase
              .from("budgets")
              .select("*")
              .eq("id", savedBudgetId)
              .single();

            if (!budgetError && budget) {
              if (budget.owner_id === currentSession.user.id) {
                setSelectedBudget({ ...budget, is_owner: true });
              } else {
                const { data: access } = await supabase
                  .from("budget_access")
                  .select("access_level")
                  .eq("budget_id", savedBudgetId)
                  .eq("user_id", currentSession.user.id)
                  .single();

                if (access) {
                  setSelectedBudget({ 
                    ...budget, 
                    is_shared: true, 
                    access_level: access.access_level 
                  });
                } else {
                  localStorage.removeItem("selectedBudgetId");
                  setSelectedBudget(null);
                }
              }
            } else {
              localStorage.removeItem("selectedBudgetId");
              setSelectedBudget(null);
            }
          }
        }
      } catch (error) {
        console.error("Błąd inicjalizacji:", error);
      } finally {
        setLoading(false);
      }
    }

    initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setSelectedBudget(null);
        localStorage.removeItem("selectedBudgetId");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleBudgetChange = useCallback((budget) => {
    console.log("[App] Zmiana budżetu:", budget);
    setSelectedBudget(budget);
    if (budget?.id) {
      localStorage.setItem("selectedBudgetId", budget.id);
    } else {
      localStorage.removeItem("selectedBudgetId");
    }
  }, []);

  const handleBudgetDeleted = useCallback((deletedBudgetId) => {
    console.log("[App] Budżet usunięty:", deletedBudgetId);
    
    if (selectedBudget?.id === deletedBudgetId) {
      setSelectedBudget(null);
      localStorage.removeItem("selectedBudgetId");
    }
  }, [selectedBudget?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-dark-bg text-white">
        <div className="container mx-auto px-4 py-6">
          <Navigation
            session={session}
            selectedBudget={selectedBudget}
            onBudgetChange={handleBudgetChange}
            onBudgetDeleted={handleBudgetDeleted}
          />
          <main className="mt-6">
            <Routes>
              <Route path="/" element={<Dashboard session={session} budget={selectedBudget} />} />
              <Route path="/expenses" element={<Expenses session={session} budget={selectedBudget} />} />
              <Route path="/income" element={<Income session={session} budget={selectedBudget} />} />
              <Route 
                path="/budget/:budgetId/settings" 
                element={
                  <BudgetSettings 
                    session={session} 
                    onBudgetDeleted={handleBudgetDeleted}
                  />
                } 
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}