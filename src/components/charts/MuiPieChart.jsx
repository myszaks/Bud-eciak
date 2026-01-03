import React, { useMemo } from "react";
import Card from "../ui/Card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

function formatPLN(value) {
  try {
    return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(Number(value) || 0);
  } catch (e) {
    return `${value} zł`;
  }
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0].value;
  const label = payload[0].name || (payload[0].payload && payload[0].payload.name) || "";
  return (
    <div style={{
      background: "#fff",
      padding: 12,
      borderRadius: 8,
      boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
      border: "1px solid rgba(15,23,42,0.06)",
      minWidth: 120,
      textAlign: "center",
    }}>
      {label ? (
        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>{label}</div>
      ) : null}
      <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{formatPLN(val)}</div>
    </div>
  );
}

export default function MuiPieChart({ data = [], dataKey = "value", nameKey = "name", height = 300, colors = [] }) {
  const total = useMemo(() => data.reduce((s, d) => s + (Number(d[dataKey]) || 0), 0), [data, dataKey]);

  return (
    <Card className="p-4" elevation={0} style={{ boxShadow: "none", border: "none" }}>
      <div className="flex flex-col md:flex-row items-center gap-4" style={{ width: "100%", height }}>
        <div style={{ flex: "0 1 60%", height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey={dataKey} nameKey={nameKey} outerRadius={Math.min(125, height / 2)} labelLine={false} label={false}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill || colors[index % colors.length] || "#3B82F6"} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(15,23,42,0.04)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex: "1 1 40%", maxHeight: height, overflowY: "auto" }}>
          {data.map((entry, index) => {
            const val = Number(entry[dataKey]) || 0;
            const percent = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
            return (
              <div key={`legend-${index}`} className="flex items-center justify-between gap-3 p-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.fill || colors[index % colors.length] }} />
                  <span className="text-sm">{entry[nameKey]}</span>
                </div>
                <div className="text-sm font-medium">{percent}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
