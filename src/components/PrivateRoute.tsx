// src/components/PrivateRoute.tsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client"; // Import your supabase client

// PrivateRoute component to protect private routes
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true); // Loading state for checking session

  const [userSession, setUserSession] = useState<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: session } = await supabase.auth.getSession();
      setUserSession(session);
      setLoading(false);
    };

    fetchSession();
  }, []);

  // If the user is not authenticated, redirect to the auth page
  if (loading) {
    return <div>Loading...</div>; // Or add a skeleton loader here
  }

  if (!userSession) {
    // If the user is not logged in, redirect to the login page
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If the user is authenticated, render the child components
  return <>{children}</>;
};

export default PrivateRoute;
