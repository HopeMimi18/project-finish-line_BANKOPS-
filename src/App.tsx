import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { ShortcutsDialog } from "@/components/ShortcutsDialog";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Upload from "./pages/Upload";
import Tokens from "./pages/Tokens";
import Assist from "./pages/Assist";
import Audit from "./pages/Audit";
import Admin from "./pages/Admin";
import Clients from "./pages/Clients";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import ThreatModel from "./pages/ThreatModel";
import HowItWorks from "./pages/HowItWorks";
import OnePager from "./pages/OnePager";
import Roadmap from "./pages/Roadmap";
import MomentumOnePager from "./pages/MomentumOnePager";

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
          <ShortcutsDialog />
          <Routes>
            <Route path="/" element={<LandingOrApp />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/threat-model" element={<ThreatModel />} />
            <Route path="/one-pager" element={<OnePager />} />
            <Route path="/auth" element={<Auth />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Index />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/tokens" element={<Tokens />} />
              <Route path="/assist" element={<Assist />} />
              <Route path="/audit" element={<Audit />} />
              <Route
                path="/admin"
                element={
                  <ManagerOnly>
                    <Admin />
                  </ManagerOnly>
                }
              />
              <Route
                path="/clients"
                element={
                  <ManagerOnly>
                    <Clients />
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

// Public landing for signed-out visitors; redirect signed-in users straight to the app.
const LandingOrApp = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
};

export default App;
