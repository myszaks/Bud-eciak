import { useEffect, useState, useCallback, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import Login from "./components/Login";
import Navigation from "./components/Navigation";
import Dashboard from "./components/Dashboard";
import Expenses from "./components/Expenses";
import Income from "./components/Income";
import BudgetSettings from "./components/BudgetSettings";
import ToastContainer from "./components/ToastContainer";
import { ToastProvider, useToast } from "./contexts/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";

const ResetPassword = lazy(() => import("./components/ResetPassword.jsx"));

function AppContent() {
  const [session, setSession] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [budgetRefreshTrigger, setBudgetRefreshTrigger] = useState(0);
  const { toasts, removeToast } = useToast();

  useEffect(() => {
    let isMounted = true;

    async function initializeSession() {
      try {
        return (
          <>
            {session ? (
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
                          <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                      </Suspense>
                    </main>
                  </div>
                </div>
              </ErrorBoundary>
            ) : (
              <Suspense fallback={<div className="text-center text-white p-8">Ładowanie...</div>}>
                <Routes>
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="*" element={<Login />} />
                </Routes>
              </Suspense>
            )}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
          </>
        );

    // ...existing code...
    // initializeSession and authListener setup should be inside useEffect only
      async (event, currentSession) => {
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
    setSelectedBudget(budget);
    if (budget?.id) {
      localStorage.setItem("selectedBudgetId", budget.id);
    }
  }, []);

  const handleBudgetDeleted = useCallback((deletedBudgetId) => {
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
      <Suspense fallback={<div className="text-center text-white p-8">Ładowanie...</div>}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <>
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
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </div>
      </ErrorBoundary>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <AppContent />
      </Router>
    </ToastProvider>
  );
}