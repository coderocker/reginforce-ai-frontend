# 🚨 API Endpoint Mismatch Report

## Overview
The frontend is using **OLD/INCORRECT** API endpoints that don't match the backend OpenAPI specification. This is why pages are showing blank or errors.

---

## ❌ ANALYSIS ENDPOINTS (WRONG)

### Current Frontend Usage (WRONG):
```typescript
// From src/api/index.ts
export const runAnalysis = async (request: AnalysisRequest): Promise<ReportPublic> => {
  const response = await apiClient.post<ReportPublic>("/analysis/run", request);
  return response.data;
};

export const getReports = async (): Promise<ReportPublic[]> => {
  const response = await apiClient.get<ReportPublic[]>("/analysis");
  return response.data;
};

export const getReport = async (reportId: number): Promise<ReportPublic> => {
  const response = await apiClient.get<ReportPublic>(`/analysis/${reportId}`);
  return response.data;
};

export const getAnalysisStats = async (): Promise<AnalysisStats> => {
  const response = await apiClient.get<AnalysisStats>("/analysis/stats");
  return response.data;
};

export const getReportTrends = async (reportId: number): Promise<TrendData> => {
  const response = await apiClient.get<TrendData>(`/analysis/${reportId}/trends`);
  return response.data;
};

export const getReportHistory = async (reportId: number): Promise<ComparisonResult> => {
  const response = await apiClient.get<ComparisonResult>(`/analysis/${reportId}/history`);
  return response.data;
};

export const compareReports = async (currentReportId: number, previousReportId: number) => {
  const response = await apiClient.post<ComparisonResult>(
    `/analysis/${currentReportId}/compare`,
    { previous_report_id: previousReportId }
  );
  return response.data;
};
```

### ✅ Correct OpenAPI Endpoints:
```
POST   /api/analysis/reports                          → Create report
GET    /api/analysis/reports                          → List reports
GET    /api/analysis/reports/{report_id}              → Get report
PATCH  /api/analysis/reports/{report_id}              → Update report
GET    /api/analysis/reports/statistics               → Report statistics
GET    /api/analysis/reports/{report_id}/severity-distribution
GET    /api/analysis/reports/{report_id}/export       → Export report
POST   /api/analysis/reports/{report_id}/execute      → Execute analysis

POST   /api/analysis/temporal-analysis                → Temporal analysis
GET    /api/analysis/temporal-trends                  → Temporal trends
GET    /api/analysis/statistics                       → Analysis statistics
GET    /api/analysis/gaps                             → List gaps
GET    /api/analysis/gaps/{gap_id}                    → Get gap
PATCH  /api/analysis/gaps/{gap_id}                    → Update gap
PATCH  /api/analysis/gaps/{gap_id}/status             → Update gap status
GET    /api/analysis/gaps/{gap_id}/history            → Gap history
POST   /api/analysis/documents/{document_id}/reports  → Reports by document
```

### 🔴 Issues:
- ❌ `/analysis/run` → DOESN'T EXIST (should be POST `/api/analysis/reports`)
- ❌ `/analysis` → DOESN'T EXIST (should be GET `/api/analysis/reports`)
- ❌ `/analysis/{reportId}` → WRONG (should be `/api/analysis/reports/{reportId}`)
- ❌ `/analysis/stats` → WRONG (should be `/api/analysis/reports/statistics`)
- ❌ `/analysis/{reportId}/trends` → WRONG (should be `/api/analysis/temporal-trends`)
- ❌ `/analysis/{reportId}/history` → WRONG (should be `/api/analysis/gaps/{gap_id}/history`)
- ❌ `/analysis/{reportId}/compare` → DOESN'T EXIST

---

## ❌ REMEDIATION ENDPOINTS (WRONG)

### Current Frontend Usage (WRONG):
```typescript
export const getRemediationPlanForReport = async (reportId: number) => {
  const response = await apiClient.get<RemediationPlanPublic>(
    `/remediation/reports/${reportId}`
  );
  return response.data;
};

export const generateRemediationPlan = async (reportId: number, options?: {...}) => {
  const response = await apiClient.post<RemediationPlanPublic>(
    `/remediation/reports/${reportId}/generate`,
    options || {}
  );
  return response.data;
};

export const getRemediationPlan = async (planId: number) => {
  const response = await apiClient.get<RemediationPlanPublic>(`/remediation/plans/${planId}`);
  return response.data;
};

export const getDependencyGraph = async (planId: number) => {
  const response = await apiClient.get<DependencyGraph>(
    `/remediation/plans/${planId}/dependencies`
  );
  return response.data;
};

export const updateRemediationStepStatus = async (stepId: number, status: string) => {
  await apiClient.patch(`/remediation/steps/${stepId}/status`, { status });
};

export const exportRemediationPlan = async (planId: number, format: string = "json") => {
  // Implementation missing!
};
```

