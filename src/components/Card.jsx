export function Card({ title, value, subtitle, valueColor = "text-textMain" }) {
  return (
    <div className="bg-white border border-borderSoft rounded-card shadow-card p-6">
      <p className="text-sm text-textMuted">{title}</p>

      <p className={`mt-2 text-2xl font-semibold ${valueColor}`}>
        {value}
      </p>

      {subtitle && (
        <p className="mt-1 text-sm text-textMuted">
          {subtitle}
        </p>
      )}
    </div>
  );
}
