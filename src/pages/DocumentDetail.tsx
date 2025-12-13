import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocument, getDocumentVersions, uploadNewVersion, getDocumentContent } from "../api";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { StatusPill } from "../components/ui/StatusPill";

export function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const documentId = parseInt(id || "0");
  const queryClient = useQueryClient();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);

  console.log('DocumentDetail - URL ID:', id, 'Parsed ID:', documentId);

  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => getDocument(documentId),
    enabled: !!documentId,
  });

  const { data: versions, isLoading: versionsLoading, error: versionsError } = useQuery({
    queryKey: ["document-versions", documentId],
    queryFn: async () => {
      console.log(`Fetching versions for document ID: ${documentId}`);
      try {
        const result = await getDocumentVersions(documentId);
        console.log(`Versions API response:`, result);
        return result;
      } catch (error) {
        console.error(`Versions API error:`, error);
        throw error;
      }
    },
    enabled: !!documentId,
  });

  const { data: content, isLoading: contentLoading, error: contentError } = useQuery({
    queryKey: ["document-content", selectedVersionId || documentId],
    queryFn: () => getDocumentContent(selectedVersionId || documentId),
    enabled: !!documentId && showContent,
  });



  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadNewVersion(documentId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      queryClient.invalidateQueries({ queryKey: ["document-versions", documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setShowUploadForm(false);
    },
    onError: (error) => {
      console.error("Upload failed:", error);
      alert("Upload failed: " + error.message);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  if (docLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Document Not Found</h2>
          <p className="text-gray-600 mb-4">The requested document could not be found.</p>
          <Link to="/documents">
            <Button variant="primary">Back to Documents</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/documents" className="text-blue-600 hover:text-blue-800">
              ← Back to Documents
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{document.filename}</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {document.doc_type.charAt(0).toUpperCase() + document.doc_type.slice(1)}
            </span>
            <StatusPill status={document.status} />
            {document.version_number && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                v{document.version_number} {document.is_latest && "(Latest)"}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowUploadForm(!showUploadForm)}
          >
            Upload New Version
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowContent(!showContent)}
          >
            {showContent ? 'Hide Content' : 'View Content'}
          </Button>
        </div>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Upload New Version</h3>
            <div className="flex items-center gap-4">
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.txt"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                aria-label="Select file for new version upload"
              />
              <Button
                variant="secondary"
                onClick={() => setShowUploadForm(false)}
              >
                Cancel
              </Button>
            </div>
            {uploadMutation.isPending && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Uploading new version...
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Document Content */}
      {showContent && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Document Content</h3>
                {selectedVersionId && versions?.find(v => v.id === selectedVersionId) && (
                  <p className="text-sm text-gray-600 mt-1">
                    Version {versions.find(v => v.id === selectedVersionId)?.version_number}
                    {versions.find(v => v.id === selectedVersionId)?.is_latest && (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">Latest</span>
                    )}
                  </p>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowContent(false);
                  setSelectedVersionId(null);
                }}
              >
                Close
              </Button>
            </div>
            {contentLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading document content...</p>
              </div>
            )}
            {!contentLoading && contentError && (
              <div className="text-center py-8">
                <div className="text-red-500 text-4xl mb-2">⚠️</div>
                <p className="text-red-600">Failed to load document content</p>
                <p className="text-sm text-gray-600 mt-1">
                  {contentError instanceof Error ? contentError.message : 'Unknown error'}
                </p>
              </div>
            )}
            {!contentLoading && !contentError && content && (
              <div className="bg-white rounded-lg p-6 border border-gray-200 max-h-96 overflow-y-auto">
                <div className="text-gray-800 whitespace-pre-wrap break-words font-serif leading-relaxed text-sm">
                  {content}
                </div>
              </div>
            )}
            {!contentLoading && !contentError && !content && (
              <div className="text-center py-8 text-gray-500">
                <p>No content available</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Document Information */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Document Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="document-created" className="text-sm font-medium text-gray-600">Created</label>
              <p id="document-created" className="text-gray-900">
                {new Date(document.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div>
              <label htmlFor="document-type" className="text-sm font-medium text-gray-600">Type</label>
              <p id="document-type" className="text-gray-900 capitalize">{document.doc_type}</p>
            </div>
            <div>
              <label htmlFor="document-status" className="text-sm font-medium text-gray-600">Status</label>
              <div id="document-status" className="mt-1">
                <StatusPill status={document.status} />
              </div>
            </div>
            {document.version_number && (
              <div>
                <label htmlFor="document-version" className="text-sm font-medium text-gray-600">Version</label>
                <p id="document-version" className="text-gray-900">
                  v{document.version_number} {document.is_latest && "(Latest)"}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Version History */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Version History</h3>
            {(() => {
              if (versionsLoading) return <div className="text-sm text-gray-500">Loading...</div>;
              if (versionsError) return <div className="text-sm text-gray-500">Error</div>;
              if (versions) return <div className="text-sm text-gray-500">{versions.length} versions</div>;
              return <div className="text-sm text-gray-500">No data</div>;
            })()}
          </div>

          {versionsError && (
            <div className="text-center py-8">
              <div className="text-red-500 text-4xl mb-2">⚠️</div>
              <p className="text-red-600">Failed to load version history</p>
              <p className="text-sm text-gray-600 mt-1">{versionsError.message}</p>
            </div>
          )}

          {versionsLoading && !versionsError && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading versions...</p>
            </div>
          )}

          {!versionsLoading && !versionsError && versions && versions.length > 0 && (
            <div className="space-y-3">
              {versions
                .slice()
                .sort((a, b) => b.version_number - a.version_number)
                .map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">v{version.version_number}</span>
                          {version.is_latest && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                              Latest
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-600">{version.filename}</span>
                      </div>
                      <StatusPill status={version.status} />
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {new Date(version.created_at).toLocaleDateString()}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedVersionId(version.id);
                          setShowContent(true);
                        }}
                      >
                        View Content
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {!versionsLoading && !versionsError && (!versions || versions.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📄</div>
              <p>No version history available</p>
              <p className="text-sm mt-1">
                Upload new versions to see version history here.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
