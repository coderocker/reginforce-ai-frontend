import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";

import ReactFlow, {
  type Node,
  type Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";

import "reactflow/dist/style.css";

// Define node and edge types outside component to prevent ReactFlow warnings
const nodeTypes = {};
const edgeTypes = {};

import {
  getRemediationPlanForReport,
  createRemediationPlan,
  getRemediationPlan,
  getDependencyGraph,
  updateRemediationStepStatus,
  exportRemediationPlan
} from "../api";
import type { RemediationStepPublic } from "../types/api.js";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { StatusPill } from "../components/ui/StatusPill";

// Kanban Card Detail Modal Component
const KanbanCardModal = ({
  isOpen,
  onClose,
  step,
  onStatusUpdate
}: {
  isOpen: boolean;
  onClose: () => void;
  step: RemediationStepPublic;
  onStatusUpdate: (stepId: number, status: string) => void;
}) => {
  const getEffortColor = (effort: string) => {
    const colors = {
      S: "bg-green-100 text-green-800",
      M: "bg-yellow-100 text-yellow-800",
      L: "bg-orange-100 text-orange-800",
      XL: "bg-red-100 text-red-800",
    };
    return colors[effort as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{step.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close modal"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={step.status}
              onChange={(e) => onStatusUpdate(step.id, e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Change step status"
            >
              <option value="draft">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effort Size</label>
              <div className={`inline-block px-3 py-1 rounded text-sm ${getEffortColor(step.effort_size)}`}>
                {step.effort_size}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effort Hours</label>
              <div className="text-sm text-gray-900">{step.effort_hours}h</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Strategy</label>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{step.strategy}</p>
          </div>

          {step.implementation_steps && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Implementation Steps</label>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{step.implementation_steps}</p>
            </div>
          )}

          {step.dependencies && step.dependencies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dependencies</label>
              <div className="text-sm text-gray-900">
                {step.dependencies.join(", ")}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
            {step.started_at && (
              <div>
                <label className="block font-medium text-gray-700 mb-1">Started At</label>
                <div>{new Date(step.started_at).toLocaleDateString()}</div>
              </div>
            )}
            {step.completed_at && (
              <div>
                <label className="block font-medium text-gray-700 mb-1">Completed At</label>
                <div>{new Date(step.completed_at).toLocaleDateString()}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Kanban Column Component
const KanbanColumn = ({
  title,
  steps,
  status,
  onStatusUpdate,
}: {
  title: string;
  steps: RemediationStepPublic[];
  status: string;
  onStatusUpdate: (stepId: number, status: string) => void;
}) => {
  const { setNodeRef } = useDroppable({
    id: `column-${status}`,
  });

  return (
    <Card className="min-h-96">
      <div ref={setNodeRef} className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {steps.length}
          </span>
        </div>

        <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {steps.map((step) => (
              <KanbanCard
                key={step.id}
                step={step}
                onStatusUpdate={onStatusUpdate}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </Card>
  );
};

// Sortable Kanban Card Component
const KanbanCard = ({
  step,
  onStatusUpdate
}: {
  step: RemediationStepPublic;
  onStatusUpdate: (stepId: number, status: string) => void;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
  } = useSortable({ id: step.id });

  const getEffortColor = (effort: string) => {
    const colors = {
      S: "bg-green-100 text-green-800",
      M: "bg-yellow-100 text-yellow-800",
      L: "bg-orange-100 text-orange-800",
      XL: "bg-red-100 text-red-800",
    };
    return colors[effort as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow touch-manipulation"
        onClick={() => {
          setIsModalOpen(true);
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-gray-900 text-sm flex-1 pr-2">
            {truncateText(step.title)}
          </h4>
          <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${getEffortColor(step.effort_size)}`}>
            {step.effort_size}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <StatusPill status={step.status} />
          <span className="text-xs text-gray-500">
            {step.effort_hours}h
          </span>
        </div>
      </div>

      <KanbanCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        step={step}
        onStatusUpdate={onStatusUpdate}
      />
    </>
  );
};

// Drag Overlay Card Component (visual feedback during drag)
const DragOverlayCard = ({ step }: { step: RemediationStepPublic }) => {
  const getEffortColor = (effort: string) => {
    const colors = {
      S: "bg-green-100 text-green-800",
      M: "bg-yellow-100 text-yellow-800",
      L: "bg-orange-100 text-orange-800",
      XL: "bg-red-100 text-red-800",
    };
    return colors[effort as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="bg-white border-2 border-blue-400 rounded-lg p-3 shadow-lg transform rotate-3 cursor-grabbing opacity-90">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm flex-1 pr-2">
          {truncateText(step.title)}
        </h4>
        <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${getEffortColor(step.effort_size)}`}>
          {step.effort_size}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <StatusPill status={step.status} />
        <span className="text-xs text-gray-500">
          {step.effort_hours}h
        </span>
      </div>
    </div>
  );
};

export function Remediation() {
  const { reportId } = useParams<{ reportId: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"kanban" | "flow">("kanban");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before dragging starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // State to hold the created plan
  const [createdPlan, setCreatedPlan] = useState<any>(null);
  const [isFetchingFullPlan, setIsFetchingFullPlan] = useState(false);

  // Reset created plan when reportId changes
  useEffect(() => {
    setCreatedPlan(null);
    setIsFetchingFullPlan(false);
    setIsCreatingPlan(false);
  }, [reportId]);

  // First, try to get existing plan for the report
  const {
    data: existingPlan,
    isLoading: existingPlanLoading,
    error: existingPlanError,
  } = useQuery({
    queryKey: ['remediationPlanForReport', reportId],
    queryFn: () => getRemediationPlanForReport(Number(reportId)),
    enabled: !!reportId,
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: () => createRemediationPlan(Number(reportId)),
    onSuccess: async (data) => {
      console.log('Plan created successfully:', data);
      
      // Keep loading state while fetching full plan
      setIsFetchingFullPlan(true);
      
      // Fetch the full plan with steps
      if (data?.id) {
        try {
          const fullPlan = await getRemediationPlan(data.id);
          console.log('Full plan fetched:', fullPlan);
          setCreatedPlan(fullPlan);
        } catch (fetchError) {
          console.error('Failed to fetch full plan:', fetchError);
          // Fallback to the create response
          setCreatedPlan(data);
        }
      } else {
        setCreatedPlan(data);
      }
      
      // Also invalidate the query to refresh
      queryClient.invalidateQueries({ queryKey: ['remediationPlanForReport', reportId] });
      setIsCreatingPlan(false);
      setIsFetchingFullPlan(false);
    },
    onError: (error) => {
      console.error('Failed to create plan:', error);
      setIsCreatingPlan(false);
      setIsFetchingFullPlan(false);
    }
  });

  // Use existing plan, created plan, or null
  const plan = existingPlan || createdPlan;
  const planId = plan?.id;
  // Include isFetchingFullPlan to maintain loading state during async operations
  const planLoading = existingPlanLoading || isCreatingPlan || createPlanMutation.isPending || isFetchingFullPlan;
  const planError = existingPlanError;

  // Debug logging
  console.log('Remediation State:', {
    reportId,
    existingPlan: existingPlan?.id,
    createdPlan: createdPlan?.id,
    plan: plan?.id,
    planSteps: plan?.steps?.length,
    planLoading,
    existingPlanLoading,
    isCreatingPlan,
    isPending: createPlanMutation.isPending,
    isFetchingFullPlan
  });

  // Fetch dependency graph
  const { data: dependencyGraph } = useQuery({
    queryKey: ['dependencyGraph', planId],
    queryFn: () => getDependencyGraph(planId!),
    enabled: !!planId && activeTab === "flow",
  });

  // Update step status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ stepId, status }: { stepId: number; status: string }) =>
      updateRemediationStepStatus(stepId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remediationPlanForReport', reportId] });
    },
  });

  // Export format state
  const [exportFormat, setExportFormat] = useState<string>('pdf');

  // Export plan mutation
  const exportPlanMutation = useMutation({
    mutationFn: (format: string) => exportRemediationPlan(planId!, format),
    onSuccess: (data, format) => {
      // Handle file download with proper extension
      const fileExtensions: Record<string, string> = {
        json: 'json',
        csv: 'csv',
        jira: 'json',
        markdown: 'md',
        pdf: 'pdf'
      };

      const extension = fileExtensions[format] || 'txt';
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `remediation-plan-${planId}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
  });

  // Initialize flow nodes and edges when dependency graph loads
  useEffect(() => {
    if (dependencyGraph) {
      // Create a more intelligent layout based on dependencies
      const nodeMap = new Map(dependencyGraph.nodes.map(node => [node.step_id, node]));
      const visited = new Set<number>();
      const levels: number[][] = [];

      // Assign nodes to levels based on dependency depth
      const assignLevel = (nodeId: number, level: number = 0) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        if (!levels[level]) levels[level] = [];
        levels[level].push(nodeId);

        const node = nodeMap.get(nodeId);
        if (node) {
          node.blocks.forEach(blockedId => {
            if (!visited.has(blockedId)) {
              assignLevel(blockedId, level + 1);
            }
          });
        }
      };

      // Start with nodes that have no dependencies
      dependencyGraph.nodes
        .filter(node => node.depends_on.length === 0)
        .forEach(node => assignLevel(node.step_id));

      // Handle remaining nodes
      dependencyGraph.nodes.forEach(node => {
        if (!visited.has(node.step_id)) {
          assignLevel(node.step_id);
        }
      });

      const flowNodes: Node[] = dependencyGraph.nodes.map((node) => {
        const level = levels.findIndex(levelNodes => levelNodes.includes(node.step_id));
        const positionInLevel = levels[level]?.indexOf(node.step_id) || 0;

        return {
          id: node.step_id.toString(),
          type: 'default',
          position: {
            x: level * 250,
            y: positionInLevel * 120 + 50
          },
          data: {
            label: `${node.title}\n(${node.effort_hours}h)`,
            status: node.status,
            priority: node.priority,
          },
          style: {
            background: node.status === 'completed' ? '#dcfce7' :
              node.status === 'in_progress' ? '#fef3c7' :
                node.status === 'blocked' ? '#fecaca' : '#f3f4f6',
            border: dependencyGraph.critical_path.includes(node.step_id)
              ? '2px solid #ef4444' : '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '12px',
            minWidth: '180px',
            fontSize: '12px',
            textAlign: 'center',
          },
        };
      });

      const flowEdges: Edge[] = [];

      // Create dependency edges (depends_on)
      dependencyGraph.nodes.forEach(node => {
        node.depends_on.forEach((dependencyId) => {
          flowEdges.push({
            id: `dep-${dependencyId}-${node.step_id}`,
            source: dependencyId.toString(),
            target: node.step_id.toString(),
            type: 'smoothstep',
            style: {
              stroke: '#6b7280',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#6b7280',
            },
            label: 'depends on',
            labelStyle: { fontSize: '10px', fill: '#6b7280' },
          });
        });

        // Create blocking edges (blocks)
        node.blocks.forEach((blockedId) => {
          flowEdges.push({
            id: `block-${node.step_id}-${blockedId}`,
            source: node.step_id.toString(),
            target: blockedId.toString(),
            type: 'smoothstep',
            style: {
              stroke: '#dc2626',
              strokeWidth: 2,
              strokeDasharray: '5,5',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#dc2626',
            },
            label: 'blocks',
            labelStyle: { fontSize: '10px', fill: '#dc2626' },
          });
        });
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [dependencyGraph, setNodes, setEdges]);

  // Handle drag start for kanban
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  // Handle drag end for kanban
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    // Logic to update step status based on the column it was dropped into
    const activeStep = plan?.steps.find(step => step.id === Number(active.id));
    if (!activeStep) return;

    // Determine new status based on drop target
    const overId = over.id;
    let newStatus: string;

    // Check if dropped over a column
    if (typeof overId === 'string' && overId.startsWith('column-')) {
      newStatus = overId.replace('column-', '');
    }
    // If dropped over another card, find the column that card is in
    else if (typeof overId === 'number') {
      const overStep = plan?.steps.find(step => step.id === overId);
      newStatus = overStep?.status || activeStep.status;
    }
    // Fallback: keep same status
    else {
      newStatus = activeStep.status;
    }

    // Only update if status actually changed
    if (newStatus !== activeStep.status) {
      updateStatusMutation.mutate({
        stepId: Number(active.id),
        status: newStatus
      });
    }
  };

  if (planLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (planError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Plan</h1>
        <p className="text-gray-600 mb-8">There was an error loading the remediation plan.</p>
        <Link to="/dashboard" className="text-blue-600 hover:text-blue-800">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // No plan exists yet - show create plan option
  if (!planLoading && !plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">📋</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Remediation Plan Yet</h1>
          <p className="text-gray-600 mb-8">
            A remediation plan hasn't been created for this analysis report yet. 
            Would you like to generate one?
          </p>
          <div className="flex flex-col gap-4">
            <Button
              variant="primary"
              onClick={() => {
                console.log('Generate Remediation Plan button clicked');
                console.log('isPending:', createPlanMutation.isPending);
                setIsCreatingPlan(true);
                createPlanMutation.mutate();
              }}
              disabled={createPlanMutation.isPending}
            >
              {createPlanMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  Generating Plan...
                </span>
              ) : (
                '🚀 Generate Remediation Plan'
              )}
            </Button>
            <Link to={`/reports/${reportId}`} className="text-blue-600 hover:text-blue-800">
              ← Back to Report
            </Link>
          </div>
          {createPlanMutation.isError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                Failed to create plan: {(createPlanMutation.error as Error)?.message || 'Unknown error'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Group steps by status for kanban view
  const stepsByStatus = {
    draft: plan.steps.filter(step => step.status === 'draft'),
    in_progress: plan.steps.filter(step => step.status === 'in_progress'),
    completed: plan.steps.filter(step => step.status === 'completed'),
    blocked: plan.steps.filter(step => step.status === 'blocked'),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Remediation Plan</h1>
            <p className="text-gray-600 mt-2">
              Total effort: {plan.total_effort_hours} hours • Status: {plan.status}
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <label htmlFor="export-format" className="text-sm font-medium text-gray-700">
                Format:
              </label>
              <select
                id="export-format"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={exportPlanMutation.isPending}
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="jira">JIRA</option>
                <option value="markdown">Markdown</option>
                <option value="pdf">PDF</option>
              </select>
              <Button
                onClick={() => exportPlanMutation.mutate(exportFormat)}
                disabled={exportPlanMutation.isPending}
                variant="secondary"
              >
                {exportPlanMutation.isPending ? 'Exporting...' : 'Export Plan'}
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("kanban")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "kanban"
              ? "bg-white text-gray-900 shadow"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Kanban View
          </button>
          <button
            onClick={() => setActiveTab("flow")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "flow"
              ? "bg-white text-gray-900 shadow"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Dependency Flow
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {activeTab === "kanban" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KanbanColumn
              title="To Do"
              status="draft"
              steps={stepsByStatus.draft}
              onStatusUpdate={(stepId: number, status: string) => {
                updateStatusMutation.mutate({ stepId, status });
              }}
            />
            <KanbanColumn
              title="In Progress"
              status="in_progress"
              steps={stepsByStatus.in_progress}
              onStatusUpdate={(stepId: number, status: string) => {
                updateStatusMutation.mutate({ stepId, status });
              }}
            />
            <KanbanColumn
              title="Completed"
              status="completed"
              steps={stepsByStatus.completed}
              onStatusUpdate={(stepId: number, status: string) => {
                updateStatusMutation.mutate({ stepId, status });
              }}
            />
            <KanbanColumn
              title="Blocked"
              status="blocked"
              steps={stepsByStatus.blocked}
              onStatusUpdate={(stepId: number, status: string) => {
                updateStatusMutation.mutate({ stepId, status });
              }}
            />
          </div>

          <DragOverlay>
            {activeId ? (
              <DragOverlayCard
                step={plan?.steps.find(step => step.id === Number(activeId))!}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Flow View */}
      {activeTab === "flow" && (
        <div className="h-[600px] border border-gray-300 rounded-lg relative">
          {/* Flow Legend */}
          <div className="absolute top-2 left-2 z-10 bg-white p-3 rounded-lg shadow-md border text-xs">
            <h4 className="font-semibold mb-2">Legend</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                <span>Todo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-100 border border-gray-300 rounded"></div>
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border border-gray-300 rounded"></div>
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border border-gray-300 rounded"></div>
                <span>Blocked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-gray-500"></div>
                <span>Dependency</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 border-b border-dashed border-red-600"></div>
                <span>Blocks</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-red-500 bg-transparent rounded"></div>
                <span>Critical Path</span>
              </div>
            </div>
          </div>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            attributionPosition="bottom-right"
            defaultEdgeOptions={{
              animated: false,
              style: { strokeWidth: 2 }
            }}
          >
            <Controls position="bottom-left" />
            <Background />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