### ✅ Correct OpenAPI Endpoints:
```
POST   /api/remediation/plans                         → Create plan
GET    /api/remediation/plans                         → List plans
GET    /api/remediation/plans/{plan_id}               → Get plan
GET    /api/remediation/reports/{report_id}/plans     → Plans by report
POST   /api/remediation/plans/{plan_id}/steps         → Create step
GET    /api/remediation/steps/{step_id}               → Get step
PATCH  /api/remediation/steps/{step_id}/status        → Update step status
GET    /api/remediation/templates                     → List templates
POST   /api/remediation/templates                     → Create template
GET    /api/remediation/templates/{template_id}       → Get template
POST   /api/remediation/templates/{template_id}/use   → Use template
```

### 🔴 Issues:
- ❌ `/remediation/reports/{reportId}` → WRONG (should be `/api/remediation/reports/{report_id}/plans`)
- ❌ `/remediation/reports/{reportId}/generate` → DOESN'T EXIST (should create plan then generate steps)
- ❌ `/remediation/plans/{planId}/dependencies` → DOESN'T EXIST (not in OpenAPI spec)
- ✅ `/remediation/steps/{stepId}/status` → CORRECT but uses POST in OpenAPI (not PATCH)

---

## ❌ POLICY/DOCUMENT ENDPOINTS (WRONG)

### Current Frontend Usage (WRONG):
```typescript
export const getPolicyDiff = async (oldId: number, newId: number, format: string = "json") => {
  const response = await apiClient.get<PolicyDiffPublic>(
    `/policies/${oldId}/diff/${newId}`,
    { params: { format } }
  );
  return response.data;
};
```

### ✅ Correct OpenAPI Endpoint:
```
GET    /api/documents/{old_id}/compare/{new_id}      → Compare documents
```

### 🔴 Issues:
- ❌ `/policies/{oldId}/diff/{newId}` → WRONG (should be `/api/documents/{old_id}/compare/{new_id}`)

---

## ✅ WORKING ENDPOINTS (NO CHANGES NEEDED)

These endpoints are **CORRECT** and match OpenAPI:

### Documents
```typescript
✅ GET    /documents/                        → getDocuments()
✅ GET    /documents/{id}                    → getDocument(id)
✅ POST   /documents/upload                  → uploadDocument()
✅ POST   /documents/{id}/new-version        → uploadNewVersion()
✅ GET    /documents/{id}/versions           → getDocumentVersions()
✅ POST   /documents/search/semantic         → (if implemented)
```

### Chat
```typescript
✅ (All chat endpoints via chatService.ts)
```

### OSS/Package Vetting
```typescript
✅ (All OSS endpoints via ossService.ts)
```

---

## 🔧 Required Changes

### File: `src/api/index.ts`

#### Change 1: Analysis Endpoints
```typescript
// WRONG:
export const runAnalysis = async (request: AnalysisRequest): Promise<ReportPublic> => {
  const response = await apiClient.post<ReportPublic>("/analysis/run", request);
  return response.data;
};

export const getReports = async (): Promise<ReportPublic[]> => {
  const response = await apiClient.get<ReportPublic[]>("/analysis");
  return response.data;
};

export const getReport = async (reportId: number): Promise<ReportPublic> => {
  const response = await apiClient.get<ReportPublic>(`/analysis/${reportId}`);
  return response.data;
};

// CORRECT:
export const runAnalysis = async (request: AnalysisRequest): Promise<ReportPublic> => {
  const response = await apiClient.post<ReportPublic>("/analysis/reports", request);
  return response.data;
};

export const getReports = async (): Promise<ReportPublic[]> => {
  const response = await apiClient.get<ReportPublic[]>("/analysis/reports");
  return response.data;
};

export const getReport = async (reportId: number): Promise<ReportPublic> => {
  const response = await apiClient.get<ReportPublic>(`/analysis/reports/${reportId}`);
  return response.data;
};
```

#### Change 2: Analysis Stats
```typescript
// WRONG:
export const getAnalysisStats = async (): Promise<AnalysisStats> => {
  const response = await apiClient.get<AnalysisStats>("/analysis/stats");
  return response.data;
};

// CORRECT:
export const getAnalysisStats = async (): Promise<AnalysisStats> => {
  const response = await apiClient.get<AnalysisStats>("/analysis/reports/statistics");
  return response.data;
};
```

