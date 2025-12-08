import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "./LoadingSpinner"; // ✅ DODAJ
import { useToast } from "../contexts/ToastContext";

export default function Dashboard({ session, budget }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalIncome: 0,
    balance: 0,
    expensesCount: 0,
    incomeCount: 0,
  });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [recentIncome, setRecentIncome] = useState([]);
  const [loading, setLoading] = useState(true); // ✅ DODAJ

  useEffect(() => {
    if (budget?.id) {
      fetchDashboardData();
    } else {
      setStats({
        totalExpenses: 0,
        totalIncome: 0,
        balance: 0,
        expensesCount: 0,
        incomeCount: 0,
      });
      setRecentExpenses([]);
      setRecentIncome([]);
      setLoading(false);
    }
  }, [budget?.id]);

  async function fetchDashboardData() {
    if (!budget?.id) return;

    try {
      setLoading(true); // ✅ DODAJ

      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("amount, date, category, description")
        .eq("budget_id", budget.id)
        .order("date", { ascending: false })
        .limit(5);

      if (expensesError) throw expensesError;

      const { data: incomeData, error: incomeError } = await supabase
        .from("income")
        .select("amount, date, source, description")
        .eq("budget_id", budget.id)
        .order("date", { ascending: false })
        .limit(5);

      if (incomeError) throw incomeError;

      const { data: allExpenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("budget_id", budget.id);

      const { data: allIncome } = await supabase
        .from("income")
        .select("amount")
        .eq("budget_id", budget.id);

      const totalExpenses =
        allExpenses?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) || 0;
      const totalIncome =
        allIncome?.reduce((sum, inc) => sum + parseFloat(inc.amount), 0) || 0;

      setStats({
        totalExpenses,
        totalIncome,
        balance: totalIncome - totalExpenses,
        expensesCount: allExpenses?.length || 0,
        incomeCount: allIncome?.length || 0,
      });

      setRecentExpenses(expensesData || []);
      setRecentIncome(incomeData || []);
    } catch (error) {
      console.error("Błąd pobierania danych dashboard:", error);
    } finally {
      setLoading(false); // ✅ DODAJ
    }
  }

  if (!budget) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/30">
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H7a2 2 0 00-2 2v2M7 7h10"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Brak wybranego budżetu
          </h2>
          <p className="text-gray-400 mb-6">
            Wybierz budżet z menu powyżej lub utwórz nowy, aby rozpocząć
            zarządzanie finansami.
          </p>
        </div>
      </div>
    );
  }

  // ✅ DODAJ: Loading state
  if (loading) {
    return <LoadingScreen message="Ładowanie dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <svg
            className="w-7 h-7 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm">{budget.name}</p>
        </div>
      </div>

      {/* Karty statystyk */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bilans */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-400"
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
          <p className="text-sm text-gray-400 mb-2">Bilans</p>
          <p
            className={`text-3xl font-bold ${
              stats.balance >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {stats.balance.toFixed(2)} zł
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {stats.balance >= 0 ? "Nadwyżka" : "Niedobór"}
          </p>
        </div>

        {/* Wpływy */}
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 11l5-5m0 0l5 5m-5-5v12"
                />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-2">Wpływy</p>
          <p className="text-3xl font-bold text-green-400">
            {stats.totalIncome.toFixed(2)} zł
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {stats.incomeCount} {stats.incomeCount === 1 ? "wpis" : "wpisów"}
          </p>
        </div>

        {/* Wydatki */}
        <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/30 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 13l-5 5m0 0l-5-5m5 5V6"
                />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-2">Wydatki</p>
          <p className="text-3xl font-bold text-red-400">
            {stats.totalExpenses.toFixed(2)} zł
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {stats.expensesCount}{" "}
            {stats.expensesCount === 1 ? "wpis" : "wpisów"}
          </p>
        </div>
      </div>

      {/* Ostatnie transakcje */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ostatnie wydatki */}
        <div className="bg-dark-surface border border-dark-border rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-400"
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
              <h2 className="text-xl font-bold text-white">Ostatnie wydatki</h2>
            </div>
            <button
              onClick={() => navigate("/expenses")}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              Zobacz wszystkie
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
          {recentExpenses.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-16 h-16 mx-auto mb-3 text-gray-600"
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
              <p className="text-gray-400 text-sm">Brak wydatków</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentExpenses.map((expense, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-dark-card border border-dark-border rounded-lg hover:border-red-500/30 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {expense.description || expense.category}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {new Date(expense.date).toLocaleDateString("pl-PL")}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-dark-border rounded-full text-gray-400">
                        {expense.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-red-400 ml-4">
                    -{parseFloat(expense.amount).toFixed(2)} zł
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ostatnie wpływy */}
        <div className="bg-dark-surface border border-dark-border rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-400"
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
              <h2 className="text-xl font-bold text-white">Ostatnie wpływy</h2>
            </div>
            <button
              onClick={() => navigate("/income")}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              Zobacz wszystkie
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
          {recentIncome.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-16 h-16 mx-auto mb-3 text-gray-600"
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
              <p className="text-gray-400 text-sm">Brak wpływów</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentIncome.map((income, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-dark-card border border-dark-border rounded-lg hover:border-green-500/30 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {income.description || income.source}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {new Date(income.date).toLocaleDateString("pl-PL")}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-dark-border rounded-full text-gray-400">
                        {income.source}
                      </span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-400 ml-4">
                    +{parseFloat(income.amount).toFixed(2)} zł
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
