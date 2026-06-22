import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { APP_NAME } from "../../constants/branding";
import { useAuth } from "../../providers";
import { ComplianceAssistant } from "../chat/ComplianceAssistant";

interface MainLayoutProps {
  readonly children: ReactNode;
}

export default function MainLayout({ children }: Readonly<MainLayoutProps>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showChatSidebar, setShowChatSidebar] = useState(false);
  const [ossMenuOpen, setOssMenuOpen] = useState(false);

  // Extract document ID from URL for chat context
  let currentDocumentId: number | undefined;
  
  // Try to extract from /documents/:id pattern
  const documentIdMatch = location.pathname.match(/\/documents\/(\d+)/);
  if (documentIdMatch && documentIdMatch[1]) {
    currentDocumentId = parseInt(documentIdMatch[1], 10);
  }
  
  // Fallback: if still not found, try to get from the last number in the URL
  if (!currentDocumentId && location.pathname.includes("/documents/")) {
    const pathSegments = location.pathname.split("/");
    const documentIndex = pathSegments.indexOf("documents");
    if (documentIndex !== -1 && documentIndex + 1 < pathSegments.length) {
      const idStr = pathSegments[documentIndex + 1];
      const parsed = parseInt(idStr, 10);
      if (!isNaN(parsed)) {
        currentDocumentId = parsed;
      }
    }
  }

  // Auto-open OSS menu if on OSS pages
  useEffect(() => {
    if (location.pathname.startsWith("/oss") || 
        location.pathname === "/package-vetting" || 
        location.pathname === "/licenses") {
      setOssMenuOpen(true);
    }
  }, [location.pathname]);

  // Log for debugging
  useEffect(() => {
    console.log("MainLayout URL Debug:", {
      pathname: location.pathname,
      documentIdMatch: documentIdMatch?.[1],
      currentDocumentId,
      isDocumentPage: location.pathname.includes("/documents/")
    });
  }, [location.pathname, documentIdMatch, currentDocumentId]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;
  const isActiveGroup = (prefix: string) => location.pathname.startsWith(prefix);

  return (
    <div
      className="relative flex min-h-screen w-full flex-col bg-white overflow-x-hidden font-inter"
    >
      <div className="layout-container flex h-full grow flex-col">
        <div className="gap-1 px-6 flex flex-1 justify-center py-5">
          {/* Sidebar */}
          <div className="layout-content-container flex flex-col w-80">
            <div className="flex h-full min-h-[700px] flex-col justify-between bg-white p-4">
              <div className="flex flex-col gap-4">
                <h1 className="text-[#131416] text-base font-medium leading-normal">
                  {APP_NAME}
                </h1>
                <nav className="flex flex-col gap-2">
                  <Link
                    to="/"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive("/")
                      ? "bg-[#f1f2f3]"
                      : "hover:bg-[#f1f2f3]"
                      }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24px"
                      height="24px"
                      fill="currentColor"
                      viewBox="0 0 256 256"
                    >
                      <path d="M218.83,103.77l-80-75.48a1.14,1.14,0,0,1-.11-.11,16,16,0,0,0-21.53,0l-.11.11L37.17,103.77A16,16,0,0,0,32,115.55V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V160h32v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V115.55A16,16,0,0,0,218.83,103.77ZM208,208H160V160a16,16,0,0,0-16-16H112a16,16,0,0,0-16,16v48H48V115.55l.11-.1L128,40l79.9,75.43.11.1Z" />
                    </svg>
                    <p className="text-[#131416] text-sm font-medium leading-normal">
                      Dashboard
                    </p>
                  </Link>

                  <Link
                    to="/documents"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive("/documents")
                      ? "bg-[#f1f2f3]"
                      : "hover:bg-[#f1f2f3]"
                      }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24px"
                      height="24px"
                      fill="currentColor"
                      viewBox="0 0 256 256"
                    >
                      <path d="M216,72H131.31L104,44.69A15.88,15.88,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.41,15.41,0,0,0,39.39,216h177.5A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72ZM40,56H92.69l16,16H40Z" />
                    </svg>
                    <p className="text-[#131416] text-sm font-medium leading-normal">
                      Documents
                    </p>
                  </Link>

                  <Link
                    to="/reports"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive("/reports") || isActiveGroup("/reports/")
                      ? "bg-[#f1f2f3]"
                      : "hover:bg-[#f1f2f3]"
                      }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24px"
                      height="24px"
                      fill="currentColor"
                      viewBox="0 0 256 256"
                    >
                      <path d="M216,40H136V24a8,8,0,0,0-16,0V40H40A16,16,0,0,0,24,56V176a16,16,0,0,0,16,16H79.36L57.75,219a8,8,0,0,0,12.5,10l29.59-37h56.32l29.59,37a8,8,0,1,0,12.5-10l-21.61-27H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,136H40V56H216V176ZM104,120v24a8,8,0,0,1-16,0V120a8,8,0,0,1,16,0Zm32-16v40a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm32-16v56a8,8,0,0,1-16,0V88a8,8,0,0,1,16,0Z" />
                    </svg>
                    <p className="text-[#131416] text-sm font-medium leading-normal">
                      Analysis Reports
                    </p>
                  </Link>

                  {/* OSS Compliance Section */}
                  <div className="mt-4">
                    <button
                      onClick={() => setOssMenuOpen(!ossMenuOpen)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                        isActiveGroup("/oss") || isActive("/package-vetting") || isActive("/licenses")
                          ? "bg-emerald-50 text-emerald-700"
                          : "hover:bg-[#f1f2f3]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24px"
                          height="24px"
                          fill="currentColor"
                          viewBox="0 0 256 256"
                        >
                          <path d="M230.91,172A8,8,0,0,1,228,182.91l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,36,169.09l92,53.65,92-53.65A8,8,0,0,1,230.91,172ZM220,121.09l-92,53.65L36,121.09A8,8,0,0,0,28,134.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,121.09ZM24,80a8,8,0,0,1,4-6.91l96-56a8,8,0,0,1,8.06,0l96,56a8,8,0,0,1,0,13.82l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,24,80Zm23.88,0L128,126.74,208.12,80,128,33.26Z" />
                        </svg>
                        <p className="text-sm font-medium leading-normal">
                          OSS Compliance
                        </p>
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16px"
                        height="16px"
                        fill="currentColor"
                        viewBox="0 0 256 256"
                        className={`transition-transform ${ossMenuOpen ? "rotate-180" : ""}`}
                      >
                        <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
                      </svg>
                    </button>

                    {ossMenuOpen && (
                      <div className="ml-4 mt-1 flex flex-col gap-1 border-l-2 border-emerald-200 pl-3">
                        <Link
                          to="/oss/projects"
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                            isActive("/oss/projects")
                              ? "bg-emerald-100 text-emerald-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          📁 Projects
                        </Link>
                        <Link
                          to="/oss/sboms"
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                            isActive("/oss/sboms")
                              ? "bg-emerald-100 text-emerald-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          📦 SBOMs
                        </Link>
                        <Link
                          to="/oss/sbom/upload"
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                            isActive("/oss/sbom/upload")
                              ? "bg-emerald-100 text-emerald-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          📤 Upload SBOM
                        </Link>
                        <Link
                          to="/oss/components"
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                            isActive("/oss/components")
                              ? "bg-emerald-100 text-emerald-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          📦 Components
                        </Link>
                        <Link
                          to="/oss/decisions"
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                            isActive("/oss/decisions")
                              ? "bg-emerald-100 text-emerald-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          ⚖️ Decision Queue
                        </Link>
                        <Link
                          to="/oss/watch"
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                            isActive("/oss/watch")
                              ? "bg-emerald-100 text-emerald-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          👁 OSS Watch
                        </Link>
                        <Link
                          to="/package-vetting"
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                            isActive("/package-vetting")
                              ? "bg-emerald-100 text-emerald-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          🔍 Package Vetting
                        </Link>
                        <Link
                          to="/licenses"
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                            isActive("/licenses")
                              ? "bg-emerald-100 text-emerald-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          ⚖️ Licenses
                        </Link>
                      </div>
                    )}
                  </div>
                </nav>
              </div>

              <div className="flex flex-col gap-1">
                <Link
                  to="/settings"
                  className="flex items-center gap-3 px-3 py-2 hover:bg-[#f1f2f3] rounded-lg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24px"
                    height="24px"
                    fill="currentColor"
                    viewBox="0 0 256 256"
                  >
                    <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z" />
                  </svg>
                  <p className="text-[#131416] text-sm font-medium leading-normal">
                    Settings
                  </p>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-[#f1f2f3] rounded-lg w-full text-left"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24px"
                    height="24px"
                    fill="currentColor"
                    viewBox="0 0 256 256"
                  >
                    <path d="M112,216a8,8,0,0,1-8,8H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32h56a8,8,0,0,1,0,16H48V208h56A8,8,0,0,1,112,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L196.69,120H104a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,221.66,122.34Z" />
                  </svg>
                  <p className="text-[#131416] text-sm font-medium leading-normal">
                    Logout
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1 relative">
            {children}
          </div>

          {/* Chat stays mounted so streaming continues when panel is closed */}
          <ComplianceAssistant
            isOpen={showChatSidebar}
            onOpen={() => setShowChatSidebar(true)}
            onClose={() => setShowChatSidebar(false)}
            documentId={currentDocumentId}
            documentName={currentDocumentId ? `Document ${currentDocumentId}` : "General Chat"}
          />
        </div>
      </div>
    </div>
  );
}
