import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import CategoryAutocomplete from "./CategoryAutocomplete";

export default function Income({ session, budget }) {
  const [income, setIncome] = useState([]);
  const [filteredIncome, setFilteredIncome] = useState([]);
  
  // Formularz dodawania
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  // Wyszukiwanie
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("name"); // "name" lub "type"

  // Edycja
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const canEdit = budget?.is_owner || budget?.access_level === "edit";

  useEffect(() => {
    if (budget) {
      fetchIncome();
    }
  }, [budget]);

  // Filtrowanie wpływów po wyszukiwaniu
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredIncome(income);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = income.filter((item) => {
      if (searchField === "name") {
        return item.name.toLowerCase().includes(query);
      } else if (searchField === "type") {
        return item.type?.toLowerCase().includes(query);
      }
      return false;
    });

    setFilteredIncome(filtered);
  }, [searchQuery, searchField, income]);

  async function fetchIncome() {
    try {
      const { data, error } = await supabase
        .from("income")
        .select("*")
        .eq("budget_id", budget.id)
        .order("date", { ascending: false });

      if (error) throw error;
      setIncome(data || []);
      setFilteredIncome(data || []);
    } catch (error) {
      console.error("Błąd pobierania wpływów:", error);
    }
  }

  async function addIncome(e) {
    e.preventDefault();
    if (!name.trim() || !amount || !canEdit) return;

    try {
      const { error } = await supabase.from("income").insert([
        {
          budget_id: budget.id,
          name: name.trim(),
          amount: parseFloat(amount),
          type: type.trim() || null,
          date,
          description: description.trim() || null,
        },
      ]);

      if (error) throw error;

      setName("");
      setAmount("");
      setType("");
      setDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      fetchIncome();
    } catch (error) {
      console.error("Błąd dodawania wpływu:", error);
      alert("Nie udało się dodać wpływu: " + error.message);
    }
  }

  async function deleteIncome(id) {
    if (!canEdit) return;
    if (!confirm("Czy na pewno chcesz usunąć ten wpływ?")) return;

    try {
      const { error } = await supabase.from("income").delete().eq("id", id);
      if (error) throw error;
      fetchIncome();
    } catch (error) {
      console.error("Błąd usuwania wpływu:", error);
      alert("Nie udało się usunąć wpływu: " + error.message);
    }
  }

  async function updateIncome(id) {
    if (!canEdit) return;

    try {
      const { error } = await supabase
        .from("income")
        .update({
          name: editName.trim(),
          amount: parseFloat(editAmount),
          type: editType.trim() || null,
          date: editDate,
          description: editDescription.trim() || null,
        })
        .eq("id", id);

      if (error) throw error;
      setEditingId(null);
      fetchIncome();
    } catch (error) {
      console.error("Błąd aktualizacji wpływu:", error);
      alert("Nie udało się zaktualizować wpływu: " + error.message);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditAmount(item.amount);
    setEditType(item.type || "");
    setEditDate(item.date);
    setEditDescription(item.description || "");
  }

  if (!budget) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400">Wybierz budżet aby zobaczyć wpływy</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formularz dodawania wpływu */}
      {canEdit && (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Dodaj wpływ
          </h2>
          <form onSubmit={addIncome} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Nazwa wpływu *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="np. Wynagrodzenie, Premia"
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500"
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
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Typ
                </label>
                <CategoryAutocomplete
                  value={type}
                  onChange={setType}
                  budgetId={budget?.id}
                  type="income"
                  placeholder="np. Wynagrodzenie, Inwestycje"
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500"
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
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500"
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
                className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Dodaj wpływ
            </button>
          </form>
        </div>
      )}

      {/* Wyszukiwanie wpływów */}
      <div className="bg-dark-surface border border-dark-border rounded-lg p-6">
        <h2 className="text-xl font-medium mb-4">Lista wpływów</h2>
        
        {/* Pasek wyszukiwania z wyborem pola */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Szukaj po ${searchField === "name" ? "nazwie" : "typie"}...`}
              className="w-full pl-10 pr-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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

          {/* Wybór pola wyszukiwania */}
          <div className="flex bg-dark-card border border-dark-border rounded-lg overflow-hidden">
            <button
              onClick={() => setSearchField("name")}
              className={`px-4 py-2 font-medium transition-colors ${
                searchField === "name"
                  ? "bg-green-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-dark-hover"
              }`}
            >
              Nazwa
            </button>
            <button
              onClick={() => setSearchField("type")}
              className={`px-4 py-2 font-medium transition-colors ${
                searchField === "type"
                  ? "bg-green-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-dark-hover"
              }`}
            >
              Typ
            </button>
          </div>
        </div>

        {/* Informacja o wynikach */}
        {searchQuery && (
          <div className="mb-4 text-sm text-gray-400">
            Znaleziono: <span className="text-white font-medium">{filteredIncome.length}</span> {filteredIncome.length === 1 ? "wpływ" : filteredIncome.length < 5 ? "wpływy" : "wpływów"}
          </div>
        )}

        {/* Lista wpływów */}
        {filteredIncome.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? (
              <>
                <svg className="w-16 h-16 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>Nie znaleziono wpływów pasujących do "{searchQuery}"</p>
                <p className="text-sm mt-1">Spróbuj wyszukać po {searchField === "name" ? "typie" : "nazwie"}</p>
              </>
            ) : (
              <>
                <svg className="w-16 h-16 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Brak wpływów</p>
                {canEdit && <p className="text-sm mt-1">Dodaj pierwszy wpływ powyżej</p>}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIncome.map((item) => (
              <div
                key={item.id}
                className="bg-dark-card border border-dark-border rounded-lg p-4 hover:border-green-500/50 transition-colors"
              >
                {editingId === item.id ? (
                  // Tryb edycji
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-3 py-2 bg-dark-bg border border-dark-border rounded text-white focus:outline-none focus:border-blue-500"
                        placeholder="Nazwa"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="px-3 py-2 bg-dark-bg border border-dark-border rounded text-white focus:outline-none focus:border-blue-500"
                        placeholder="Kwota"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <CategoryAutocomplete
                        value={editType}
                        onChange={setEditType}
                        budgetId={budget?.id}
                        type="income"
                        placeholder="Typ"
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateIncome(item.id)}
                        className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
                      >
                        Zapisz
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 bg-dark-border text-white py-2 rounded hover:bg-dark-hover transition-colors"
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                ) : (
                  // Tryb wyświetlania
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-white truncate">
                          {item.name}
                        </h3>
                        {item.type && (
                          <span className="px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400 flex-shrink-0">
                            {item.type}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(item.date).toLocaleDateString("pl-PL")}
                        </span>
                        <span className="text-xl font-bold text-green-400">
                          +{parseFloat(item.amount).toFixed(2)} zł
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-2 text-blue-400 hover:bg-dark-hover rounded transition-colors"
                          title="Edytuj"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteIncome(item.id)}
                          className="p-2 text-red-400 hover:bg-dark-hover rounded transition-colors"
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
    </div>
  );
}