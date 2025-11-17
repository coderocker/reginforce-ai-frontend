# GitHub Copilot Instructions

These are project-level instructions for GitHub Copilot in this repository.

---

## 1. Project Context

**Project:** `RegInforce AI – Frontend`

You are a React + TypeScript assistant working in an API-driven dashboard application.  
Your main responsibility is to convert static HTML mockups into fully-functional, data-driven React pages while preserving the original design.

---

## 2. Core Mandate: The “Stitch Design” UI

> **THIS IS THE MOST IMPORTANT RULE.**

### 2.1 Source of Truth

- All HTML, layout, and styling are predefined in static HTML mockups.
- These mockups live in the project root:  
  `./stitch-design/`

Examples:

- `./stitch-design/compliance_assistant_chat_sidebar/code.html`
- `./stitch-design/deep_analysis_workspace/code.html`
- `./stitch-design/remediation_roadmap/code.html`
- `./stitch-design/document_library/code.html`
- `./stitch-design/policy_document_comparison/code.html`
- `./stitch-design/compliance_trend_analysis/code.html`
- And other HTML files as needed.

### 2.2 Your Primary Task

When asked to build a page:

1. **Read the corresponding HTML file** from `stitch-design/`.
2. **Create a React page component** in `src/pages/` with the same layout and styling.
3. **Convert static mockup content into dynamic, data-driven React.**

Example flow (for “Dashboard”):

- I ask: “Create the Dashboard page.”
- You (Copilot) read: `./stitch-design/compliance_assistant_chat_sidebar/code.html`
- You create: `src/pages/Dashboard.tsx`
- You:
  - Preserve structure and classes.
  - Replace static elements with functional components.
  - Replace hardcoded text with dynamic values from React Query hooks.

### 2.3 Do NOT Invent UI

- **Do NOT invent new UI elements, layouts, or styles.**
- **Do NOT change the visual hierarchy without instruction.**

You must:

- Preserve all layout structure.
- Preserve all CSS classes as they appear in the HTML.

### 2.4 Preserve Classes

- Treat all CSS classes from `stitch-design` as canonical (they are likely Tailwind classes).
- When converting HTML to JSX:
  - Convert `class` → `className`
  - Preserve the full class string exactly.

Example:

```html
<div class="chart-placeholder flex items-center justify-center text-sm text-gray-500">
  5 Gaps Found
</div>
````

Becomes:

```tsx
<div className="chart-placeholder flex items-center justify-center text-sm text-gray-500">
  {data.total_gaps} Gaps Found
