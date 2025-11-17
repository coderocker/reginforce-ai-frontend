import type { ProcessingStatus, RemediationStatus } from "../../types/api";

interface StatusPillProps {
  status: ProcessingStatus | RemediationStatus | string;
}

export function StatusPill({ status }: StatusPillProps) {
  const getStatusStyles = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      processed: "bg-green-100 text-green-800",
      error: "bg-red-100 text-red-800",
      draft: "bg-gray-100 text-gray-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      blocked: "bg-red-100 text-red-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(
        status
      )}`}
    >
      {formatStatus(status)}
    </span>
  );
}
