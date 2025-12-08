import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useBudgets } from "../hooks/useBudgets";
import { useToast } from "../contexts/ToastContext";

export default function Navigation({
  session,
  selectedBudget,
  onBudgetChange,
  onBudgetDeleted,
  onBudgetCreated,
  budgetRefreshTrigger,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { budgets, loading, createBudget } = useBudgets(session, budgetRefreshTrigger);
  
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showNewBudgetModal, setShowNewBudgetModal] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState("");
  const [newBudgetDescription, setNewBudgetDescription] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const tabs = [
    { 
      name: "Dashboard", 
      path: "/", 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      name: "Wydatki", 
      path: "/expenses", 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      name: "Wpływy", 
      path: "/income", 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    ...(selectedBudget?.is_owner
      ? [{
          name: "Ustawienia",
          path: `/budget/${selectedBudget.id}/settings`,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )
        }]
      : []),
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
    if (!newBudgetName.trim()) {
      toast.warning("Nazwa budżetu nie może być pusta");
      return;
    }

    try {
      const newBudget = await createBudget(newBudgetName, newBudgetDescription);
      setShowNewBudgetModal(false);
      setNewBudgetName("");
      setNewBudgetDescription("");
      
      if (newBudget) {
        onBudgetChange(newBudget);
        toast.success(`Budżet "${newBudget.name}" został utworzony!`);
      }
      
      if (onBudgetCreated) {
        onBudgetCreated(newBudget);
      }
    } catch (error) {
      console.error("Błąd tworzenia budżetu:", error);
      toast.error("Nie udało się utworzyć budżetu: " + error.message);
    }
  }

  function handleBudgetSelect(budget) {
    if (onBudgetChange) {
      onBudgetChange(budget);
    }
  }

  return (
    <>
      <nav className="bg-dark-surface rounded-lg shadow-lg mb-4 md:mb-6 border border-dark-border/50">
        {/* Desktop Navigation */}
        <div className="hidden md:flex justify-between items-center p-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Budżeciak
            </span>
          </Link>

          {/* Zakładki Desktop */}
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  location.pathname === tab.path
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                    : "text-gray-300 hover:bg-dark-hover hover:text-white"
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </Link>
            ))}
          </div>

          {/* Dropdown i wylogowanie Desktop */}
          <div className="flex items-center gap-3">
            {/* Dropdown budżetów */}
            <div className="relative">
              <button
                onClick={() => setShowBudgetDropdown(!showBudgetDropdown)}
                className="flex items-center gap-2 px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg hover:border-blue-500 transition-all"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="max-w-[150px] truncate text-sm">
                  {selectedBudget ? selectedBudget.name : "Wybierz budżet"}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <div className="p-3 border-b border-dark-border">
                      <button
                        onClick={() => {
                          setShowNewBudgetModal(true);
                          setShowBudgetDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-blue-400 hover:bg-dark-hover rounded-lg transition-colors font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nowy budżet
                      </button>
                    </div>

                    <div className="overflow-y-auto flex-1">
                      {loading ? (
                        <div className="p-6 text-center text-gray-400">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                          <p className="text-sm">Ładowanie...</p>
                        </div>
                      ) : budgets.length === 0 ? (
                        <div className="p-6 text-center">
                          <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-gray-400 text-sm">Brak budżetów</p>
                        </div>
                      ) : (
                        budgets.map((budget) => (
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
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                  Właściciel
                                </span>
                              )}
                              {budget.is_shared && (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                  {budget.access_level === "edit" ? "Edycja" : "Widok"}
                                </span>
                              )}
                            </div>
                            {budget.description && (
                              <p className="text-xs text-gray-400 truncate">
                                {budget.description}
                              </p>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Wylogowanie */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg font-medium transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden xl:inline">Wyloguj</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="flex justify-between items-center p-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Budżeciak
              </span>
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

          {showMobileMenu && (
            <div className="border-t border-dark-border p-3 space-y-2">
              <div className="mb-3 relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBudgetDropdown(!showBudgetDropdown);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-dark-card border border-dark-border rounded-lg hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="truncate text-sm">
                      {selectedBudget ? selectedBudget.name : "Wybierz budżet"}
                    </span>
                  </div>
                  <svg className={`w-4 h-4 flex-shrink-0 transition-transform text-gray-400 ${showBudgetDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showBudgetDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowBudgetDropdown(false)}
                    />
                    <div className="absolute left-0 right-0 mt-2 bg-dark-card border border-dark-border rounded-lg shadow-2xl z-50 max-h-[400px] overflow-hidden flex flex-col">
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

                      <div className="overflow-y-auto flex-1">
                        {loading ? (
                          <div className="p-4 text-center text-gray-400 text-sm">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                            Ładowanie...
                          </div>
                        ) : budgets.length === 0 ? (
                          <div className="p-4 text-center text-gray-400 text-sm">
                            Brak budżetów
                          </div>
                        ) : (
                          budgets.map((budget) => (
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
                                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                    Właściciel
                                  </span>
                                )}
                                {budget.is_shared && (
                                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                    {budget.access_level === "edit" ? "Edycja" : "Widok"}
                                  </span>
                                )}
                              </div>
                              {budget.description && (
                                <p className="text-xs text-gray-400 truncate">
                                  {budget.description}
                                </p>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

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
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                      : "text-gray-300 hover:bg-dark-hover hover:text-white"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.name}</span>
                </Link>
              ))}

              <button
                onClick={() => {
                  handleLogout();
                  setShowMobileMenu(false);
                  setShowBudgetDropdown(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg font-medium transition-all"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">Nowy budżet</h2>
            </div>
            
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
                  className="w-full px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                  className="w-full px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2.5 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-lg shadow-blue-500/30"
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
                  className="flex-1 bg-dark-border text-white py-2.5 px-4 rounded-lg hover:bg-dark-hover transition-colors font-medium"
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
