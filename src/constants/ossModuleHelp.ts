import type { HelpFlowStep, HelpLegendItem } from "../components/oss/ModuleHelpPanel";

export const RELEASE_GATE_HELP = {
  summary:
    "Checks whether a new release is safe to ship by comparing its SBOM to a previous baseline. Only added or changed dependencies are vetted — unchanged packages are skipped.",
  steps: [
    {
      icon: "📦",
      label: "Select SBOM",
      detail: "Open a release SBOM from the SBOM list, or pick one here.",
    },
    {
      icon: "↔️",
      label: "Compare baseline",
      detail: "Diff against the prior release (auto-selected) or choose another baseline.",
    },
    {
      icon: "🔍",
      label: "Vet deltas",
      detail: "Each new/changed package is checked for license status, CVEs, and org policy.",
    },
    {
      icon: "✅",
      label: "Verdict + evidence",
      detail: "Get pass, review, or block plus a downloadable audit evidence pack.",
    },
  ] satisfies HelpFlowStep[],
  bullets: [
    "Use before promoting a build to staging or production.",
    "Preview diff shows added, changed, and removed packages without running the full gate.",
    "Evidence packs include developer, legal, and executive summaries for auditors.",
  ],
  legend: [
    {
      label: "Pass",
      description: "No blocking issues — safe to proceed with release.",
      badgeClass: "bg-green-100 text-green-800",
    },
    {
      label: "Review",
      description: "Human review needed (legal check, high CVEs, or caution risk).",
      badgeClass: "bg-amber-100 text-amber-800",
    },
    {
      label: "Block",
      description: "Do not ship until blockers are resolved (NOT_ALLOWED, critical CVEs).",
      badgeClass: "bg-red-100 text-red-800",
    },
  ] satisfies HelpLegendItem[],
};

export const DECISION_QUEUE_HELP = {
  summary:
    "Human-in-the-loop review for SBOM components flagged during upload or auto-classification. Legal and security teams approve, reject, or defer packages before they can ship.",
  steps: [
    {
      icon: "📤",
      label: "SBOM upload",
      detail: "Components arrive as pending review or check with legal based on license rules.",
    },
    {
      icon: "📋",
      label: "Review queue",
      detail: "Packages needing a decision appear here for assignees.",
    },
    {
      icon: "⚖️",
      label: "Decide",
      detail: "Approve (allowed), reject (not allowed), or defer to legal with notes.",
    },
    {
      icon: "📝",
      label: "Audit trail",
      detail: "Every action is logged with status changes and rationale.",
    },
  ] satisfies HelpFlowStep[],
  bullets: [
    "Queue includes components with status check with legal or pending review.",
    "Assign packages to yourself or teammates before deciding.",
    "Approved packages become eligible for OSS Watch continuous monitoring.",
  ],
  legend: [
    {
      label: "Approve",
      description: "Marks the component allowed for use in your products.",
      badgeClass: "bg-green-100 text-green-800",
    },
    {
      label: "Reject",
      description: "Marks not allowed — blocks release gate if present in a delta.",
      badgeClass: "bg-red-100 text-red-800",
    },
    {
      label: "Defer",
      description: "Escalates to legal for further review without a final decision.",
      badgeClass: "bg-amber-100 text-amber-800",
    },
  ] satisfies HelpLegendItem[],
};

export const OSS_WATCH_HELP = {
  summary:
    "Continuous monitoring for packages you have already approved. Re-scans allowed components for new CVEs, risk degradation, or policy conflicts — without re-reviewing your entire SBOM.",
  steps: [
    {
      icon: "✅",
      label: "Approved packages",
      detail: "Only components with allowed status are monitored.",
    },
    {
      icon: "🔄",
      label: "Run scan",
      detail: "Re-vets up to 100 allowed packages against live CVE and policy data.",
    },
    {
      icon: "🚨",
      label: "Alerts",
      detail: "New critical/high CVEs, risk upgrades, or status conflicts raise alerts.",
    },
    {
      icon: "✔️",
      label: "Acknowledge",
      detail: "Triage alerts and acknowledge once handled.",
    },
  ] satisfies HelpFlowStep[],
  bullets: [
    "Zero alerts usually means no approved packages yet, or approved packages are still clean.",
    "After a scan, check “Last scan: N packages checked” to confirm the scan ran.",
    "Alerts are deduplicated — the same open issue won't create duplicate entries.",
  ],
  legend: [
    {
      label: "Critical CVE",
      description: "New critical vulnerability on an approved package.",
      badgeClass: "bg-red-100 text-red-800",
    },
    {
      label: "High CVE",
      description: "High-severity vulnerability requiring attention.",
      badgeClass: "bg-amber-100 text-amber-800",
    },
    {
      label: "Risk degraded",
      description: "Overall risk rose to HIGH or CRITICAL since approval.",
      badgeClass: "bg-orange-100 text-orange-800",
    },
  ] satisfies HelpLegendItem[],
};

export const LICENSE_MANAGEMENT_HELP = {
  summary:
    "Your organization's license registry — a catalog of SPDX licenses with type, obligations, and compatibility rules. It defines what each license means for compliance and supports vetting, SBOM review, and policy chat.",
  steps: [
    {
      icon: "📚",
      label: "Define licenses",
      detail: "Add org-specific or custom licenses (SPDX ID, type, obligations).",
    },
    {
      icon: "🔗",
      label: "Match SBOMs",
      detail: "Uploaded components reference licenses by SPDX ID from this registry.",
    },
    {
      icon: "⚙️",
      label: "Auto-classify",
      detail: "SBOM ingestion uses license type to flag copyleft, permissive, or unknown.",
    },
    {
      icon: "💬",
      label: "Inform decisions",
      detail: "Vetting, decision queue, and RAG policy answers use license metadata.",
    },
  ] satisfies HelpFlowStep[],
  bullets: [
    "Global licenses (MIT, Apache-2.0, etc.) are preloaded; add custom or org-specific entries as needed.",
    "License type drives initial status: copyleft often not allowed, permissive → check with legal, unknown → pending review.",
    "Use compatible/incompatible license fields to document mixing rules for legal review.",
  ],
  legend: [
    {
      label: "Permissive",
      description: "MIT, Apache — generally low risk; still verify attribution.",
      badgeClass: "bg-green-100 text-green-800",
    },
    {
      label: "Copyleft",
      description: "GPL, AGPL — strict sharing obligations; often blocked by default.",
      badgeClass: "bg-blue-100 text-blue-800",
    },
    {
      label: "Unknown",
      description: "Unrecognized SPDX — requires manual review in the decision queue.",
      badgeClass: "bg-gray-100 text-gray-800",
    },
  ] satisfies HelpLegendItem[],
};
