import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getDocuments, runAnalysis } from "../api";
import { Button } from "./ui/Button";
import type { DocumentPublic } from "../types/api";

interface NewAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function NewAnalysisModal({ isOpen, onClose, onSuccess }: NewAnalysisModalProps) {
  const [selectedRegulation, setSelectedRegulation] = useState<string>("");
  const [regulationVersionId, setRegulationVersionId] = useState<number | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<string>("");
  const [policyVersionId, setPolicyVersionId] = useState<number | null>(null);
  const navigate = useNavigate();

  const { data: documents } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const processedDocuments = documents?.filter(doc => doc.status === "processed") || [];

  // Group documents by base filename to show unique document names
  const groupedRegulations = processedDocuments
    .filter(doc => doc.doc_type === "regulation")
    .reduce((acc: Record<string, DocumentPublic[]>, doc) => {
      const baseFileName = doc.filename.replace(/\s*\(v\d+\)/, '').trim();
      if (!acc[baseFileName]) acc[baseFileName] = [];
      acc[baseFileName].push(doc);
      return acc;
    }, {});

  const groupedPolicies = processedDocuments
    .filter(doc => doc.doc_type === "policy")
    .reduce((acc: Record<string, DocumentPublic[]>, doc) => {
      const baseFileName = doc.filename.replace(/\s*\(v\d+\)/, '').trim();
      if (!acc[baseFileName]) acc[baseFileName] = [];
      acc[baseFileName].push(doc);
      return acc;
    }, {});

  const selectedRegulationVersions = selectedRegulation ? groupedRegulations[selectedRegulation] || [] : [];
  const selectedPolicyVersions = selectedPolicy ? groupedPolicies[selectedPolicy] || [] : [];

  const analysisMutation = useMutation({
    mutationFn: runAnalysis,
    onSuccess: (response) => {
      console.log("Analysis started:", response);
      onClose();
      onSuccess?.(); // Call the optional refresh callback
      navigate(`/reports/${response.id}`);
    },
    onError: (error) => {
      console.error("Analysis failed:", error);
      alert("Failed to start analysis: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (regulationVersionId && policyVersionId) {
      analysisMutation.mutate({
        regulation_doc_id: regulationVersionId,
        policy_doc_id: policyVersionId,
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
          {/* Regulation Selection */}
          <div>
            <label htmlFor="regulation-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Regulation Document
            </label>
            <select
              id="regulation-select"
              value={selectedRegulation}
              onChange={(e) => {
                setSelectedRegulation(e.target.value);
                setRegulationVersionId(null); // Reset version when document changes
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Choose a regulation document...</option>
              {Object.keys(groupedRegulations).map((fileName) => (
                <option key={fileName} value={fileName}>
                  {fileName}
                </option>
              ))}
            </select>
          </div>

          {/* Regulation Version Selection */}
          {selectedRegulation && (
            <div>
              <label htmlFor="regulation-version-select" className="block text-sm font-medium text-gray-700 mb-1">
                Select Regulation Version
              </label>
              <select
                id="regulation-version-select"
                value={regulationVersionId || ""}
                onChange={(e) => setRegulationVersionId(e.target.value ? Number(e.target.value) : null)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Choose a version...</option>
                {selectedRegulationVersions
                  .sort((a, b) => (b.version_number || 0) - (a.version_number || 0)) // Sort by version descending
                  .map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      v{doc.version_number || 1} {doc.is_latest && '(Latest)'} - {new Date(doc.created_at).toLocaleDateString()}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Policy Selection */}
          <div>
            <label htmlFor="policy-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Policy Document
            </label>
            <select
              id="policy-select"
              value={selectedPolicy}
              onChange={(e) => {
                setSelectedPolicy(e.target.value);
                setPolicyVersionId(null); // Reset version when document changes
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Choose a policy document...</option>
              {Object.keys(groupedPolicies).map((fileName) => (
                <option key={fileName} value={fileName}>
                  {fileName}
                </option>
              ))}
            </select>
          </div>

          {/* Policy Version Selection */}
          {selectedPolicy && (
            <div>
              <label htmlFor="policy-version-select" className="block text-sm font-medium text-gray-700 mb-1">
                Select Policy Version
              </label>
              <select
                id="policy-version-select"
                value={policyVersionId || ""}
                onChange={(e) => setPolicyVersionId(e.target.value ? Number(e.target.value) : null)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Choose a version...</option>
                {selectedPolicyVersions
                  .sort((a, b) => (b.version_number || 0) - (a.version_number || 0)) // Sort by version descending
                  .map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      v{doc.version_number || 1} {doc.is_latest && '(Latest)'} - {new Date(doc.created_at).toLocaleDateString()}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {Object.keys(groupedRegulations).length === 0 && (
            <div className="text-amber-600 text-sm p-3 bg-amber-50 rounded-md">
              No processed regulation documents available. Please upload and process regulation documents first.
            </div>
          )}

          {Object.keys(groupedPolicies).length === 0 && (
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
              disabled={!regulationVersionId || !policyVersionId || analysisMutation.isPending}
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
