import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ReactQueryProvider } from "./providers/ReactQueryProvider";
import { MainLayout } from "./components/layouts/MainLayout";
import { Dashboard } from "./pages/Dashboard";
import { Documents } from "./pages/Documents";

function App() {
  return (
    <ReactQueryProvider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/reports" element={<Dashboard />} />
            <Route path="/settings" element={<Dashboard />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </ReactQueryProvider>
  );
}

export default App;
