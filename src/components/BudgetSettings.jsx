import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../hooks/useToast";

export default function BudgetSettings({ session, selectedBudget, onBudgetChange, onBudgetDeleted }) {
  const { budgetId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [budget, setBudget] = useState(null);
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMode, setEditMode] = useState(false);
  
  const [shareEmail, setShareEmail] = useState("");
  const [shareAccessLevel, setShareAccessLevel] = useState("view");
  const [shareLoading, setShareLoading] = useState(false);

  const [changingPermission, setChangingPermission] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  
  // ✅ NOWE: Modalne okna
  const [showDeleteBudgetModal, setShowDeleteBudgetModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showRemoveShareModal, setShowRemoveShareModal] = useState(false);
  const [shareToRemove, setShareToRemove] = useState(null);

  // Fetch shares
  async function fetchShares() {
    if (!budgetId) return;
    
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

  // Fetch budget data
  const fetchBudgetData = useCallback(async () => {
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

      const isOwner = budgetData.owner_id === session.user.id;
      let hasAccess = isOwner;

      if (!isOwner) {
        const { data: access } = await supabase
          .from("budget_access")
          .select("access_level")
          .eq("budget_id", budgetId)
          .eq("user_id", session.user.id)
          .single();

        hasAccess = !!access;
        
        if (!hasAccess) {
          throw new Error("Nie masz uprawnień do zarządzania tym budżetem");
        }
      }

      console.log("[BudgetSettings] Załadowano budżet:", budgetData);
      
      setBudget(budgetData);
      setEditName(budgetData.name);
      setEditDescription(budgetData.description || "");

      if (!selectedBudget || selectedBudget.id !== budgetData.id) {
        const budgetWithPermissions = {
          ...budgetData,
          is_owner: isOwner,
        };
        onBudgetChange(budgetWithPermissions);
      }

      await fetchShares();
    } catch (error) {
      console.error("Błąd pobierania danych budżetu:", error);
      setError(error.message);
      
      if (error.message.includes("znaleziony")) {
        toast.error("Nie znaleziono budżetu");
      } else if (error.message.includes("uprawnień")) {
        toast.error(error.message);
      } else if (error.message.includes("Nieprawidłowy")) {
        toast.error(error.message);
      } else {
        toast.error("Nie udało się załadować budżetu");
      }
      
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [budgetId, session?.user?.id, selectedBudget, onBudgetChange, navigate]);

  useEffect(() => {
    if (selectedBudget?.id && selectedBudget.id !== budgetId) {
      console.log("[BudgetSettings] Budżet zmieniony, przekierowanie do:", selectedBudget.id);
      navigate(`/budget/${selectedBudget.id}/settings`, { replace: true });
    }
  }, [selectedBudget?.id, budgetId, navigate]);

  useEffect(() => {
    if (budgetId && session?.user?.id) {
      fetchBudgetData();
    }
  }, [budgetId, session?.user?.id]);

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

  // ✅ NOWA FUNKCJA: Usuwanie budżetu z modalem
  async function handleDeleteBudget() {
    if (deleteConfirmText !== budget.name) {
      toast.warning("Nieprawidłowe potwierdzenie");
      return;
    }

    try {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budgetId)
        .eq("owner_id", session.user.id);

      if (error) throw error;

      if (onBudgetDeleted) {
        onBudgetDeleted(budgetId);
      }
      
      setShowDeleteBudgetModal(false);
      setDeleteConfirmText("");
      toast.success("Budżet został usunięty");
      navigate("/");
    } catch (error) {
      console.error("Błąd usuwania budżetu:", error);
      toast.error("Nie udało się usunąć budżetu: " + error.message);
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

    setShareLoading(true);
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
            access_level: shareAccessLevel,
          },
        ]);

      if (shareError) throw shareError;

      setShareEmail("");
      setShareAccessLevel("view");
      await fetchShares();
      toast.success(`Budżet został udostępniony użytkownikowi ${trimmedEmail}!`);
    } catch (error) {
      console.error("Błąd udostępniania budżetu:", error);
      toast.error("Nie udało się udostępnić budżetu: " + error.message);
    } finally {
      setShareLoading(false);
    }
  }

  // ✅ NOWA FUNKCJA: Usuwanie udostępnienia z modalem
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
    <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto px-2 sm:px-0">
      {/* Nagłówek */}
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={() => navigate("/")}
          className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl md:text-2xl font-bold">Ustawienia budżetu</h1>
      </div>

      {/* Karta budżetu */}
      <div className="bg-dark-surface rounded-lg p-4 md:p-6 border border-dark-border">
        {!editMode ? (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 md:gap-4 mb-4">
              <div className="min-w-0">
                <h2 className="text-lg md:text-xl font-bold mb-2 break-words">{budget.name}</h2>
                {budget.description && (
                  <p className="text-sm md:text-base text-gray-400 break-words">{budget.description}</p>
                )}
              </div>
              {budget.owner_id === session.user.id && (
                <button
                  onClick={() => setEditMode(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm md:text-base whitespace-nowrap"
                >
                  Edytuj
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={updateBudget} className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Nazwa budżetu
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 md:px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500"
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
                className="w-full px-3 md:px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm md:text-base"
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
                className="flex-1 px-4 py-2 bg-dark-border hover:bg-dark-hover rounded-lg transition-colors text-sm md:text-base"
              >
                Anuluj
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Udostępnianie */}
      {budget.owner_id === session.user.id && (
        <>
          <div className="bg-dark-surface rounded-lg p-4 md:p-6 border border-dark-border">
            <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">Udostępnij budżet</h3>
            <form onSubmit={shareBudget} className="space-y-3 md:space-y-4">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                <div className="flex-1">
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="Adres email użytkownika"
                    className="w-full px-3 md:px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white text-sm md:text-base focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div className="w-full md:w-auto">
                  <select
                    value={shareAccessLevel}
                    onChange={(e) => setShareAccessLevel(e.target.value)}
                    className="w-full px-3 md:px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white text-sm md:text-base focus:outline-none focus:border-blue-500"
                  >
                    <option value="view">Widok</option>
                    <option value="edit">Edycja</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={shareLoading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 text-sm md:text-base"
              >
                {shareLoading ? "Udostępnianie..." : "Udostępnij"}
              </button>
            </form>
          </div>

          {/* Lista udostępnień */}
          {shares.length > 0 && (
            <div className="bg-dark-surface rounded-lg p-4 md:p-6 border border-dark-border">
              <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">Udostępniono dla:</h3>
              <div className="space-y-2 md:space-y-3">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 bg-dark-card rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm md:text-base break-words">{share.user_email}</p>
                      <p className="text-xs md:text-sm text-gray-400">
                        Poziom dostępu: {share.access_level === "edit" ? "Edycja" : "Widok"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => requestPermissionChange(share.id, share.access_level)}
                        className="flex-1 sm:flex-none px-3 py-1.5 text-xs md:text-sm bg-blue-600 hover:bg-blue-700 rounded transition-colors whitespace-nowrap"
                      >
                        Zmień uprawnienia
                      </button>
                      <button
                        onClick={() => requestRemoveShare(share)}
                        className="flex-1 sm:flex-none px-3 py-1.5 text-xs md:text-sm bg-red-600 hover:bg-red-700 rounded transition-colors"
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Usuwanie budżetu */}
      {budget.owner_id === session.user.id && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-red-400 mb-2">Strefa niebezpieczna</h3>
          <p className="text-sm md:text-base text-gray-400 mb-4">
            Usuń ten budżet permanentnie. Tej operacji nie można cofnąć.
          </p>
          <button
            onClick={() => setShowDeleteBudgetModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm md:text-base"
          >
            Usuń budżet
          </button>
        </div>
      )}

      {/* ✅ MODAL: Usuwanie budżetu */}
      {showDeleteBudgetModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface border-2 border-red-500/50 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Usuń budżet</h3>
                <p className="text-sm text-gray-400">Ta operacja jest nieodwracalna</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Czy na pewno chcesz usunąć budżet <span className="font-bold text-white">"{budget.name}"</span>?
              </p>
              <p className="text-sm text-gray-400 mb-4">
                Wszystkie wydatki, wpływy i udostępnienia zostaną trwale usunięte.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Wpisz nazwę budżetu aby potwierdzić: <span className="text-white font-bold">{budget.name}</span>
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={budget.name}
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteBudget}
                disabled={deleteConfirmText !== budget.name}
                className="flex-1 bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Usuń budżet
              </button>
              <button
                onClick={() => {
                  setShowDeleteBudgetModal(false);
                  setDeleteConfirmText("");
                }}
                className="flex-1 bg-dark-border text-white py-2.5 px-4 rounded-lg hover:bg-dark-hover transition-colors font-medium"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL: Usuwanie udostępnienia */}
      {showRemoveShareModal && shareToRemove && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Cofnij dostęp</h3>
                <p className="text-sm text-gray-400">Potwierdzenie wymagane</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Czy na pewno chcesz cofnąć dostęp dla użytkownika{" "}
              <span className="font-bold text-white">{shareToRemove.user_email}</span>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={confirmRemoveShare}
                className="flex-1 bg-orange-600 text-white py-2.5 px-4 rounded-lg hover:bg-orange-700 transition-colors font-medium"
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

      {/* MODAL: Zmiana uprawnień (pozostaje bez zmian) */}
      {showPermissionModal && changingPermission && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Zmień uprawnienia</h3>
                <p className="text-sm text-gray-400">Potwierdzenie wymagane</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Czy na pewno chcesz zmienić uprawnienia z{" "}
              <span className="text-white font-bold">
                {changingPermission.currentLevel === "edit" ? "Edycja" : "Widok"}
              </span>{" "}
              na{" "}
              <span className="text-white font-bold">
                {changingPermission.newLevel === "edit" ? "Edycja" : "Widok"}
              </span>
              ?
            </p>

            <div className="flex gap-3">
              <button
                onClick={confirmPermissionChange}
                className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Potwierdź
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