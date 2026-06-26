import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { APP_DOCUMENT_TITLE } from "./constants/branding";
import { ReactQueryProvider } from "./providers/ReactQueryProvider";
import { AuthProvider, useAuth } from "./providers";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/layouts/MainLayout";
import Login from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Documents } from "./pages/Documents";
import { DocumentDetail } from "./pages/DocumentDetail";
import { Reports } from "./pages/Reports";
import { ReportsListing } from "./pages/ReportsListing";
import { Remediation } from "./pages/Remediation";
import { PackageVetting } from "./pages/oss/PackageVetting";
import { LicenseManagement } from "./pages/oss/LicenseManagement";
import { Projects } from "./pages/oss/Projects";
import { Sboms } from "./pages/oss/Sboms";
import { SbomUpload } from "./pages/oss/SbomUpload";
import { Components } from "./pages/oss/Components";
import { ReleaseReadiness } from "./pages/oss/ReleaseReadiness";
import { DecisionQueue } from "./pages/oss/DecisionQueue";
import { OssWatch } from "./pages/oss/OssWatch";
import { ShiftLeftIntegrations } from "./pages/oss/ShiftLeftIntegrations";
import { Settings } from "./pages/Settings";
import AdminRoute from "./components/AdminRoute";
import { OrganizationsAdmin } from "./pages/admin/OrganizationsAdmin";
import { OrganizationDetail } from "./pages/admin/OrganizationDetail";
import { getDefaultAppPath } from "./utils/roles";

function DefaultRedirect() {
  const { authState } = useAuth();
  return <Navigate to={getDefaultAppPath(authState.user)} replace />;
}
function App() {
  useEffect(() => {
    document.title = APP_DOCUMENT_TITLE;
  }, []);

  return (
    <ReactQueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Routes>
                      <Route path="/" element={<DefaultRedirect />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/documents" element={<Documents />} />
                      <Route path="/documents/:id" element={<DocumentDetail />} />
                      <Route path="/reports" element={<ReportsListing />} />
                      <Route path="/reports/:reportId" element={<Reports />} />
                      <Route path="/remediation/:reportId" element={<Remediation />} />
                      
                      {/* OSS Compliance Routes */}
                      <Route path="/package-vetting" element={<PackageVetting />} />
                      <Route path="/licenses" element={<LicenseManagement />} />
                      <Route path="/oss/projects" element={<Projects />} />
                      <Route path="/oss/sboms" element={<Sboms />} />
                      <Route path="/oss/sbom/upload" element={<SbomUpload />} />
                      <Route path="/oss/components" element={<Components />} />
                      <Route path="/oss/releases/:sbomId" element={<ReleaseReadiness />} />
                      <Route path="/oss/decisions" element={<DecisionQueue />} />
                      <Route path="/oss/watch" element={<OssWatch />} />
                      <Route path="/oss/integrations/shift-left" element={<ShiftLeftIntegrations />} />
                      
                      <Route path="/settings" element={<Settings />} />
                      <Route
                        path="/admin/organizations"
                        element={
                          <AdminRoute>
                            <OrganizationsAdmin />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/organizations/:orgId"
                        element={
                          <AdminRoute>
                            <OrganizationDetail />
                          </AdminRoute>
                        }
                      />
                      <Route path="*" element={<DefaultRedirect />} />
                    </Routes>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ReactQueryProvider>
  );
}

export default App;
