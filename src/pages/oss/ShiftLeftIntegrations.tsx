import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ossService } from "../../services/ossService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import type { CiSnippetPlatform } from "../../types/oss";
import { buildVsCodeSettingsSnippet, buildVetFilesExampleCurl } from "../../utils/shiftLeftIntegrations";

type IntegrationTab = "vscode" | "github" | "gitlab";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const VSCODE_SETTINGS_SNIPPET = buildVsCodeSettingsSnippet(API_BASE_URL);
const VET_FILES_EXAMPLE_CURL = buildVetFilesExampleCurl(API_BASE_URL);

const GITLAB_WEBHOOK_ENV = `GITLAB_WEBHOOK_SECRET=your-shared-secret
GITLAB_API_TOKEN=glpat-...
GITLAB_API_URL=https://gitlab.com
GITLAB_WEBHOOK_ORG_ID=00000000-0000-0000-0000-000000000001
COMPLYLENS_PUBLIC_URL=${API_BASE_URL.replace(/\/$/, "")}`;

export function ShiftLeftIntegrations() {
  const [tab, setTab] = useState<IntegrationTab>("gitlab");
  const apiUrl = API_BASE_URL.replace(/\/$/, "");

  const gitlabSnippet = useQuery({
    queryKey: ["ci-snippet", "gitlab", apiUrl],
    queryFn: () => ossService.getCiSnippet("gitlab", apiUrl),
    enabled: tab === "gitlab",
  });

  const githubSnippet = useQuery({
    queryKey: ["ci-snippet", "github", apiUrl],
    queryFn: () => ossService.getCiSnippet("github", apiUrl),
    enabled: tab === "github",
  });

  return (
    <>
      <header className="flex items-center justify-between border-b border-[#f1f2f3] px-10 py-3">
        <div>
          <h2 className="text-lg font-bold text-[#131416]">Shift-Left Integrations</h2>
          <p className="text-sm text-gray-500">
            Stop bad dependencies before they enter the SBOM — wire vetting into your IDE and CI pipelines.
          </p>
        </div>
      </header>

      <div className="p-6 flex flex-col gap-6">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Plugin API keys</h3>
          <p className="text-sm text-gray-600 mb-3">
            CI jobs and IDE extensions authenticate with the{" "}
            <code className="text-xs bg-gray-100 px-1 rounded">X-Plugin-Api-Key</code> header.
            Organization members can create keys in{" "}
            <Link to="/settings" className="text-emerald-700 hover:underline font-medium">
              Settings → Plugin API keys
            </Link>
            . Legacy env-based keys via <code className="text-xs bg-gray-100 px-1 rounded">PLUGIN_API_KEYS</code> are
            still supported.
          </p>
          <p className="text-sm text-gray-600 mb-3">
            Required scopes: <strong>oss:vet:ci</strong> for CI pipelines,{" "}
            <strong>oss:vet</strong> for IDE single-package vetting.
          </p>
        </Card>

        <div className="flex gap-2 border-b border-gray-200">
          <TabButton active={tab === "vscode"} onClick={() => setTab("vscode")}>
            VS Code
          </TabButton>
          <TabButton active={tab === "github"} onClick={() => setTab("github")}>
            GitHub
          </TabButton>
          <TabButton active={tab === "gitlab"} onClick={() => setTab("gitlab")}>
            GitLab
          </TabButton>
        </div>

        {tab === "vscode" && <VsCodeTab />}
        {tab === "github" && (
          <>
            <ShiftLeftDownloadsPanel
              apiUrl={apiUrl}
              artifactIds={["github-action"]}
              title="Download GitHub Action"
              className="mb-6"
            />
            <CiPlatformTab
            platform="github"
            title="GitHub Actions"
            description="Add a vet job to pull requests using comply-lens-github-action."
            snippet={githubSnippet.data?.snippet}
            docsUrl={githubSnippet.data?.docs_url}
            isLoading={githubSnippet.isLoading}
            error={githubSnippet.error}
            extraSteps={
              <>
                <li>
                  Add repository secret <code className="text-xs bg-gray-100 px-1 rounded">COMPLYLENS_PLUGIN_KEY</code>{" "}
                  with your plugin API key (oss:vet:ci scope).
                </li>
                <li>Paste the workflow step into your PR or CI workflow YAML.</li>
                <li>
                  The job calls <code className="text-xs bg-gray-100 px-1 rounded">POST /api/oss/shift-left/vet-diff</code>{" "}
                  on manifest changes.
                </li>
              </>
            }
          />
          </>
        )}
        {tab === "gitlab" && (
          <>
            <ShiftLeftDownloadsPanel
              apiUrl={apiUrl}
              artifactIds={["gitlab-ci"]}
              title="Download GitLab CI component"
              className="mb-6"
            />
            <CiPlatformTab
              platform="gitlab"
              title="GitLab CI (CI/CD Component)"
              description="Include the Comply Lens vet component in .gitlab-ci.yml. Runs on merge request pipelines and posts a sticky MR note."
              snippet={gitlabSnippet.data?.snippet}
              docsUrl={gitlabSnippet.data?.docs_url}
              isLoading={gitlabSnippet.isLoading}
              error={gitlabSnippet.error}
              extraSteps={
                <>
                  <li>
                    Add masked CI/CD variable{" "}
                    <code className="text-xs bg-gray-100 px-1 rounded">COMPLYLENS_API_KEY</code> with your plugin key.
                  </li>
                  <li>
                    Component repo:{" "}
                    <code className="text-xs bg-gray-100 px-1 rounded">comply-lens-gitlab-ci</code>
                  </li>
                </>
              }
            />
            <Card className="p-4">
              <h3 className="font-semibold mb-2">GitLab MR webhook</h3>
              <p className="text-sm text-gray-600 mb-4">
                Server-side webhook: Comply Lens fetches the MR diff and posts vet results as an MR note. No CI job required.
              </p>
              <div className="overflow-x-auto mb-4">
                <table className="text-sm w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="py-2 pr-4 font-medium">Field</th>
                      <th className="py-2 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr className="border-b border-gray-100">
                      <td className="py-2 pr-4">URL</td>
                      <td className="py-2 font-mono text-xs break-all">
                        {apiUrl}/api/oss/shift-left/webhooks/gitlab
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 pr-4">Secret token</td>
                      <td className="py-2">Same as server <code className="text-xs bg-gray-100 px-1 rounded">GITLAB_WEBHOOK_SECRET</code></td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Trigger</td>
                      <td className="py-2">Merge request events</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-600 mb-3">Required server environment variables:</p>
              <CodeBlock code={GITLAB_WEBHOOK_ENV} label="Server env (GitLab webhook)" />
            </Card>
          </>
        )}
      </div>
    </>
  );
}