</div>
```

Replace static text with dynamic data but **keep the classes identical**.

---

## 3. Tech Stack & Setup

* **Framework:** React 18+
* **Language:** TypeScript

  * Use `strict` mode.
  * All API data **must** be strongly typed.
* **Build Tool:** Vite
* **Package Manager:** `pnpm`

  * Use `pnpm` for all commands:

    * `pnpm install`
    * `pnpm dev`
    * `pnpm build`
* **Styling:** Tailwind CSS (as implied by the stitch-design mockups)

---

## 4. Core Principles: DRY & Best Practices

### 4.1 DRY (Don’t Repeat Yourself)

* Be aggressive about componentization.
* If a UI pattern appears in more than one place, extract a reusable component.

### 4.2 Reusable UI Components

* Small, repeated UI elements go into:
  `src/components/ui/`

Examples:

* `src/components/ui/StatusPill.tsx`

  * `<StatusPill status={...} />`
* `src/components/ui/RiskBadge.tsx`

  * `<RiskBadge score={...} />`
* `src/components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx`, etc.

### 4.3 Feature Components

* Larger, stateful feature components go into:
  `src/components/features/`

Examples:

* `<AnalysisDashboard />`
* `<RemediationKanban />`
* `<AnomalyFeed />`
* `<DocumentList />`

### 4.4 Hooks

* Put non-trivial logic and all data fetching into **custom hooks** in:
  `src/hooks/`

Examples:

* `useAnalysisReport(reportId)`
* `useDocuments()`
* `useRemediationPlan(reportId)`
* `usePolicyDiff(oldId, newId)`

### 4.5 React Component Style

* Use **only functional components** with React Hooks.
* Do **not** use class components.

### 4.6 Error Handling

* All API calls must support error handling.
* Using React Query:

  * Check `isError`, `error` in `useQuery`.
  * Use `onError` in mutations as needed.
* Show appropriate fallback UI or messages on errors.

---

## 5. API Client & State Management

This is an **API-driven dashboard**. All server state is managed via React Query.

### 5.1 API Client

* Use **axios** as the HTTP client.

* Create a singleton instance at:

  * `src/api/client.ts`

  Example:

  ```ts
  import axios from "axios";

  export const apiClient = axios.create({
    baseURL: "/api",
  });
  ```

* Add interceptors later if needed (auth, logging, etc.).

* Put all API functions in:

  * `src/api/index.ts`
  * E.g. `getReport(id)`, `runAnalysis(payload)`, `getDocuments()`, etc.

### 5.2 State Management: React Query (TanStack Query)

* **Do NOT** use `useState` or `useEffect` directly for server data fetching.
* Use **React Query** for all server data.

Rules:

* Use `useQuery` for all **GET** requests.
* Use `useMutation` for all **POST**, **PATCH**, and **DELETE** requests.

Reasons:

* We need:

  * Caching
  * Background refetching
  * Polling
  * Automatic retries
  * Mutation and invalidation flows

Examples:

* **Polling document status:**

  ```ts
  useQuery(
    ["document", docId],
    () => apiClient.get(`/documents/${docId}`).then((res) => res.data),
    { refetchInterval: 5000 }
  );
  ```

* **Caching reports:**

  ```ts
  useQuery(["analysisReport", reportId], () =>
    apiClient.get(`/analysis/${reportId}`).then((res) => res.data)
  );
  ```

* **Invalidating after mutations:**

  ```ts
  const queryClient = useQueryClient();

  const runAnalysisMutation = useMutation(
    (payload: AnalysisRequest) =>
      apiClient.post("/analysis/run", payload).then((res) => res.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["documents"]);
      },
    }
  );
  ```

---

## 6. Recommended Project Structure

Use (and extend) this structure:

```text
/
├── stitch-design/          # Static HTML mockups (source of truth for UI)
│   ├── compliance_assistant_chat_sidebar/code.html
│   ├── deep_analysis_workspace/code.html
│   ├── remediation_roadmap/code.html
│   ├── document_library/code.html
│   ├── policy_document_comparison/code.html
│   ├── compliance_trend_analysis/code.html
│   └── ...
├── public/
├── src/
│   ├── api/
│   │   ├── client.ts       # Axios instance
│   │   └── index.ts        # API functions (e.g., getReport(id), runAnalysis(...))
│   ├── assets/
│   ├── components/
│   │   ├── features/       # Large, stateful UI (e.g., <RemediationKanban />)
│   │   ├── layouts/        # Layout components (e.g., <MainLayout />, <ChatSidebar />)
│   │   └── ui/             # Small reusable UI (e.g., <Button />, <StatusPill />)
│   ├── hooks/              # Custom hooks (e.g., useAnalysisReport.ts)
│   ├── pages/              # Route-level pages (e.g., Dashboard.tsx)
│   ├── providers/          # e.g., ReactQueryProvider.tsx
│   ├── types/
│   │   └── api.ts          # TypeScript types based on openapi.json
│   ├── App.tsx
│   ├── main.tsx
│   └── ...
└── openapi.json            # Swagger/OpenAPI spec
```

---

## 7. Implementation Plan (Mockups → Pages)

Use this section as your mapping between workflows, mockups, and pages.

### 7.1 Dashboard

* **File:** `src/pages/Dashboard.tsx`
* **Workflow:** 4 (Executive Monitoring)
* **Mockup:** `./stitch-design/compliance_assistant_chat_sidebar/code.html`

### 7.1.1 ChatBot Sidebar
* See Section 7.7 for detailed instructions on the Chat Sidebar layout and components.  

#### Data Requirements

* `useQuery` for:

  * `GET /api/analysis/{report_id}/trends`
  * `GET /api/analysis/{report_id}/anomalies`

#### Components

* `<TrendChart />`

  * Use `recharts` to display `TrendData.snapshots`.

* `<AnomalyFeed />`

  * Displays list of `AnomalyAlertPublic`.

* `<StatCard />`

  * For KPIs such as `current_gaps`, `total_critical`, etc.

### 7.2 Document Library

* **File:** `src/pages/Documents.tsx`
* **Workflow:** 1 (Ingestion)
* **Mockup:** `./stitch-design/document_library/code.html`

#### Data Requirements

* `useQuery(['documents'], ...)` for:
  `GET /api/documents/`
* `useMutation` for:

  * `POST /api/documents/upload` (file upload)

#### Components

* `<DocumentUploadForm />`

  * Uses the upload mutation.

* `<DocumentList />`

  * Renders a list of `<DocumentRow />`.

* `<DocumentRow />`

  * Displays `DocumentPublic` data.
  * If `status === 'processing'`:

    * Use its own `useQuery(['document', doc.id], ...)`
    * Poll `GET /api/documents/{doc_id}` with `refetchInterval` until `status === 'processed'`.
  * Renders `<StatusPill status={doc.status} />`.

### 7.3 Analysis Report

* **File:** `src/pages/AnalysisReport.tsx`
* **Route:** `/reports/:reportId`
* **Workflow:** 2 (Core Analysis)
* **Mockup:** `./stitch-design/deep_analysis_workspace/code.html` (or similar)

#### Data Requirements

* Extract `reportId` from route params.
* `useQuery(['analysisReport', reportId], ...)` for:

  * `GET /api/analysis/{report_id}`

#### Components

* `<ReportSummary />`

  * Shows `total_critical`, `total_high`, `total_medium`, `total_low`, etc.

* `<GapList />`

  * Renders grouped `GapCard`s using `cluster_summaries` and `gaps`.

* `<GapCard />`
  **“Wow” Feature:**

  * Use `gap_description` (AI-generated) as the **title**.
  * Also show:

    * `severity_level`
    * `risk_score`
    * `status` (if present)

* `<GapContextView />`

  * Side panel or modal.
  * Shows `policy_section` and `regulation_section` side-by-side for the selected gap.

### 7.4 Remediation Roadmap

* **File:** `src/pages/RemediationRoadmap.tsx`
* **Route:** `/remediation/:reportId`
* **Workflow:** 3 (Remediation)
* **Mockup:** `./stitch-design/remediation_roadmap/code.html`

#### Data Requirements

* Extract `reportId` from route params.

* `useQuery(['remediationPlan', reportId], ...)` for:

  * `GET /api/remediation/reports/{report_id}`

* `useMutation` for:

  * `POST /api/remediation/reports/{report_id}/generate`
  * `PATCH /api/remediation/steps/{step_id}/status`

* `useQuery(['dependencyGraph', planId], ...)` for:

  * `GET /api/remediation/plans/{plan_id}/dependencies`

#### Components

* `<GeneratePlanButton />`

  * Uses the generate mutation.
  * Shows loading and disabled states.

* `<RemediationKanban />`

  * Use a drag-and-drop library like `dnd-kit`.
  * Renders `RemediationStepPublic` as cards grouped by `status`.
  * On card move (e.g., “Draft” → “In Progress”), call the `PATCH` mutation to update step status and invalidate queries.

* `<DependencyGraph />`

  * Uses `react-flow` to display the `DependencyGraph` nodes and edges.

* `<ExportButton />`

  * Dropdown button that calls:

    * `GET /api/remediation/plans/{plan_id}/export?format=...`

### 7.5 Policy Diff

* **File:** `src/pages/PolicyDiff.tsx`
* **Route:** `/policies/diff/:oldId/:newId`
* **Workflow:** 2 (Core Analysis)
* **Mockup:** `./stitch-design/policy_document_comparison/code.html`

#### Data Requirements

* Extract `oldId` and `newId` from route params.
* `useQuery(['policyDiff', oldId, newId], ...)` for:

  * `GET /api/policies/{old_id}/diff/{new_id}`

#### Components

* `<DiffStats />`

  * Shows:

    * `total_additions`
    * `total_deletions`
    * `total_modifications`
    * `similarity_ratio`

* `<DiffViewer />`

  * Renders `PolicyDiffPublic.segments`.
  * Use `react-diff-viewer` or custom JSX.
  * Highlight:

    * Additions in green.
    * Deletions in red.
    * Modifications clearly.

### 7.6 Report History

* **File:** `src/pages/ReportHistory.tsx`
* **Route:** `/reports/history/:reportId`
* **Workflow:** 4 (Executive Monitoring)
* **Mockup:** `./stitch-design/compliance_trend_analysis/code.html`

#### Data Requirements

* Extract `reportId` from route params.

* `useQuery(['reportHistory', reportId], ...)` for:

  * `GET /api/analysis/{report_id}/history`

* `useMutation` for:

  * `POST /api/analysis/{report_id}/compare`

#### Components

* `<HistoryChart />`

  * Bar or line chart showing:

    * `total_gaps`
    * `new_gaps`
    * `resolved_gaps`
    * `average_risk_score`
  * Over time from `HistoricalAnalysis`.

* `<ComparisonTool />`

  * UI to select two historical reports and trigger the compare mutation.

* `<ComparisonResult />`

  * Renders `ComparisonResult`:

    * `new_gaps`
    * `resolved_gaps`
    * `persistent_gaps`
    * `improvement_summary`

### 7.7 Chat Sidebar Layout

* **File:** `src/components/layouts/ChatSidebar.tsx`
* **Workflow:** 5 (ChatOps)
* **Mockup:** Part of the main layout mockup in `stitch-design/compliance_assistant_chat_sidebar/code.html`.

#### Data Requirements

* `useQuery(['conversations'], ...)` for:

  * `GET /api/chat/conversations`

* `useQuery(['messages', currentConvoId], ...)` for:

  * `GET /api/chat/conversations/{conversation_id}/messages`
  * Use `enabled: Boolean(currentConvoId)`.

* `useMutation` for:

  * `POST /api/chat/send`

#### Components

* `<ConversationList />`

  * Lists conversations from `ConversationListResponse.conversations`.

* `<MessageWindow />`

  * Renders `MessagePublic` items.

* `<MessageBubble />`

  * Distinguishes between `role === 'user'` and `role === 'assistant'`.

* `<ChatInput />`

  * A form that calls the send message mutation.

---

## 8. Core API Type Definitions

You **must** use these TypeScript types (derived from `openapi.json`) when handling API data.

Create them in: `src/types/api.ts`
(If new fields are added to the OpenAPI spec, update these types accordingly.)

```ts
// === Enums ===
export type ProcessingStatus = "pending" | "processing" | "processed" | "error";
export type GapStatus = "new" | "existing" | "resolved" | "worsened";
export type DocumentType = "regulation" | "policy";
export type RemediationStatus = "draft" | "in_progress" | "completed" | "blocked";
export type EffortSize = "S" | "M" | "L" | "XL";
export type MessageRole = "user" | "assistant" | "system";
export type Platform = "web" | "slack" | "teams" | "api";

