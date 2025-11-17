import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getDocuments, runAnalysis } from "../api";
import { Button } from "./ui/Button";
import type { DocumentPublic } from "../types/api";

interface NewAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewAnalysisModal({ isOpen, onClose }: NewAnalysisModalProps) {
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [policyId, setPolicyId] = useState<number | null>(null);
  const navigate = useNavigate();

  const { data: documents } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const processedDocuments = documents?.filter(doc => doc.status === "processed") || [];
  const regulations = processedDocuments.filter(doc => doc.doc_type === "regulation");
  const policies = processedDocuments.filter(doc => doc.doc_type === "policy");

  const analysisMutation = useMutation({
    mutationFn: runAnalysis,
    onSuccess: (response) => {
      console.log("Analysis started:", response);
      onClose();
      navigate(`/reports/${response.id}`);
    },
    onError: (error) => {
      console.error("Analysis failed:", error);
      alert("Failed to start analysis: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (regulationId && policyId) {
      analysisMutation.mutate({
        regulation_doc_id: regulationId,
        policy_doc_id: policyId,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">New Analysis</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="regulation-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Regulation
            </label>
            <select
              id="regulation-select"
              value={regulationId || ""}
              onChange={(e) => setRegulationId(e.target.value ? Number(e.target.value) : null)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Choose a regulation document...</option>
              {regulations.map((doc: DocumentPublic) => (
                <option key={doc.id} value={doc.id}>
                  {doc.filename}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="policy-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Policy
            </label>
            <select
              id="policy-select"
              value={policyId || ""}
              onChange={(e) => setPolicyId(e.target.value ? Number(e.target.value) : null)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Choose a policy document...</option>
              {policies.map((doc: DocumentPublic) => (
                <option key={doc.id} value={doc.id}>
                  {doc.filename}
                </option>
              ))}
            </select>
          </div>

          {regulations.length === 0 && (
            <div className="text-amber-600 text-sm p-3 bg-amber-50 rounded-md">
              No processed regulation documents available. Please upload and process regulation documents first.
            </div>
          )}

          {policies.length === 0 && (
            <div className="text-amber-600 text-sm p-3 bg-amber-50 rounded-md">
              No processed policy documents available. Please upload and process policy documents first.
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!regulationId || !policyId || analysisMutation.isPending}
              isLoading={analysisMutation.isPending}
              className="flex-1"
            >
              {analysisMutation.isPending ? "Starting Analysis..." : "Run Analysis"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
