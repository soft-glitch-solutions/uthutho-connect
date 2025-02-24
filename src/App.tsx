
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import { Onboarding } from "./components/Onboarding";
import { MainLayout } from "./components/layout/MainLayout";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Hubs from "./pages/Hubs";
import TransportRoutes from "./pages/Routes";
import HubRequest from "./pages/HubRequest";
import RouteRequest from "./pages/RouteRequest";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Stop from "./pages/Stop";
import HubsDetials from "./pages/HubsDetials";
import RouteDetails from "./pages/RoutesDetials";
import AddFavorites from "./pages/AddFavorites";
import FavoriteDetails from './pages/FavoriteDetails';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouterRoutes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/home" element={<MainLayout><Home /></MainLayout>} />
          <Route path="/addFavourties" element={<MainLayout><AddFavorites /></MainLayout>} />
          <Route path="/favorites/:favoriteId" element={<FavoriteDetails />} />
          <Route path="/hubs" element={<MainLayout><Hubs /></MainLayout>} />
          <Route path="/hubs/:hubId" element={<MainLayout><HubsDetials /></MainLayout>} />
          <Route path="/routes" element={<MainLayout><TransportRoutes /></MainLayout>} />
          <Route path="/routes/:routeId" element={<MainLayout><RouteDetails /></MainLayout>} />
          <Route path="/hub-request" element={<MainLayout><HubRequest /></MainLayout>} />
          <Route path="/route-request" element={<MainLayout><RouteRequest /></MainLayout>} />
          <Route path="/stops" element={<MainLayout><Stop /></MainLayout>} />
          <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
