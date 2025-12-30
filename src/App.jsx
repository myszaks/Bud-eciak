import { useEffect, useState, useCallback } from "react";
import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import Login from "./components/Login";
import Navigation from "./components/Navigation";
import Dashboard from "./components/Dashboard";
import Expenses from "./components/Expenses";
import Income from "./components/Income";
import BudgetSettings from "./components/BudgetSettings";
import ResetPassword from "./components/ResetPassword";
import ForwardToSupabase from "./components/ForwardToSupabase";
import ToastContainer from "./components/ToastContainer";
import { ToastProvider, useToast } from "./contexts/ToastContext"; // ✅ Import z contexts
import ErrorBoundary from "./components/ErrorBoundary";

const ResetPassword = lazy(() => import("./components/ResetPassword.jsx"));

function AppContent() {
  const [session, setSession] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [budgetRefreshTrigger, setBudgetRefreshTrigger] = useState(0);
  const { toasts, removeToast } = useToast(); // ✅ Pobierz z contextu

  useEffect(() => {
    let isMounted = true;

    async function initializeSession() {
      try {
        setLoading(true);
        
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Błąd pobierania sesji:", error);
          if (isMounted) setSession(null);
          return;
        }

        if (isMounted) setSession(currentSession);

        if (currentSession) {
          const savedBudgetId = localStorage.getItem("selectedBudgetId");
          if (savedBudgetId) {
            const { data: budget, error: budgetError } = await supabase
              .from("budgets")
              .select("*")
              .eq("id", savedBudgetId)
              .single();

            if (!budgetError && budget && isMounted) {
              if (budget.owner_id === currentSession.user.id) {
                setSelectedBudget({ ...budget, is_owner: true });
              } else {
                const { data: access } = await supabase
                  .from("budget_access")
                  .select("access_level")
                  .eq("budget_id", savedBudgetId)
                  .eq("user_id", currentSession.user.id)
                  .single();

                if (access && isMounted) {
                  setSelectedBudget({ 
                    ...budget, 
                    is_shared: true, 
                    access_level: access.access_level 
                  });
                } else {
                  localStorage.removeItem("selectedBudgetId");
                  if (isMounted) setSelectedBudget(null);
                }
              }
            } else {
              localStorage.removeItem("selectedBudgetId");
              if (isMounted) setSelectedBudget(null);
            }
          }
        }
      } catch (error) {
        console.error("Błąd inicjalizacji:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event);
        if (isMounted) {
          setSession(currentSession);
          if (!currentSession) {
            setSelectedBudget(null);
            localStorage.removeItem("selectedBudgetId");
          }
        }
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleBudgetChange = useCallback((budget) => {
    console.log("[App] Budget changed to:", budget);
    setSelectedBudget(budget);
    if (budget?.id) {
      localStorage.setItem("selectedBudgetId", budget.id);
    }
  }, []);

  const handleBudgetDeleted = useCallback((deletedBudgetId) => {
    console.log("[App] Budget deleted:", deletedBudgetId);
    
    if (selectedBudget?.id === deletedBudgetId) {
      setSelectedBudget(null);
      localStorage.removeItem("selectedBudgetId");
    }
    
    setBudgetRefreshTrigger(prev => prev + 1);
  }, [selectedBudget?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Router>
        <Suspense fallback={<div className="text-center text-white p-8">Ładowanie...</div>}>
          <Routes>
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<Login />} />
          </Routes>
        </Suspense>
      </Router>
    );
  }

  return (
    <>
      <Router>
        <ErrorBoundary>
          <div className="min-h-screen bg-dark-bg text-white">
            <div className="container mx-auto px-4 py-6">
              <Navigation
                session={session}
                selectedBudget={selectedBudget}
                onBudgetChange={handleBudgetChange}
                onBudgetDeleted={handleBudgetDeleted}
                budgetRefreshTrigger={budgetRefreshTrigger}
              />

              <main className="mt-6">
                <Suspense fallback={<div className="text-center text-white p-8">Ładowanie...</div>}>
                  <Routes>
                    <Route path="/" element={<Dashboard session={session} budget={selectedBudget} />} />
                    <Route path="/expenses" element={<Expenses session={session} budget={selectedBudget} />} />
                    <Route path="/income" element={<Income session={session} budget={selectedBudget} />} />
                    <Route 
                      path="/budget/:budgetId/settings" 
                      element={
                        <BudgetSettings 
                          session={session}
                          selectedBudget={selectedBudget}
                          onBudgetChange={handleBudgetChange}
                          onBudgetDeleted={handleBudgetDeleted}
                        />
                      } 
                    />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/auth/forward-to-supabase" element={<ForwardToSupabase />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </div>
        </ErrorBoundary>
      </Router>
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}