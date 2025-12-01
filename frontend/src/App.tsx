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

const queryClient = new QueryClient();

const App = () => (
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
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/storage" element={<Storage />} />
              <Route path="/storage/:folderId" element={<Storage />} />
              <Route path="/forms" element={<Forms />} />
              <Route path="/forms/builder" element={<FormBuilder />} />
              <Route path="/forms/preview" element={<FormPreview />} />
              <Route path="/forms/filled" element={<FilledForms />} />
              <Route path="/forms/user/:userId" element={<FilledForms />} />
              <Route path="/filled-forms" element={<FilledForms />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
