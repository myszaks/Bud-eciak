import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useToast } from "../hooks/useToast"; // ✅ DODAJ

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
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-300 text-sm">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard({ session, budget }) {
  const toast = useToast(); // ✅ DODAJ
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [tooltipData, setTooltipData] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const chartRef = useRef(null);

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

      const [expensesResponse, incomeResponse] = await Promise.all([
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
      ]);

      if (expensesResponse.error) throw expensesResponse.error;
      if (incomeResponse.error) throw incomeResponse.error;

      setExpenses(expensesResponse.data || []);
      setIncome(incomeResponse.data || []);
    } catch (error) {
      console.error("Błąd pobierania danych:", error);
      toast.error("Nie udało się załadować danych");
    } finally {
      setLoading(false);
    }
  }, [budget?.id, selectedMonth]);

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

    return { totalExpenses, totalIncome, balance };
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

  const handleMouseMove = useCallback(
    (e) => {
      if (tooltipData) {
        setMousePosition({ x: e.clientX, y: e.clientY });
      }
    },
    [tooltipData]
  );

  const handlePieMouseEnter = useCallback((data) => {
    setTooltipData(data);
  }, []);

  const handlePieMouseLeave = useCallback(() => {
    setTooltipData(null);
  }, []);

  const handleChartMouseLeave = useCallback(() => {
    setTooltipData(null);
  }, []);

  if (!budget) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2 className="text-xl font-medium text-gray-400 mb-2">
            Wybierz budżet
          </h2>
          <p className="text-gray-500">
            Wybierz budżet z listy aby zobaczyć dashboard
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Ładowanie danych...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Filtr miesiąca */}
      <div className="bg-dark-surface p-3 md:p-4 rounded-lg shadow-xl border border-dark-border">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Wybierz miesiąc
        </label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full px-3 md:px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm md:text-base"
        />
      </div>

      {/* Statystyki - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {/* Karta Wpływy */}
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 p-4 md:p-6 rounded-lg shadow-xl border border-green-500/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs md:text-sm font-medium text-green-400">
              Wpływy
            </h3>
            <svg
              className="w-6 h-6 md:w-8 md:h-8 text-green-400"
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
          <p className="text-xl md:text-3xl font-bold text-white break-words">
            {stats.totalIncome.toFixed(2)} zł
          </p>
        </div>

        {/* Karta Wydatki */}
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 p-4 md:p-6 rounded-lg shadow-xl border border-red-500/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs md:text-sm font-medium text-red-400">
              Wydatki
            </h3>
            <svg
              className="w-6 h-6 md:w-8 md:h-8 text-red-400"
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
          <p className="text-xl md:text-3xl font-bold text-white break-words">
            {stats.totalExpenses.toFixed(2)} zł
          </p>
        </div>

        {/* Karta Bilans */}
        <div
          className={`bg-gradient-to-br ${
            stats.balance >= 0
              ? "from-blue-500/20 to-blue-600/10 border-blue-500/30"
              : "from-orange-500/20 to-orange-600/10 border-orange-500/30"
          } p-4 md:p-6 rounded-lg shadow-xl border sm:col-span-2 lg:col-span-1`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3
              className={`text-xs md:text-sm font-medium ${
                stats.balance >= 0 ? "text-blue-400" : "text-orange-400"
              }`}
            >
              Bilans
            </h3>
            <svg
              className={`w-6 h-6 md:w-8 md:h-8 ${
                stats.balance >= 0 ? "text-blue-400" : "text-orange-400"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-xl md:text-3xl font-bold text-white break-words">
            {stats.balance.toFixed(2)} zł
          </p>
        </div>
      </div>

      {/* Porównanie - BEZ TOOLTIP */}
      {comparisonData.length > 0 && (
        <div className="bg-dark-surface p-3 md:p-6 rounded-lg shadow-xl border border-dark-border">
          <h3 className="text-base md:text-lg font-medium text-white mb-4 md:mb-6">
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

      {/* Kategorie - Z Custom Tooltip */}
      {categoryData.length > 0 && (
        <div
          ref={chartRef}
          className="bg-dark-surface p-3 md:p-6 rounded-lg shadow-xl border border-dark-border"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleChartMouseLeave}
        >
          <h3 className="text-base md:text-lg font-medium text-white mb-4 md:mb-6">
            Wydatki według kategorii
          </h3>

          {/* Mobile Chart */}
          <div className="md:hidden">
            <ResponsiveContainer width="100%" height={250}>
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
                  onMouseEnter={(data, index) => setTooltipData(categoryData[index])}
                  onMouseLeave={() => setTooltipData(null)}
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
                <Legend content={<CustomLegend />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Desktop Chart */}
          <div className="hidden md:block">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="45%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                  onMouseEnter={handlePieMouseEnter}
                  onMouseLeave={handlePieMouseLeave}
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
                <Legend content={<CustomLegend />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Tooltip - tylko desktop */}
          {tooltipData && (
            <div
              className="fixed bg-dark-surface border border-dark-border rounded-lg p-3 shadow-xl pointer-events-none hidden md:block"
              style={{
                left: `${mousePosition.x + 15}px`,
                top: `${mousePosition.y - 10}px`,
                zIndex: 9999,
                transform: "translateY(-50%)",
              }}
            >
              <p className="text-white font-medium mb-1">{tooltipData.name}</p>
              <p className="text-gray-300">
                {tooltipData.value.toFixed(2)} zł
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {(tooltipData.percent * 100).toFixed(1)}% całości
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
