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
import Feed from './pages/Feed';
import PrivateRoute from "@/components/PrivateRoute"; // Import the PrivateRoute component


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouterRoutes>
          {/* Public Routes */}
          <Route path="/" element={<Onboarding />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected Routes */}
          <Route 
            path="/home" 
            element={<PrivateRoute><MainLayout><Home /></MainLayout></PrivateRoute>} 
          />
          <Route 
            path="/feed" 
            element={<PrivateRoute><MainLayout><Feed /></MainLayout></PrivateRoute>} 
          />
          <Route 
            path="/addFavourties" 
            element={<PrivateRoute><MainLayout><AddFavorites /></MainLayout></PrivateRoute>} 
          />
          <Route 
            path="/favorites/:favoriteId" 
            element={<PrivateRoute><MainLayout><FavoriteDetails /></MainLayout></PrivateRoute>} 
          />
          <Route 
            path="/hubs" 
            element={<PrivateRoute><MainLayout><Hubs /></MainLayout></PrivateRoute>} 
          />
          <Route 
            path="/hubs/:hubId" 
            element={<PrivateRoute><MainLayout><HubsDetials /></MainLayout></PrivateRoute>} 
          />
          <Route 
            path="/routes" 
            element={<PrivateRoute><MainLayout><TransportRoutes /></MainLayout></PrivateRoute>} 
          />
          <Route 
            path="/routes/:routeId" 
            element={<PrivateRoute><MainLayout><RouteDetails /></MainLayout></PrivateRoute>} 
          />
          <Route 
            path="/hub-request" 
            element={<PrivateRoute><MainLayout><HubRequest /></MainLayout></PrivateRoute>} 
          />
          <Route 
            path="/route-request" 
            element={<PrivateRoute><MainLayout><RouteRequest /></MainLayout></PrivateRoute>} 
          />
          <Route 
            path="/stops" 
            element={<PrivateRoute><MainLayout><Stop /></MainLayout></PrivateRoute>} 
          />
          <Route 
            path="/profile" 
            element={<PrivateRoute><MainLayout><Profile /></MainLayout></PrivateRoute>} 
          />
          
          {/* Catch-all for undefined routes */}
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
