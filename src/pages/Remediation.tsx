import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {

  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";

import ReactFlow, {
  type Node,
  type Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";

import {
  getRemediationPlan,
  getDependencyGraph,
  updateRemediationStepStatus,
  exportRemediationPlan
} from "../api";
import type { RemediationStepPublic } from "../types/api.js";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { StatusPill } from "../components/ui/StatusPill";

// Kanban Column Component
const KanbanColumn = ({
  title,
  steps,
}: {
  title: string;
  steps: RemediationStepPublic[];
}) => {
  return (
    <Card className="min-h-96">
      <div className="p-4">
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
  step
}: {
  step: RemediationStepPublic;
}) => {
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

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="bg-white border border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm">{step.strategy}</h4>
        <span className={`text-xs px-2 py-1 rounded ${getEffortColor(step.effort_size)}`}>
          {step.effort_size}
        </span>
      </div>

      {step.implementation_steps && (
        <p className="text-xs text-gray-600 mb-2">{step.implementation_steps}</p>
      )}

      <div className="flex items-center justify-between">
        <StatusPill status={step.status} />
        <span className="text-xs text-gray-500">
          {step.effort_hours}h
        </span>
      </div>
    </div>
  );
}; export function Remediation() {
  const { planId } = useParams<{ planId: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"kanban" | "flow">("kanban");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch remediation plan
  const {
    data: plan,
    isLoading: planLoading,
    error: planError
  } = useQuery({
    queryKey: ['remediationPlan', planId],
    queryFn: () => getRemediationPlan(Number(planId)),
    enabled: !!planId,
  });

  // Fetch dependency graph
  const { data: dependencyGraph } = useQuery({
    queryKey: ['dependencyGraph', planId],
    queryFn: () => getDependencyGraph(Number(planId)),
    enabled: !!planId && activeTab === "flow",
  });



  // Update step status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ stepId, status }: { stepId: number; status: string }) =>
      updateRemediationStepStatus(stepId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remediationPlan', planId] });
    },
  });

  // Export plan mutation
  const exportPlanMutation = useMutation({
    mutationFn: () => exportRemediationPlan(Number(planId)),
    onSuccess: (data) => {
      // Handle file download
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `remediation-plan-${planId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
  });

  // Initialize flow nodes and edges when dependency graph loads
  useEffect(() => {
    if (dependencyGraph) {
      const flowNodes: Node[] = dependencyGraph.nodes.map((node, index) => ({
        id: node.step_id.toString(),
        type: 'default',
        position: { x: (index % 3) * 200, y: Math.floor(index / 3) * 100 },
        data: {
          label: node.title,
          status: node.status,
        },
        style: {
          background: node.status === 'completed' ? '#dcfce7' :
            node.status === 'in_progress' ? '#fef3c7' : '#f3f4f6',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
        },
      }));

      const flowEdges: Edge[] = [];
      dependencyGraph.nodes.forEach(node => {
        node.depends_on.forEach(depId => {
          flowEdges.push({
            id: `${depId}-${node.step_id}`,
            source: depId.toString(),
            target: node.step_id.toString(),
            type: 'smoothstep',
            animated: node.status !== 'completed',
          });
        });
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [dependencyGraph, setNodes, setEdges]); const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !plan) return;

    const activeStep = plan.steps.find(s => s.id === active.id);
    if (!activeStep) return;

    // Determine new status based on drop zone
    // This is a simplified version - you might want more sophisticated logic
    const newStatus = over.id as string;

    if (activeStep.status !== newStatus) {
      updateStatusMutation.mutate({
        stepId: activeStep.id,
        status: newStatus
      });
    }
  };



  if (planLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading remediation plan...</p>
        </div>
      </div>
    );
  }

  if (planError || !plan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Plan Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The remediation plan could not be loaded.
          </p>
          <Link to="/reports">
            <Button variant="primary">Back to Reports</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Group steps by status for Kanban view
  const stepsByStatus = {
    draft: plan.steps.filter(s => s.status === 'draft'),
    in_progress: plan.steps.filter(s => s.status === 'in_progress'),
    completed: plan.steps.filter(s => s.status === 'completed'),
    blocked: plan.steps.filter(s => s.status === 'blocked'),
  };

  return (
    <>
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f1f2f3] px-10 py-3">
        <div className="flex items-center gap-4 text-[#131416]">
          <Link to="/reports" className="text-blue-600 hover:text-blue-800">
            ← Back to Reports
          </Link>
          <h2 className="text-[#131416] text-lg font-bold leading-tight tracking-[-0.015em]">
            Remediation Plan #{plan.id}
          </h2>
          <StatusPill status={plan.status} />
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => exportPlanMutation.mutate()}
            disabled={exportPlanMutation.isPending}
          >
            {exportPlanMutation.isPending ? 'Exporting...' : 'Export PDF'}
          </Button>
          <div className="flex border border-gray-300 rounded-lg">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${activeTab === 'kanban'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              onClick={() => setActiveTab('kanban')}
            >
              Kanban
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${activeTab === 'flow'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              onClick={() => setActiveTab('flow')}
            >
              Flow Diagram
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Plan Overview */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-600">Total Steps</h3>
                <p className="text-2xl font-bold text-gray-900">{plan.steps.length}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600">Completed</h3>
                <p className="text-2xl font-bold text-green-600">{stepsByStatus.completed.length}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600">In Progress</h3>
                <p className="text-2xl font-bold text-blue-600">{stepsByStatus.in_progress.length}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600">Blocked</h3>
                <p className="text-2xl font-bold text-red-600">{stepsByStatus.blocked.length}</p>
              </div>
            </div>


          </div>
        </Card>

        {/* Kanban Board */}
        {activeTab === 'kanban' && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <KanbanColumn
                title="To Do"
                steps={stepsByStatus.draft}
              />
              <KanbanColumn
                title="In Progress"
                steps={stepsByStatus.in_progress}
              />
              <KanbanColumn
                title="Completed"
                steps={stepsByStatus.completed}
              />
              <KanbanColumn
                title="Blocked"
                steps={stepsByStatus.blocked}
              />
            </div>
          </DndContext>
        )}

        {/* Dependency Flow Diagram */}
        {activeTab === 'flow' && (
          <Card>
            <div className="h-96">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
              >
                <Controls />
                <Background />
              </ReactFlow>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
