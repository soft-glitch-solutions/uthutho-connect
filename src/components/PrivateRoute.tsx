
// src/components/PrivateRoute.tsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client"; 
import { updateLoginStreak } from "@/utils/loginStreak";
import { Skeleton } from "@/components/ui/skeleton";

// PrivateRoute component to protect private routes
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true); // Loading state for checking session
  const [userSession, setUserSession] = useState<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const { data: session } = await supabase.auth.getSession();
        setUserSession(session);
        
        // Update login streak if user is authenticated
        if (session.session?.user.id) {
          await updateLoginStreak(session.session.user.id);
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  // If the user is not authenticated, redirect to the auth page
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-48 mt-4" />
      </div>
    );
  }

  if (!userSession.session) {
    // If the user is not logged in, redirect to the login page
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If the user is authenticated, render the child components
  return <>{children}</>;
};

export default PrivateRoute;
