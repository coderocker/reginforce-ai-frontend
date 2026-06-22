import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ossService } from "../../services/ossService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import type { OssWatchAlert } from "../../types/oss";

export function OssWatch() {
  const queryClient = useQueryClient();

  const { data: summary } = useQuery({
    queryKey: ["oss-watch-summary"],
    queryFn: () => ossService.getOssWatchSummary(),
  });

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["oss-watch-alerts"],
    queryFn: () => ossService.getOssWatchAlerts(false),
  });

  const scanMutation = useMutation({
    mutationFn: () => ossService.runOssWatch(100),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oss-watch-summary"] });
      queryClient.invalidateQueries({ queryKey: ["oss-watch-alerts"] });
    },
  });

  const ackMutation = useMutation({
    mutationFn: (alertId: number) => ossService.acknowledgeWatchAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oss-watch-summary"] });
      queryClient.invalidateQueries({ queryKey: ["oss-watch-alerts"] });
    },
  });

  return (
    <>
      <header className="flex items-center justify-between border-b border-[#f1f2f3] px-10 py-3">
        <div>
          <h2 className="text-lg font-bold text-[#131416]">Continuous OSS Watch</h2>
          <p className="text-sm text-gray-500">Post-approval monitoring for new CVEs and risk degradation</p>
        </div>
        <Button
          variant="primary"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
        >
          {scanMutation.isPending ? "Scanning…" : "Run scan now"}
        </Button>
      </header>

      <div className="p-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard label="Open alerts" value={summary?.open_alerts ?? 0} accent="text-amber-700" />
          <SummaryCard label="Critical alerts" value={summary?.critical_alerts ?? 0} accent="text-red-700" />
          <SummaryCard label="Needs review" value={summary?.needs_review_estimate ?? 0} accent="text-blue-700" />
        </div>

        {scanMutation.data && (
          <p className="text-sm text-gray-600">
            Last scan: {scanMutation.data.scanned} packages checked, {scanMutation.data.alerts_created} new alert(s).
          </p>
        )}

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Active alerts</h3>
          {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
          {!isLoading && (!alerts || alerts.length === 0) && (
            <p className="text-sm text-gray-500">No open alerts. Run a scan to check approved packages.</p>
          )}
          <ul className="space-y-3">
            {(alerts || []).map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onAck={() => ackMutation.mutate(alert.id)}
                acking={ackMutation.isPending}
              />
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <Card className="p-4 text-center">
      <div className={`text-3xl font-bold ${accent}`}>{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </Card>
  );
}

function AlertRow({
  alert,
  onAck,
  acking,
}: {
  alert: OssWatchAlert;
  onAck: () => void;
  acking: boolean;
}) {
  const severityClass =
    alert.severity === "critical"
      ? "border-red-200 bg-red-50"
      : alert.severity === "high"
        ? "border-amber-200 bg-amber-50"
        : "border-gray-200 bg-gray-50";

  return (
    <li className={`p-3 rounded-lg border ${severityClass}`}>
      <div className="flex justify-between gap-3">
        <div>
          <div className="font-medium text-sm">
            {alert.package_name}@{alert.package_version}
          </div>
          <div className="text-xs text-gray-600 mt-1">{alert.message}</div>
          <div className="text-xs text-gray-400 mt-1">
            {alert.alert_type.replace(/_/g, " ")} · {new Date(alert.created_at).toLocaleString()}
            {alert.new_risk && ` · risk ${alert.new_risk}`}
          </div>
        </div>
        <Button variant="secondary" onClick={onAck} disabled={acking}>
          Acknowledge
        </Button>
      </div>
    </li>
  );
}
