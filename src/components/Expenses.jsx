import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import CategoryAutocomplete from "./CategoryAutocomplete";
import { useToast } from "../contexts/ToastContext";
import DatePickerField from "./DatePickerField";
import { useModal } from "../contexts/ModalContext";

export default function Expenses({ session, budget }) {
  const toast = useToast();
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

  // Modal usuwania
  const { openModal } = useModal();

  const canEdit = budget?.is_owner || budget?.access_level === "edit";

  useEffect(() => {
    if (!budget) return;
    fetchExpenses();
  }, [budget?.id]);

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

    // optimistic UI: insert temporary row immediately
    const tempId = `temp-${Date.now()}`;
    const tempRow = {
      id: tempId,
      budget_id: budget.id,
      name: name.trim(),
      amount: parseFloat(amount),
      category: category.trim() || null,
      date,
      description: description.trim() || null,
      created_at: new Date().toISOString(),
    };

    setExpenses((prev) => [tempRow, ...prev]);
    setFilteredExpenses((prev) => [tempRow, ...prev]);

    try {
      const { data, error } = await supabase
        .from("expenses")
        .insert([
          {
            budget_id: budget.id,
            name: name.trim(),
            amount: parseFloat(amount),
            category: category.trim() || null,
            date,
            description: description.trim() || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // replace temp row with real row
      setExpenses((prev) => [data, ...prev.filter((r) => r.id !== tempId)]);
      setFilteredExpenses((prev) => [data, ...prev.filter((r) => r.id !== tempId)]);

      setName("");
      setAmount("");
      setCategory("");
      setDate(new Date().toISOString().split("T")[0]);
      setDescription("");

      toast.success("Wydatek został dodany!");
    } catch (error) {
      // rollback temp row
      setExpenses((prev) => prev.filter((r) => r.id !== tempId));
      setFilteredExpenses((prev) => prev.filter((r) => r.id !== tempId));
      console.error("Błąd dodawania wydatku:", error);
      toast.error("Nie udało się dodać wydatku: " + error.message);
    }
  }

  function requestDeleteExpense(expense) {
    if (!canEdit) {
      toast.warning("Nie masz uprawnień do usuwania wydatków");
      return;
    }

    openModal("confirmDelete", {
      title: "Usuń wydatek",
      description: (
        <>
          Czy na pewno chcesz usunąć wydatek <strong>{expense.name}</strong> o
          wartości <strong className="text-red-400">{expense.amount}zł</strong>
          ?
        </>
      ),
      confirmText: "Usuń",
      confirmVariant: "danger",
      onConfirm: async () => {
        await deleteExpense(expense.id);
      },
    });
  }

  async function deleteExpense(expenseId) {
    if (!canEdit) return;
    // optimistic removal
    const previous = expenses;
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    setFilteredExpenses((prev) => prev.filter((e) => e.id !== expenseId));

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
      if (error) throw error;
      toast.success("Wydatek został usunięty");
    } catch (error) {
      // rollback
      setExpenses(previous);
      setFilteredExpenses(previous);
      console.error("Błąd usuwania wydatku:", error);
      toast.error("Nie udało się usunąć wydatku: " + error.message);
    }
  }

  async function updateExpense(id) {
    if (!canEdit) return;
    // optimistic update
    const previous = expenses;
    const updated = {
      ...previous.find((e) => e.id === id),
      name: editName.trim(),
      amount: parseFloat(editAmount),
      category: editCategory.trim() || null,
      date: editDate,
      description: editDescription.trim() || null,
    };
    setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
    setFilteredExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));

    try {
      const { error } = await supabase.from("expenses").update({
        name: editName.trim(),
        amount: parseFloat(editAmount),
        category: editCategory.trim() || null,
        date: editDate,
        description: editDescription.trim() || null,
      }).eq("id", id);

      if (error) throw error;
      setEditingId(null);
      toast.success("Wydatek został zaktualizowany!");
    } catch (error) {
      // rollback
      setExpenses(previous);
      setFilteredExpenses(previous);
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
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-primary mb-3">
            Brak wybranego budżetu
          </h2>
          <p className="text-text mb-6">
            Wybierz budżet z menu powyżej lub utwórz nowy, aby rozpocząć
            zarządzanie wydatkami.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Formularz dodawania */}
      {canEdit && (
        <div className="bg-bg rounded-lg shadow-lg border border-primary/30 p-4 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-primary">
              Dodaj nowy wydatek
            </h2>
          </div>

          <form onSubmit={addExpense} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Nazwa wydatku *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="np. Zakupy spożywcze"
                  className="w-full px-4 py-2.5 bg-bg border border-primary rounded-lg text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Kwota (zł) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 bg-bg border border-primary rounded-lg text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Kategoria
                </label>
                <CategoryAutocomplete
                  value={category}
                  onChange={setCategory}
                  budgetId={budget?.id}
                  type="expense"
                  placeholder="np. Jedzenie, Transport"
                  className="w-full px-4 py-2.5 bg-bg border border-primary rounded-lg text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Data *
                </label>
                <DatePickerField
                  value={date || null}
                  onChange={setDate}
                  required
                  textFieldClassName={
                    "w-full px-4 py-2.5 bg-bg border border-primary rounded-lg text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Opis
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dodatkowe informacje..."
                rows="3"
                className="w-full px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-text focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 resize-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-red-500 text-white py-2.5 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium shadow-lg shadow-red-500/30"
            >
              Dodaj wydatek
            </button>
          </form>
        </div>
      )}

      {/* Lista wydatków */}
      <div className="bg-dark-surface rounded-lg shadow-lg border border-dark-border/50 p-4 md:p-6">
        <h2 className="text-xl font-bold mb-5">Lista wydatków</h2>

        {/* Wyszukiwanie */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Wyszukaj po ${
                searchField === "name" ? "nazwie" : "kategorii"
              }...`}
              className="w-full pl-10 pr-10 py-2.5 bg-dark-card border border-dark-border rounded-lg text-text placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            <svg
              className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          <div className="flex bg-dark-card border border-dark-border rounded-lg overflow-hidden">
            <button
              onClick={() => setSearchField("name")}
              className={`flex-1 px-4 py-2 font-medium transition-all ${
                searchField === "name"
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                  : "text-gray-400 hover:bg-dark-hover"
              }`}
            >
              Nazwa
            </button>
            <button
              onClick={() => setSearchField("category")}
              className={`flex-1 px-4 py-2 font-medium transition-all ${
                searchField === "category"
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                  : "text-gray-400 hover:bg-dark-hover"
              }`}
            >
              Kategoria
            </button>
          </div>

          {searchQuery && (
            <p className="text-sm text-gray-400 text-center">
              Znaleziono:{" "}
              <span className="text-text font-medium">
                {filteredExpenses.length}
              </span>{" "}
              {filteredExpenses.length === 1 ? "wydatek" : "wydatków"}
            </p>
          )}
        </div>

        {/* Lista */}
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {searchQuery ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              )}
            </svg>
            <p className="text-gray-400">
              {searchQuery
                ? `Nie znaleziono wydatków pasujących do "${searchQuery}"`
                : "Brak wydatków"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="bg-dark-card border border-dark-border rounded-lg p-4 hover:border-red-500/50 transition-all"
              >
                {editingId === expense.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nazwa"
                      className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-text focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="Kwota"
                      className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-text focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <CategoryAutocomplete
                        value={editCategory}
                        onChange={setEditCategory}
                        budgetId={budget?.id}
                        type="expense"
                        placeholder="Kategoria"
                        className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-text focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                      <DatePickerField
                        value={editDate || null}
                        onChange={setEditDate}
                        textFieldClassName={
                          "px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-text focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        }
                      />
                    </div>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Opis"
                      rows="2"
                      className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-text focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none transition-all"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => updateExpense(expense.id)}
                        className="flex-1 bg-red-500 text-white py-2.5 rounded-lg hover:bg-red-600 transition-colors font-medium shadow-lg shadow-red-500/30"
                      >
                        Zapisz
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 bg-dark-border text-text py-2.5 rounded-lg hover:bg-dark-hover transition-colors font-medium"
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium text-text truncate">
                          {expense.name}
                        </h3>
                        {expense.category && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                            {expense.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                        <span className="flex items-center gap-1.5">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {new Date(expense.date).toLocaleDateString("pl-PL")}
                        </span>
                        <span className="text-xl font-bold text-red-400">
                          -{parseFloat(expense.amount).toFixed(2)} zł
                        </span>
                      </div>

                      {expense.description && (
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {expense.description}
                        </p>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(expense)}
                          className="p-2 text-blue-400 hover:bg-dark-hover rounded-lg transition-colors"
                          title="Edytuj"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => requestDeleteExpense(expense)}
                          className="p-2 text-red-400 hover:bg-dark-hover rounded-lg transition-colors"
                          title="Usuń"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
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
        <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 rounded-lg p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Suma wydatków</p>
              <p className="text-3xl font-bold text-red-400">
                {filteredExpenses
                  .reduce((sum, exp) => sum + parseFloat(exp.amount), 0)
                  .toFixed(2)}{" "}
                zł
              </p>
            </div>
            <div className="bg-red-500/20 p-4 rounded-full">
              <svg
                className="w-10 h-10 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
