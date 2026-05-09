import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { ClipboardProvider } from "@/contexts/ClipboardContext";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import MainLayout from "./pages/MainLayout";
import Dashboard from "./pages/Dashboard";
import Forms from "./pages/Forms";
import FormBuilder from "./pages/FormBuilder";
import FormPreview from "./pages/FormPreview";
import FilledForms from "./pages/FilledForms";
import SignedDocuments from "./pages/SignedDocuments";
import Settings from "./pages/Settings";
import Sign from "./pages/Sign";
import Storage from "./pages/Storage";
import Share from "./pages/Share";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ClipboardProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/share/:tokens?" element={<Share />} />
                <Route element={<MainLayout />}>
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/storage"
                    element={
                      <ProtectedRoute>
                        <Storage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/storage/:folderId"
                    element={
                      <ProtectedRoute>
                        <Storage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/forms"
                    element={
                      <ProtectedRoute>
                        <Forms />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/forms/builder"
                    element={
                      <ProtectedRoute>
                        <FormBuilder />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/forms/preview"
                    element={
                      <ProtectedRoute>
                        <FormPreview />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/forms/filled"
                    element={
                      <ProtectedRoute>
                        <FilledForms />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/forms/user/:userId"
                    element={
                      <ProtectedRoute>
                        <FilledForms />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/filled-forms"
                    element={
                      <ProtectedRoute>
                        <FilledForms />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/sign"
                    element={
                      <ProtectedRoute>
                        <Sign />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ClipboardProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
