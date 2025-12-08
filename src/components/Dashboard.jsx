import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { LoadingScreen } from "./LoadingSpinner";
import { useToast } from "../contexts/ToastContext";

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#84CC16",
];

const CustomLegend = ({ payload }) => {
  return (
    <div className="mt-6 space-y-2 max-h-48 overflow-y-auto pr-2">
      {payload.map((entry, index) => (
        <div
          key={`legend-${index}`}
          className="flex items-center justify-between gap-3 p-2 bg-dark-card/50 rounded-lg hover:bg-dark-card transition-colors"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-300 text-sm truncate">
              {entry.value}
            </span>
          </div>
          <span className="text-gray-400 text-xs font-medium flex-shrink-0">
            {entry.payload.percent
              ? `${(entry.payload.percent * 100).toFixed(1)}%`
              : "0%"}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard({ session, budget }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [recentIncome, setRecentIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const fetchData = useCallback(async () => {
    if (!budget?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const startOfMonth = `${selectedMonth}-01`;
      const endOfMonth = new Date(
        parseInt(selectedMonth.split("-")[0]),
        parseInt(selectedMonth.split("-")[1]),
        0
      )
        .toISOString()
        .split("T")[0];

      // Pobierz wszystkie dane z wybranego miesiąca
      const [expensesResponse, incomeResponse, recentExpensesResponse, recentIncomeResponse] = await Promise.all([
        supabase
          .from("expenses")
          .select("*")
          .eq("budget_id", budget.id)
          .gte("date", startOfMonth)
          .lte("date", endOfMonth)
          .order("date", { ascending: false }),
        supabase
          .from("income")
          .select("*")
          .eq("budget_id", budget.id)
          .gte("date", startOfMonth)
          .lte("date", endOfMonth)
          .order("date", { ascending: false }),
        supabase
          .from("expenses")
          .select("*")
          .eq("budget_id", budget.id)
          .order("date", { ascending: false })
          .limit(5),
        supabase
          .from("income")
          .select("*")
          .eq("budget_id", budget.id)
          .order("date", { ascending: false })
          .limit(5),
      ]);

      if (expensesResponse.error) throw expensesResponse.error;
      if (incomeResponse.error) throw incomeResponse.error;
      if (recentExpensesResponse.error) throw recentExpensesResponse.error;
      if (recentIncomeResponse.error) throw recentIncomeResponse.error;

      setExpenses(expensesResponse.data || []);
      setIncome(incomeResponse.data || []);
      setRecentExpenses(recentExpensesResponse.data || []);
      setRecentIncome(recentIncomeResponse.data || []);
    } catch (error) {
      console.error("Błąd pobierania danych:", error);
      toast.error("Nie udało się załadować danych dashboard");
    } finally {
      setLoading(false);
    }
  }, [budget?.id, selectedMonth, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + parseFloat(exp.amount),
      0
    );
    const totalIncome = income.reduce(
      (sum, inc) => sum + parseFloat(inc.amount),
      0
    );
    const balance = totalIncome - totalExpenses;

    return {
      totalExpenses,
      totalIncome,
      balance,
      expensesCount: expenses.length,
      incomeCount: income.length,
    };
  }, [expenses, income]);

  const categoryData = useMemo(() => {
    if (expenses.length === 0 || stats.totalExpenses === 0) return [];

    const categoryMap = {};

    expenses.forEach((expense) => {
      const category = expense.category || "Inne";
      if (!categoryMap[category]) {
        categoryMap[category] = 0;
      }
      categoryMap[category] += parseFloat(expense.amount);
    });

    return Object.entries(categoryMap)
      .map(([name, value]) => ({
        name,
        value,
        percent: value / stats.totalExpenses,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, stats.totalExpenses]);

  const comparisonData = useMemo(() => {
    return [
      { name: "Wpływy", value: stats.totalIncome, fill: "#10B981" },
      { name: "Wydatki", value: stats.totalExpenses, fill: "#EF4444" },
      {
        name: "Bilans",
        value: Math.abs(stats.balance),
        fill: stats.balance >= 0 ? "#3B82F6" : "#F59E0B",
      },
    ];
  }, [stats]);

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

  if (loading) {
    return <LoadingScreen message="Ładowanie dashboard..." />;
  }

  return (
    <div className="space-y-6">      

      {/* Filtr miesiąca */}
      <div className="bg-dark-surface rounded-lg shadow-lg border border-dark-border/50 p-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Wybierz miesiąc do analizy
        </label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
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

      {/* Wykresy */}
      {(comparisonData.length > 0 || categoryData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Porównanie wpływów i wydatków */}
          {comparisonData.length > 0 && (
            <div className="bg-dark-surface rounded-lg shadow-lg border border-dark-border/50 p-6">
              <h3 className="text-lg font-bold text-white mb-6">
                Porównanie wpływów i wydatków
              </h3>

              {/* Mobile Chart */}
              <div className="md:hidden">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={comparisonData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#404040"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="#9CA3AF"
                      style={{ fontSize: "10px" }}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      style={{ fontSize: "10px" }}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                      {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Desktop Chart */}
              <div className="hidden md:block">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={comparisonData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#404040"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="#9CA3AF"
                      style={{ fontSize: "14px", fontWeight: 500 }}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      style={{ fontSize: "12px" }}
                      tickFormatter={(value) => `${value} zł`}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={80}>
                      {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Wydatki według kategorii */}
          {categoryData.length > 0 && (
            <div className="bg-dark-surface rounded-lg shadow-lg border border-dark-border/50 p-6">
              <h3 className="text-lg font-bold text-white mb-6">
                Wydatki według kategorii
              </h3>

              {/* Mobile Chart - bez labeli */}
              <div className="md:hidden">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="#1E1E1E"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend dla mobile */}
                <CustomLegend
                  payload={categoryData.map((entry, index) => ({
                    value: entry.name,
                    color: COLORS[index % COLORS.length],
                    payload: entry,
                  }))}
                />
              </div>

              {/* Desktop Chart - z labelami */}
              <div className="hidden md:block">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        percent > 0.05
                          ? `${name}: ${(percent * 100).toFixed(0)}%`
                          : ""
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={500}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="#1E1E1E"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend dla desktop */}
                <CustomLegend
                  payload={categoryData.map((entry, index) => ({
                    value: entry.name,
                    color: COLORS[index % COLORS.length],
                    payload: entry,
                  }))}
                />
              </div>
            </div>
          )}
        </div>
      )}

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
                      {expense.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {new Date(expense.date).toLocaleDateString("pl-PL")}
                      </span>
                      {expense.category && (
                        <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                          {expense.category}
                        </span>
                      )}
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
              {recentIncome.map((inc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-dark-card border border-dark-border rounded-lg hover:border-green-500/30 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {inc.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {new Date(inc.date).toLocaleDateString("pl-PL")}
                      </span>
                      {inc.category && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                          {inc.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-400 ml-4">
                    +{parseFloat(inc.amount).toFixed(2)} zł
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
