import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Expenses from "./components/Expenses";
import Income from "./components/Income";
import Navigation from "./components/Navigation";
import BudgetSelector from "./components/BudgetSelector";
import BudgetSettings from "./components/BudgetSettings";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  const [session, setSession] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then((res) => {
      if (res.data?.session) setSession(res.data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        setSession(sess);
      }
    );

    return () => listener?.subscription?.unsubscribe();
  }, []);

  if (!session) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-light text-white mb-2">
              Domowy Budżet
            </h1>
            <p className="text-gray-400">Zarządzaj swoimi finansami</p>
          </header>
          <main>
            <Login />
          </main>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-dark-bg">
          <div className="max-w-6xl mx-auto p-4">
            <header className="mb-6">
              <h1 className="text-3xl font-light text-white text-center mb-6">
                Domowy Budżet
              </h1>
              <Navigation />
            </header>

            <main className="mt-6">
              <Routes>
                {/* Strona zarządzania budżetem */}
                <Route
                  path="/budget/:budgetId"
                  element={<BudgetSettings session={session} />}
                />

                {/* Główne widoki z selektorem budżetu */}
                <Route
                  path="/*"
                  element={
                    <>
                      <BudgetSelector
                        session={session}
                        selectedBudget={selectedBudget}
                        onBudgetChange={setSelectedBudget}
                      />

                      {selectedBudget ? (
                        <Routes>
                          <Route
                            path="/"
                            element={
                              <Dashboard
                                session={session}
                                budget={selectedBudget}
                              />
                            }
                          />
                          <Route
                            path="/expenses"
                            element={
                              <Expenses
                                session={session}
                                budget={selectedBudget}
                              />
                            }
                          />
                          <Route
                            path="/income"
                            element={
                              <Income session={session} budget={selectedBudget} />
                            }
                          />
                        </Routes>
                      ) : (
                        <div className="bg-dark-surface p-8 rounded-lg shadow-xl border border-dark-border text-center mt-6">
                          <p className="text-gray-400 text-lg">
                            Wybierz budżet lub utwórz nowy, aby rozpocząć
                          </p>
                        </div>
                      )}
                    </>
                  }
                />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}