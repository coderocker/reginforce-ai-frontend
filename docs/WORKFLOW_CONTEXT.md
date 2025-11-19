# RegInforce AI Frontend - Workflow Context

This document describes the user's journey and intent for each page of the RegInforce AI frontend. This context should be used to understand *why* we are building a component and *how* it should interact with the API.

## View 1: Document Library (`/documents`)

**Purpose:** This is the starting point. The user needs to upload their raw source material (the laws and their internal policies) and see when they are ready for analysis.

### Workflow (Page Load):
1. When the user lands on this page, immediately call `GET /api/documents/` using `useQuery(['documents'])`.
2. Display the list of `DocumentPublic` items in a table or list.
3. Show a "Regulations" list and a "Policies" list (by filtering the `doc_type`).

### Workflow (User Upload):
1. The user drags a PDF file (e.g., `gdpr.pdf`) into an upload zone.
2. They select the `doc_type` from a dropdown (e.g., "Regulation").
3. The user clicks "Upload."
4. This triggers a `useMutation` hook that calls `POST /api/documents/upload` with the file and doc_type.
5. On success (201), automatically invalidate the `['documents']` query key. This makes React Query refetch the list, and the new document appears with a `status: "pending"`.

### Workflow (Polling Status):
1. The `<DocumentRow>` component for any document where `status === "pending"` or `status === "processing"` must *poll* for updates.
2. Start a `useQuery(['document', doc.id], ...)` with a `refetchInterval: 5000` (5 seconds).
3. When the poll response shows `status: "processed"` or `status: "error"`, stop the refetching.
4. The UI must visually update: a yellow "Processing..." pill should turn into a green "Processed" pill.

## View 2: Dashboard (`/`)

**Purpose:** This is the executive "Command Center." It answers "What's our compliance status right now?" and "Is there anything urgent?"

### Workflow (Page Load):
1. This page loads high-level trend data. It needs a "primary" report to be selected (e.g., the most recent one).
2. Fire two `useQuery` calls:
   * `GET /api/analysis/{report_id}/trends` (for the main chart).
   * `GET /api/analysis/{report_id}/anomalies` (for the "Alerts" widget).
3. The `TrendData` populates a `recharts` line chart (X-axis: `date`, Y-axis: `risk_score`).
4. The `AnomalyAlertPublic` array populates an "Anomalies" feed. If `has_anomalies: true`, the widget should have a red border or icon.

### Workflow (Run New Analysis):
1. The user clicks a primary "Run New Analysis" button.
2. A modal appears. This modal has two dropdowns, "Select Regulation" and "Select Policy."
3. These dropdowns are populated by data from the `useQuery(['documents'])`, filtered to only show items with `status: "processed"`.
4. The user clicks "Run."
5. This triggers a `useMutation` for `POST /api/analysis/run`.
6. On success (202), immediately navigate the user to the new report's detail page: `/reports/{response.id}`.

## View 3: Analysis Report (`/reports/:reportId`)

**Purpose:** This is the core "Deep Dive" view and the main "wow" feature. The user analyzes the results of a specific report.

### Workflow (Page Load):
1. Get the `reportId` from the URL parameters.
2. Call `GET /api/analysis/{report_id}` using `useQuery(['analysisReport', reportId])`.
3. While loading, display a skeleton screen.

### Workflow (Viewing Gaps):
1. Once data is loaded, populate the header with KPIs from the `ReportPublic` object (`total_critical`, `total_high`, etc.).
2. Render the list of gaps from the `gaps` array.
3. **Crucially:** Group these gaps using the `cluster_summaries` object (e.g., create headers like "Cluster: Data Retention (5 gaps)").
4. Each `<GapCard>` must prominently feature the AI-generated `gap_description` as its main title.

### Workflow (Drill Down):
1. The user clicks a `<GapCard>`.
2. The card expands or opens a side-panel.
3. This view shows the `policy_section` and `regulation_section` text side-by-side for human verification.