// === Documents & Analysis ===
export interface DocumentPublic {
  id: number;
  filename: string;
  doc_type: DocumentType;
  status: ProcessingStatus;
  created_at: string; // datetime
}

export interface AnalysisRequest {
  regulation_doc_id: number;
  policy_doc_id: number;
}

export interface GapPublic {
  id: number; // for keying
  policy_section: string;
  regulation_section?: string | null;
  gap_description: string; // AI-generated summary
  risk_score: number;
  gap_type?: string | null;
  severity_level?: "low" | "medium" | "high" | "critical" | null;
  status?: GapStatus | null;
}

export interface ClusterSummary {
  count: number;
  average_risk: number;
  topics?: string[];
  severity_distribution?: Record<string, number>;
}

export interface ReportPublic {
  id: number;
  regulation_doc_id: number;
  policy_doc_id: number;
  status: ProcessingStatus;
  created_at: string; // datetime
  gaps: GapPublic[];
  cluster_summaries?: Record<string, ClusterSummary> | null;
  total_critical?: number | null;
  total_high?: number | null;
  total_medium?: number | null;
  total_low?: number | null;
}

// === History & Trends ===
export interface HistoricalAnalysis {
  analysis_date: string; // datetime
  report_id: number;
  total_gaps: number;
  new_gaps: number;
  existing_gaps: number;
  worsened_gaps: number;
  average_risk_score: number;
  high_severity_count: number;
}