function VsCodeTab() {
  const apiUrl = API_BASE_URL.replace(/\/$/, "");

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-2">comply-lens-vscode-extension</h3>
      <p className="text-sm text-gray-600 mb-4">
        Vets manifest changes on save using{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">POST /api/oss/shift-left/vet-files</code>.
        Supports npm/Python (<code className="text-xs bg-gray-100 px-1 rounded">package.json</code>,{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">requirements.txt</code>,{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">pyproject.toml</code>) and Java (
        <code className="text-xs bg-gray-100 px-1 rounded">pom.xml</code>,{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">build.gradle</code>,{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">build.gradle.kts</code>).
        Blocked and legal-review packages appear as editor diagnostics.
      </p>

      <ShiftLeftDownloadsPanel apiUrl={apiUrl} artifactIds={["vscode"]} title="Download extension" />

      <h4 className="font-medium text-sm mb-2 mt-6">Build from source (developers)</h4>
      <CodeBlock
        code={`cd comply-lens-vscode-extension
npm install && npm run compile
# F5 in VS Code (Run Extension), or:
npx @vscode/vsce package
code --install-extension comply-lens-vscode-0.1.0.vsix`}
        label="Local install"
      />

      <h3 className="font-semibold mt-6 mb-2">Workspace settings</h3>
      <p className="text-sm text-gray-600 mb-3">
        Add these to <code className="text-xs bg-gray-100 px-1 rounded">.vscode/settings.json</code> (plugin key
        needs <strong>oss:vet:ci</strong> scope):
      </p>
      <CodeBlock code={VSCODE_SETTINGS_SNIPPET} label="VS Code settings.json" />

      <h3 className="font-semibold mt-6 mb-2">Commands</h3>
      <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1 mb-4">
        <li>
          <strong>Comply Lens: Vet Current Manifest</strong> — vet the open file vs git HEAD
        </li>
        <li>
          <strong>Comply Lens: Vet Workspace Manifests</strong> — vet all configured manifests
        </li>
      </ul>

      <h3 className="font-semibold mt-6 mb-2">How manifest vetting works</h3>
      <p className="text-sm text-gray-600 mb-3">
        The extension sends the <strong>full manifest file</strong> in a single API call — not one request per
        package. Comply Lens compares <code className="text-xs bg-gray-100 px-1 rounded">base_content</code> (last
        git commit) to <code className="text-xs bg-gray-100 px-1 rounded">head_content</code> (your saved file), then
        vets only <strong>added</strong> or <strong>version-changed</strong> dependencies. Unchanged lines are skipped.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 mb-2">git HEAD — base_content</p>
          <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">flask==3.0.0</pre>
        </div>
        <div className="rounded-lg border border-emerald-200 p-3 bg-emerald-50">
          <p className="text-xs font-medium text-emerald-800 mb-2">Your save — head_content</p>
          <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">{`flask==3.0.0\nrequests==2.31.0  ← new line`}</pre>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">
        Result: only <code className="text-xs bg-gray-100 px-1 rounded">requests==2.31.0</code> is vetted.{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">flask==3.0.0</code> is unchanged and skipped. If there is
        no git history, every dependency in the file is treated as new.
      </p>

      <CodeBlock code={VET_FILES_EXAMPLE_CURL} label="Example — one vet-files request (same as VS Code on save)" />

      <p className="text-sm text-gray-500 mt-3 mb-4">
        The response includes a summary (<code className="text-xs bg-gray-100 px-1 rounded">total_new</code>,{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">blocked</code>,{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">needs_legal_review</code>) plus per-package details in{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">added</code> /{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">changed</code>.
      </p>

      <h3 className="font-semibold mb-2">Single-package vet (optional)</h3>
      <p className="text-sm text-gray-600 mb-3">
        To vet one package without a manifest diff, use the package endpoint:
      </p>
      <CodeBlock
        code={`curl -X POST "${API_BASE_URL.replace(/\/$/, "")}/api/oss/packages/vet" \\
  -H "X-Plugin-Api-Key: clp_your_secret_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"package_name": "lodash", "version": "4.17.21", "ecosystem": "npm"}'`}
        label="curl — /api/oss/packages/vet"
      />
    </Card>
  );
}

function ShiftLeftDownloadsPanel({
  apiUrl,
  artifactIds,
  title,
  className = "",
}: {
  apiUrl: string;
  artifactIds: string[];
  title: string;
  className?: string;
}) {
  const downloads = useQuery({
    queryKey: ["shift-left-downloads", apiUrl],
    queryFn: () => ossService.getShiftLeftDownloads(apiUrl),
  });

  const items = (downloads.data?.artifacts || []).filter((a) => artifactIds.includes(a.id));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`rounded-lg border border-gray-200 p-4 bg-gray-50 ${className}`}>
      <h4 className="font-medium text-sm mb-2">{title}</h4>
      {downloads.isLoading && <p className="text-sm text-gray-500">Checking for built packages…</p>}
      {Boolean(downloads.error) && (
        <p className="text-sm text-red-600">Could not load download info from the API.</p>
      )}
      {!downloads.isLoading && items.length === 0 && (
        <div className="text-sm text-gray-600">
          <p className="mb-2">No install package on this server yet.</p>
          <p>
            An admin builds artifacts before deploy (not stored in git). From the repo root, run:
          </p>
          <CodeBlock
            code={downloads.data?.build_command || "bash scripts/build_shift_left_artifacts.sh"}
            label="Build command (server / CI)"
          />
        </div>
      )}
      {items.map((artifact) => (
        <div key={artifact.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-medium text-sm">{artifact.label}</div>
            <div className="text-xs text-gray-500 mt-1">
              v{artifact.version} · {artifact.filename} · {formatSize(artifact.size_bytes)}
            </div>
            {artifact.install_hint && (
              <p className="text-xs text-gray-600 mt-2 font-mono">{artifact.install_hint}</p>
            )}
          </div>
          <a
            href={artifact.download_url || `${apiUrl}${artifact.download_path}`}
            download={artifact.filename}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 shrink-0"
          >
            Download
          </a>
        </div>
      ))}
    </div>
  );
}

function CiPlatformTab({
  platform,
  title,
  description,
  snippet,
  docsUrl,
  isLoading,
  error,
  extraSteps,
}: {
  platform: CiSnippetPlatform;
  title: string;
  description: string;
  snippet?: string;
  docsUrl?: string | null;
  isLoading: boolean;
  error: unknown;
  extraSteps: ReactNode;
}) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>

      {isLoading && <p className="text-sm text-gray-500 mb-4">Loading snippet…</p>}
      {Boolean(error) && (
        <p className="text-sm text-red-600 mb-4">
          Failed to load snippet. Check that the API is reachable at {API_BASE_URL}.
        </p>
      )}
      {snippet && <CodeBlock code={snippet} label={`${platform} CI snippet`} />}

      {docsUrl && (
        <p className="text-sm mt-4">
          <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
            Platform documentation →
          </a>
        </p>
      )}

      <h4 className="font-medium text-sm mt-6 mb-2">Setup steps</h4>
      <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">{extraSteps}</ol>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-emerald-600 text-emerald-700"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <Button variant="secondary" onClick={handleCopy} className="text-xs py-1 px-2">
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}
