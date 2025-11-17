interface RiskBadgeProps {
  score: number;
  severity?: "low" | "medium" | "high" | "critical" | null;
}

export function RiskBadge({ score, severity }: RiskBadgeProps) {
  const getSeverityStyles = (severity?: string | null) => {
    const styles: Record<string, string> = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    return severity ? styles[severity] || "bg-gray-100 text-gray-800" : "bg-gray-100 text-gray-800";
  };

  const getSeverityLabel = (score: number, severity?: string | null) => {
    if (severity) {
      return severity.charAt(0).toUpperCase() + severity.slice(1);
    }
    if (score >= 0.9) return "Critical";
    if (score >= 0.7) return "High";
    if (score >= 0.4) return "Medium";
    return "Low";
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityStyles(
          severity
        )}`}
      >
        {getSeverityLabel(score, severity)}
      </span>
      <span className="text-sm text-gray-600">Risk: {score.toFixed(1)}/10</span>
    </div>
  );
}
