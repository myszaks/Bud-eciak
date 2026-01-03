import React, { useEffect, useState, useCallback } from "react";
import { getIncome, createIncome, updateIncome, deleteIncome as apiDeleteIncome } from "../lib/api";
import CategoryAutocomplete from "./CategoryAutocomplete";
import { useToast } from "../contexts/ToastContext";
import { useModal } from "../contexts/ModalContext";
import DatePickerField from "./DatePickerField";

export default function Income({ session, budget }) {
  const toast = useToast();
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formularz dodawania
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  // Edycja
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");

  // Wyszukiwanie
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("name");

  // Modal usuwania
  const { openModal } = useModal();

  const canEdit = budget?.is_owner || budget?.access_level === "edit";

  const fetchIncome = useCallback(async () => {
    if (!budget?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await getIncome(budget.id);
      if (error) throw error;
      setIncome(data || []);
    } catch (error) {
      console.error("Błąd pobierania wpływów:", error);
      toast.error("Nie udało się załadować wpływów");
    } finally {
      setLoading(false);
    }
  }, [budget?.id]);

  useEffect(() => {
    fetchIncome();
  }, [fetchIncome]);

  const filteredIncome = income.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    if (searchField === "name") {
      return item.name.toLowerCase().includes(query);
    } else if (searchField === "category") {
      return item.category?.toLowerCase().includes(query);
    }
    return true;
  });

  async function addIncome(e) {
    e.preventDefault();

    if (!name.trim()) {
      toast.warning("Nazwa wpływu nie może być pusta");
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
      toast.warning("Nie masz uprawnień do dodawania wpływów");
      return;
    }

    // optimistic UI
    const tempId = `temp-${Date.now()}`;
    const tempRow = {
      id: tempId,
      budget_id: budget.id,
      name: name.trim(),
      amount: parseFloat(amount),
      date,
      description: description.trim() || null,
      category: category.trim() || null,
      created_at: new Date().toISOString(),
    };

    setIncome((prev) => [tempRow, ...prev]);

    try {

      const { data, error } = await createIncome({
        budget_id: budget.id,
        name: name.trim(),
        amount: parseFloat(amount),
        date,
        description: description.trim() || null,
        category: category.trim() || null,
      });

      if (error) throw error;

      setIncome((prev) => [data, ...prev.filter((r) => r.id !== tempId)]);

      setName("");
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      setCategory("");

      toast.success("Wpływ został dodany!");
    } catch (error) {
      setIncome((prev) => prev.filter((r) => r.id !== tempId));
      console.error("Błąd dodawania wpływu:", error);
      toast.error("Nie udało się dodać wpływu: " + error.message);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditAmount(item.amount);
    setEditDate(item.date);
    setEditDescription(item.description || "");
    setEditCategory(item.category || "");
  }

  async function updateIncome(id) {
    if (!editName.trim() || !editAmount || !editDate) {
      toast.warning("Wypełnij wszystkie wymagane pola");
      return;
    }

    try {
      const { error } = await updateIncome(id, {
        name: editName.trim(),
        amount: parseFloat(editAmount),
        date: editDate,
        description: editDescription.trim() || null,
        category: editCategory.trim() || null,
      });

      if (error) throw error;

      await fetchIncome();
      setEditingId(null);
      toast.success("Wpływ został zaktualizowany!");
    } catch (error) {
      console.error("Błąd aktualizacji wpływu:", error);
      toast.error("Nie udało się zaktualizować wpływu");
    }
  }

  function requestDeleteIncome(income) {
    if (!canEdit) {
      toast.warning("Nie masz uprawnień do usuwania wpływów");
      return;
    }

    openModal("confirmDelete", {
      title: "Usuń wpływ",
      description: (
        <>
          Czy na pewno chcesz usunąć wpływ <strong>{income.name}</strong> o
          wartości <strong className="text-green-400">{income.amount}zł</strong>
          ?
        </>
      ),
      confirmText: "Usuń",
      confirmVariant: "danger",
      onConfirm: async () => {
        await deleteIncome(income.id);
      },
    });
  }

  async function deleteIncome(incomeId) {
    if (!canEdit) return;
    const previous = income;
    setIncome((prev) => prev.filter((i) => i.id !== incomeId));

    try {
      const { error } = await apiDeleteIncome(incomeId);
      if (error) throw error;
      toast.success("Wpływ został usunięty");
    } catch (error) {
      setIncome(previous);
      console.error("Błąd usuwania wpływu:", error);
      toast.error("Nie udało się usunąć wpływu: " + error.message);
    }
  }

  if (!budget) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
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
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-primary mb-3">
            Brak wybranego budżetu
          </h2>
          <p className="text-text mb-6">
            Wybierz budżet z menu powyżej lub utwórz nowy, aby rozpocząć
            zarządzanie wpływami.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-green-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Ładowanie wpływów...</p>
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
            <h2 className="text-xl font-bold text-primary">Dodaj nowy wpływ</h2>
          </div>

          <form onSubmit={addIncome} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Nazwa wpływu *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="np. Wynagrodzenie, Premia"
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
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="np. Pensja, Dodatkowy dochód"
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
                    "w-full px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-text focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
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
                className="w-full px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2.5 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium shadow-lg shadow-green-500/30"
            >
              Dodaj wpływ
            </button>
          </form>
        </div>
      )}

      {/* Lista wpływów */}
      <div className="bg-dark-surface rounded-lg shadow-lg border border-dark-border/50 p-4 md:p-6">
        <h2 className="text-xl font-bold mb-5">Lista wpływów</h2>

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
              className="w-full pl-10 pr-10 py-2.5 bg-dark-card border border-dark-border rounded-lg text-text placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
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
                  ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                  : "text-gray-400 hover:bg-dark-hover"
              }`}
            >
              Nazwa
            </button>
            <button
              onClick={() => setSearchField("category")}
              className={`flex-1 px-4 py-2 font-medium transition-all ${
                searchField === "category"
                  ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
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
                {filteredIncome.length}
              </span>{" "}
              {filteredIncome.length === 1 ? "wpływ" : "wpływów"}
            </p>
          )}
        </div>

        {/* Lista */}
        {filteredIncome.length > 0 ? (
          <div className="space-y-3">
            {filteredIncome.map((item) => (
              <div
                key={item.id}
                className="bg-dark-card border border-dark-border rounded-lg p-4 hover:border-green-500/50 transition-all"
              >
                {editingId === item.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nazwa *"
                      className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-text focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                      required
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="Kwota *"
                      className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-text focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                      required
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        placeholder="Kategoria"
                        className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-text focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                      />
                      <DatePickerField
                        value={editDate || null}
                        onChange={setEditDate}
                        required
                        textFieldClassName={
                          "w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-text focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                        }
                      />
                    </div>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Opis"
                      className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-text focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-none transition-all"
                      rows="2"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => updateIncome(item.id)}
                        className="flex-1 bg-green-500 text-white py-2.5 rounded-lg hover:bg-green-600 transition-colors font-medium shadow-lg shadow-green-500/30"
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
                          {item.name}
                        </h3>
                        {item.category && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            {item.category}
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
                          {new Date(item.date).toLocaleDateString("pl-PL")}
                        </span>
                        <span className="text-xl font-bold text-green-400">
                          +{parseFloat(item.amount).toFixed(2)} zł
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(item)}
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
                          onClick={() => requestDeleteIncome(item)}
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
        ) : (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-gray-400">
              {searchQuery ? "Nie znaleziono wpływów" : "Brak wpływów"}
            </p>
          </div>
        )}
      </div>

      {/* Podsumowanie */}
      {filteredIncome.length > 0 && (
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-lg p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Suma wpływów</p>
              <p className="text-3xl font-bold text-green-400">
                {filteredIncome
                  .reduce((sum, item) => sum + parseFloat(item.amount), 0)
                  .toFixed(2)}{" "}
                zł
              </p>
            </div>
            <div className="bg-green-500/20 p-4 rounded-full">
              <svg
                className="w-10 h-10 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
