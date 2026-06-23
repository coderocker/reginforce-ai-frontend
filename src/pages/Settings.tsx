import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { identityService } from "../services/identityService";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PLUGIN_SCOPE_OPTIONS } from "../types/identity";

export function Settings() {
  return (
    <>
      <header className="border-b border-[#f1f2f3] px-10 py-3">
        <h2 className="text-lg font-bold text-[#131416]">Settings</h2>
        <p className="text-sm text-gray-500">Organization configuration and integrations</p>
      </header>
      <div className="p-6 flex flex-col gap-6">
        <PluginApiKeysSection />
      </div>
    </>
  );
}

function PluginApiKeysSection() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["oss:vet", "oss:vet:ci"]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["plugin-api-keys"],
    queryFn: () => identityService.listPluginKeys(),
  });

  const createMutation = useMutation({
    mutationFn: () => identityService.createPluginKey({ name: name.trim(), scopes }),
    onSuccess: (created) => {
      setNewKey(created.api_key);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["plugin-api-keys"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => identityService.revokePluginKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugin-api-keys"] });
    },
  });

  const toggleScope = (scopeId: string) => {
    setScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  const copyKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-1">Plugin API keys</h3>
      <p className="text-sm text-gray-600 mb-4">
        Keys authenticate IDE extensions and CI pipelines via the{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">X-Plugin-Api-Key</code> header. The
        secret is shown only once at creation.
      </p>

      {newKey && (
        <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50">
          <p className="text-sm font-medium text-amber-900 mb-2">Copy your new key now — it won&apos;t be shown again.</p>
          <div className="flex gap-2 items-start">
            <code className="text-xs bg-white border border-amber-200 rounded p-2 flex-1 break-all">{newKey}</code>
            <Button variant="secondary" onClick={copyKey} className="shrink-0">
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <button
            type="button"
            className="text-xs text-amber-800 underline mt-2"
            onClick={() => setNewKey(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-medium mb-3">Create key</h4>
        <label className="block text-sm text-gray-600 mb-1" htmlFor="key-name">
          Name
        </label>
        <input
          id="key-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="GitHub CI, VS Code dev, etc."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
        />
        <p className="text-sm text-gray-600 mb-2">Scopes</p>
        <div className="space-y-2 mb-4">
          {PLUGIN_SCOPE_OPTIONS.map((opt) => (
            <label key={opt.id} className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={scopes.includes(opt.id)}
                onChange={() => toggleScope(opt.id)}
                className="mt-1"
              />
              <span>
                <span className="font-medium">{opt.label}</span>
                <span className="text-gray-500"> — {opt.description}</span>
                <code className="ml-1 text-xs bg-gray-100 px-1 rounded">{opt.id}</code>
              </span>
            </label>
          ))}
        </div>
        <Button
          variant="primary"
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={!name.trim() || scopes.length === 0 || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? "Creating…" : "Create key"}
        </Button>
        {createMutation.isError && (
          <p className="text-sm text-red-600 mt-2">Failed to create key. Admin role may be required.</p>
        )}
      </div>

      <h4 className="text-sm font-medium mb-3">Existing keys</h4>
      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {Boolean(error) && (
        <p className="text-sm text-red-600">Could not load keys. Organization admin access is required.</p>
      )}
      {!isLoading && data && data.items.length === 0 && (
        <p className="text-sm text-gray-500">No plugin keys yet.</p>
      )}
      <ul className="space-y-2">
        {(data?.items || []).map((key) => (
          <li
            key={key.id}
            className={`flex justify-between items-center gap-3 p-3 rounded-lg border text-sm ${
              key.is_active ? "border-gray-200 bg-gray-50" : "border-gray-100 bg-gray-50 opacity-60"
            }`}
          >
            <div>
              <div className="font-medium">{key.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {key.key_prefix}… · {key.scopes.join(", ")}
                {!key.is_active && " · revoked"}
              </div>
              <div className="text-xs text-gray-400">
                Created {new Date(key.created_at).toLocaleString()}
                {key.last_used_at && ` · last used ${new Date(key.last_used_at).toLocaleString()}`}
              </div>
            </div>
            {key.is_active && (
              <Button
                variant="secondary"
                onClick={() => revokeMutation.mutate(key.id)}
                disabled={revokeMutation.isPending}
              >
                Revoke
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
