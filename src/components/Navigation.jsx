import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useBudgets } from "../hooks/useBudgets";

export default function Navigation({ session, selectedBudget, onBudgetChange, onBudgetDeleted }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { budgets, loading, createBudget, deleteBudget } = useBudgets(session);
  
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showNewBudgetModal, setShowNewBudgetModal] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState("");
  const [newBudgetDescription, setNewBudgetDescription] = useState("");

  const tabs = [
    { name: "Dashboard", path: "/" },
    { name: "Wydatki", path: "/expenses" },
    { name: "Wpływy", path: "/income" },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function handleCreateBudget(e) {
    e.preventDefault();
    try {
      const budget = await createBudget(newBudgetName, newBudgetDescription);
      setNewBudgetName("");
      setNewBudgetDescription("");
      setShowNewBudgetModal(false);
      onBudgetChange({ ...budget, is_owner: true });
      toast.success("Budżet utworzony!");
    } catch (error) {
      console.error("Błąd tworzenia budżetu:", error);
      toast.error("Nie udało się usunąć budżetu: " + error.message);
    }
  }

  async function handleDeleteBudget(budgetId, budgetName) {
    const confirmText = `Czy na pewno chcesz usunąć budżet "${budgetName}"?\n\nTa operacja jest nieodwracalna!\n\nWpisz "${budgetName}" aby potwierdzić:`;
    const userInput = prompt(confirmText);
    
    if (userInput !== budgetName) {
      if (userInput !== null) {
        alert("Nieprawidłowe potwierdzenie. Budżet nie został usunięty.");
      }
      return;
    }

    try {
      await deleteBudget(budgetId);
      
      // ✅ WYWOŁAJ CALLBACK do App.jsx
      if (onBudgetDeleted) {
        onBudgetDeleted(budgetId);
      }
      
      setShowBudgetDropdown(false);
      alert("Budżet został usunięty");
    } catch (error) {
      console.error("Błąd usuwania budżetu:", error);
      alert("Nie udało się usunąć budżetu: " + error.message);
    }
  }

  return (
    <>
      <nav className="bg-dark-surface rounded-lg shadow-xl mb-6">
        <div className="flex justify-between items-center p-2">
          {/* Logo i nazwa aplikacji */}
          <div className="flex items-center gap-4 ml-2">
            <Link to="/" className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">💰</span>
              <span>Budżeciak</span>
            </Link>
          </div>

          {/* Zakładki */}
          <div className="flex space-x-2">
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  location.pathname === tab.path
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-gray-300 hover:bg-dark-hover hover:text-white"
                }`}
              >
                {tab.name}
              </Link>
            ))}
          </div>

          {/* Dropdown budżetów i wylogowanie */}
          <div className="flex items-center gap-3 mr-2">
            {/* Dropdown budżetów */}
            <div className="relative">
              <button
                onClick={() => setShowBudgetDropdown(!showBudgetDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-dark-border rounded-lg hover:border-blue-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="max-w-[150px] truncate">
                  {selectedBudget ? selectedBudget.name : "Wybierz budżet"}
                </span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showBudgetDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-dark-card border border-dark-border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowNewBudgetModal(true);
                        setShowBudgetDropdown(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-blue-400 hover:bg-dark-hover rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Nowy budżet
                    </button>
                  </div>

                  {loading ? (
                    <div className="p-4 text-center text-gray-400">
                      Ładowanie...
                    </div>
                  ) : budgets.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">
                      Brak budżetów
                    </div>
                  ) : (
                    <div className="border-t border-dark-border">
                      {budgets.map((budget) => (
                        <div
                          key={budget.id}
                          className={`flex items-center justify-between p-3 hover:bg-dark-hover transition-colors ${
                            selectedBudget?.id === budget.id ? "bg-dark-hover" : ""
                          }`}
                        >
                          <button
                            onClick={() => {
                              const budgetWithPermissions = {
                                ...budget,
                                is_owner: budget.is_owner || false,
                                is_shared: budget.is_shared || false,
                                access_level: budget.access_level || null,
                              };
                              onBudgetChange(budgetWithPermissions);
                              setShowBudgetDropdown(false);
                            }}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{budget.name}</span>
                              {budget.is_owner && (
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                  Właściciel
                                </span>
                              )}
                              {budget.is_shared && (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                  {budget.access_level === "edit" ? "Edycja" : "Widok"}
                                </span>
                              )}
                            </div>
                            {budget.description && (
                              <p className="text-sm text-gray-400 truncate mt-1">
                                {budget.description}
                              </p>
                            )}
                          </button>

                          <div className="flex gap-1 ml-2">
                            {budget.is_owner && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/budget/${budget.id}/settings`);
                                    setShowBudgetDropdown(false);
                                  }}
                                  className="p-2 text-gray-400 hover:text-blue-400 hover:bg-dark-bg rounded transition-colors"
                                  title="Ustawienia"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBudget(budget.id, budget.name);
                                  }}
                                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-dark-bg rounded transition-colors"
                                  title="Usuń"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Przycisk wylogowania */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-dark-hover rounded-lg font-medium transition-all"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </nav>

      {/* Modal nowego budżetu */}
      {showNewBudgetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-surface border border-dark-border rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Nowy budżet</h2>
            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Nazwa budżetu *
                </label>
                <input
                  type="text"
                  value={newBudgetName}
                  onChange={(e) => setNewBudgetName(e.target.value)}
                  placeholder="np. Domowy, Firmowy"
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Opis (opcjonalnie)
                </label>
                <textarea
                  value={newBudgetDescription}
                  onChange={(e) => setNewBudgetDescription(e.target.value)}
                  placeholder="Krótki opis budżetu..."
                  rows="3"
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Utwórz
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewBudgetModal(false);
                    setNewBudgetName("");
                    setNewBudgetDescription("");
                  }}
                  className="flex-1 bg-dark-border text-white py-2 px-4 rounded-lg hover:bg-dark-hover transition-colors font-medium"
                >
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}