import React from "react";
import { Card } from "@mui/material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

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
      <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{formatPLN(val)}</div>
    </div>
  );
}

export default function MuiBarChart({ data = [], dataKey = "value", categoryKey = "name", height = 300, colors = [] }) {
  const barSize = height > 300 ? 80 : 60;

  return (
    <Card className="p-4" elevation={0} style={{ boxShadow: "none", border: "none" }}>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey={categoryKey} stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(15,23,42,0.04)" }} />
            <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} barSize={barSize}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill || colors[index % colors.length] || "#3B82F6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
