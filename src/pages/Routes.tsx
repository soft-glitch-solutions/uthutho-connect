import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react"; // Import Loader2 for the refresh spinner
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Skeleton Component for Routes
function RouteSkeleton() {
  return (
    <Card className="p-4 cursor-pointer">
      <div className="animate-pulse">
        {/* Placeholder for the title */}
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        {/* Placeholder for the start and end points */}
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        {/* Placeholder for the transport type and cost */}
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    </Card>
  );
}

export default function Routes() {
  const [pullStartY, setPullStartY] = useState(0); // Track the starting Y position of the touch
  const [pullDistance, setPullDistance] = useState(0); // Track how far the user has pulled down
  const [isRefreshing, setIsRefreshing] = useState(false); // Track if a refresh is in progress

  const { data: routes, isLoading, refetch } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Handle touch start event
  const handleTouchStart = (e) => {
    setPullStartY(e.touches[0].clientY);
  };

  // Handle touch move event
  const handleTouchMove = (e) => {
    if (window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStartY;
      if (distance > 0) {
        setPullDistance(distance);
      }
    }
  };

  // Handle touch end event
  const handleTouchEnd = async () => {
    if (pullDistance > 100) { // Trigger refresh if pulled down more than 100px
      setIsRefreshing(true);
      await refetch(); // Refresh the data
      setIsRefreshing(false);
    }
    setPullDistance(0); // Reset pull distance
  };

  return (
    <div
      className="space-y-6 p-4 sm:p-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-down refresh indicator */}
      {pullDistance > 0 && (
        <div className="flex justify-center items-center">
          <div
            className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center"
            style={{
              transform: `rotate(${pullDistance * 0.36}deg)`, // Rotate the spinner based on pull distance
            }}
          >
            <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Transport Routes</h1>
        <Button asChild>
          <Link to="/route-request" className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" />
            Request Route
          </Link>
        </Button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading || isRefreshing ? (
          // Show skeleton placeholders while loading or refreshing
          Array.from({ length: 6 }).map((_, index) => (
            <RouteSkeleton key={index} />
          ))
        ) : (
          // Show actual route cards when data is loaded
          routes?.map((route) => (
            <Link key={route.id} to={`/routes/${route.id}`} className="block">
              <Card className="p-4 hover:shadow-lg transition-shadow duration-200">
                <h3 className="font-semibold mb-2">{route.name}</h3>
                <div className="space-y-1 mb-3">
                  <p className="text-sm text-muted-foreground">From: {route.start_point}</p>
                  <p className="text-sm text-muted-foreground">To: {route.end_point}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {route.transport_type}
                  </span>
                  <span className="text-sm font-medium">
                    R{route.cost}
                  </span>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}