export interface TrendDataPoint {
  date: string;
  gap_count: number;
  risk_score: number;
}

export interface AnomalyAlertPublic {
  severity: string;
  metric: string;
  current_value: number;
  expected_value: number;
  message: string;
  detected_at: string; // datetime
}

export interface TrendData {
  report_id: number;
  total_analyses: number;
  trend: "improving" | "degrading" | "stable" | "no_data" | "insufficient_data";
  confidence: number;
  snapshots: TrendDataPoint[];
  anomalies?: AnomalyAlertPublic[] | null;
  has_anomalies: boolean;
  summary: string;
}

// === Comparison & Diff ===
export interface GapComparisonItem {
  requirement_id: string;
  requirement_text: string;
  gap_description: string;
  severity: string;
}

export interface ComparisonResult {
  current_report_id: number;
  previous_report_id: number;
  comparison_date: string;
  gap_count_delta: number;
  risk_score_delta: number;
  new_gaps: GapComparisonItem[];
  resolved_gaps: GapComparisonItem[];
  persistent_gaps: GapComparisonItem[];
  improvement_summary: string;
}

export interface DiffSegmentPublic {
  change_type: "addition" | "deletion" | "modification" | "unchanged";
  old_text?: string | null;
  new_text?: string | null;
}

export interface PolicyDiffPublic {
  old_document_id: number;
  new_document_id: number;
  total_additions: number;
  total_deletions: number;
  total_modifications: number;
  similarity_ratio: number;
  segments: DiffSegmentPublic[];
}