### Workflow (Start Remediation):
1. The user clicks a "Generate Remediation Plan" button (this may be a one-time action if a plan doesn't exist).
2. This triggers a `useMutation` for `POST /api/remediation/reports/{report_id}/generate`.
3. A loading spinner appears. On success, navigate the user to the new plan: `/remediation/{plan_id}`.

## View 4: Remediation Roadmap (`/remediation/:planId`)

**Purpose:** This is the project management view. The user turns the AI's "plan" into "work."

### Workflow (Page Load):
1. Get the `planId` from the URL.
2. Call `GET /api/remediation/plans/{plan_id}` to get the `steps`.
3. Call `GET /api/remediation/plans/{plan_id}/dependencies` to get the `DependencyGraph`.
4. Render a Kanban board (using `dnd-kit`) with columns ("Draft," "In Progress," "Blocked," "Completed").
5. Populate the columns with `<TaskCard>` components based on the `steps` array.
6. Render a separate "Dependency View" (e.g., using `react-flow`) to show the `DependencyGraph` data visually.

### Workflow (Update Task Status):
1. The user drags a `<TaskCard>` from "In Progress" to "Completed."
2. The `onDragEnd` event fires.
3. This triggers a `useMutation` for `PATCH /api/remediation/steps/{step_id}/status` with the new status.
4. On success, invalidate the `['remediationPlan', planId]` query to refetch.

### Workflow (Export):
1. User clicks "Export" -> "Download as CSV."
2. This triggers an API call (not a query) to `GET /api/remediation/plans/{plan_id}/export?format=csv` which will initiate a file download.

## View 5: Policy Diff (`/policies/diff/:oldId/:newId`)

**Purpose:** A utility screen for users to manually compare two *document versions*.

### Workflow (Page Load):
1. Get `oldId` and `newId` from the URL.
2. Call `GET /api/policies/{old_id}/diff/{new_id}` using `useQuery`.
3. Display the stats (`total_additions`, `total_deletions`, `similarity_ratio`) in a header.
4. Render the `segments` array in a diff viewer component, highlighting additions in green and deletions in red.

## View 6: Report History & Comparison (`/reports/history/:reportId`)

**Purpose:** A manager-level view to compare two *analysis reports* over time (e.g., "Q3 Report" vs. "Q4 Report").

### Workflow (Page Load):
1. Get the *base* `reportId` from the URL (to find its history).
2. Call `GET /api/analysis/{report_id}/history` using `useQuery`.
3. Use this `HistoricalAnalysis` data to render a bar chart (X-axis: `analysis_date`, Y-axis: `total_gaps`).

### Workflow (Compare):
1. The user clicks on two bars in the chart (selecting two historical reports).
2. This enables a "Compare" button.
3. User clicks "Compare."
4. This triggers a `useMutation` for `POST /api/analysis/{report_id}/compare`.
5. The `ComparisonResult` data is then displayed in a new panel.
6. This panel *must* show the deltas (`gap_count_delta`) and the three lists: `new_gaps`, `resolved_gaps`, and `persistent_gaps`.

## View 7: Global Chat Sidebar (`<ChatSidebar />`)

**Purpose:** A persistent, context-aware AI assistant.

### Workflow (Load & List):
1. The sidebar loads. It calls `GET /api/chat/conversations` to list past chats.
2. The user can click a past chat, which then calls `GET /api/chat/conversations/{conversation_id}/messages` to populate the window.

### Workflow (Send Message):
1. The user types a message (e.g., "What are my critical gaps?").
2. The "Send" button triggers a `useMutation` for `POST /api/chat/send`.
3. **Context:** The chat component *must* know what page the user is on. If the user is on `/reports/123`, the `active_report_id` (123) must be sent with the chat request (this is handled by the backend's context model, but the frontend needs to supply it).
4. The `SendMessageResponse` is received.
5. The frontend adds *both* the user's `message` and the assistant's `response` to the UI.
6. The `follow_up_suggestions` are rendered as clickable buttons at the bottom of the chat.

## Implementation Status

### ✅ Completed
- Basic project setup with Vite + React + TypeScript
- API client with proxy configuration
- Document Library page with upload and display functionality
- Basic Dashboard page
- Status polling for document processing

### 🚧 In Progress
- File upload functionality (proxy configuration completed)
- Tab filtering between Regulations and Policies

### ❌ Missing Critical Features
- Document status polling with refetchInterval
- Analysis Report page with gap clustering
- Remediation Roadmap with Kanban board
- Policy Diff viewer
- Report History & Comparison
- Global Chat Sidebar
- New Analysis modal workflow

## Next Priority
Based on the workflow, the next critical implementation should be:
1. Complete Document Library with proper status polling
2. Implement New Analysis modal on Dashboard
3. Build Analysis Report page as the core "wow" feature
