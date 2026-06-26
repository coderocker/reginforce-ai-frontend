import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ossService } from "../../services/ossService";
import { useAuth } from "../../providers";
import { ModuleHelpPanel } from "../../components/oss/ModuleHelpPanel";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { DECISION_QUEUE_HELP } from "../../constants/ossModuleHelp";
import {
  COMPLIANCE_STATUS_COLORS,
  COMPLIANCE_STATUS_LABELS,
  type SbomComponent,
  type DecisionEvent,
} from "../../types/oss";

export function DecisionQueue() {
  const queryClient = useQueryClient();
  const { authState } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const { data: queue, isLoading } = useQuery({
    queryKey: ["decision-queue"],
    queryFn: () => ossService.getDecisionQueue(),
  });

  const { data: history } = useQuery({
    queryKey: ["decision-history", selectedId],
    queryFn: () => ossService.getDecisionHistory(selectedId!),
    enabled: !!selectedId,
  });

  const actionMutation = useMutation({
    mutationFn: ({
      componentId,
      action,
    }: {
      componentId: number;
      action: "approved" | "rejected" | "deferred" | "commented";
    }) => ossService.decisionAction(componentId, action, comment || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decision-queue"] });
      queryClient.invalidateQueries({ queryKey: ["decision-history", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["oss-components"] });
      setComment("");
    },
  });

  const assignMutation = useMutation({
    mutationFn: (componentId: number) =>
      ossService.assignDecision(componentId, authState.user!.id, comment || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decision-history", selectedId] });
      setComment("");
    },
  });

  const items = queue?.items || [];
  const selected = items.find((c) => c.id === selectedId);

  return (
    <>
      <header className="border-b border-[#f1f2f3] px-10 py-3">
        <h2 className="text-lg font-bold text-[#131416]">Compliance Decision Workflow</h2>
        <p className="text-sm text-gray-500">Human-in-the-loop review for legal and security decisions</p>
      </header>

      <div className="p-6 flex flex-col gap-6">
        <ModuleHelpPanel
          title="About Compliance Decision Workflow"
          summary={DECISION_QUEUE_HELP.summary}
          steps={DECISION_QUEUE_HELP.steps}
          bullets={DECISION_QUEUE_HELP.bullets}
          legend={DECISION_QUEUE_HELP.legend}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Review queue ({items.length})</h3>
          {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
          {!isLoading && items.length === 0 && (
            <p className="text-sm text-gray-500">No packages awaiting review.</p>
          )}
          <ul className="space-y-2 max-h-[480px] overflow-y-auto">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedId === item.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <ComponentRow item={item} />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4 space-y-4">
          {selected ? (
            <>
              <h3 className="font-semibold">{selected.package_name}@{selected.package_version}</h3>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Review notes or rationale…"
                className="w-full border rounded-lg p-2 text-sm min-h-[80px]"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => actionMutation.mutate({ componentId: selected.id, action: "approved" })}
                  disabled={actionMutation.isPending}
                >
                  Approve
                </Button>
                <Button
                  variant="primary"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => actionMutation.mutate({ componentId: selected.id, action: "rejected" })}
                  disabled={actionMutation.isPending}
                >
                  Reject
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => actionMutation.mutate({ componentId: selected.id, action: "deferred" })}
                  disabled={actionMutation.isPending}
                >
                  Defer to legal
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => assignMutation.mutate(selected.id)}
                  disabled={assignMutation.isPending || !authState.user?.id}
                >
                  Assign to me
                </Button>
              </div>
              <HistoryList events={history || []} />
            </>
          ) : (
            <p className="text-sm text-gray-500">Select a package to review.</p>
          )}
        </Card>
        </div>
      </div>
    </>
  );
}

function ComponentRow({ item }: { item: SbomComponent }) {
  const colors = COMPLIANCE_STATUS_COLORS[item.status];
  return (
    <div className="flex justify-between items-start gap-2">
      <div>
        <div className="font-medium text-sm">{item.package_name}</div>
        <div className="text-xs text-gray-500">{item.package_version} · {item.license_spdx}</div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
        {COMPLIANCE_STATUS_LABELS[item.status]}
      </span>
    </div>
  );
}

function HistoryList({ events }: { events: DecisionEvent[] }) {
  if (!events.length) return null;
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Audit trail</h4>
      <ul className="space-y-2 text-xs text-gray-600 max-h-40 overflow-y-auto">
        {events.map((e) => (
          <li key={e.id} className="border-l-2 border-gray-200 pl-2">
            <span className="font-medium capitalize">{e.action}</span>
            {e.previous_status && e.new_status && e.previous_status !== e.new_status && (
              <span> · {e.previous_status} → {e.new_status}</span>
            )}
            {e.comment && <p className="italic">{e.comment}</p>}
            <p className="text-gray-400">{new Date(e.created_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
