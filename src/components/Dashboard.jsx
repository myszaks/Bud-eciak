import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from "recharts";

const COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16"
];

// Niestandardowy tooltip dla wykresów
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-surface border border-dark-border rounded-lg p-3 shadow-xl">
        <p className="text-white font-medium mb-1">{label || payload[0].name}</p>
        <p className="text-gray-300">
          {payload[0].value.toFixed(2)} zł
        </p>
      </div>
    );
  }
  return null;
};

// Niestandardowa legenda
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
  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalIncome: 0,
    expenseCount: 0,
    incomeCount: 0,
  });
  const [categoryData, setCategoryData] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // DODAJ: Memoizację danych wykresów
  const chartData = useMemo(() => {
    return {
      categoryData,
      comparisonData,
    };
  }, [categoryData, comparisonData]);

  // DODAJ: Optymalizację filtrów
  const dateFilter = useMemo(() => {
    if (filterType === "month") {
      const [year, month] = selectedMonth.split("-");
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);
      return {
        start: startOfMonth.toISOString().split("T")[0],
        end: endOfMonth.toISOString().split("T")[0],
      };
    }
    return { start: startDate, end: endDate };
  }, [filterType, selectedMonth, startDate, endDate]);

  useEffect(() => {
    if (budget && dateFilter.start && dateFilter.end) {
      fetchStats();
    }
  }, [budget, dateFilter]);

  useEffect(() => {
    if (budget) {
      fetchStats();
    }
  }, [session, budget, filterType, selectedMonth, startDate, endDate]);

  async function fetchStats() {
    try {
      setLoading(true);

      let dateFilter = {};
      if (filterType === "month") {
        const [year, month] = selectedMonth.split("-");
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0);
        dateFilter = {
          start: startOfMonth.toISOString().split("T")[0],
          end: endOfMonth.toISOString().split("T")[0],
        };
      } else {
        if (!startDate || !endDate) {
          setStats({
            totalExpenses: 0,
            totalIncome: 0,
            expenseCount: 0,
            incomeCount: 0,
          });
          setCategoryData([]);
          setComparisonData([]);
          setLoading(false);
          return;
        }
        dateFilter = { start: startDate, end: endDate };
      }

      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("amount, date, category")
        .eq("budget_id", budget.id)
        .gte("date", dateFilter.start)
        .lte("date", dateFilter.end);

      if (expensesError) throw expensesError;

      const { data: incomeData, error: incomeError } = await supabase
        .from("income")
        .select("amount, date, type")
        .eq("budget_id", budget.id)
        .gte("date", dateFilter.start)
        .lte("date", dateFilter.end);

      if (incomeError) throw incomeError;

      const totalExpenses = expensesData.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
      const totalIncome = incomeData.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);

      const categoryMap = {};
      expensesData.forEach((exp) => {
        const cat = exp.category || "Bez kategorii";
        if (!categoryMap[cat]) {
          categoryMap[cat] = 0;
        }
        categoryMap[cat] += parseFloat(exp.amount);
      });

      const chartData = Object.entries(categoryMap)
        .map(([name, value]) => ({
          name,
          value: parseFloat(value.toFixed(2)),
        }))
        .sort((a, b) => b.value - a.value); // Sortuj malejąco

      const comparison = [
        { name: "Wpływy", value: totalIncome, fill: "#10B981" },
        { name: "Wydatki", value: totalExpenses, fill: "#EF4444" },
      ];

      setStats({
        totalExpenses,
        totalIncome,
        expenseCount: expensesData.length,
        incomeCount: incomeData.length,
      });
      setCategoryData(chartData);
      setComparisonData(comparison);
    } catch (error) {
      console.error("Błąd pobierania statystyk:", error);
      alert("Wystąpił błąd podczas pobierania danych. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  if (!budget) {
    return (
      <div className="text-center py-8 text-gray-400">
        Wybierz budżet, aby zobaczyć statystyki
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400 text-lg">Ładowanie...</div>
      </div>
    );
  }

  const balance = stats.totalIncome - stats.totalExpenses;

  return (
    <div className="space-y-6">
      {/* Powitanie */}
      {/*<div className="bg-dark-surface p-6 rounded-lg shadow-xl border border-dark-border">
        <h3 className="text-xl font-light text-white mb-2">
          {budget.name} 
          {budget.is_shared && (
            <span className="ml-2 text-sm text-gray-400">
              ({budget.access_level === 'view' ? 'widok' : 'edycja'})
            </span>
          )}
        </h3>
        {budget.description && (
          <p className="text-gray-400">{budget.description}</p>
        )}
      </div>*/}

      {/* Filtry */}
      /
      <div className="bg-dark-surface p-6 rounded-lg shadow-xl border border-dark-border">
        <h3 className="text-lg font-medium text-white mb-4">Zakres czasowy</h3>
        <div className="space-y-4">
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="month"
                checked={filterType === "month"}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-4 h-4 text-blue-600 bg-dark-card border-dark-border focus:ring-blue-500"
              />
              <span className="text-gray-300">Wybrany miesiąc</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="range"
                checked={filterType === "range"}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-4 h-4 text-blue-600 bg-dark-card border-dark-border focus:ring-blue-500"
              />
              <span className="text-gray-300">Przedział dat</span>
            </label>
          </div>

          {filterType === "month" ? (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Miesiąc
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 bg-dark-card border border-dark-border rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Data od
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || undefined}
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Data do
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-dark-surface p-6 rounded-lg shadow-xl border border-dark-border">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Wpływy</h3>
          <p className="text-3xl font-light text-green-400">
            +{stats.totalIncome.toFixed(2)} zł
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Transakcji: {stats.incomeCount}
          </p>
        </div>

        <div className="bg-dark-surface p-6 rounded-lg shadow-xl border border-dark-border">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Wydatki</h3>
          <p className="text-3xl font-light text-red-400">
            -{stats.totalExpenses.toFixed(2)} zł
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Transakcji: {stats.expenseCount}
          </p>
        </div>

        <div className="bg-dark-surface p-6 rounded-lg shadow-xl border border-dark-border">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Bilans</h3>
          <p className={`text-3xl font-light ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
            {balance >= 0 ? "+" : ""}{balance.toFixed(2)} zł
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {balance >= 0 ? "Nadwyżka" : "Deficyt"}
          </p>
        </div>

        <div className="bg-dark-surface p-6 rounded-lg shadow-xl border border-dark-border">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Oszczędności</h3>
          <p className="text-3xl font-light text-blue-400">
            {stats.totalIncome > 0 ? ((balance / stats.totalIncome) * 100).toFixed(1) : 0}%
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Procent wpływów
          </p>
        </div>
      </div>

      {/* Porównanie wpływów i wydatków */}
      {comparisonData.length > 0 && (
        <div className="bg-dark-surface p-6 rounded-lg shadow-xl border border-dark-border">
          <h3 className="text-lg font-medium text-white mb-6">
            Porównanie wpływów i wydatków
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart 
              data={comparisonData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#404040" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF"
                style={{ fontSize: '14px', fontWeight: 500 }}
              />
              <YAxis 
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `${value} zł`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#383838' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={80}>
                {comparisonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Wydatki według kategorii */}
      {categoryData.length > 0 && (
        <div className="bg-dark-surface p-6 rounded-lg shadow-xl border border-dark-border">
          <h3 className="text-lg font-medium text-white mb-6">
            Wydatki według kategorii
          </h3>
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
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}