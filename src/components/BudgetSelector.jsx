import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBudgets } from "../hooks/useBudgets";

export default function BudgetSelector({ session, selectedBudget, onBudgetChange }) {
  const { budgets, loading, createBudget } = useBudgets(session);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState("");
  const [newBudgetDescription, setNewBudgetDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedBudget && budgets.length > 0) {
      onBudgetChange(budgets[0]);
    }
  }, [budgets, selectedBudget, onBudgetChange]);

  // Zamknij dropdown po kliknięciu poza nim
  useEffect(() => {
    function handleClickOutside(event) {
      const dropdown = document.getElementById('budget-dropdown');
      const button = document.getElementById('budget-selector-button');
      
      if (dropdown && button && 
          !dropdown.contains(event.target) && 
          !button.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  async function handleCreateBudget(e) {
    e.preventDefault();
    if (!newBudgetName.trim()) return;

    setSubmitting(true);
    try {
      const newBudget = await createBudget(newBudgetName, newBudgetDescription);
      setNewBudgetName("");
      setNewBudgetDescription("");
      setShowCreateModal(false);
      onBudgetChange(newBudget);
    } catch (error) {
      alert("Nie udało się utworzyć budżetu: " + error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="bg-dark-surface border border-dark-border rounded-lg p-4 shadow-lg mb-6">
        <div className="flex items-center gap-3">
          {/* Przycisk wyboru budżetu */}
          <div className="flex-1 relative">
            <button
              id="budget-selector-button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full bg-dark-card border-2 border-dark-border rounded-lg p-3 flex items-center justify-between hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="text-left">
                  {selectedBudget ? (
                    <>
                      <div className="text-white font-medium">{selectedBudget.name}</div>
                      <div className="text-xs text-gray-400">
                        {selectedBudget.is_owner && "🔑 Właściciel"}
                        {selectedBudget.is_shared && `🔗 ${selectedBudget.access_level === 'view' ? 'Widok' : 'Edycja'}`}
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-400">Wybierz budżet...</div>
                  )}
                </div>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${showDropdown ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown lista budżetów */}
            {showDropdown && (
              <div 
                id="budget-dropdown"
                className="absolute top-full left-0 right-0 mt-2 bg-dark-card border-2 border-blue-500/50 rounded-lg shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto"
              >
                {/* Moje budżety */}
                {budgets.filter(b => b.is_owner).length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-dark-bg/50 sticky top-0 backdrop-blur-sm">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        🔑 Moje budżety
                      </span>
                    </div>
                    {budgets.filter(b => b.is_owner).map((budget) => (
                      <div
                        key={budget.id}
                        className={`flex items-center justify-between px-4 py-3 hover:bg-dark-hover transition-colors group ${
                          selectedBudget?.id === budget.id ? 'bg-blue-500/10 border-l-4 border-blue-500' : 'border-l-4 border-transparent'
                        }`}
                      >
                        <div
                          onClick={() => {
                            onBudgetChange(budget);
                            setShowDropdown(false);
                          }}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="text-white font-medium truncate">{budget.name}</div>
                          {budget.description && (
                            <div className="text-sm text-gray-400 truncate">{budget.description}</div>
                          )}
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/budget/${budget.id}`);
                            setShowDropdown(false);
                          }}
                          className="ml-3 p-2 hover:bg-dark-surface rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                          title="Ustawienia budżetu"
                        >
                          <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Udostępnione mi */}
                {budgets.filter(b => b.is_shared).length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-dark-bg/50 sticky top-0 backdrop-blur-sm">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        🔗 Udostępnione mi
                      </span>
                    </div>
                    {budgets.filter(b => b.is_shared).map((budget) => (
                      <div
                        key={budget.id}
                        onClick={() => {
                          onBudgetChange(budget);
                          setShowDropdown(false);
                        }}
                        className={`px-4 py-3 hover:bg-dark-hover transition-colors cursor-pointer ${
                          selectedBudget?.id === budget.id ? 'bg-green-500/10 border-l-4 border-green-500' : 'border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">{budget.name}</div>
                            <div className="text-sm text-gray-400">
                              {budget.access_level === 'view' ? '👁️ Tylko widok' : '✏️ Edycja'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {budgets.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-sm">Brak budżetów</p>
                    <p className="text-xs mt-1">Utwórz swój pierwszy budżet</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Przycisk tworzenia budżetu */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 flex-shrink-0 shadow-lg"
            title="Utwórz nowy budżet"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Nowy budżet</span>
          </button>
        </div>
      </div>

      {/* Modal tworzenia budżetu */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface rounded-xl shadow-2xl border-2 border-blue-500/30 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                Utwórz nowy budżet
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewBudgetName("");
                  setNewBudgetDescription("");
                }}
                className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-dark-hover rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
                  placeholder="np. Budżet domowy, Wakacje 2025"
                  className="w-full px-4 py-3 bg-dark-card border-2 border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
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
                  className="w-full px-4 py-3 bg-dark-card border-2 border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Tworzenie...
                    </span>
                  ) : "Utwórz budżet"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewBudgetName("");
                    setNewBudgetDescription("");
                  }}
                  className="flex-1 bg-dark-card border-2 border-dark-border text-white py-3 px-4 rounded-lg font-medium hover:bg-dark-hover transition-colors"
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