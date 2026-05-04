import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import MainLayout from "./pages/MainLayout";
import Dashboard from "./pages/Dashboard";
import Forms from "./pages/Forms";
import FormBuilder from "./pages/FormBuilder";
import FormPreview from "./pages/FormPreview";
import FilledForms from "./pages/FilledForms";
import Settings from "./pages/Settings";
import Storage from "./pages/Storage";
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
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/landing" element={<Landing />} />
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
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
