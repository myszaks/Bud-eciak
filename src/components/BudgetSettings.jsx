import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../contexts/ToastContext";

export default function BudgetSettings({ session, selectedBudget, onBudgetChange, onBudgetDeleted }) {
  const { budgetId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [budget, setBudget] = useState(null);
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State dla edycji
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // State dla udostępniania
  const [shareEmail, setShareEmail] = useState("");
  const [shareLevel, setShareLevel] = useState("view");
  const [sharing, setSharing] = useState(false);

  // State dla modali
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showRemoveShareModal, setShowRemoveShareModal] = useState(false);
  const [shareToRemove, setShareToRemove] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [changingPermission, setChangingPermission] = useState(null);

  // ✅ NOWE: Sprawdź czy user jest właścicielem PRZED fetchem
  const checkOwnership = useCallback(async (budgetIdToCheck) => {
    if (!session?.user?.id) return false;

    try {
      const { data, error } = await supabase
        .from("budgets")
        .select("owner_id")
        .eq("id", budgetIdToCheck)
        .single();

      if (error || !data) return false;
      
      return data.owner_id === session.user.id;
    } catch (err) {
      return false;
    }
  }, [session?.user?.id]);

  // ✅ ZMIENIONE: Obsługa zmiany wybranego budżetu
  useEffect(() => {
    // Ignoruj jeśli budżet się nie zmienił lub jeśli to jest ten sam budżet co w URL
    if (!selectedBudget?.id || selectedBudget.id === budgetId) {
      return;
    }

    console.log("[BudgetSettings] Wykryto zmianę budżetu z", budgetId, "na", selectedBudget.id);
    
    // ✅ Sprawdź czy NOWY budżet jest własnością usera
    if (selectedBudget.is_owner) {
      // Jesteś właścicielem NOWEGO budżetu - przekieruj do jego ustawień
      console.log("[BudgetSettings] Przekierowanie do ustawień nowego budżetu");
      navigate(`/budget/${selectedBudget.id}/settings`, { replace: true });
    } else {
      // ✅ NIE jesteś właścicielem NOWEGO budżetu - wyjdź z ustawień (zakładka zniknie)
      console.log("[BudgetSettings] Nowy budżet nie jest Twój - powrót do Dashboard");
      navigate("/", { replace: true });
    }
  }, [selectedBudget?.id, selectedBudget?.is_owner, budgetId, navigate]);

  // Fetch shares
  async function fetchShares() {
    if (!budgetId || isDeleting) return;
    
    try {
      const { data: sharesData, error: sharesError } = await supabase
        .from("budget_access")
        .select("id, user_id, access_level, created_at")
        .eq("budget_id", budgetId);

      if (sharesError) throw sharesError;

      if (!sharesData || sharesData.length === 0) {
        setShares([]);
        return;
      }

      const userIds = sharesData.map(share => share.user_id);

      const { data: emailsData, error: emailError } = await supabase
        .rpc('get_user_emails_by_ids', { user_ids: userIds });

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

      const sharesWithEmails = sharesData.map(share => ({
        ...share,
        user_email: emailsMap[share.user_id] || "Nieznany użytkownik",
      }));

      setShares(sharesWithEmails);
    } catch (error) {
      console.error("Błąd pobierania udostępnień:", error);
      setShares([]);
    }
  }

  // ✅ ZMIENIONE: Fetch budget data
  const fetchBudgetData = useCallback(async () => {
    if (isDeleting) return;
    
    try {
      setLoading(true);
      setError(null);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!budgetId || !uuidRegex.test(budgetId)) {
        console.error("Nieprawidłowy budgetId:", budgetId);
        throw new Error("Nieprawidłowy identyfikator budżetu");
      }

      if (!session?.user?.id) {
        console.error("Brak sesji użytkownika");
        throw new Error("Musisz być zalogowany");
      }

      console.log("[BudgetSettings] Ładowanie budżetu:", budgetId);

      // ✅ Sprawdź ownership PRZED fetchem
      const isOwner = await checkOwnership(budgetId);
      
      if (!isOwner) {
        console.log("[BudgetSettings] Nie jesteś właścicielem budżetu:", budgetId);
        throw new Error("Nie masz uprawnień do zarządzania tym budżetem");
      }

      const { data: budgetData, error: budgetError } = await supabase
        .from("budgets")
        .select("*")
        .eq("id", budgetId)
        .single();

      if (budgetError) {
        if (budgetError.code === "PGRST116") {
          throw new Error("Budżet nie został znaleziony");
        }
        throw budgetError;
      }

      console.log("[BudgetSettings] Załadowano budżet:", budgetData);
      
      setBudget(budgetData);
      setEditName(budgetData.name);
      setEditDescription(budgetData.description || "");

      // ✅ ZMIENIONE: Aktualizuj selectedBudget TYLKO jeśli jest null lub różny
      // NIE wywołuj onBudgetChange jeśli to ten sam budżet (zapobiega loopowi)
      if (!selectedBudget || selectedBudget.id !== budgetData.id) {
        console.log("[BudgetSettings] Aktualizuję selectedBudget do:", budgetData.id);
        const budgetWithPermissions = {
          ...budgetData,
          is_owner: true,
        };
        onBudgetChange(budgetWithPermissions);
      } else {
        console.log("[BudgetSettings] Pomijam aktualizację selectedBudget - ten sam budżet");
      }

      await fetchShares();
    } catch (err) {
      console.error("Błąd pobierania danych budżetu:", err);
      setError(err.message);
      
      if (err.message.includes("znaleziony")) {
        toast.error("Nie znaleziono budżetu");
      } else if (err.message.includes("uprawnień")) {
        toast.error(err.message);
      } else if (err.message.includes("Nieprawidłowy")) {
        toast.error(err.message);
      } else {
        toast.error("Nie udało się załadować budżetu");
      }
      
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [budgetId, session?.user?.id, selectedBudget, onBudgetChange, navigate, isDeleting, checkOwnership, toast]);

  // ✅ ZMIENIONE: Fetch tylko gdy budgetId z URL się zmieni (NIE gdy selectedBudget się zmieni)
  useEffect(() => {
    if (budgetId && session?.user?.id && !isDeleting) {
      fetchBudgetData();
    }
  }, [budgetId, session?.user?.id, isDeleting]); // ✅ USUNIĘTO fetchBudgetData z dependencies

  async function updateBudget(e) {
    e.preventDefault();
    
    const trimmedName = editName.trim();
    const trimmedDescription = editDescription.trim();
    
    if (!trimmedName) {
      toast.warning("Nazwa budżetu nie może być pusta");
      return;
    }
    
    if (trimmedName.length > 100) {
      toast.warning("Nazwa budżetu może mieć maksymalnie 100 znaków");
      return;
    }
    
    if (trimmedDescription.length > 500) {
      toast.warning("Opis może mieć maksymalnie 500 znaków");
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

      const updatedBudget = { 
        ...budget, 
        name: trimmedName, 
        description: trimmedDescription 
      };
      
      setBudget(updatedBudget);
      setEditMode(false);

      if (selectedBudget?.id === budgetId) {
        onBudgetChange({
          ...selectedBudget,
          name: trimmedName,
          description: trimmedDescription,
        });
      }

      toast.success("Budżet zaktualizowany!");
    } catch (error) {
      console.error("Błąd aktualizacji budżetu:", error);
      toast.error("Nie udało się zaktualizować budżetu: " + error.message);
    }
  }

  async function handleDeleteBudget() {
    if (deleteConfirmation !== budget.name) {
      toast.error("Nieprawidłowe potwierdzenie");
      return;
    }

    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budgetId)
        .eq("owner_id", session.user.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setDeleteConfirmation("");
      
      if (onBudgetDeleted) {
        onBudgetDeleted(budgetId);
      }
      
      toast.success("Budżet został usunięty");
      navigate("/", { replace: true });
      
    } catch (error) {
      console.error("Błąd usuwania budżetu:", error);
      toast.error("Nie udało się usunąć budżetu: " + error.message);
      setIsDeleting(false);
    }
  }

  async function shareBudget(e) {
    e.preventDefault();
    
    const trimmedEmail = shareEmail.trim().toLowerCase();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.warning("Nieprawidłowy format adresu email");
      return;
    }

    setSharing(true);
    try {
      const { data: emailExists, error: checkError } = await supabase
        .rpc("check_email_exists", { email_input: trimmedEmail });

      if (checkError) {
        console.error("Błąd sprawdzania emaila:", checkError);
        toast.error("Nie udało się sprawdzić adresu email");
        return;
      }

      if (!emailExists) {
        toast.error("Nie znaleziono użytkownika o podanym adresie email.\n\nUpewnij się, że użytkownik ma konto w aplikacji.");
        return;
      }

      const { data: userId, error: userError } = await supabase
        .rpc("get_user_id_by_email", { email_input: trimmedEmail });

      if (userError) throw userError;
      
      if (!userId) {
        toast.error("Nie znaleziono użytkownika");
        return;
      }

      if (userId === session.user.id) {
        toast.error("Nie możesz udostępnić budżetu samemu sobie");
        return;
      }

      const { data: existingShare } = await supabase
        .from("budget_access")
        .select("id")
        .eq("budget_id", budgetId)
        .eq("user_id", userId)
        .single();

      if (existingShare) {
        toast.warning("Ten budżet jest już udostępniony temu użytkownikowi");
        return;
      }

      const { error: shareError } = await supabase
        .from("budget_access")
        .insert([
          {
            budget_id: budgetId,
            user_id: userId,
            access_level: shareLevel,
          },
        ]);

      if (shareError) throw shareError;

      setShareEmail("");
      setShareLevel("view");
      await fetchShares();
      toast.success(`Budżet został udostępniony użytkownikowi ${trimmedEmail}!`);
    } catch (error) {
      console.error("Błąd udostępniania budżetu:", error);
      toast.error("Nie udało się udostępnić budżetu: " + error.message);
    } finally {
      setSharing(false);
    }
  }

  function requestRemoveShare(share) {
    setShareToRemove(share);
    setShowRemoveShareModal(true);
  }

  async function confirmRemoveShare() {
    if (!shareToRemove) return;

    try {
      const { error } = await supabase
        .from("budget_access")
        .delete()
        .eq("id", shareToRemove.id)
        .eq("budget_id", budgetId);

      if (error) throw error;

      await fetchShares();
      setShowRemoveShareModal(false);
      setShareToRemove(null);
      toast.success("Dostęp został cofnięty");
    } catch (error) {
      console.error("Błąd usuwania dostępu:", error);
      toast.error("Nie udało się cofnąć dostępu: " + error.message);
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
        .eq("budget_id", budgetId);

      if (error) throw error;

      await fetchShares();
      setShowPermissionModal(false);
      setChangingPermission(null);
      toast.success("Uprawnienia zostały zmienione!");
    } catch (error) {
      console.error("Błąd zmiany uprawnień:", error);
      toast.error("Nie udało się zmienić uprawnień: " + error.message);
    }
  }

  if (isDeleting) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Usuwanie budżetu...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Ładowanie ustawień budżetu...</p>
        </div>
      </div>
    );
  }

  if (error || !budget) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-3">
            Nie można załadować budżetu
          </h2>
          <p className="text-gray-400 mb-6">
            {error || "Budżet nie został znaleziony lub nie masz do niego dostępu."}
          </p>
          <button
            onClick={() => navigate("/", { replace: true })}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-lg shadow-blue-500/30"
          >
            Wróć do listy budżetów
          </button>
        </div>
      </div>
    );
  }

  const isOwner = budget.owner_id === session.user.id;

  return (
    <div className="space-y-6">

      {/* Podstawowe informacje */}
      <div className="bg-dark-surface border border-dark-border rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Podstawowe informacje</h2>
          </div>
          {isOwner && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edytuj
            </button>
          )}
        </div>

        {editMode ? (
          <form onSubmit={updateBudget} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Nazwa budżetu *
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Opis (opcjonalnie)
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows="3"
                className="w-full px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none transition-all"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-lg shadow-blue-500/30"
              >
                Zapisz
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setEditName(budget.name);
                  setEditDescription(budget.description || "");
                }}
                className="bg-dark-border text-white py-2.5 px-6 rounded-lg hover:bg-dark-hover transition-colors font-medium"
              >
                Anuluj
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400 mb-1">Nazwa</p>
              <p className="text-white font-medium">{budget.name}</p>
            </div>
            {budget.description && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Opis</p>
                <p className="text-white">{budget.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-400 mb-1">Utworzono</p>
              <p className="text-white">
                {new Date(budget.created_at).toLocaleDateString("pl-PL", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Udostępnianie - tylko dla właścicieli */}
      {isOwner && (
        <div className="bg-dark-surface border border-dark-border rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Udostępnianie</h2>
          </div>

          <form onSubmit={shareBudget} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email użytkownika
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="uzytkownik@example.com"
                  className="w-full px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Uprawnienia
                </label>
                <div className="relative">
                  <select
                    value={shareLevel}
                    onChange={(e) => setShareLevel(e.target.value)}
                    className="w-full px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all appearance-none cursor-pointer"
                  >
                    <option value="view">Podgląd</option>
                    <option value="edit">Edycja</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={sharing}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white py-2.5 px-6 rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-medium shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sharing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Udostępnianie...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Udostępnij
                </>
              )}
            </button>
          </form>

          {/* Lista udostępnień */}
          {shares.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                Udostępniono dla ({shares.length})
              </h3>
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-4 bg-dark-card border border-dark-border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {share.user_email}
                        </p>
                        <p className="text-xs text-gray-500">
                          Udostępniono{" "}
                          {new Date(share.created_at).toLocaleDateString("pl-PL")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => requestPermissionChange(share.id, share.access_level)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          share.access_level === "edit"
                            ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                            : "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
                        }`}
                      >
                        {share.access_level === "edit" ? "Edycja" : "Podgląd"}
                      </button>
                      <button
                        onClick={() => requestRemoveShare(share)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Cofnij dostęp"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Strefa niebezpieczna - tylko dla właścicieli */}
      {isOwner && (
        <div className="bg-dark-surface border border-red-500/30 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-400">Strefa niebezpieczna</h2>
              <p className="text-sm text-gray-400">Nieodwracalne operacje</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <h3 className="font-medium text-white mb-2">Usuń budżet</h3>
              <p className="text-sm text-gray-400 mb-4">
                Usunięcie budżetu jest nieodwracalne. Wszystkie wydatki, wpływy i
                udostępnienia zostaną trwale usunięte.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-500 text-white py-2.5 px-6 rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Usuń budżet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal potwierdzenia usunięcia budżetu */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface border border-red-500/30 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Potwierdź usunięcie</h2>
            </div>
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Ta operacja jest <strong className="text-red-400">nieodwracalna</strong>.
                Wszystkie dane zostaną trwale usunięte.
              </p>
              <p className="text-sm text-gray-400 mb-4">
                Wpisz nazwę budżetu <strong className="text-white">{budget.name}</strong> aby
                potwierdzić:
              </p>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={budget.name}
                className="w-full px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteBudget}
                disabled={deleteConfirmation !== budget.name}
                className="flex-1 bg-red-500 text-white py-2.5 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Usuń budżet
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                }}
                className="flex-1 bg-dark-border text-white py-2.5 px-4 rounded-lg hover:bg-dark-hover transition-colors font-medium"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal potwierdzenia usunięcia udostępnienia */}
      {showRemoveShareModal && shareToRemove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Cofnij dostęp</h2>
            </div>
            <p className="text-gray-300 mb-6">
              Czy na pewno chcesz cofnąć dostęp użytkownikowi{" "}
              <strong className="text-white">{shareToRemove.user_email}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmRemoveShare}
                className="flex-1 bg-red-500 text-white py-2.5 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                Cofnij dostęp
              </button>
              <button
                onClick={() => {
                  setShowRemoveShareModal(false);
                  setShareToRemove(null);
                }}
                className="flex-1 bg-dark-border text-white py-2.5 px-4 rounded-lg hover:bg-dark-hover transition-colors font-medium"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal zmiany uprawnień */}
      {showPermissionModal && changingPermission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Zmień uprawnienia</h2>
            </div>
            <p className="text-gray-300 mb-6">
              Zmienić uprawnienia z{" "}
              <strong className="text-white">
                {changingPermission.currentLevel === "view" ? "Podgląd" : "Edycja"}
              </strong>{" "}
              na{" "}
              <strong className="text-white">
                {changingPermission.newLevel === "view" ? "Podgląd" : "Edycja"}
              </strong>
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmPermissionChange}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-lg shadow-blue-500/30"
              >
                Zmień
              </button>
              <button
                onClick={() => {
                  setShowPermissionModal(false);
                  setChangingPermission(null);
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