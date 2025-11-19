import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocuments, uploadDocument, uploadNewVersion } from "../api";
import { StatusPill } from "../components/ui/StatusPill";
import { Button } from "../components/ui/Button";
import type { DocumentType, DocumentPublic } from "../types/api.js";

export function Documents() {
  const [activeTab, setActiveTab] = useState<DocumentType>("regulation");
  const [uploadingVersionFor, setUploadingVersionFor] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
    refetchInterval: (query) => {
      // Poll every 5 seconds if any document is pending or processing
      const hasProcessingDocs = query.state.data?.some((doc: DocumentPublic) =>
        doc.status === "pending" || doc.status === "processing"
      );
      return hasProcessingDocs ? 5000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, doc_type }: { file: File; doc_type: DocumentType }) =>
      uploadDocument(file, doc_type),
    onSuccess: (data) => {
      console.log('Upload successful:', data);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    },
  });

  const versionUploadMutation = useMutation({
    mutationFn: ({ documentId, file }: { documentId: number; file: File }) =>
      uploadNewVersion(documentId, file),
    onSuccess: (data) => {
      console.log('Version upload successful:', data);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setUploadingVersionFor(null);
    },
    onError: (error) => {
      console.error('Version upload failed:', error);
      alert('Version upload failed: ' + error.message);
      setUploadingVersionFor(null);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('File selected:', file);
    if (file) {
      console.log('Uploading file:', file.name, 'Type:', activeTab);
      uploadMutation.mutate({ file, doc_type: activeTab });
    }
  };

  const handleVersionUpload = (documentId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingVersionFor(documentId);
      versionUploadMutation.mutate({ documentId, file });
    }
  };

  const triggerFileUpload = () => {
    console.log('Triggering file upload...');
    const input = document.getElementById('file-upload') as HTMLInputElement;
    input?.click();
  };

  const filteredDocuments = documents?.filter((doc) => doc.doc_type === activeTab);

  return (
    <>
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f1f2f3] px-10 py-3">
        <div className="flex items-center gap-4 text-[#131416]">
          <div className="size-4">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h2 className="text-[#131416] text-lg font-bold leading-tight tracking-[-0.015em]">
            Documents
          </h2>
        </div>
        <div className="flex flex-1 justify-end gap-8">
          <Button
            variant="secondary"
            onClick={() => alert('Template explorer coming soon!')}
          >
            Explore Templates
          </Button>
          <div className="flex items-center justify-center aspect-square bg-gray-300 rounded-full size-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
              <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" />
            </svg>
          </div>
        </div>
      </header>

      <div className="pb-3">
        <div className="flex border-b border-[#dedfe3] px-4 gap-8">
          <button
            onClick={() => setActiveTab("regulation")}
            className={`flex flex-col items-center justify-center border-b-[3px] ${activeTab === "regulation"
              ? "border-b-[#131416] text-[#131416]"
              : "border-b-transparent text-[#6b7180]"
              } pb-[13px] pt-4`}
          >
            <p className="text-sm font-bold leading-normal tracking-[0.015em]">
              Regulations
            </p>
          </button>
          <button
            onClick={() => setActiveTab("policy")}
            className={`flex flex-col items-center justify-center border-b-[3px] ${activeTab === "policy"
              ? "border-b-[#131416] text-[#131416]"
              : "border-b-transparent text-[#6b7180]"
              } pb-[13px] pt-4`}
          >
            <p className="text-sm font-bold leading-normal tracking-[0.015em]">
              Internal Policies
            </p>
          </button>
        </div>
      </div>

      <div className="flex flex-col p-4">
        <div className="flex flex-col items-center gap-6 rounded-lg border-2 border-dashed border-[#dedfe3] px-6 py-14">
          <div className="flex max-w-[480px] flex-col items-center gap-2">
            <p className="text-[#131416] text-lg font-bold leading-tight tracking-[-0.015em] text-center">
              Drag and drop files here
            </p>
            <p className="text-[#131416] text-sm font-normal leading-normal text-center">
              Or click to browse
            </p>
          </div>
          <div>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.txt"
              aria-label="Upload document file"
              title="Upload document file"
            />
            <Button
              variant="secondary"
              isLoading={uploadMutation.isPending}
              onClick={triggerFileUpload}
              type="button"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Choose File'}
            </Button>
          </div>
        </div>
      </div>

      <h2 className="text-[#131416] text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
        Uploaded Documents
      </h2>

      <div className="px-4 py-3">
        <div className="flex overflow-hidden rounded-lg border border-[#dedfe3] bg-white">
          <table className="flex-1">
            <thead>
              <tr className="bg-white">
                <th className="px-4 py-3 text-left text-[#131416] w-[300px] text-sm font-medium leading-normal">
                  File
                </th>
                <th className="px-4 py-3 text-left text-[#131416] w-[120px] text-sm font-medium leading-normal">
                  Version
                </th>
                <th className="px-4 py-3 text-left text-[#131416] w-[200px] text-sm font-medium leading-normal">
                  Uploaded
                </th>
                <th className="px-4 py-3 text-left text-[#131416] w-[100px] text-sm font-medium leading-normal">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[#131416] w-[200px] text-sm font-medium leading-normal">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Loading documents...
                  </td>
                </tr>
              ) : filteredDocuments?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No documents uploaded yet
                  </td>
                </tr>
              ) : (
                filteredDocuments?.map((doc) => (
                  <tr key={doc.id} className="border-t border-t-[#dedfe3]">
                    <td className="h-[72px] px-4 py-2">
                      <Link
                        to={`/documents/${doc.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {doc.filename}
                      </Link>
                      {doc.is_latest === false && (
                        <span className="ml-2 text-xs text-gray-500">(Old Version)</span>
                      )}
                    </td>
                    <td className="h-[72px] px-4 py-2 text-[#6b7180] text-sm font-normal leading-normal">
                      {doc.version_number ? `v${doc.version_number}` : ''}
                      {doc.is_latest && (
                        <span className="ml-1 text-xs text-green-600 font-medium">Latest</span>
                      )}
                    </td>
                    <td className="h-[72px] px-4 py-2 text-[#6b7180] text-sm font-normal leading-normal">
                      {new Date(doc.created_at).toLocaleString()}
                    </td>
                    <td className="h-[72px] px-4 py-2">
                      <StatusPill status={doc.status} />
                    </td>
                    <td className="h-[72px] px-4 py-2">
                      <div className="flex gap-2">
                        {doc.status === "processed" && (doc.is_latest !== false) && (
                          <>
                            <input
                              type="file"
                              id={`version-upload-${doc.id}`}
                              className="hidden"
                              onChange={(e) => handleVersionUpload(doc.id, e)}
                              accept=".pdf,.txt"
                              aria-label={`Upload new version for ${doc.filename}`}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                const input = document.getElementById(`version-upload-${doc.id}`) as HTMLInputElement;
                                input?.click();
                              }}
                              isLoading={uploadingVersionFor === doc.id}
                            >
                              {uploadingVersionFor === doc.id ? 'Uploading...' : 'New Version'}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
