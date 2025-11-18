import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ReactQueryProvider } from "./providers/ReactQueryProvider";
import { MainLayout } from "./components/layouts/MainLayout";
import { Dashboard } from "./pages/Dashboard";
import { Documents } from "./pages/Documents";
import { DocumentDetail } from "./pages/DocumentDetail";
import { Reports } from "./pages/Reports";
import { ReportsListing } from "./pages/ReportsListing";
import { Remediation } from "./pages/Remediation";

function App() {
  return (
    <ReactQueryProvider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/documents/:id" element={<DocumentDetail />} />
            <Route path="/reports" element={<ReportsListing />} />
            <Route path="/reports/:reportId" element={<Reports />} />
            <Route path="/remediation/:planId" element={<Remediation />} />
            <Route path="/settings" element={<Dashboard />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </ReactQueryProvider>
  );
}

export default App;
