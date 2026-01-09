import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReactQueryProvider } from "./providers/ReactQueryProvider";
import { AuthProvider } from "./providers/AuthProvider";
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

function App() {
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
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/documents" element={<Documents />} />
                      <Route path="/documents/:id" element={<DocumentDetail />} />
                      <Route path="/reports" element={<ReportsListing />} />
                      <Route path="/reports/:reportId" element={<Reports />} />
                      <Route path="/remediation/:planId" element={<Remediation />} />
                      
                      {/* OSS Compliance Routes */}
                      <Route path="/package-vetting" element={<PackageVetting />} />
                      <Route path="/licenses" element={<LicenseManagement />} />
                      <Route path="/oss/projects" element={<Projects />} />
                      <Route path="/oss/sboms" element={<Sboms />} />
                      <Route path="/oss/sbom/upload" element={<SbomUpload />} />
                      <Route path="/oss/components" element={<Components />} />
                      
                      <Route path="/settings" element={<Dashboard />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
