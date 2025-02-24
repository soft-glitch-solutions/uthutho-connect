
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Onboarding } from "./components/Onboarding";
import { MainLayout } from "./components/layout/MainLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Hubs from "./pages/Hubs";
import Routes from "./pages/Routes";
import HubRequest from "./pages/HubRequest";
import RouteRequest from "./pages/RouteRequest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
          <Route path="/hubs" element={<MainLayout><Hubs /></MainLayout>} />
          <Route path="/routes" element={<MainLayout><Routes /></MainLayout>} />
          <Route path="/hub-request" element={<MainLayout><HubRequest /></MainLayout>} />
          <Route path="/route-request" element={<MainLayout><RouteRequest /></MainLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