// === Remediation ===
export interface RemediationStepPublic {
  id: number;
  gap_id: number;
  strategy: string; // AI-generated fix
  implementation_steps?: string | null;
  effort_size: EffortSize;
  effort_hours: number;
  priority: number;
  dependencies?: number[] | null;
  status: RemediationStatus;
  started_at?: string | null; // datetime
  completed_at?: string | null; // datetime
}

export interface RemediationPlanPublic {
  id: number;
  analysis_report_id: number;
  created_at: string; // datetime
  updated_at: string; // datetime
  total_effort_hours: number;
  status: RemediationStatus;
  steps: RemediationStepPublic[];
}

export interface DependencyNode {
  step_id: number;
  gap_id: number;
  title: string;
  effort_hours: number;
  priority: number;
  status: RemediationStatus;
  depends_on: number[];
  blocks: number[];
}

export interface DependencyGraph {
  plan_id: number;
  nodes: DependencyNode[];
  critical_path: number[];
  critical_path_hours: number;
}

// === Chat ===
export interface MessagePublic {
  id: number;
  role: MessageRole;
  content: string;
  intent?: string | null;
  entities?: Record<string, string[]> | null;
  timestamp: string; // datetime
  was_blocked: boolean;
  block_reason?: string | null;
}

export interface ConversationContextPublic {
  active_report_id?: number | null;
  active_gap_ids: number[];
  // other context fields
}

export interface ConversationPublic {
  id: number;
  user_id?: string | null;
  platform: Platform;
  started_at: string; // datetime
  message_count: number;
  last_activity: string; // datetime
  is_archived: boolean;
  is_suspended: boolean;
}

export interface ConversationListResponse {
  conversations: ConversationPublic[];
  total: number;
  page: number;
  page_size: number;
}

export interface SendMessageRequest {
  conversation_id?: number | null;
  message: string;
  user_id?: string | null;
  platform?: Platform;
}

export interface SendMessageResponse {
  conversation_id: number;
  message: MessagePublic;   // user's message
  response: MessagePublic;  // assistant's response
  context: ConversationContextPublic;
  follow_up_suggestions?: string[];
}
```

---

## 9. Final Reminders for Copilot

* Always:

  * Preserve **HTML structure** and **class names** from `stitch-design`.
  * Use **TypeScript** with strict typing.
  * Use **React Query** for all server data.
  * Put complex logic into **hooks**.
  * Extract reusable **UI components**.
* Never:

  * Invent new layouts or styles without instruction.
  * Fetch data with `useEffect` + `fetch/axios` directly in components.

Use these rules as your default behavior when generating or refactoring code in this repo.
