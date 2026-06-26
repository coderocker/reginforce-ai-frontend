import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ossService } from "../../services/ossService";
import { useAuth } from "../../providers";
import { ModuleHelpPanel } from "../../components/oss/ModuleHelpPanel";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { RELEASE_GATE_HELP } from "../../constants/ossModuleHelp";
import {
  GATE_VERDICT_COLORS,
  type ReleaseGateEvaluation,
  type SbomDiff,
} from "../../types/oss";

export function ReleaseReadiness() {
  const { sbomId: sbomIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const sbomId = sbomIdParam ? parseInt(sbomIdParam, 10) : parseInt(searchParams.get("sbom") || "0", 10);
  const [baselineId, setBaselineId] = useState<number | "">("");
  const queryClient = useQueryClient();
  const { authState } = useAuth();

  const { data: sbom } = useQuery({
    queryKey: ["oss-sbom", sbomId],
    queryFn: () => ossService.getSbom(sbomId),
    enabled: sbomId > 0,
  });

  const { data: sbomList } = useQuery({
    queryKey: ["oss-sboms", sbom?.project_id],
    queryFn: () => ossService.listSboms({ project_id: sbom?.project_id }),
    enabled: !!sbom?.project_id,
  });

  const { data: gate, isLoading: gateLoading } = useQuery({
    queryKey: ["release-gate", sbomId],
    queryFn: () => ossService.getLatestGate(sbomId),
    enabled: sbomId > 0,
    retry: false,
  });

  const [diff, setDiff] = useState<SbomDiff | null>(null);

  const compareMutation = useMutation({
    mutationFn: () =>
      ossService.compareReleases(sbomId, Number(baselineId)),
    onSuccess: (result) => setDiff(result),
  });

  const gateMutation = useMutation({
    mutationFn: () =>
      ossService.runReleaseGate(
        sbomId,
        baselineId ? Number(baselineId) : undefined,
        false
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["release-gate", sbomId] });
    },
  });

  const peerSboms = (sbomList?.items || []).filter((s) => s.id !== sbomId);

  const evidenceJsonUrl = sbomId > 0 ? ossService.getEvidencePackJsonUrl(sbomId) : "";
  const evidenceHtmlUrl = sbomId > 0 ? ossService.getEvidencePackHtmlUrl(sbomId) : "";

  if (!sbomId) {
    return (
      <div className="p-8">
        <p>Select an SBOM from the <Link to="/oss/sboms" className="text-emerald-600 underline">SBOM list</Link>.</p>
      </div>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-[#f1f2f3] px-10 py-3">
        <div>
          <h2 className="text-lg font-bold text-[#131416]">Release Compliance Gate</h2>
          {sbom && (
            <p className="text-sm text-gray-500">
              {sbom.name} · {sbom.release_version} · SBOM #{sbom.id}
            </p>
          )}
        </div>
        <Link to="/oss/sboms">
          <Button variant="secondary">← SBOMs</Button>
        </Link>
      </header>

      <div className="p-6 flex flex-col gap-6 max-w-5xl">
        <ModuleHelpPanel
          title="About Release Compliance Gate"
          summary={RELEASE_GATE_HELP.summary}
          steps={RELEASE_GATE_HELP.steps}
          bullets={RELEASE_GATE_HELP.bullets}
          legend={RELEASE_GATE_HELP.legend}
        />

        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Compare & run gate</h3>
          <p className="text-sm text-gray-600">
            Reviews only packages that changed versus a baseline SBOM, then produces pass / review / block verdict and evidence pack.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Baseline SBOM</label>
              <select
                value={baselineId}
                onChange={(e) => setBaselineId(e.target.value ? parseInt(e.target.value, 10) : "")}
                className="px-3 py-2 border rounded-lg text-sm min-w-[220px]"
              >
                <option value="">Auto (previous release)</option>
                {peerSboms.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.release_version} (#{s.id})
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              onClick={() => compareMutation.mutate()}
              disabled={!baselineId || compareMutation.isPending}
            >
              Preview diff
            </Button>
            <Button
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => gateMutation.mutate()}
              disabled={gateMutation.isPending}
            >
              {gateMutation.isPending ? "Running gate…" : "Run release gate"}
            </Button>
          </div>
        </Card>

        {diff && (
          <Card className="p-5">
            <h3 className="font-semibold mb-3">SBOM delta</h3>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div className="rounded-lg bg-green-50 p-3">
                <div className="text-2xl font-bold text-green-700">{diff.added.length}</div>
                <div className="text-green-600">Added</div>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <div className="text-2xl font-bold text-amber-700">{diff.changed.length}</div>
                <div className="text-amber-600">Changed</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-2xl font-bold text-gray-700">{diff.removed.length}</div>
                <div className="text-gray-600">Removed</div>
              </div>
            </div>
          </Card>
        )}

        {(gate || gateLoading) && (
          <GateResultCard
            gate={gate}
            loading={gateLoading}
            evidenceJsonUrl={evidenceJsonUrl}
            evidenceHtmlUrl={evidenceHtmlUrl}
            accessToken={authState.accessToken}
          />
        )}
      </div>
    </>
  );
}

function GateResultCard({
  gate,
  loading,
  evidenceJsonUrl,
  evidenceHtmlUrl,
  accessToken,
}: {
  gate?: ReleaseGateEvaluation;
  loading: boolean;
  evidenceJsonUrl: string;
  evidenceHtmlUrl: string;
  accessToken: string | null;
}) {
  if (loading) return <Card className="p-5">Loading gate result…</Card>;
  if (!gate) return null;

  const colors = GATE_VERDICT_COLORS[gate.verdict];

  const downloadWithAuth = (url: string, filename: string, mime = "application/json") => {
    if (!accessToken) return;
    fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([blob], { type: mime }));
        a.download = filename;
        a.click();
      });
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Gate result</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${colors.bg} ${colors.text}`}>
          {gate.verdict}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <Stat label="Pass" value={gate.pass_count} className="text-green-700" />
        <Stat label="Review" value={gate.review_count} className="text-amber-700" />
        <Stat label="Block" value={gate.block_count} className="text-red-700" />
      </div>
      {gate.reasons?.length > 0 && (
        <ul className="text-sm text-gray-600 list-disc pl-5">
          {gate.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <p className="text-xs text-gray-400">
        Evaluated {new Date(gate.created_at).toLocaleString()}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => downloadWithAuth(evidenceJsonUrl, "evidence-pack.json")}>
          Download JSON evidence
        </Button>
        <Button
          variant="secondary"
          onClick={() => downloadWithAuth(evidenceHtmlUrl, "evidence-pack.html", "text/html")}
        >
          Download HTML evidence
        </Button>
      </div>
    </Card>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded border p-3 text-center">
      <div className={`text-xl font-bold ${className}`}>{value}</div>
      <div className="text-gray-500">{label}</div>
    </div>
  );
}
