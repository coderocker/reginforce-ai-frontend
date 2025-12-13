import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../providers";
import NewAnalysisModal from "../NewAnalysisModal";
import { ComplianceAssistant } from "../chat/ComplianceAssistant";

interface MainLayoutProps {
  readonly children: ReactNode;
}

export default function MainLayout({ children }: Readonly<MainLayoutProps>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showChatSidebar, setShowChatSidebar] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

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
                  Comply Lens
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive("/reports")
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
                      Reports
                    </p>
                  </Link>

                  <Link
                    to="/package-vetting"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive("/package-vetting")
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
                      <path d="M216,40H136V24a8,8,0,0,0-16,0V40H40A16,16,0,0,0,24,56V176a16,16,0,0,0,16,16h72v16a8,8,0,0,0,16,0V192h48a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,136H40V56H216V176Zm-72,48v32a8,8,0,0,1-16,0V224a8,8,0,0,1,16,0Z" />
                    </svg>
                    <p className="text-[#131416] text-sm font-medium leading-normal">
                      OSS Vetting
                    </p>
                  </Link>

                  <Link
                    to="/licenses"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive("/licenses")
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
                      <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H216v80H40ZM40,200V152H216v48Z" />
                    </svg>
                    <p className="text-[#131416] text-sm font-medium leading-normal">
                      Licenses
                    </p>
                  </Link>
                </nav>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#0f1729] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#1a2332] transition-colors"
                  onClick={() => setShowModal(true)}
                >
                  <span className="truncate">New Analysis</span>
                </button>
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
                      <path d="M112,216a8,8,0,0,1-8-8V40a8,8,0,0,1,16,0V208A8,8,0,0,1,112,216Zm76.37-52.37a8,8,0,1,1-11.31,11.31l24,24a8,8,0,0,0,11.31,0l24-24a8,8,0,0,1-11.31-11.31L224,176.69V160a8,8,0,0,1,16,0v40a8,8,0,0,1-8,8H192a8,8,0,0,1,0-16h16.69Zm0-125.26a8,8,0,0,1,11.31-11.31L224,47.31V32a8,8,0,0,1,16,0V72a8,8,0,0,1-8,8H192a8,8,0,0,1,0-16h16.69Z" />
                    </svg>
                    <p className="text-[#131416] text-sm font-medium leading-normal">
                      Logout
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1 relative">
            <div className="absolute top-0 right-0 -mr-12">
              <button
                onClick={() => setShowChatSidebar(!showChatSidebar)}
                className="p-2 hover:bg-[#f1f2f3] rounded-lg transition-colors"
                title="Toggle Compliance Assistant"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24px"
                  height="24px"
                  fill="currentColor"
                  viewBox="0 0 256 256"
                >
                  <path d="M231,175.89A56,56,0,0,1,176,232H40a8,8,0,0,1-8-8V88a56,56,0,0,1,112,0v8a8,8,0,0,0,16,0V88a72,72,0,0,0-144,0V40a8,8,0,0,1,16,0V80a56,56,0,0,1,112,0v88a40,40,0,0,1-40,40H40V216h136a40,40,0,0,0,40-40.11A8,8,0,0,1,231,175.89Z" />
                </svg>
              </button>
            </div>
            {children}
          </div>

          {/* Chat Sidebar */}
          {showChatSidebar && <ComplianceAssistant isOpen={true} />}
        </div>
      </div>
      <NewAnalysisModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