#### Change 3: Report Trends & History
```typescript
// WRONG:
export const getReportTrends = async (reportId: number): Promise<TrendData> => {
  const response = await apiClient.get<TrendData>(`/analysis/${reportId}/trends`);
  return response.data;
};

export const getReportHistory = async (reportId: number): Promise<ComparisonResult> => {
  const response = await apiClient.get<ComparisonResult>(`/analysis/${reportId}/history`);
  return response.data;
};

// CORRECT:
export const getReportTrends = async (): Promise<TrendData> => {
  const response = await apiClient.get<TrendData>(`/analysis/temporal-trends`);
  return response.data;
};

export const getGapHistory = async (gapId: number): Promise<any> => {
  const response = await apiClient.get(`/analysis/gaps/${gapId}/history`);
  return response.data;
};
```

#### Change 4: Remediation Endpoints
```typescript
// WRONG:
export const getRemediationPlanForReport = async (reportId: number) => {
  const response = await apiClient.get<RemediationPlanPublic>(
    `/remediation/reports/${reportId}`
  );
  return response.data;
};

export const generateRemediationPlan = async (reportId: number, options?: {...}) => {
  const response = await apiClient.post<RemediationPlanPublic>(
    `/remediation/reports/${reportId}/generate`,
    options || {}
  );
  return response.data;
};

export const getDependencyGraph = async (planId: number) => {
  const response = await apiClient.get<DependencyGraph>(
    `/remediation/plans/${planId}/dependencies`
  );
  return response.data;
};

// CORRECT:
export const getRemediationPlanForReport = async (reportId: number) => {
  const response = await apiClient.get<RemediationPlanPublic[]>(
    `/remediation/reports/${reportId}/plans`
  );
  return response.data[0]; // Get first plan or handle array
};

export const createRemediationPlan = async (reportId: number, data?: {...}) => {
  const response = await apiClient.post<RemediationPlanPublic>(
    `/remediation/plans`,
    { analysis_report_id: reportId, ...data }
  );
  return response.data;
};

export const generateRemediationPlan = async (reportId: number, options?: {...}) => {
  // Step 1: Create plan
  const plan = await createRemediationPlan(reportId, options);
  return plan;
};

export const getDependencyGraph = async (planId: number) => {
  // NOTE: This endpoint doesn't exist in OpenAPI
  // You may need to calculate dependencies from plan.steps
  const plan = await getRemediationPlan(planId);
  // Transform plan.steps into a dependency graph
  return transformPlanToGraph(plan);
};
```

#### Change 5: Policy Diff
```typescript
// WRONG:
export const getPolicyDiff = async (oldId: number, newId: number, format: string = "json") => {
  const response = await apiClient.get<PolicyDiffPublic>(
    `/policies/${oldId}/diff/${newId}`,
    { params: { format } }
  );
  return response.data;
};

// CORRECT:
export const getPolicyDiff = async (oldId: number, newId: number) => {
  const response = await apiClient.get<PolicyDiffPublic>(
    `/documents/${oldId}/compare/${newId}`
  );
  return response.data;
};
```

---

## 📋 Summary of Fixes Needed

| Endpoint | Current (WRONG) | Correct (OpenAPI) | Status |
|----------|-----------------|-------------------|--------|
| Create Report | `POST /analysis/run` | `POST /analysis/reports` | ❌ WRONG |
| List Reports | `GET /analysis` | `GET /analysis/reports` | ❌ WRONG |
| Get Report | `GET /analysis/{id}` | `GET /analysis/reports/{id}` | ❌ WRONG |
| Report Stats | `GET /analysis/stats` | `GET /analysis/reports/statistics` | ❌ WRONG |
| Report Trends | `GET /analysis/{id}/trends` | `GET /analysis/temporal-trends` | ❌ WRONG |
| Gap History | `GET /analysis/{id}/history` | `GET /analysis/gaps/{id}/history` | ❌ WRONG |
| Compare Reports | `POST /analysis/{id}/compare` | ❌ Not in spec | ❌ WRONG |
| Compare Docs | `GET /policies/{old}/diff/{new}` | `GET /documents/{old}/compare/{new}` | ❌ WRONG |
| Plans by Report | `GET /remediation/reports/{id}` | `GET /remediation/reports/{id}/plans` | ❌ WRONG |
| Generate Plan | `POST /remediation/reports/{id}/generate` | Create via `/remediation/plans` | ❌ WRONG |
| Plan Dependencies | `GET /remediation/plans/{id}/dependencies` | ❌ Not in spec | ❌ WRONG |

---

## 🚀 Action Items

1. **Update `src/api/index.ts`** - Fix all 5 endpoint issues
2. **Update component usages** - Ensure components use correct parameter names
3. **Test all pages** - Dashboard, Reports, Remediation, Documents
4. **Check response structures** - Ensure data parsing matches actual backend responses

---

## 🔗 References

- OpenAPI Spec: `openapi.json` (10,350 lines)
- Analysis Endpoints: Lines 1304-2386
- Remediation Endpoints: Lines 2430-3083
- Document Endpoints: Lines 106-605
