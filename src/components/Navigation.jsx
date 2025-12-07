import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useBudgets } from "../hooks/useBudgets";
import { useToast } from "../hooks/useToast"; // ✅ DODAJ

export default function Navigation({ session, selectedBudget, onBudgetChange, onBudgetDeleted, onBudgetCreated }) {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast(); // ✅ Już używane w kodzie, ale brakowało importu
  const { budgets, loading, createBudget, deleteBudget } = useBudgets(session);
  
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showNewBudgetModal, setShowNewBudgetModal] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState("");
  const [newBudgetDescription, setNewBudgetDescription] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const tabs = [
    { name: "Dashboard", path: "/", icon: "📊" },
    { name: "Wydatki", path: "/expenses", icon: "💸" },
    { name: "Wpływy", path: "/income", icon: "💰" },
    // ✅ NOWA ZAKŁADKA: Ustawienia (widoczna tylko gdy budżet jest wybrany i jesteś właścicielem)
    ...(selectedBudget?.is_owner 
      ? [{ name: "Ustawienia", path: `/budget/${selectedBudget.id}/settings`, icon: "⚙️" }] 
      : []
    ),
  ];

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Błąd wylogowania:", error);
    }
  }

  async function handleCreateBudget(e) {
    e.preventDefault();
    if (!newBudgetName.trim()) return;

    try {
      const newBudget = await createBudget(newBudgetName, newBudgetDescription);
      setShowNewBudgetModal(false);
      setNewBudgetName("");
      setNewBudgetDescription("");
      if (onBudgetCreated) onBudgetCreated(newBudget);
    } catch (error) {
      console.error("Błąd tworzenia budżetu:", error);
    }
  }

  function handleBudgetSelect(budget) {
    if (onBudgetChange) {
      onBudgetChange(budget);
    }
  }

  async function handleDeleteBudget(budgetId, budgetName) {
    const confirmText = `Czy na pewno chcesz usunąć budżet "${budgetName}"?\n\nWpisz "${budgetName}" aby potwierdzić:`;
    const userInput = prompt(confirmText);
    
    if (userInput !== budgetName) {
      if (userInput !== null) {
        toast.warning("Nieprawidłowe potwierdzenie.");
      }
      return;
    }

    try {
      await deleteBudget(budgetId);
      setShowBudgetDropdown(false);
      
      if (onBudgetDeleted) {
        onBudgetDeleted(budgetId);
      }
      
      toast.success("Budżet został usunięty");
    } catch (error) {
      console.error("Błąd usuwania budżetu:", error);
      toast.error("Nie udało się usunąć budżetu: " + error.message);
    }
  }

  return (
    <>
      <nav className="bg-dark-surface rounded-lg shadow-xl mb-4 md:mb-6">
        {/* Desktop Navigation */}
        <div className="hidden md:flex justify-between items-center p-2">
          {/* Logo */}
          <div className="flex items-center gap-4 ml-2">
            <Link to="/" className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">💰</span>
              <span>Budżeciak</span>
            </Link>
          </div>

          {/* Zakładki Desktop */}
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

          {/* Dropdown i wylogowanie Desktop */}
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
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowBudgetDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-dark-card border border-dark-border rounded-lg shadow-2xl z-40 max-h-[500px] overflow-hidden flex flex-col">
                    {/* Przycisk "Nowy budżet" */}
                    <div className="p-3 border-b border-dark-border">
                      <button
                        onClick={() => {
                          setShowNewBudgetModal(true);
                          setShowBudgetDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-blue-400 hover:bg-dark-hover rounded-lg transition-colors font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nowy budżet
                      </button>
                    </div>

                    {/* Lista budżetów */}
                    <div className="overflow-y-auto flex-1">
                      {loading ? (
                        <div className="p-6 text-center text-gray-400">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                          Ładowanie...
                        </div>
                      ) : budgets.length === 0 ? (
                        <div className="p-6 text-center text-gray-400">
                          Brak budżetów. Utwórz nowy!
                        </div>
                      ) : (
                        <>
                          {budgets.map((budget) => (
                            <button
                              key={budget.id}
                              onClick={() => {
                                handleBudgetSelect(budget);
                                setShowBudgetDropdown(false);
                              }}
                              className={`w-full text-left p-4 hover:bg-dark-hover transition-colors border-b border-dark-border last:border-b-0 ${
                                selectedBudget?.id === budget.id ? "bg-dark-hover" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
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
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </>
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

        {/* Mobile Navigation */}
        <div className="md:hidden">
          {/* Mobile Header */}
          <div className="flex justify-between items-center p-3">
            <Link to="/" className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">💰</span>
              <span>Budżeciak</span>
            </Link>

            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="border-t border-dark-border p-3 space-y-2">
              {/* Wybór budżetu Mobile */}
              <div className="mb-3 relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBudgetDropdown(!showBudgetDropdown);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-dark-card border border-dark-border rounded-lg hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="truncate text-sm">
                      {selectedBudget ? selectedBudget.name : "Wybierz budżet"}
                    </span>
                  </div>
                  <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${showBudgetDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown budżetów - MOBILE */}
                {showBudgetDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowBudgetDropdown(false)}
                    />
                    <div className="absolute left-0 right-0 mt-2 bg-dark-card border border-dark-border rounded-lg shadow-2xl z-50 max-h-[400px] overflow-hidden flex flex-col">
                      {/* Przycisk "Nowy budżet" */}
                      <div className="p-2 border-b border-dark-border">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowNewBudgetModal(true);
                            setShowBudgetDropdown(false);
                            setShowMobileMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-blue-400 hover:bg-dark-hover rounded-lg transition-colors text-sm"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Nowy budżet
                        </button>
                      </div>

                      {/* Lista budżetów */}
                      <div className="overflow-y-auto flex-1">
                        {loading ? (
                          <div className="p-4 text-center text-gray-400 text-sm">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                            Ładowanie...
                          </div>
                        ) : budgets.length === 0 ? (
                          <div className="p-4 text-center text-gray-400 text-sm">
                            Brak budżetów
                          </div>
                        ) : (
                          <>
                            {budgets.map((budget) => (
                              <button
                                key={budget.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBudgetSelect(budget);
                                  setShowBudgetDropdown(false);
                                }}
                                className={`w-full text-left p-3 hover:bg-dark-hover transition-colors border-b border-dark-border last:border-b-0 ${
                                  selectedBudget?.id === budget.id ? "bg-dark-hover" : ""
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{budget.name}</span>
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
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Zakładki Mobile */}
              {tabs.map((tab) => (
                <Link
                  key={tab.path}
                  to={tab.path}
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowBudgetDropdown(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    location.pathname === tab.path
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-gray-300 hover:bg-dark-hover hover:text-white"
                  }`}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span>{tab.name}</span>
                </Link>
              ))}

              {/* Wylogowanie Mobile */}
              <button
                onClick={() => {
                  handleLogout();
                  setShowMobileMenu(false);
                  setShowBudgetDropdown(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-dark-hover rounded-lg font-medium transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Wyloguj</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Modal nowego budżetu */}
      {showNewBudgetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
                  autoFocus
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