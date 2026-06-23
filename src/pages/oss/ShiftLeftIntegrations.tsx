import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ossService } from "../../services/ossService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import type { CiSnippetPlatform } from "../../types/oss";

type IntegrationTab = "vscode" | "github" | "gitlab";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const VSCODE_SETTINGS_SNIPPET = `{
  "complylens.apiUrl": "${API_BASE_URL.replace(/\/$/, "")}",
  "complylens.apiKey": "clp_your_secret_key_here",
  "complylens.vetOnSave": true,
  "complylens.manifestFiles": [
    "package.json",
    "requirements.txt",
    "pyproject.toml"
  ]
}`;

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
            Organization admins can create keys in{" "}
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
        )}
        {tab === "gitlab" && (
          <>
            <CiPlatformTab
              platform="gitlab"
              title="GitLab CI — Option B (CI/CD Component)"
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
              <h3 className="font-semibold mb-2">GitLab — Option C (MR webhook)</h3>
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
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3 mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
        <span className="text-lg">🔌</span>
        <div>
          <div className="font-medium text-sm text-blue-900">comply-lens-vscode-extension</div>
          <p className="text-sm text-blue-800 mt-1">
            The VS Code extension is coming soon. It will vet dependencies on save using{" "}
            <code className="text-xs bg-blue-100 px-1 rounded">POST /api/oss/packages/vet</code> and surface
            legal-review / blocked packages inline.
          </p>
        </div>
      </div>

      <h3 className="font-semibold mb-2">Preview — workspace settings</h3>
      <p className="text-sm text-gray-600 mb-3">
        When the extension ships, add these settings to <code className="text-xs bg-gray-100 px-1 rounded">.vscode/settings.json</code>:
      </p>
      <CodeBlock code={VSCODE_SETTINGS_SNIPPET} label="VS Code settings.json" />

      <h3 className="font-semibold mt-6 mb-2">Manual vet (API)</h3>
      <p className="text-sm text-gray-600 mb-3">Until the extension is available, vet packages via the API:</p>
      <CodeBlock
        code={`curl -X POST "${API_BASE_URL.replace(/\/$/, "")}/api/oss/packages/vet" \\
  -H "X-Plugin-Api-Key: clp_your_secret_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"package_name": "lodash", "version": "4.17.21", "ecosystem": "npm"}'`}
        label="curl example"
      />
    </Card>
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
