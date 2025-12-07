import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import CategoryAutocomplete from "./CategoryAutocomplete";
import { useToast } from "../hooks/useToast"; // ✅ DODAJ

export default function Expenses({ session, budget }) {
  const toast = useToast(); // ✅ DODAJ
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  
  // Formularz dodawania
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  // Wyszukiwanie
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("name");

  // Edycja
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // ✅ DODAJ: State dla modala usuwania
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  const canEdit = budget?.is_owner || budget?.access_level === "edit";

  useEffect(() => {
    if (budget) {
      fetchExpenses();
    }
  }, [budget]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredExpenses(expenses);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = expenses.filter((expense) => {
      if (searchField === "name") {
        return expense.name.toLowerCase().includes(query);
      } else if (searchField === "category") {
        return expense.category?.toLowerCase().includes(query);
      }
      return false;
    });

    setFilteredExpenses(filtered);
  }, [searchQuery, searchField, expenses]);

  async function fetchExpenses() {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("budget_id", budget.id)
        .order("date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
      setFilteredExpenses(data || []);
    } catch (error) {
      console.error("Błąd pobierania wydatków:", error);
    }
  }

  async function addExpense(e) {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.warning("Nazwa wydatku nie może być pusta");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.warning("Kwota musi być większa od zera");
      return;
    }

    if (!date) {
      toast.warning("Data jest wymagana");
      return;
    }

    if (!canEdit) {
      toast.warning("Nie masz uprawnień do dodawania wydatków");
      return;
    }

    try {
      const { error } = await supabase.from("expenses").insert([
        {
          budget_id: budget.id,
          name: name.trim(),
          amount: parseFloat(amount),
          category: category.trim() || null,
          date,
          description: description.trim() || null,
        },
      ]);

      if (error) throw error;

      setName("");
      setAmount("");
      setCategory("");
      setDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      
      await fetchExpenses();
      toast.success("Wydatek został dodany!");
    } catch (error) {
      console.error("Błąd dodawania wydatku:", error);
      toast.error("Nie udało się dodać wydatku: " + error.message);
    }
  }

  // ✅ ZMIEŃ: funkcję deleteExpense
  function requestDeleteExpense(expense) {
    setExpenseToDelete(expense);
    setShowDeleteModal(true);
  }

  async function confirmDeleteExpense() {
    if (!expenseToDelete || !canEdit) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseToDelete.id);
        
      if (error) throw error;
      
      await fetchExpenses();
      setShowDeleteModal(false);
      setExpenseToDelete(null);
      toast.success("Wydatek został usunięty");
    } catch (error) {
      console.error("Błąd usuwania wydatku:", error);
      toast.error("Nie udało się usunąć wydatku: " + error.message);
    }
  }

  async function updateExpense(id) {
    if (!canEdit) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          name: editName.trim(),
          amount: parseFloat(editAmount),
          category: editCategory.trim() || null,
          date: editDate,
          description: editDescription.trim() || null,
        })
        .eq("id", id);

      if (error) throw error;
      setEditingId(null);
      fetchExpenses();
      toast.success("Wydatek został zaktualizowany!");
    } catch (error) {
      console.error("Błąd aktualizacji wydatku:", error);
      toast.error("Nie udało się zaktualizować wydatku: " + error.message);
    }
  }

  function startEdit(expense) {
    setEditingId(expense.id);
    setEditName(expense.name);
    setEditAmount(expense.amount);
    setEditCategory(expense.category || "");
    setEditDate(expense.date);
    setEditDescription(expense.description || "");
  }

  if (!budget) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400">Wybierz budżet aby zobaczyć wydatki</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Formularz dodawania - Zawsze widoczny */}
      {canEdit && (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-3 md:p-6 shadow-xl">
          <h2 className="text-lg md:text-xl font-medium mb-3 md:mb-4 flex items-center gap-2">
            <span className="text-xl md:text-2xl">➕</span>
            Dodaj nowy wydatek
          </h2>
          <form onSubmit={addExpense} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Nazwa wydatku *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="np. Zakupy spożywcze"
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Kwota (zł) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Kategoria
                </label>
                <CategoryAutocomplete
                  value={category}
                  onChange={setCategory}
                  budgetId={budget?.id}
                  type="expense"
                  placeholder="np. Jedzenie, Transport"
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Data *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Opis
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dodatkowe informacje..."
                rows="2"
                className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-red-600 text-white py-2 md:py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg hover:shadow-xl"
            >
              Dodaj wydatek
            </button>
          </form>
        </div>
      )}

      {/* Wyszukiwanie i lista */}
      <div className="bg-dark-surface border border-dark-border rounded-lg p-3 md:p-6 shadow-xl">
        <h2 className="text-lg md:text-xl font-medium mb-3 md:mb-4 flex items-center gap-2">
          <span className="text-xl md:text-2xl">📋</span>
          Lista wydatków
        </h2>
        
        {/* Pole wyszukiwania */}
        <div className="relative mb-3 md:mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Wyszukaj po ${searchField === "name" ? "nazwie" : "kategorii"}...`}
            className="w-full pl-10 pr-10 py-2 md:py-3 bg-dark-card border border-dark-border rounded-lg text-white text-sm md:text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Wybór pola */}
        <div className="flex bg-dark-card border border-dark-border rounded-lg overflow-hidden mb-4">
          <button
            onClick={() => setSearchField("name")}
            className={`flex-1 px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-colors ${
              searchField === "name" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-dark-hover"
            }`}
          >
            Nazwa
          </button>
          <button
            onClick={() => setSearchField("category")}
            className={`flex-1 px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-colors ${
              searchField === "category" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-dark-hover"
            }`}
          >
            Kategoria
          </button>
        </div>

        {/* Informacja o wynikach */}
        {searchQuery && (
          <div className="mb-4 text-sm text-gray-400">
            Znaleziono: <span className="text-white font-medium">{filteredExpenses.length}</span> {filteredExpenses.length === 1 ? "wydatek" : "wydatków"}
          </div>
        )}

        {/* Lista wydatków */}
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? (
              <>
                <svg className="w-16 h-16 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>Nie znaleziono wydatków pasujących do "{searchQuery}"</p>
              </>
            ) : (
              <>
                <svg className="w-16 h-16 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p>Brak wydatków</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="bg-dark-card border border-dark-border rounded-lg p-3 md:p-4 hover:border-red-500/50 transition-colors"
              >
                {editingId === expense.id ? (
                  <div className="space-y-2 md:space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nazwa"
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white text-sm md:text-base focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="Kwota"
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white text-sm md:text-base focus:outline-none focus:border-blue-500"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <CategoryAutocomplete
                        value={editCategory}
                        onChange={setEditCategory}
                        budgetId={budget?.id}
                        type="expense"
                        placeholder="Kategoria"
                        className="px-3 py-2 bg-dark-bg border border-dark-border rounded text-white focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="px-3 py-2 bg-dark-bg border border-dark-border rounded text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Opis"
                      rows="2"
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white focus:outline-none focus:border-blue-500 resize-none"
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => updateExpense(expense.id)}
                        className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors text-sm md:text-base"
                      >
                        Zapisz
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 bg-dark-border text-white py-2 rounded hover:bg-dark-hover transition-colors text-sm md:text-base"
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-base md:text-lg font-medium text-white truncate">
                          {expense.name}
                        </h3>
                        {expense.category && (
                          <span className="inline-flex items-center px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded w-fit">
                            {expense.category}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs md:text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(expense.date).toLocaleDateString("pl-PL")}
                        </span>
                        <span className="text-base md:text-xl font-bold text-red-400">
                          -{parseFloat(expense.amount).toFixed(2)} zł
                        </span>
                      </div>
                      {expense.description && (
                        <p className="mt-2 text-xs md:text-sm text-gray-400 line-clamp-2">
                          {expense.description}
                        </p>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex sm:flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => startEdit(expense)}
                          className="flex-1 sm:flex-none p-2 text-blue-400 hover:bg-dark-hover rounded transition-colors"
                          title="Edytuj"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* ZMIEŃ: przycisk usuwania */}
                        <button
                          onClick={() => requestDeleteExpense(expense)}
                          className="flex-1 sm:flex-none p-2 text-red-400 hover:bg-dark-hover rounded transition-colors"
                          title="Usuń"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Podsumowanie */}
      {filteredExpenses.length > 0 && (
        <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 rounded-lg p-4 md:p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-400 mb-1">Suma wydatków</p>
              <p className="text-2xl md:text-3xl font-bold text-red-400">
                {filteredExpenses
                  .reduce((sum, exp) => sum + parseFloat(exp.amount), 0)
                  .toFixed(2)} zł
              </p>
            </div>
            <div className="bg-red-500/20 p-3 md:p-4 rounded-full">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ✅ DODAJ: Modal usuwania */}
      {showDeleteModal && expenseToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Usuń wydatek</h3>
                <p className="text-sm text-gray-400">Czy na pewno?</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Czy na pewno chcesz usunąć wydatek <span className="font-bold text-white">"{expenseToDelete.name}"</span> o wartości <span className="font-bold text-red-400">{expenseToDelete.amount} zł</span>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={confirmDeleteExpense}
                className="flex-1 bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Usuń
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setExpenseToDelete(null);
                }}
                className="flex-1 bg-dark-border text-white py-2.5 px-4 rounded-lg hover:bg-dark-hover transition-colors font-medium"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
