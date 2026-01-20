import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { ossService } from "../../services/ossService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import {
  LinkingType,
  LinkingTypeReviewStatus,
  ComplianceStatus,
  LINKING_TYPE_LABELS,
  LINKING_TYPE_ICONS,
  COMPLIANCE_STATUS_LABELS,
  COMPLIANCE_STATUS_ICONS,
  COMPLIANCE_STATUS_COLORS,
  LINKING_TYPE_REVIEW_STATUS_LABELS,
  LINKING_TYPE_REVIEW_STATUS_ICONS,
  LINKING_TYPE_REVIEW_STATUS_COLORS,
  DEPENDENCY_SOURCE_LABELS,
  getConfidenceColor,
  getFinalLinkingType,
  parseLinkingTypeReasons,
} from "../../types/oss";
import type {
  SbomComponent,
  ComponentFilter,
  ComponentReviewRequest,
  LinkingTypeOverrideRequest,
} from "../../types/oss";

export function Components() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Filter state
  const [filters, setFilters] = useState<ComponentFilter>({
    project_id: searchParams.get("project")
      ? parseInt(searchParams.get("project")!, 10)
      : undefined,
    sbom_id: searchParams.get("sbom")
      ? parseInt(searchParams.get("sbom")!, 10)
      : undefined,
    status: searchParams.get("status") as ComplianceStatus | undefined,
    linking_type: searchParams.get("linking_type") as LinkingType | undefined,
    linking_type_review_status: searchParams.get("review_status") as LinkingTypeReviewStatus | undefined,
    confidence_max: searchParams.get("confidence_max")
      ? parseInt(searchParams.get("confidence_max")!, 10)
      : undefined,
    package_name: searchParams.get("search") || undefined,
    limit: 50,
    offset: 0,
  });

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingComponent, setReviewingComponent] = useState<SbomComponent | null>(null);
  const [isBulkReview, setIsBulkReview] = useState(false);

  // Linking type review modal state
  const [showLinkingTypeModal, setShowLinkingTypeModal] = useState(false);
  const [linkingTypeComponent, setLinkingTypeComponent] = useState<SbomComponent | null>(null);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideForm, setOverrideForm] = useState<LinkingTypeOverrideRequest>({
    override_linking_type: LinkingType.UNKNOWN,
    override_reason: "",
  });

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Review form state
  const [reviewForm, setReviewForm] = useState<ComponentReviewRequest>({
    linking_type: LinkingType.UNKNOWN,
    status: ComplianceStatus.PENDING_REVIEW,
    review_notes: "",
  });

  // Fetch projects for filter dropdown
  const { data: projectList } = useQuery({
    queryKey: ["oss-projects"],
    queryFn: () => ossService.listProjects({ is_active: true }),
  });
  const projects = projectList?.items || [];

  // Fetch SBOMs for filter dropdown
  const { data: sbomList } = useQuery({
    queryKey: ["oss-sboms", filters.project_id],
    queryFn: () => ossService.listSboms({ project_id: filters.project_id }),
    enabled: !!filters.project_id,
  });
  const sboms = sbomList?.items || [];

  // Fetch components
  const {
    data: componentsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["oss-components", filters],
    queryFn: () => ossService.listComponents(filters),
  });

  const components = componentsData?.items || [];
  const total = componentsData?.total || 0;

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ComponentReviewRequest }) =>
      ossService.reviewComponent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oss-components"] });
      closeReviewModal();
    },
  });

  // Bulk review mutation
  const bulkReviewMutation = useMutation({
    mutationFn: (data: {
      component_ids: number[];
      linking_type: LinkingType;
      status: ComplianceStatus;
      review_notes?: string;
    }) => ossService.bulkReviewComponents(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oss-components"] });
      setSelectedIds(new Set());
      closeReviewModal();
    },
  });

  // Confirm linking type mutation
  const confirmLinkingTypeMutation = useMutation({
    mutationFn: (componentId: number) => ossService.confirmLinkingType(componentId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["oss-components"] });
      setShowLinkingTypeModal(false);
      setLinkingTypeComponent(null);
      showToast("Linking type confirmed successfully", "success");
    },
    onError: (error: Error) => {
      showToast(error.message || "Failed to confirm linking type", "error");
    },
  });

  // Override linking type mutation
  const overrideLinkingTypeMutation = useMutation({
    mutationFn: ({ componentId, data }: { componentId: number; data: LinkingTypeOverrideRequest }) =>
      ossService.overrideLinkingType(componentId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["oss-components"] });
      setShowLinkingTypeModal(false);
      setLinkingTypeComponent(null);
      setShowOverrideForm(false);
      showToast("Linking type overridden successfully", "success");
    },
    onError: (error: Error) => {
      showToast(error.message || "Failed to override linking type", "error");
    },
  });

  // Toast helper
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Filter handlers
  const updateFilter = (key: keyof ComponentFilter, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined, offset: 0 };
    setFilters(newFilters);
    
    // Update URL params
    const newParams = new URLSearchParams();
    if (newFilters.project_id) newParams.set("project", newFilters.project_id.toString());
    if (newFilters.sbom_id) newParams.set("sbom", newFilters.sbom_id.toString());
    if (newFilters.status) newParams.set("status", newFilters.status);
    if (newFilters.linking_type) newParams.set("linking_type", newFilters.linking_type);
    if (newFilters.linking_type_review_status) newParams.set("review_status", newFilters.linking_type_review_status);
    if (newFilters.confidence_max) newParams.set("confidence_max", newFilters.confidence_max.toString());
    if (newFilters.package_name) newParams.set("search", newFilters.package_name);
    setSearchParams(newParams);
  };

  // Open linking type review modal
  const openLinkingTypeReview = (component: SbomComponent) => {
    setLinkingTypeComponent(component);
    setShowOverrideForm(false);
    setOverrideForm({
      override_linking_type: component.linking_type,
      override_reason: "",
    });
    setShowLinkingTypeModal(true);
  };

  // Handle confirm
  const handleConfirmLinkingType = () => {
    if (linkingTypeComponent) {
      confirmLinkingTypeMutation.mutate(linkingTypeComponent.id);
    }
  };

  // Handle override
  const handleOverrideLinkingType = () => {
    if (linkingTypeComponent) {
      overrideLinkingTypeMutation.mutate({
        componentId: linkingTypeComponent.id,
        data: overrideForm,
      });
    }
  };

  // Selection handlers
  const toggleSelection = (id: number) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === components.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(components.map((c) => c.id)));
    }
  };

  // Review modal handlers
  const openReviewModal = (component: SbomComponent | null, bulk = false) => {
    setReviewingComponent(component);
    setIsBulkReview(bulk);
    if (component) {
      setReviewForm({
        linking_type: component.linking_type,
        status: component.status,
        review_notes: component.review_notes || "",
      });
    } else {
      setReviewForm({
        linking_type: LinkingType.DYNAMICALLY_LINKED,
        status: ComplianceStatus.ALLOWED,
        review_notes: "",
      });
    }
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setReviewingComponent(null);
    setIsBulkReview(false);
  };

  const handleReviewSubmit = () => {
    if (isBulkReview) {
      bulkReviewMutation.mutate({
        component_ids: Array.from(selectedIds),
        ...reviewForm,
      });
    } else if (reviewingComponent) {
      reviewMutation.mutate({
        id: reviewingComponent.id,
        data: reviewForm,
      });
    }
  };

  // Pagination
  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1;
  const totalPages = Math.ceil(total / (filters.limit || 50));

  const goToPage = (page: number) => {
    setFilters((prev) => ({
      ...prev,
      offset: (page - 1) * (prev.limit || 50),
    }));
  };

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f1f2f3] px-10 py-3">
        <div className="flex items-center gap-4 text-[#131416]">
          <h2 className="text-[#131416] text-lg font-bold leading-tight tracking-[-0.015em]">
            Component Review
          </h2>
          <span className="text-sm text-gray-500">
            {total} component{total !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <Button
              variant="primary"
              onClick={() => openReviewModal(null, true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Bulk Review ({selectedIds.size})
            </Button>
          )}
          <Link to="/oss/sbom/upload">
            <Button variant="secondary">Upload SBOM</Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-col p-6 gap-6">
        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="🔍 Search packages..."
                value={filters.package_name || ""}
                onChange={(e) => updateFilter("package_name", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Project Filter */}
            <select
              value={filters.project_id || ""}
              onChange={(e) =>
                updateFilter("project_id", e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* SBOM Filter */}
            {filters.project_id && (
              <select
                value={filters.sbom_id || ""}
                onChange={(e) =>
                  updateFilter("sbom_id", e.target.value ? parseInt(e.target.value, 10) : undefined)
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All SBOMs</option>
                {sboms.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.release_version})
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={filters.status || ""}
              onChange={(e) =>
                updateFilter("status", e.target.value || undefined)
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Statuses</option>
              {Object.entries(ComplianceStatus).map(([key, value]) => (
                <option key={value} value={value}>
                  {COMPLIANCE_STATUS_ICONS[value]} {COMPLIANCE_STATUS_LABELS[value]}
                </option>
              ))}
            </select>

            {/* Linking Type Filter */}
            <select
              value={filters.linking_type || ""}
              onChange={(e) =>
                updateFilter("linking_type", e.target.value || undefined)
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Linking Types</option>
              {Object.entries(LinkingType).map(([key, value]) => (
                <option key={value} value={value}>
                  {LINKING_TYPE_ICONS[value]} {LINKING_TYPE_LABELS[value]}
                </option>
              ))}
            </select>

            {/* Review Status Filter */}
            <select
              value={filters.linking_type_review_status || ""}
              onChange={(e) =>
                updateFilter("linking_type_review_status", e.target.value || undefined)
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Review Status</option>
              {Object.entries(LinkingTypeReviewStatus).map(([key, value]) => (
                <option key={value} value={value}>
                  {LINKING_TYPE_REVIEW_STATUS_ICONS[value]} {LINKING_TYPE_REVIEW_STATUS_LABELS[value]}
                </option>
              ))}
            </select>

            {/* Confidence Filter */}
            <select
              value={filters.confidence_max?.toString() || ""}
              onChange={(e) =>
                updateFilter("confidence_max", e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Confidence</option>
              <option value="50">Low (&lt; 50%)</option>
              <option value="70">Medium (&lt; 70%)</option>
              <option value="80">Needs Review (&lt; 80%)</option>
            </select>

            {/* Clear Filters */}
            {(filters.project_id || filters.sbom_id || filters.status || filters.linking_type || filters.linking_type_review_status || filters.confidence_max || filters.package_name) && (
              <button
                onClick={() => {
                  setFilters({ limit: 50, offset: 0 });
                  setSearchParams(new URLSearchParams());
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </button>
            )}
          </div>
        </Card>

        {/* Components Table */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600">
              Error loading components: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          ) : components.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Components Found
              </h3>
              <p className="text-gray-600 mb-4">
                {filters.package_name || filters.status || filters.linking_type
                  ? "Try adjusting your filters"
                  : "Upload an SBOM to get started"}
              </p>
              <Link to="/oss/sbom/upload">
                <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700">
                  Upload SBOM
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === components.length && components.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                        Package
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                        License
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                        Linking Type
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 uppercase">
                        Confidence
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 uppercase">
                        Review
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                        Compliance
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 uppercase min-w-[140px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((component) => (
                      <ComponentRow
                        key={component.id}
                        component={component}
                        isSelected={selectedIds.has(component.id)}
                        onToggleSelect={() => toggleSelection(component.id)}
                        onReview={() => openReviewModal(component)}
                        onOpenLinkingTypeReview={() => openLinkingTypeReview(component)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    Showing {(filters.offset || 0) + 1} - {Math.min((filters.offset || 0) + (filters.limit || 50), total)} of {total}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => goToPage(currentPage - 1)}
                    >
                      ←
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => goToPage(currentPage + 1)}
                    >
                      →
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          component={reviewingComponent}
          isBulk={isBulkReview}
          bulkCount={selectedIds.size}
          form={reviewForm}
          setForm={setReviewForm}
          onSubmit={handleReviewSubmit}
          onClose={closeReviewModal}
          isLoading={reviewMutation.isPending || bulkReviewMutation.isPending}
          error={reviewMutation.error || bulkReviewMutation.error}
        />
      )}

      {/* Linking Type Review Modal */}
      {showLinkingTypeModal && linkingTypeComponent && (
        <LinkingTypeReviewModal
          component={linkingTypeComponent}
          showOverrideForm={showOverrideForm}
          setShowOverrideForm={setShowOverrideForm}
          overrideForm={overrideForm}
          setOverrideForm={setOverrideForm}
          onConfirm={handleConfirmLinkingType}
          onOverride={handleOverrideLinkingType}
          onClose={() => {
            setShowLinkingTypeModal(false);
            setLinkingTypeComponent(null);
            setShowOverrideForm(false);
          }}
          isConfirming={confirmLinkingTypeMutation.isPending}
          isOverriding={overrideLinkingTypeMutation.isPending}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 transition-all ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-80"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

// Component Row
interface ComponentRowProps {
  component: SbomComponent;
  isSelected: boolean;
  onToggleSelect: () => void;
  onReview: () => void;
  onOpenLinkingTypeReview: () => void;
}

function ComponentRow({ component, isSelected, onToggleSelect, onReview, onOpenLinkingTypeReview }: ComponentRowProps) {
  const statusColors = COMPLIANCE_STATUS_COLORS[component.status];
  const finalLinkingType = getFinalLinkingType(component);
  const confidence = component.linking_type_confidence ?? 0;
  const confidenceColors = getConfidenceColor(confidence);
  const reviewStatus = component.linking_type_review_status ?? LinkingTypeReviewStatus.PENDING;
  const reviewStatusColors = LINKING_TYPE_REVIEW_STATUS_COLORS[reviewStatus];

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="rounded border-gray-300"
        />
      </td>
      <td className="px-3 py-3">
        <div className="font-medium text-gray-900 text-sm">{component.package_name}</div>
        <div className="text-xs text-gray-500">
          {component.package_version} • {component.package_ecosystem}
        </div>
      </td>
      <td className="px-3 py-3">
        <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded">
          {component.license_spdx}
        </span>
      </td>
      <td className="px-3 py-3">
        <button
          onClick={onOpenLinkingTypeReview}
          className="flex items-center gap-1.5 text-sm hover:bg-gray-100 px-2 py-1 rounded transition-colors"
          title="Click to review linking type"
        >
          <span>{LINKING_TYPE_ICONS[finalLinkingType]}</span>
          <span className="text-gray-700 text-xs">
            {LINKING_TYPE_LABELS[finalLinkingType]}
          </span>
          {reviewStatus === LinkingTypeReviewStatus.OVERRIDDEN && (
            <span className="text-blue-500 text-xs" title="Overridden">✏️</span>
          )}
        </button>
      </td>
      <td className="px-3 py-3 text-center">
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${confidenceColors.bg} ${confidenceColors.text}`}
          title={`Confidence: ${confidence}%`}
        >
          {confidence}%
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${reviewStatusColors.bg} ${reviewStatusColors.text}`}
        >
          {LINKING_TYPE_REVIEW_STATUS_ICONS[reviewStatus]}
        </span>
      </td>
      <td className="px-3 py-3">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}
        >
          {COMPLIANCE_STATUS_ICONS[component.status]}
          <span className="hidden sm:inline">{COMPLIANCE_STATUS_LABELS[component.status]}</span>
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={onOpenLinkingTypeReview}
            className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded font-medium"
            title="Review linking type"
          >
            🔗
          </button>
          <button
            onClick={onReview}
            className="text-xs px-2 py-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded font-medium"
            title="Full review"
          >
            Review
          </button>
        </div>
      </td>
    </tr>
  );
}

// Review Modal
interface ReviewModalProps {
  component: SbomComponent | null;
  isBulk: boolean;
  bulkCount: number;
  form: ComponentReviewRequest;
  setForm: (form: ComponentReviewRequest) => void;
  onSubmit: () => void;
  onClose: () => void;
  isLoading: boolean;
  error: Error | null;
}

function ReviewModal({
  component,
  isBulk,
  bulkCount,
  form,
  setForm,
  onSubmit,
  onClose,
  isLoading,
  error,
}: ReviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isBulk
              ? `Bulk Review (${bulkCount} components)`
              : `Review: ${component?.package_name}`}
          </h3>
          {component && !isBulk && (
            <p className="text-sm text-gray-500 mt-1">
              v{component.package_version} • {component.license_spdx}
            </p>
          )}
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Linking Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Linking Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(LinkingType).map(([key, value]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, linking_type: value })}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-colors ${
                    form.linking_type === value
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span>{LINKING_TYPE_ICONS[value]}</span>
                  <span className="text-sm font-medium">{LINKING_TYPE_LABELS[value]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Compliance Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compliance Status *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ComplianceStatus).map(([key, value]) => {
                const colors = COMPLIANCE_STATUS_COLORS[value];
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, status: value })}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-colors ${
                      form.status === value
                        ? `border-current ${colors.bg} ${colors.text}`
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span>{COMPLIANCE_STATUS_ICONS[value]}</span>
                    <span className="text-sm font-medium">{COMPLIANCE_STATUS_LABELS[value]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Notes
            </label>
            <textarea
              value={form.review_notes || ""}
              onChange={(e) => setForm({ ...form, review_notes: e.target.value })}
              placeholder="Add notes about this compliance decision..."
              rows={3}
              maxLength={2000}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error.message}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSubmit}
            isLoading={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isBulk ? `Review ${bulkCount} Components` : "Save Review"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Linking Type Review Modal
interface LinkingTypeReviewModalProps {
  component: SbomComponent;
  showOverrideForm: boolean;
  setShowOverrideForm: (show: boolean) => void;
  overrideForm: LinkingTypeOverrideRequest;
  setOverrideForm: (form: LinkingTypeOverrideRequest) => void;
  onConfirm: () => void;
  onOverride: () => void;
  onClose: () => void;
  isConfirming: boolean;
  isOverriding: boolean;
}

function LinkingTypeReviewModal({
  component,
  showOverrideForm,
  setShowOverrideForm,
  overrideForm,
  setOverrideForm,
  onConfirm,
  onOverride,
  onClose,
  isConfirming,
  isOverriding,
}: LinkingTypeReviewModalProps) {
  const confidence = component.linking_type_confidence ?? 0;
  const confidenceColors = getConfidenceColor(confidence);
  const reasons = parseLinkingTypeReasons(component.linking_type_reasons);
  const reviewStatus = component.linking_type_review_status ?? LinkingTypeReviewStatus.PENDING;
  const reviewStatusColors = LINKING_TYPE_REVIEW_STATUS_COLORS[reviewStatus];
  const finalLinkingType = getFinalLinkingType(component);
  const isReviewed = reviewStatus !== LinkingTypeReviewStatus.PENDING;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                🔗 Review Linking Type
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {component.package_name} @ {component.package_version}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Package Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Ecosystem:</span>
              <span className="ml-2 font-medium text-gray-900">{component.package_ecosystem}</span>
            </div>
            <div>
              <span className="text-gray-500">Dependency Source:</span>
              <span className="ml-2 font-medium text-gray-900">
                {DEPENDENCY_SOURCE_LABELS[component.dependency_source] ?? "Unknown"}
              </span>
            </div>
          </div>

          {/* Computed Linking Type Box */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Computed Linking Type
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${reviewStatusColors.bg} ${reviewStatusColors.text}`}
              >
                {LINKING_TYPE_REVIEW_STATUS_ICONS[reviewStatus]}
                {LINKING_TYPE_REVIEW_STATUS_LABELS[reviewStatus]}
              </span>
            </div>

            <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{LINKING_TYPE_ICONS[component.linking_type]}</span>
                <span className="font-semibold text-gray-900">
                  {LINKING_TYPE_LABELS[component.linking_type]}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">Confidence</span>
                <div className={`text-lg font-bold ${confidenceColors.text}`}>
                  {confidence}%
                </div>
              </div>
            </div>

            {/* Reasons */}
            {reasons.length > 0 && (
              <div className="mt-3">
                <span className="text-xs font-medium text-gray-500">Reasons:</span>
                <ul className="mt-1 space-y-1">
                  {reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-gray-400">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* If Overridden, show original vs final */}
          {reviewStatus === LinkingTypeReviewStatus.OVERRIDDEN && component.linking_type_user_override && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600">✏️</span>
                <span className="font-semibold text-blue-800">Override Applied</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  Original: {LINKING_TYPE_LABELS[component.linking_type]}
                </span>
                <span className="text-gray-400">→</span>
                <span className="text-sm font-medium text-blue-700">
                  {LINKING_TYPE_ICONS[component.linking_type_user_override]}{" "}
                  {LINKING_TYPE_LABELS[component.linking_type_user_override]}
                </span>
              </div>
              {component.linking_type_confirmed_at && (
                <p className="text-xs text-gray-500 mt-2">
                  Reviewed at: {new Date(component.linking_type_confirmed_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Override Form */}
          {showOverrideForm ? (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-3">Override Linking Type</h4>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Linking Type *
                </label>
                <select
                  value={overrideForm.override_linking_type}
                  onChange={(e) =>
                    setOverrideForm({
                      ...overrideForm,
                      override_linking_type: e.target.value as LinkingType,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {Object.entries(LinkingType).map(([key, value]) => (
                    <option key={value} value={value}>
                      {LINKING_TYPE_ICONS[value]} {LINKING_TYPE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Override
                </label>
                <textarea
                  value={overrideForm.override_reason || ""}
                  onChange={(e) =>
                    setOverrideForm({ ...overrideForm, override_reason: e.target.value })
                  }
                  placeholder="Why are you overriding the computed value?"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowOverrideForm(false)}
                  disabled={isOverriding}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOverride}
                  isLoading={isOverriding}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Submit Override
                </Button>
              </div>
            </div>
          ) : (
            /* Action Buttons */
            <div className="flex items-center gap-3">
              {reviewStatus === LinkingTypeReviewStatus.PENDING ? (
                <>
                  <Button
                    variant="primary"
                    onClick={onConfirm}
                    isLoading={isConfirming}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    ✅ Confirm
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowOverrideForm(true)}
                    className="flex-1"
                  >
                    ✏️ Override
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => setShowOverrideForm(true)}
                  className="flex-1"
                >
                  ✏️ Change Override
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Linking type affects GPL compliance requirements. Review carefully.
          </p>
        </div>
      </div>
    </div>
  );
}
