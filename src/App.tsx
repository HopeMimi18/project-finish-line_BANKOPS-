import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Upload from "./pages/Upload";
import Tokens from "./pages/Tokens";
import Audit from "./pages/Audit";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ManagerOnly = ({ children }: { children: React.ReactNode }) => {
  const { isManagerOrAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isManagerOrAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Index />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/tokens" element={<Tokens />} />
              <Route
                path="/assist"
                element={
                  <Placeholder
                    title="AI Assist"
                    description="Run summarize / keywords / classify on a document, gated by a token."
                    step="Step 3"
                  />
                }
              />
              <Route path="/audit" element={<Audit />} />
              <Route
                path="/admin"
                element={
                  <ManagerOnly>
                    <Placeholder
                      title="Admin & Access"
                      description="Manage user roles and access classifications."
                      step="Step 3"
                    />
                  </ManagerOnly>
                }
              />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
