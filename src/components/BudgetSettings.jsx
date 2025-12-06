import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

// Debug mode - ustaw na true aby zobaczyć szczegółowe logi
const DEBUG = true;

function debugLog(message, data) {
  if (DEBUG) {
    console.log(`[BudgetSettings] ${message}`, data || '');
  }
}

export default function BudgetSettings({ session }) {
  const { budgetId } = useParams();
  const navigate = useNavigate();
  
  const [budget, setBudget] = useState(null);
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edycja budżetu
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMode, setEditMode] = useState(false);
  
  // Udostępnianie
  const [shareEmail, setShareEmail] = useState("");
  const [shareAccessLevel, setShareAccessLevel] = useState("view");
  const [shareLoading, setShareLoading] = useState(false);

  // Zmiana uprawnień
  const [changingPermission, setChangingPermission] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // ✅ NAPRAWA: Walidacja budgetId i session
  useEffect(() => {
    // Sprawdź czy budgetId jest prawidłowym UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!budgetId || !uuidRegex.test(budgetId)) {
      console.error("Nieprawidłowy budgetId:", budgetId);
      alert("Nieprawidłowy identyfikator budżetu");
      navigate("/");
      return;
    }

    if (!session?.user?.id) {
      console.error("Brak sesji użytkownika");
      alert("Musisz być zalogowany");
      navigate("/");
      return;
    }

    fetchBudgetData();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetId, session?.user?.id]);

  async function fetchBudgetData() {
    try {
      setLoading(true);
      setError(null);

      // ✅ NAPRAWA: Dodaj timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );

      const budgetPromise = supabase
        .from("budgets")
        .select("*")
        .eq("id", budgetId)
        .single();

      const { data: budgetData, error: budgetError } = await Promise.race([
        budgetPromise,
        timeoutPromise
      ]);

      if (budgetError) {
        if (budgetError.code === "PGRST116") {
          throw new Error("Budżet nie został znaleziony");
        }
        throw budgetError;
      }

      // ✅ NAPRAWA: Sprawdź czy użytkownik ma uprawnienia
      if (budgetData.owner_id !== session.user.id) {
        throw new Error("Nie masz uprawnień do zarządzania tym budżetem");
      }

      setBudget(budgetData);
      setEditName(budgetData.name);
      setEditDescription(budgetData.description || "");

      await fetchShares();
    } catch (error) {
      console.error("Błąd pobierania danych budżetu:", error);
      setError(error.message);
      
      if (error.message === "Timeout") {
        alert("Przekroczono czas oczekiwania. Sprawdź połączenie internetowe.");
      } else if (error.message === "Budżet nie został znaleziony") {
        alert("Nie znaleziono budżetu");
      } else if (error.message.includes("uprawnień")) {
        alert(error.message);
      } else {
        alert("Nie udało się załadować budżetu");
      }
      
      navigate("/");
    } finally {
      setLoading(false);
    }
  }

  // ✅ NAPRAWA: Poprawione fetchShares z obsługą RPC
  async function fetchShares() {
    try {
      debugLog('Rozpoczynam pobieranie udostępnień dla budgetId:', budgetId);
    
      const { data: sharesData, error: sharesError } = await supabase
        .from("budget_access")
        .select("id, user_id, access_level, created_at")
        .eq("budget_id", budgetId);

      debugLog('Odpowiedź z budget_access:', { sharesData, sharesError });

      if (sharesError) throw sharesError;

      if (!sharesData || sharesData.length === 0) {
        debugLog('Brak udostępnień');
        setShares([]);
        return;
      }

      const userIds = sharesData.map(share => share.user_id);
      debugLog('User IDs do pobrania:', userIds);

      const { data: emailsData, error: emailError } = await supabase
        .rpc('get_user_emails_by_ids', { user_ids: userIds });

      debugLog('Odpowiedź z RPC get_user_emails_by_ids:', { emailsData, emailError });

      if (emailError) {
        console.error("Błąd RPC get_user_emails_by_ids:", emailError);
        const sharesWithPlaceholders = sharesData.map(share => ({
          ...share,
          user_email: "Nie można pobrać emaila",
        }));
        setShares(sharesWithPlaceholders);
        return;
      }

      const emailsMap = {};
      if (emailsData && Array.isArray(emailsData)) {
        emailsData.forEach(row => {
          emailsMap[row.user_id] = row.email;
        });
      }
    
      debugLog('Mapa emaili:', emailsMap);

      const sharesWithEmails = sharesData.map(share => ({
        ...share,
        user_email: emailsMap[share.user_id] || "Nieznany użytkownik",
      }));

      debugLog('Finalne udostępnienia:', sharesWithEmails);
      setShares(sharesWithEmails);
    } catch (error) {
      console.error("Błąd pobierania udostępnień:", error);
      setShares([]);
    }
  }

  async function updateBudget(e) {
    e.preventDefault();
    
    // ✅ NAPRAWA: Walidacja danych
    const trimmedName = editName.trim();
    const trimmedDescription = editDescription.trim();
    
    if (!trimmedName) {
      alert("Nazwa budżetu nie może być pusta");
      return;
    }
    
    if (trimmedName.length > 100) {
      alert("Nazwa budżetu może mieć maksymalnie 100 znaków");
      return;
    }
    
    if (trimmedDescription.length > 500) {
      alert("Opis może mieć maksymalnie 500 znaków");
      return;
    }
    
    try {
      const { error } = await supabase
        .from("budgets")
        .update({
          name: trimmedName,
          description: trimmedDescription || null,
        })
        .eq("id", budgetId);

      if (error) throw error;

      setBudget({ ...budget, name: trimmedName, description: trimmedDescription });
      setEditMode(false);
      alert("Budżet zaktualizowany!");
    } catch (error) {
      console.error("Błąd aktualizacji budżetu:", error);
      alert("Nie udało się zaktualizować budżetu: " + error.message);
    }
  }

  async function deleteBudget() {
    const confirmText = `Czy na pewno chcesz usunąć budżet "${budget.name}"? Ta operacja jest nieodwracalna!\n\nWpisz "${budget.name}" aby potwierdzić:`;
    const userInput = prompt(confirmText);
    
    if (userInput !== budget.name) {
      if (userInput !== null) {
        alert("Nieprawidłowe potwierdzenie. Budżet nie został usunięty.");
      }
      return;
    }

    try {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budgetId)
        .eq("owner_id", session.user.id); // ✅ Dodatkowe zabezpieczenie

      if (error) throw error;

      alert("Budżet został usunięty");
      navigate("/");
    } catch (error) {
      console.error("Błąd usuwania budżetu:", error);
      alert("Nie udało się usunąć budżetu: " + error.message);
    }
  }

  // ✅ NAPRAWA: Walidacja emaila przed udostępnieniem
  async function shareBudget(e) {
    e.preventDefault();
    
    const trimmedEmail = shareEmail.trim().toLowerCase();
    
    // Walidacja emaila
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      alert("Nieprawidłowy format adresu email");
      return;
    }

    setShareLoading(true);
    try {
      // ✅ NAPRAWA: Najpierw sprawdź czy email istnieje
      const { data: emailExists, error: checkError } = await supabase
        .rpc("check_email_exists", { email_input: trimmedEmail });

      if (checkError) {
        console.error("Błąd sprawdzania emaila:", checkError);
        alert("Nie udało się sprawdzić adresu email");
        return;
      }

      if (!emailExists) {
        alert("Nie znaleziono użytkownika o podanym adresie email.\n\nUpewnij się, że użytkownik ma konto w aplikacji.");
        return;
      }

      // Pobierz user_id
      const { data: userId, error: userError } = await supabase
        .rpc("get_user_id_by_email", { email_input: trimmedEmail });

      if (userError) throw userError;
      
      if (!userId) {
        alert("Nie znaleziono użytkownika");
        return;
      }

      // ✅ NAPRAWA: Sprawdź czy to nie ty
      if (userId === session.user.id) {
        alert("Nie możesz udostępnić budżetu samemu sobie");
        return;
      }

      // ✅ NAPRAWA: Sprawdź czy już nie jest udostępniony
      const { data: existingShare, error: existingError } = await supabase
        .from("budget_access")
        .select("id")
        .eq("budget_id", budgetId)
        .eq("user_id", userId)
        .single();

      if (existingShare) {
        alert("Ten budżet jest już udostępniony temu użytkownikowi");
        return;
      }

      // Dodaj udostępnienie
      const { error: shareError } = await supabase
        .from("budget_access")
        .insert([
          {
            budget_id: budgetId,
            user_id: userId,
            access_level: shareAccessLevel,
          },
        ]);

      if (shareError) throw shareError;

      setShareEmail("");
      setShareAccessLevel("view");
      await fetchShares();
      alert(`Budżet został udostępniony użytkownikowi ${trimmedEmail}!`);
    } catch (error) {
      console.error("Błąd udostępniania budżetu:", error);
      alert("Nie udało się udostępnić budżetu: " + error.message);
    } finally {
      setShareLoading(false);
    }
  }

  async function removeShare(shareId) {
    if (!confirm("Czy na pewno chcesz cofnąć dostęp?")) return;

    try {
      const { error } = await supabase
        .from("budget_access")
        .delete()
        .eq("id", shareId)
        .eq("budget_id", budgetId); // ✅ Dodatkowe zabezpieczenie

      if (error) throw error;

      await fetchShares();
      alert("Dostęp został cofnięty");
    } catch (error) {
      console.error("Błąd usuwania dostępu:", error);
      alert("Nie udało się cofnąć dostępu: " + error.message);
    }
  }

  function requestPermissionChange(shareId, currentLevel) {
    const newLevel = currentLevel === "view" ? "edit" : "view";
    setChangingPermission({ shareId, newLevel, currentLevel });
    setShowPermissionModal(true);
  }

  async function confirmPermissionChange() {
    if (!changingPermission) return;

    try {
      const { error } = await supabase
        .from("budget_access")
        .update({ access_level: changingPermission.newLevel })
        .eq("id", changingPermission.shareId)
        .eq("budget_id", budgetId); // ✅ Dodatkowe zabezpieczenie

      if (error) throw error;

      await fetchShares();
      setShowPermissionModal(false);
      setChangingPermission(null);
      alert("Uprawnienia zostały zmienione!");
    } catch (error) {
      console.error("Błąd zmiany uprawnień:", error);
      alert("Nie udało się zmienić uprawnień: " + error.message);
    }
  }

  // ✅ NAPRAWA: Lepszy loading screen
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Ładowanie ustawień budżetu...</p>
        </div>
      </div>
    );
  }

  // ✅ NAPRAWA: Obsługa błędów
  if (error || !budget) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-medium text-red-400 mb-2">
            Nie można załadować budżetu
          </h2>
          <p className="text-gray-400 mb-4">
            {error || "Budżet nie został znaleziony lub nie masz do niego dostępu."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Wróć do listy budżetów
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Nagłówek */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">Ustawienia budżetu</h1>
      </div>

      {/* Edycja podstawowych informacji */}
      <div className="bg-dark-surface border border-dark-border rounded-lg p-6">
        <h2 className="text-xl font-medium mb-4">Podstawowe informacje</h2>
        
        {editMode ? (
          <form onSubmit={updateBudget} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Nazwa budżetu
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Opis
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows="3"
                className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Zapisz zmiany
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setEditName(budget.name);
                  setEditDescription(budget.description || "");
                }}
                className="flex-1 bg-dark-card border border-dark-border text-white py-2 px-4 rounded-lg hover:bg-dark-hover transition-colors"
              >
                Anuluj
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Nazwa</p>
              <p className="text-white font-medium">{budget.name}</p>
            </div>
            {budget.description && (
              <div>
                <p className="text-sm text-gray-400">Opis</p>
                <p className="text-white">{budget.description}</p>
              </div>
            )}
            <button
              onClick={() => setEditMode(true)}
              className="w-full bg-dark-card border border-dark-border text-white py-2 px-4 rounded-lg hover:bg-dark-hover transition-colors"
            >
              Edytuj informacje
            </button>
          </div>
        )}
      </div>

      {/* Udostępnianie budżetu */}
      <div className="bg-dark-surface border border-dark-border rounded-lg p-6">
        <h2 className="text-xl font-medium mb-4">Udostępnianie budżetu</h2>
        
        <form onSubmit={shareBudget} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Email użytkownika
            </label>
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="użytkownik@example.com"
              className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Poziom dostępu
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShareAccessLevel("view")}
                className={`p-4 border-2 rounded-lg transition-all ${
                  shareAccessLevel === "view"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-dark-border bg-dark-card hover:border-dark-border/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <div className="text-left">
                    <div className="font-medium text-white">Tylko widok</div>
                    <div className="text-xs text-gray-400">Może przeglądać dane</div>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setShareAccessLevel("edit")}
                className={`p-4 border-2 rounded-lg transition-all ${
                  shareAccessLevel === "edit"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-dark-border bg-dark-card hover:border-dark-border/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <div className="text-left">
                    <div className="font-medium text-white">Edycja</div>
                    <div className="text-xs text-gray-400">Może dodawać i edytować</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={shareLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {shareLoading ? "Udostępnianie..." : "Udostępnij budżet"}
          </button>
        </form>

        {/* Lista udostępnień */}
        {shares.length > 0 && (
          <div className="border-t border-dark-border pt-6">
            <h3 className="font-medium mb-3">Udostępniony dla:</h3>
            <div className="space-y-3">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-4 bg-dark-card border border-dark-border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-medium">
                        {share.user_email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{share.user_email}</p>
                      <p className="text-sm text-gray-400">
                        {share.access_level === "view" ? "👁️ Tylko widok" : "✏️ Może edytować"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => requestPermissionChange(share.id, share.access_level)}
                      className="px-3 py-1.5 bg-dark-hover border border-dark-border text-sm text-white rounded hover:bg-dark-surface transition-colors"
                      title="Zmień uprawnienia"
                    >
                      {share.access_level === "view" ? "Nadaj edycję" : "Tylko widok"}
                    </button>
                    <button
                      onClick={() => removeShare(share.id)}
                      className="p-2 text-red-400 hover:bg-dark-hover rounded transition-colors"
                      title="Usuń dostęp"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Strefa niebezpieczna */}
      <div className="bg-dark-surface border border-red-500/30 rounded-lg p-6">
        <h2 className="text-xl font-medium text-red-400 mb-4">Strefa niebezpieczna</h2>
        <p className="text-gray-400 mb-4">
          Usunięcie budżetu jest nieodwracalne. Wszystkie wydatki, wpływy i udostępnienia zostaną trwale usunięte.
        </p>
        <button
          onClick={deleteBudget}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Usuń budżet na zawsze
        </button>
      </div>

      {/* Modal potwierdzenia zmiany uprawnień */}
      {showPermissionModal && changingPermission && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface rounded-xl shadow-2xl border-2 border-yellow-500/30 p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-medium text-white">Potwierdź zmianę uprawnień</h3>
              </div>
            </div>

            <p className="text-gray-400 mb-6">
              Czy na pewno chcesz zmienić uprawnienia z{" "}
              <span className="font-medium text-white">
                "{changingPermission.currentLevel === "view" ? "Tylko widok" : "Edycja"}"
              </span>{" "}
              na{" "}
              <span className="font-medium text-white">
                "{changingPermission.newLevel === "view" ? "Tylko widok" : "Edycja"}"
              </span>
              ?
            </p>

            <div className="flex gap-3">
              <button
                onClick={confirmPermissionChange}
                className="flex-1 bg-yellow-600 text-white py-3 px-4 rounded-lg hover:bg-yellow-700 transition-colors font-medium"
              >
                Potwierdź zmianę
              </button>
              <button
                onClick={() => {
                  setShowPermissionModal(false);
                  setChangingPermission(null);
                }}
                className="flex-1 bg-dark-card border-2 border-dark-border text-white py-3 px-4 rounded-lg hover:bg-dark-hover transition-colors font-medium"
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